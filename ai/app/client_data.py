"""A logged-in client's own projects, read from the Spring Boot client API, for the client assistant.

Like the admin assistant, it forwards the client's login cookie and never has access of its own, so
Spring Boot decides who the caller is and only ever returns that client's requests (401/403 otherwise).
The data is fetched fresh for each question and put in the prompt as text.
"""
import asyncio

import httpx

from .admin_data import _day, _money, format_room

MAX_REQUESTS = 20  # newest first

# How each status is explained to the client (matches the wording on their dashboard).
STATUS = {
    "pending": "Under review (Anna is preparing a quote)",
    "quoted": "Quote ready",
    "countered": "Waiting for Anna (the client replied to the quote)",
    "accepted": "Accepted",
    "rejected": "Declined",
    "canceled": "Canceled",
}


class ClientAccessError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


class ClientDataSource:
    def __init__(self, base_url: str, transport: httpx.AsyncBaseTransport | None = None):
        self.base_url = base_url.rstrip("/")
        self.transport = transport  # tests pass a mock transport

    async def snapshot(self, token: str) -> str:
        """The client's quote requests, with rooms, as text. Raises ClientAccessError if Spring Boot says
        the cookie isn't a logged-in client."""
        async with httpx.AsyncClient(base_url=self.base_url, cookies={"token": token}, timeout=10,
                                     transport=self.transport) as client:
            summaries = (await self._get(client, "/requests"))["requests"]
            details = await asyncio.gather(
                *(self._get(client, f"/requests/{r['id']}") for r in summaries[:MAX_REQUESTS])
            )
        return format_client_requests([d["request"] for d in details], total=len(summaries))

    @staticmethod
    async def _get(client: httpx.AsyncClient, path: str):
        response = await client.get(path)
        if response.status_code in (401, 403):
            message = response.json().get("error", "Clients only.") if response.content else "Clients only."
            raise ClientAccessError(response.status_code, message)
        response.raise_for_status()
        return response.json()


def format_client_requests(requests: list[dict], total: int | None = None) -> str:
    if not requests:
        return "YOUR QUOTE REQUESTS\n(none yet: the client hasn't sent a quote request)"
    total = len(requests) if total is None else total
    lines = [f"YOUR QUOTE REQUESTS (newest first, {len(requests)} of {total})"]
    for r in requests:
        lines.append(
            f"- R-{r['id']} | status {STATUS.get(r['status'], r['status'])} | sent {_day(r.get('createdAt'))} | "
            f"address {r.get('serviceAddress')} | preferred date {r.get('preferredDate') or 'flexible'} | "
            f"budget {_money(r.get('budget'))} | total {r.get('totalArea')} sq ft | photos {len(r.get('photos', []))}"
        )
        lines += [f"    {format_room(room)}" for room in r.get("rooms", [])]
        if r.get("notes"):
            lines.append(f"    notes: \"{r['notes']}\"")
    return "\n".join(lines)
