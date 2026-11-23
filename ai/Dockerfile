# The AI assistant service (FastAPI + LangChain + ChromaDB). Used by compose.yaml at the repo root.
FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.11.32 /uv /bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never

# Dependencies first, so code changes don't reinstall them.
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project

COPY app app
COPY knowledge knowledge

# The ChromaDB index and the downloaded embedding model live in /data (a volume in compose.yaml).
# The model downloader also writes to HF_HOME, so that goes in /data too.
RUN useradd --system --create-home --uid 10002 assistant && mkdir /data && chown assistant /data
ENV CHROMA_DIR=/data/chroma EMBEDDING_CACHE_DIR=/data/fastembed HF_HOME=/data/huggingface \
    PATH="/app/.venv/bin:$PATH"
USER assistant
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
