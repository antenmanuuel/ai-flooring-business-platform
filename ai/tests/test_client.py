import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from app.client_data import ClientAccessError, ClientDataSource
from app.main import create_app
from app.rag import CLIENT_PROMPT, Assistant, ClientAssistant
from test_api import parse_sse

JOHN = "john-token"
EMPTY = "new-client-token"

REQUEST = {
    "id": 1002, "status": "pending", "createdAt": "2026-11-21T20:38:26Z",
    "serviceAddress": "4521 Woodward Ave, Detroit, MI 48201", "preferredDate": "2027-01-15", "budget": 4500.00,
    "notes": "Please match the hallway trim.", "client": None, "totalArea": 312.00,
    "photos": ["/api/uploads/requests/a.jpg"],
    "rooms": [
        {"id": 3, "name": "Living room", "productName": "Natural White Oak", "unitPrice": 7.50, "pricingUnit": "sq ft",
         "length": 18.00, "width": 14.00, "area": 252.00, "currentFlooring": "Carpet", "removeExisting": True, "pattern": "Straight"},
    ],
}


def fake_spring(request: httpx.Request) -> httpx.Response:
    """Answers like Spring Boot's /api/client: 401 without a cookie, 403 for the admin, the caller's own requests."""
    token = request.headers.get("cookie", "").removeprefix("token=")
    if not token:
        return httpx.Response(401, json={"error": "Not logged in."})
    if token not in (JOHN, EMPTY):
        return httpx.Response(403, json={"error": "Clients only."})
    mine = [REQUEST] if token == JOHN else []
    if request.url.path == "/api/client/requests":
        summaries = [{"id": r["id"], "status": r["status"], "createdAt": r["createdAt"]} for r in mine]
        return httpx.Response(200, json={"requests": summaries})
    found = [r for r in mine if request.url.path == f"/api/client/requests/{r['id']}"]
    if not found:
        return httpx.Response(404, json={"error": "Project not found."})
    return httpx.Response(200, json={"request": found[0]})


@pytest.fixture
def source():
    return ClientDataSource("http://spring/api/client", transport=httpx.MockTransport(fake_spring))


@pytest.fixture
def chat_client(settings, store, fake_llm, source):
    app = create_app(settings)
    app.state.store = store
    app.state.assistant = Assistant(store, fake_llm)
    app.state.client_assistant = ClientAssistant(store, fake_llm)
    app.state.client_source = source
    with TestClient(app) as client:
        yield client


def test_snapshot_lists_the_clients_own_requests(source):
    text = asyncio.run(source.snapshot(JOHN))
    assert "YOUR QUOTE REQUESTS (newest first, 1 of 1)" in text
    assert "R-1002 | status Under review (Anna is preparing a quote) | sent 2026-11-21" in text
    assert "preferred date 2027-01-15 | budget $4,500.00 | total 312.0 sq ft | photos 1" in text
    assert "room Living room: Natural White Oak ($7.50/sq ft), 18.0 x 14.0 ft, 252.0 sq ft" in text
    assert 'notes: "Please match the hallway trim."' in text


def test_snapshot_for_a_client_without_requests(source):
    assert "none yet" in asyncio.run(source.snapshot(EMPTY))


def test_snapshot_refuses_the_admin(source):
    with pytest.raises(ClientAccessError) as err:
        asyncio.run(source.snapshot("admin-token"))
    assert err.value.status == 403 and str(err.value) == "Clients only."


def test_client_prompt_holds_the_projects_and_rules():
    system = CLIENT_PROMPT.format_messages(data="YOUR QUOTE REQUESTS\n- R-1002", context="[1] FAQ", history=[], question="Hi")[0]
    assert "R-1002" in system.content and "[1] FAQ" in system.content
    assert "Never invent requests" in system.content and "can't change anything" in system.content


def test_client_chat_streams_for_a_client(chat_client):
    chat_client.cookies.set("token", JOHN)
    response = chat_client.post("/api/assistant/client/chat", json={"message": "What's the status of my request?"})
    assert response.status_code == 200
    events = parse_sse(response.text)
    assert events[0][0] == "sources" and events[-1] == ("done", {})


def test_client_chat_needs_a_login(chat_client):
    response = chat_client.post("/api/assistant/client/chat", json={"message": "Hi"})
    assert response.status_code == 401 and response.json()["detail"] == "Not logged in."


def test_client_chat_refuses_the_admin(chat_client):
    chat_client.cookies.set("token", "admin-token")
    response = chat_client.post("/api/assistant/client/chat", json={"message": "Show me my requests"})
    assert response.status_code == 403 and response.json()["detail"] == "Clients only."
