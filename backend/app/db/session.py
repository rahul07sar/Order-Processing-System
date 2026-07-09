"""Database engine and request-scoped session helpers."""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# The engine is shared across the process while sessions stay short-lived per
# request or background job.
engine = create_engine(settings.resolved_database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Session:
    """Yield a transaction-capable SQLAlchemy session for request handlers."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
