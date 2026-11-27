"""The ChromaDB vector store and the embedding model that fills it."""
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from .config import Settings


class LocalEmbeddings(Embeddings):
    """A LangChain Embeddings backed by FastEmbed: a small open-source model (bge-small-en-v1.5)
    that runs locally on ONNX. No API key, no per-use cost; downloaded once into ai/.fastembed."""

    def __init__(self, model_name: str, cache_dir: str):
        from fastembed import TextEmbedding  # imported here so tests with fake embeddings don't load it

        self.model = TextEmbedding(model_name=model_name, cache_dir=cache_dir)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [vector.tolist() for vector in self.model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        # query_embed adds the model's search prefix, which bge models are trained to expect.
        return next(iter(self.model.query_embed(text))).tolist()


def make_embeddings(settings: Settings) -> Embeddings:
    return LocalEmbeddings(settings.embedding_model, str(settings.embedding_cache_dir))


def make_vector_store(settings: Settings, embeddings: Embeddings, persist: bool = True) -> Chroma:
    return Chroma(
        collection_name=settings.chroma_collection,
        embedding_function=embeddings,
        persist_directory=str(settings.chroma_dir) if persist else None,
        collection_metadata={"hnsw:space": "cosine"},
    )


def rebuild(store: Chroma, documents: list[Document]) -> int:
    """Replaces everything in the collection with these documents. Returns how many were added."""
    existing = store.get(include=[])["ids"]
    if existing:
        store.delete(ids=existing)
    if not documents:
        return 0
    ids = [f"{d.metadata['source']}#{i}" for i, d in enumerate(documents)]
    store.add_documents(documents, ids=ids)
    return len(documents)


def replace_catalog(store: Chroma, documents: list[Document]) -> bool:
    """Swaps the catalog documents in the index for these (the guides stay). Does nothing when the catalog
    hasn't changed, so it's cheap to call often. Returns True if the index changed."""
    current = store.get(include=["documents", "metadatas"])
    old = {
        doc_id: text
        for doc_id, text, meta in zip(current["ids"], current["documents"], current["metadatas"])
        if str((meta or {}).get("source", "")).startswith("catalog:")
    }
    new = {d.metadata["source"]: d for d in documents}
    if sorted(old.values()) == sorted(d.page_content for d in new.values()):
        return False
    if old:
        store.delete(ids=list(old))
    if new:
        store.add_documents(list(new.values()), ids=list(new))
    return True


def count(store: Chroma) -> int:
    return len(store.get(include=[])["ids"])
