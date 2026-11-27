"""Settings for the AI assistant, read from environment variables or ai/.env (see .env.example)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

AI_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=AI_DIR / ".env", extra="ignore")

    # Claude. Without a key the service still starts, and the chat says it isn't set up yet.
    anthropic_api_key: str | None = None
    ai_model: str = "claude-opus-5-5"
    ai_max_tokens: int = 1024

    # Where the knowledge comes from.
    knowledge_dir: Path = AI_DIR / "knowledge"
    catalog_url: str = "http://localhost:5050/api/products"
    # The admin assistant reads live data here, forwarding the admin's login cookie.
    admin_api_url: str = "http://localhost:5050/api/admin"
    # The client assistant reads the logged-in client's own requests here, forwarding their cookie.
    client_api_url: str = "http://localhost:5050/api/client"

    # ChromaDB, persisted on disk so restarts don't re-embed everything.
    chroma_dir: Path = AI_DIR / ".chroma"
    chroma_collection: str = "anna_flooring"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_cache_dir: Path = AI_DIR / ".fastembed"
    top_k: int = 4
    # How often the catalog is re-read from the website so prices and products stay current (0 = never).
    catalog_refresh_minutes: float = 10

    # Limits for a public chat.
    max_question_chars: int = 1000
    max_history_messages: int = 6
    rate_limit_per_minute: int = 10
    rate_limit_per_day: int = 100
    # Questions per day for the whole site (public and client chats together), whoever asks: a ceiling on
    # the Claude bill. Anna's chat isn't counted.
    site_daily_question_limit: int = 1000
    # Proxies in front of this service that add to X-Forwarded-For: 1 for nginx (Docker) or Vite (dev);
    # 2 if a load balancer sits in front of nginx.
    trusted_proxy_hops: int = 1
    # Anna's assistant is only for a logged-in admin, so its limits are higher.
    admin_rate_limit_per_minute: int = 30
    admin_rate_limit_per_day: int = 500


def get_settings() -> Settings:
    return Settings()
