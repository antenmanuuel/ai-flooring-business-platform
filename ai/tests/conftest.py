"""Shared test setup: a real ChromaDB collection (in memory) with fake embeddings and a fake Claude,
so tests need no API key, no network and no model download."""
import uuid

import pytest
from fastapi.testclient import TestClient
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.config import AI_DIR, Settings
from app.knowledge import load_guides, product_to_document
from app.main import create_app
from app.rag import Assistant
from app.store import make_vector_store, rebuild

CATALOG = [
    {"productId": 2, "name": "Natural White Oak", "category": "Hardwood", "unitPrice": 7.5, "pricingUnit": "sq ft", "coveragePerBox": None},
    {"productId": 3, "name": "Gray Plank", "category": "Vinyl plank", "unitPrice": 40, "pricingUnit": "box", "coveragePerBox": 20},
]


@pytest.fixture
def settings(tmp_path):
    return Settings(
        anthropic_api_key="test-key",
        knowledge_dir=AI_DIR / "knowledge",
        chroma_dir=tmp_path / "chroma",
        chroma_collection=f"test_{uuid.uuid4().hex[:8]}",  # a fresh collection per test
        rate_limit_per_minute=3,
        catalog_refresh_minutes=0,  # no background refresh calling a real server
    )


@pytest.fixture
def store(settings):
    store = make_vector_store(settings, DeterministicFakeEmbedding(size=64), persist=False)
    rebuild(store, load_guides(settings.knowledge_dir) + [product_to_document(p) for p in CATALOG])
    return store


@pytest.fixture
def fake_llm():
    return FakeListChatModel(responses=["Sweep often and use a damp mop [1]."])


@pytest.fixture
def client(settings, store, fake_llm):
    app = create_app(settings)
    app.state.store = store
    app.state.assistant = Assistant(store, fake_llm, settings.top_k)
    with TestClient(app) as client:
        yield client
