import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from app.admin_data import AdminAccessError, AdminDataSource
from app.main import create_app
from app.rag import ADMIN_PROMPT, AdminAssistant, Assistant
from test_api import parse_sse

ADMIN_TOKEN = "admin-token"

# What the Spring Boot admin API returns (same JSON field names).
SPRING = {
    "/api/admin/overview": {
        "greeting": "Good evening", "firstName": "Anna",
        "stats": {"newRequests": 1, "openQuotes": 0, "activeOrders": 0, "unpaidBills": 0},
        "pendingSignups": [{"id": 7, "firstName": "Jane", "lastName": "Smith"}],
        "newRequests": [{"id": 1002, "firstName": "John", "lastName": "Doe"}],
    },
    "/api/admin/requests": {"requests": [{
        "id": 1002, "status": "pending", "createdAt": "2026-11-21T20:38:26Z",
        "serviceAddress": "4521 Woodward Ave, Detroit, MI 48201", "preferredDate": "2027-01-15", "budget": 4500.00,
        "notes": "Please match the hallway trim.", "totalArea": 312.00, "photos": ["/api/uploads/requests/a.jpg"],
        "client": {"id": 5, "firstName": "John", "lastName": "Doe", "email": "john@demo.com", "phone": "(313) 555-0187"},
        "rooms": [
            {"id": 3, "name": "Living room", "productName": "Natural White Oak", "unitPrice": 7.50, "pricingUnit": "sq ft",
             "length": 18.00, "width": 14.00, "area": 252.00, "currentFlooring": "Carpet", "removeExisting": True, "pattern": "Straight"},
            {"id": 4, "name": "Hallway", "productName": "Natural White Oak", "unitPrice": 7.50, "pricingUnit": "sq ft",
             "length": None, "width": None, "area": 60.00, "currentFlooring": "Tile", "removeExisting": False, "pattern": "Straight"},
        ],
    }]},
    "/api/admin/clients": {"clients": [
        {"id": 5, "firstName": "John", "lastName": "Doe", "email": "john@demo.com", "phone": "(313) 555-0187",
         "address": "4521 Woodward Ave", "city": "Detroit", "state": "MI", "status": "active", "createdAt": "2026-11-21T20:38:26Z"},
    ]},
    "/api/admin/products": [
        {"productId": 2, "name": "Natural White Oak", "description": None, "category": "Hardwood", "manufacturer": "Bruce",
         "style": "Solid plank", "color": "Natural", "unitPrice": 7.50, "pricingUnit": "sq ft", "dimensions": None,
         "coveragePerBox": None, "imageUrl": None},
    ],
}


def fake_spring(request: httpx.Request) -> httpx.Response:
    """Answers like Spring Boot: 401 without a cookie, 403 for a non-admin, data for the admin."""
    token = request.headers.get("cookie", "").removeprefix("token=")
    if not token:
        return httpx.Response(401, json={"error": "Not logged in."})
    if token != ADMIN_TOKEN:
        return httpx.Response(403, json={"error": "Admins only."})
    return httpx.Response(200, json=SPRING[request.url.path])


@pytest.fixture
def source():
    return AdminDataSource("http://spring/api/admin", transport=httpx.MockTransport(fake_spring))


@pytest.fixture
def admin_client(settings, store, fake_llm, source):
    app = create_app(settings)
    app.state.store = store
    app.state.assistant = Assistant(store, fake_llm)
    app.state.admin_assistant = AdminAssistant(store, fake_llm)
    app.state.admin_source = source
    with TestClient(app) as client:
        yield client


def test_snapshot_summarizes_the_live_data(source):
    text = asyncio.run(source.snapshot(ADMIN_TOKEN))
    assert "New requests waiting for a first quote: 1 (R-1002 from John Doe)" in text
    assert "Sign-ups waiting for approval: Jane Smith (C7)" in text
    assert "R-1002 | status pending | sent 2026-11-21 | client John Doe (C5, john@demo.com, (313) 555-0187)" in text
    assert "budget $4,500.00 | total 312.0 sq ft | photos 1" in text
    assert "room Living room: Natural White Oak ($7.50/sq ft), 18.0 x 14.0 ft, 252.0 sq ft, pattern Straight, current floor Carpet, remove existing" in text
    assert "room Hallway: Natural White Oak ($7.50/sq ft), 60.0 sq ft" in text
    assert 'notes from client: "Please match the hallway trim."' in text
    assert "C5 John Doe | active | john@demo.com" in text
    assert "Natural White Oak | Hardwood | Bruce Solid plank, Natural | $7.50/sq ft" in text


def test_snapshot_refuses_a_non_admin(source):
    with pytest.raises(AdminAccessError) as err:
        asyncio.run(source.snapshot("client-token"))
    assert err.value.status == 403 and str(err.value) == "Admins only."


def test_admin_prompt_holds_the_data_and_rules():
    system = ADMIN_PROMPT.format_messages(data="QUOTE REQUESTS\n- R-1002", context="[1] FAQ", history=[], question="Hi")[0]
    assert "R-1002" in system.content and "[1] FAQ" in system.content
    assert "never invent requests" in system.content and "can't change anything" in system.content


def test_admin_chat_streams_for_the_admin(admin_client):
    admin_client.cookies.set("token", ADMIN_TOKEN)
    response = admin_client.post("/api/assistant/admin/chat", json={"message": "What needs my attention?"})
    assert response.status_code == 200
    events = parse_sse(response.text)
    assert events[0][0] == "sources" and events[-1] == ("done", {})


def test_admin_chat_needs_a_login(admin_client):
    response = admin_client.post("/api/assistant/admin/chat", json={"message": "Hi"})
    assert response.status_code == 401 and response.json()["detail"] == "Not logged in."


def test_admin_chat_refuses_clients(admin_client):
    admin_client.cookies.set("token", "client-token")
    response = admin_client.post("/api/assistant/admin/chat", json={"message": "Show me all clients"})
    assert response.status_code == 403 and response.json()["detail"] == "Admins only."
