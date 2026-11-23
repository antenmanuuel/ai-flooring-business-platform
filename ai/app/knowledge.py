"""Turns the assistant's sources into LangChain Documents:
- the Markdown guides in ai/knowledge, split into chunks by heading
- the live product catalog, one Document per product, from the Spring Boot API
"""
import logging
import re
from pathlib import Path

import httpx
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

log = logging.getLogger(__name__)

_HEADERS = [("#", "title"), ("##", "section")]
_header_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=_HEADERS, strip_headers=False)
# Sections longer than this are split again, with some overlap so sentences aren't cut off from context.
_size_splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)


def load_guides(knowledge_dir: Path) -> list[Document]:
    """Splits every guide by its headings, then by size. Each chunk remembers its file, title and section."""
    chunks: list[Document] = []
    for path in sorted(knowledge_dir.glob("*.md")):
        # HTML comments (like the "starter content" note) are for editors, not the assistant.
        text = re.sub(r"<!--.*?-->", "", path.read_text(encoding="utf-8"), flags=re.S)
        sections = _header_splitter.split_text(text)
        title = next((s.metadata["title"] for s in sections if "title" in s.metadata), path.stem.replace("-", " ").title())
        for doc in _size_splitter.split_documents(sections):
            doc.metadata = {
                "source": f"guide:{path.name}",
                "title": title,
                "section": doc.metadata.get("section", ""),
            }
            chunks.append(doc)
    return chunks


def product_to_document(product: dict) -> Document:
    """One catalog product as text the retriever can match ('oak hardwood under $8') and Claude can quote."""
    unit = product.get("pricingUnit") or "sq ft"
    lines = [
        f"Product: {product['name']}",
        f"Category: {product['category']}",
        f"Material price: ${float(product['unitPrice']):.2f} per {unit} (before installation)",
    ]
    if product.get("coveragePerBox"):
        lines.append(f"Coverage: {float(product['coveragePerBox']):g} sq ft per box")
    return Document(
        page_content="\n".join(lines),
        metadata={"source": f"catalog:{product['productId']}", "title": product["name"], "section": "Catalog"},
    )


def load_catalog(catalog_url: str) -> list[Document]:
    """The current catalog from GET /api/products. Returns [] (and logs why) if the server can't be reached."""
    try:
        response = httpx.get(catalog_url, timeout=10)
        response.raise_for_status()
    except httpx.HTTPError as err:
        log.warning("Could not load the catalog from %s (%s); indexing guides only.", catalog_url, err)
        return []
    try:
        return [product_to_document(p) for p in response.json()]
    except (KeyError, TypeError, ValueError) as err:
        log.warning("The catalog from %s isn't in the expected format (%r); indexing guides only.", catalog_url, err)
        return []
