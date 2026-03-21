import os
from functools import lru_cache

from sqlalchemy import create_engine


@lru_cache(maxsize=1)
def get_engine():
    """Create and cache SQLAlchemy engine using Postgres env settings."""
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "dwv")
    user = os.getenv("POSTGRES_USER", "dwv")
    password = os.getenv("POSTGRES_PASSWORD", "dwv")

    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"
    return create_engine(url, pool_pre_ping=True, future=True)


def _engine_factory():
    """Internal helper to keep top-level name concise."""
    return get_engine()


engine = _engine_factory()
