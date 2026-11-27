from app.config import AI_DIR
from app.knowledge import fetch_catalog, load_catalog, load_guides, product_to_document
from app.main import refresh_catalog
from app.store import replace_catalog
from conftest import CATALOG


def test_guides_are_chunked_with_title_and_section():
    chunks = load_guides(AI_DIR / "knowledge")
    assert len(chunks) > 20
    sources = {c.metadata["source"] for c in chunks}
    assert "guide:hardwood-care.md" in sources
    care = [c for c in chunks if c.metadata["source"] == "guide:hardwood-care.md"]
    assert {c.metadata["title"] for c in care} == {"Caring for hardwood and engineered wood floors"}
    assert "Humidity" in {c.metadata["section"] for c in care}


def test_editor_notes_are_not_indexed():
    for chunk in load_guides(AI_DIR / "knowledge"):
        assert "Starter content" not in chunk.page_content
        assert chunk.page_content.strip()


def test_chunks_stay_under_the_size_limit():
    assert max(len(c.page_content) for c in load_guides(AI_DIR / "knowledge")) <= 900


def test_product_becomes_a_quotable_document():
    doc = product_to_document(CATALOG[1])
    assert "Product: Gray Plank" in doc.page_content
    assert "$40.00 per box (before installation)" in doc.page_content
    assert "20 sq ft per box" in doc.page_content
    assert doc.metadata == {"source": "catalog:3", "title": "Gray Plank", "section": "Catalog"}


def test_unreachable_catalog_falls_back_to_guides_only():
    assert load_catalog("http://127.0.0.1:9/api/products") == []


def test_catalog_changes_replace_only_the_catalog_in_the_index(store):
    guides_before = [m for m in store.get(include=["metadatas"])["metadatas"] if m["source"].startswith("guide:")]
    repriced = [{**CATALOG[0], "unitPrice": 8.25}]  # White Oak's price changed; Gray Plank was removed

    assert replace_catalog(store, [product_to_document(p) for p in repriced]) is True
    data = store.get(include=["documents", "metadatas"])
    catalog = [d for d, m in zip(data["documents"], data["metadatas"]) if m["source"].startswith("catalog:")]
    assert catalog == [product_to_document(repriced[0]).page_content] and "$8.25" in catalog[0]
    assert len([m for m in data["metadatas"] if m["source"].startswith("guide:")]) == len(guides_before)

    # Nothing changed since: nothing is re-embedded.
    assert replace_catalog(store, [product_to_document(p) for p in repriced]) is False


def test_refresh_keeps_the_catalog_when_the_server_is_down(store, monkeypatch):
    monkeypatch.setattr("app.main.fetch_catalog", lambda url: None)
    before = store.get(include=[])["ids"]
    refresh_catalog(store, "http://127.0.0.1:9/api/products")
    assert store.get(include=[])["ids"] == before


def test_unreachable_catalog_is_none_not_empty():
    assert fetch_catalog("http://127.0.0.1:9/api/products") is None
