"""Rebuilds the ChromaDB index from the guides and the live catalog.
    uv run python -m app.ingest          (from ai/; the Spring Boot server should be running for the catalog)
"""
import logging

from .config import get_settings
from .knowledge import load_catalog, load_guides
from .store import make_embeddings, make_vector_store, rebuild


def run() -> tuple[int, int]:
    settings = get_settings()
    guides = load_guides(settings.knowledge_dir)
    catalog = load_catalog(settings.catalog_url)
    store = make_vector_store(settings, make_embeddings(settings))
    rebuild(store, guides + catalog)
    return len(guides), len(catalog)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    guide_chunks, products = run()
    print(f"Indexed {guide_chunks} guide chunks and {products} catalog products into ChromaDB.")
