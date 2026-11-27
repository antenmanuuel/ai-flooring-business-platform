"""The assistant's HTTP API (FastAPI).
    POST /api/assistant/chat         public assistant: {message, history?} -> Server-Sent Events:
                                     sources, token..., done (or error)
    POST /api/assistant/admin/chat   Anna's assistant: same, plus live business data; needs an admin's
                                     login cookie (checked by Spring Boot)
    POST /api/assistant/client/chat  a logged-in client's assistant: same, plus their own quote requests;
                                     needs a client's login cookie (checked by Spring Boot)
    GET  /api/assistant/health       status, index size, whether Claude is configured
Run from ai/:  uv run uvicorn app.main:app --port 8000 --reload
"""
import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from dataclasses import asdict
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from .admin_data import AdminAccessError, AdminDataSource
from .client_data import ClientAccessError, ClientDataSource
from .config import Settings, get_settings
from .knowledge import fetch_catalog, load_catalog, load_guides
from .rag import AdminAssistant, Assistant, ClientAssistant
from .store import count, make_embeddings, make_vector_store, rebuild, replace_catalog

log = logging.getLogger("assistant")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)

    @field_validator("message")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Type a question first.")
        return value


class RateLimiter:
    """Limits kept in memory: N questions per minute and per day, per key (a visitor's IP, a login, or
    "all" for the whole site)."""

    SWEEP_EVERY = 1000  # checks between clean-ups of keys with no recent questions

    def __init__(self, per_minute: int, per_day: int,
                 message: str = "You've asked a lot of questions in a short time. Please try again later."):
        self.limits = [(60, per_minute), (86_400, per_day)]
        self.message = message
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.checks = 0

    def check(self, key: str) -> str | None:
        """Records a question for this key, or returns why it's refused."""
        now = time.monotonic()
        self.checks += 1
        if self.checks % self.SWEEP_EVERY == 0:
            self.sweep(now)
        hits = self.hits[key]
        while hits and hits[0] < now - 86_400:
            hits.popleft()
        for window, limit in self.limits:
            if sum(1 for t in hits if t >= now - window) >= limit:
                return self.message
        hits.append(now)
        return None

    def sweep(self, now: float) -> None:
        """Forgets keys with nothing in the last day, so a stream of new visitors can't grow memory forever."""
        for key in [k for k, hits in self.hits.items() if not hits or hits[-1] < now - 86_400]:
            del self.hits[key]


def make_llm(settings: Settings):
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(model=settings.ai_model, max_tokens=settings.ai_max_tokens, api_key=settings.anthropic_api_key)


def refresh_catalog(store, catalog_url: str) -> None:
    """Brings the catalog in the index up to date with the website (prices, new or removed products).
    Keeps the current one if the server can't be reached."""
    documents = fetch_catalog(catalog_url)
    if documents is not None and replace_catalog(store, documents):
        log.info("Catalog updated in the index (%d products).", len(documents))


