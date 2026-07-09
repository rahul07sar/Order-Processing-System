import logging

from sqlalchemy import inspect, select

from app.core.config import get_settings
from app.db.models import User, UserRole
from app.db.session import SessionLocal, engine
from app.services.auth import hash_password

settings = get_settings()
logger = logging.getLogger(__name__)


def seed_bootstrap_admin() -> None:
    if not settings.bootstrap_admin_email or not settings.bootstrap_admin_password:
        return

    inspector = inspect(engine)
    if not inspector.has_table("users"):
        logger.info("Skipping bootstrap admin creation until migrations are applied.")
        return

    db = SessionLocal()
    try:
        admin_email = settings.bootstrap_admin_email.strip().lower()
        existing_admin = db.scalar(select(User).where(User.email == admin_email))
        if existing_admin is None:
            admin = User(
                full_name="System Administrator",
                email=admin_email,
                password_hash=hash_password(settings.bootstrap_admin_password),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
