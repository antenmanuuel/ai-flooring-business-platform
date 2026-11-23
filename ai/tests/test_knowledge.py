from app.config import AI_DIR
from app.knowledge import load_catalog, load_guides, product_to_document
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