async def keep_catalog_fresh(app: FastAPI, minutes: float) -> None:
    while True:
        await asyncio.sleep(minutes * 60)
        try:
            await asyncio.to_thread(refresh_catalog, app.state.store, app.state.settings.catalog_url)
        except Exception:  # keep refreshing even if one attempt fails
            log.exception("Catalog refresh failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = app.state.settings
    if not hasattr(app.state, "store"):
        app.state.store = make_vector_store(settings, make_embeddings(settings))
        if count(app.state.store) == 0:
            # First start: build the index so the assistant works without a separate step.
            docs = load_guides(settings.knowledge_dir) + load_catalog(settings.catalog_url)
            log.info("Indexed %d documents into ChromaDB.", rebuild(app.state.store, docs))
        else:
            await asyncio.to_thread(refresh_catalog, app.state.store, settings.catalog_url)
    if not hasattr(app.state, "assistant") and settings.anthropic_api_key:
        llm = make_llm(settings)
        app.state.assistant = Assistant(app.state.store, llm, settings.top_k)
        app.state.admin_assistant = AdminAssistant(app.state.store, llm, settings.top_k)
        app.state.client_assistant = ClientAssistant(app.state.store, llm, settings.top_k)
    if not hasattr(app.state, "admin_source"):
        app.state.admin_source = AdminDataSource(settings.admin_api_url)
    if not hasattr(app.state, "client_source"):
        app.state.client_source = ClientDataSource(settings.client_api_url)
    # Products and prices change on the website; re-read the catalog regularly so answers stay current.
    refresher = None
    if settings.catalog_refresh_minutes > 0:
        refresher = asyncio.create_task(keep_catalog_fresh(app, settings.catalog_refresh_minutes))
    yield
    if refresher:
        refresher.cancel()


def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Anna Flooring assistant", lifespan=lifespan)
    app.state.settings = settings or get_settings()
    s = app.state.settings
    app.state.limiter = RateLimiter(s.rate_limit_per_minute, s.rate_limit_per_day)
    app.state.admin_limiter = RateLimiter(s.admin_rate_limit_per_minute, s.admin_rate_limit_per_day)
    app.state.client_limiter = RateLimiter(s.rate_limit_per_minute, s.rate_limit_per_day)
    # A ceiling on questions per day across the public and client chats together, so the Claude bill
    # stays bounded even if many different visitors (or addresses) ask at once. Anna's chat isn't counted.
    app.state.daily_limiter = RateLimiter(
        per_minute=s.site_daily_question_limit, per_day=s.site_daily_question_limit,
        message="The assistant has answered all the questions it can for today. Please try again tomorrow or "
                "call (313) 555-0142.")

    @app.get("/api/assistant/health")
    def health():
        return {
            "status": "ok",
            "documents": count(app.state.store),
            "llmConfigured": getattr(app.state, "assistant", None) is not None,
            "model": app.state.settings.ai_model,
        }

    @app.post("/api/assistant/chat")
    async def chat(body: ChatRequest, request: Request):
        assistant = ready(app, body, getattr(app.state, "assistant", None))
        refused = app.state.limiter.check(client_key(request, app.state.settings.trusted_proxy_hops)) \
            or app.state.daily_limiter.check("all")
        if refused:
            raise HTTPException(429, refused)
        return stream_response(assistant, body.message, history_of(app, body))

    @app.post("/api/assistant/admin/chat")
    async def admin_chat(body: ChatRequest, request: Request):
        return await logged_in_chat(app, body, request, "admin_assistant", app.state.admin_source,
                                    [app.state.admin_limiter])

    @app.post("/api/assistant/client/chat")
    async def client_chat(body: ChatRequest, request: Request):
        return await logged_in_chat(app, body, request, "client_assistant", app.state.client_source,
                                    [app.state.client_limiter, app.state.daily_limiter])

    return app


def ready(app: FastAPI, body: ChatRequest, assistant: Assistant | None) -> Assistant:
    """Checks the question's length and that Claude is configured."""
    limit = app.state.settings.max_question_chars
    if len(body.message) > limit:
        raise HTTPException(400, f"Questions can be up to {limit} characters.")
    if assistant is None:
        raise HTTPException(503, "The assistant isn't set up yet.")
    return assistant


async def logged_in_chat(app: FastAPI, body: ChatRequest, request: Request, assistant_name: str, source,
                         limiters: list[RateLimiter]) -> StreamingResponse:
    """The admin and client assistants: forward the login cookie to Spring Boot for the caller's data, which
    also decides access (its 401/403 are passed through), then answer with that data in the prompt."""
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(401, "Not logged in.")
    assistant = ready(app, body, getattr(app.state, assistant_name, None))
    try:
        data = await source.snapshot(token)
    except (AdminAccessError, ClientAccessError) as err:
        raise HTTPException(err.status, str(err))
    except httpx.HTTPError:
        log.exception("Could not read data from the website's server")
        raise HTTPException(503, "The assistant can't reach the website right now. Please try again in a moment.")
    for limiter in limiters:
        key = "all" if limiter is app.state.daily_limiter else token
        refused = limiter.check(key)
        if refused:
            raise HTTPException(429, refused)
    return stream_response(assistant, body.message, history_of(app, body), data=data)


def history_of(app: FastAPI, body: ChatRequest) -> list[dict]:
    return [m.model_dump() for m in body.history[-app.state.settings.max_history_messages :]]


def stream_response(assistant: Assistant, question: str, history: list[dict], **extra) -> StreamingResponse:
    return StreamingResponse(events(assistant, question, history, **extra), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def client_key(request: Request, trusted_proxy_hops: int = 1) -> str:
    """The visitor's IP. Each proxy in front of this service adds the address it received the request from
    to the end of X-Forwarded-For, so with N trusted proxies (TRUSTED_PROXY_HOPS: 1 for nginx or the Vite
    proxy, 2 for a load balancer in front of nginx) the visitor is the Nth entry from the end. Entries
    further left can be made up by the visitor, so they aren't trusted."""
    forwarded = [part.strip() for part in request.headers.get("x-forwarded-for", "").split(",") if part.strip()]
    if forwarded and trusted_proxy_hops > 0:
        return forwarded[-min(trusted_proxy_hops, len(forwarded))]
    return request.client.host if request.client else "unknown"


def sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def events(assistant: Assistant, question: str, history: list[dict], **extra):
    try:
        async for kind, value in assistant.stream(question, history, **extra):
            if kind == "sources":
                yield sse("sources", [asdict(s) for s in value])
            else:
                yield sse("token", value)
        yield sse("done", {})
    except Exception:  # the stream has started, so errors are reported as an event, not a status code
        log.exception("Chat failed")
        yield sse("error", {"error": "Sorry, something went wrong. Please try again."})


app = create_app()
