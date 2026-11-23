"""Live business data for the admin assistant, read from the Spring Boot admin API.

The assistant never gets its own access: it forwards the admin's login cookie, so Spring Boot decides
whether the caller is an admin (401/403 otherwise). The data is fetched fresh for each question and
summarized as text: it's small, changes constantly, and must be exact, so it's put in the prompt
rather than embedded in ChromaDB.
"""
import asyncio

import httpx

MAX_REQUESTS = 40   # newest first
MAX_CLIENTS = 150


class AdminAccessError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


class AdminDataSource:
    def __init__(self, base_url: str, transport: httpx.AsyncBaseTransport | None = None):
        self.base_url = base_url.rstrip("/")
        self.transport = transport  # tests pass a mock transport

    async def snapshot(self, token: str) -> str:
        """The overview, requests, clients and products as text. Raises AdminAccessError if Spring
        Boot says the cookie isn't a logged-in admin."""
        async with httpx.AsyncClient(base_url=self.base_url, cookies={"token": token}, timeout=10,
                                     transport=self.transport) as client:
            overview, requests, clients, products = await asyncio.gather(
                *(self._get(client, path) for path in ("/overview", "/requests", "/clients", "/products"))
            )
        return "\n\n".join([
            format_overview(overview),
            format_requests(requests["requests"]),
            format_clients(clients["clients"]),
            format_products(products),
        ])

    @staticmethod
    async def _get(client: httpx.AsyncClient, path: str):
        response = await client.get(path)
        if response.status_code in (401, 403):
            message = response.json().get("error", "Admins only.") if response.content else "Admins only."
            raise AdminAccessError(response.status_code, message)
        response.raise_for_status()
        return response.json()


def _name(person: dict) -> str:
    return f"{person.get('firstName', '')} {person.get('lastName', '')}".strip()


def _money(value) -> str:
    return f"${float(value):,.2f}" if value is not None else "none given"


def _day(timestamp: str | None) -> str:
    return (timestamp or "")[:10]


def format_overview(o: dict) -> str:
    stats = o.get("stats", {})
    signups = ", ".join(f"{_name(s)} (C{s['id']})" for s in o.get("pendingSignups", [])) or "none"
    new = ", ".join(f"R-{r['id']} from {_name(r)}" for r in o.get("newRequests", [])) or "none"
    return (
        "OVERVIEW\n"
        f"New requests waiting for a first quote: {stats.get('newRequests', 0)} ({new})\n"
        f"Sign-ups waiting for approval: {signups}"
    )


def format_requests(requests: list[dict]) -> str:
    if not requests:
        return "QUOTE REQUESTS\n(none yet)"
    lines = [f"QUOTE REQUESTS (newest first, {min(len(requests), MAX_REQUESTS)} of {len(requests)})"]
    for r in requests[:MAX_REQUESTS]:
        c = r.get("client") or {}
        lines.append(
            f"- R-{r['id']} | status {r['status']} | sent {_day(r.get('createdAt'))} | client {_name(c)} (C{c.get('id')}, "
            f"{c.get('email')}, {c.get('phone')}) | address {r.get('serviceAddress')} | preferred date "
            f"{r.get('preferredDate') or 'flexible'} | budget {_money(r.get('budget'))} | total {r.get('totalArea')} sq ft | "
            f"photos {len(r.get('photos', []))}"
        )
        for room in r.get("rooms", []):
            size = f"{room['length']} x {room['width']} ft, " if room.get("length") and room.get("width") else ""
            lines.append(
                f"    room {room['name']}: {room['productName']} ({_money(room['unitPrice'])}/{room['pricingUnit']}), "
                f"{size}{room['area']} sq ft, pattern {room['pattern']}, current floor {room.get('currentFlooring') or 'not given'}"
                f"{', remove existing' if room.get('removeExisting') else ''}"
            )
        if r.get("notes"):
            lines.append(f"    notes from client: \"{r['notes']}\"")
    return "\n".join(lines)


def format_clients(clients: list[dict]) -> str:
    if not clients:
        return "CLIENTS\n(none yet)"
    lines = [f"CLIENTS ({min(len(clients), MAX_CLIENTS)} of {len(clients)})"]
    for c in clients[:MAX_CLIENTS]:
        place = ", ".join(p for p in (c.get("city"), c.get("state")) if p)
        lines.append(f"- C{c['id']} {_name(c)} | {c['status']} | {c.get('email')} | {c.get('phone')} | {place} | "
                     f"registered {_day(c.get('createdAt'))}")
    return "\n".join(lines)


def format_products(products: list[dict]) -> str:
    if not products:
        return "PRODUCTS\n(none yet)"
    lines = ["PRODUCTS"]
    for p in products:
        extra = f", {float(p['coveragePerBox']):g} sq ft/box" if p.get("coveragePerBox") else ""
        lines.append(f"- {p['name']} | {p['category']} | {p['manufacturer']} {p['style']}, {p['color']} | "
                     f"{_money(p['unitPrice'])}/{p['pricingUnit']}{extra}")
    return "\n".join(lines)
