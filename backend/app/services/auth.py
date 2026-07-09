"""Authentication and session-management service helpers."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Response
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import SessionToken, User, UserRole

settings = get_settings()


def hash_password(password: str) -> str:
    """Hash a password using scrypt with a per-user random salt."""

    salt = secrets.token_bytes(16)
    derived_key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )
    return "scrypt$16384$8$1${}${}".format(
        base64.b64encode(salt).decode("utf-8"),
        base64.b64encode(derived_key).decode("utf-8"),
    )


def verify_password(password: str, password_hash: str) -> bool:
    """Compare a plain password against a stored scrypt hash."""

    try:
        algorithm, n_value, r_value, p_value, salt_b64, hash_b64 = password_hash.split("$", 5)
    except ValueError:
        return False

    if algorithm != "scrypt":
        return False

    salt = base64.b64decode(salt_b64.encode("utf-8"))
    expected_hash = base64.b64decode(hash_b64.encode("utf-8"))
    candidate_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=int(n_value),
        r=int(r_value),
        p=int(p_value),
        dklen=len(expected_hash),
    )
    return hmac.compare_digest(candidate_hash, expected_hash)


def create_user(
    db: Session,
    full_name: str,
    email: str,
    password: str,
    role: UserRole = UserRole.CUSTOMER,
) -> User:
    """Persist a new user after enforcing minimum password requirements."""

    if len(password) < settings.password_min_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must be at least {settings.password_min_length} characters long.",
        )

    user = User(
        full_name=full_name.strip(),
        email=email.strip().lower(),
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    """Authenticate a user by email and password."""

    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return user


def create_session_for_user(
    db: Session,
    user: User,
    user_agent: Optional[str] = None,
) -> tuple[str, SessionToken]:
    """Issue a new opaque session token and persist its hashed form."""

    raw_token = secrets.token_urlsafe(48)
    session_token = SessionToken(
        user_id=user.id,
        token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.auth_token_ttl_hours),
        user_agent=(user_agent or "")[:255] or None,
    )
    db.add(session_token)
    db.commit()
    db.refresh(session_token)
    return raw_token, session_token


def set_auth_cookie(response: Response, raw_token: str) -> None:
    """Attach the session token as an HttpOnly cookie for browser clients."""

    response.set_cookie(
        key=settings.auth_cookie_name,
        value=raw_token,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        max_age=settings.auth_token_ttl_hours * 3600,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Remove the session cookie during logout."""

    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )


def revoke_session(db: Session, raw_token: str, user_id) -> None:
    """Invalidate one session token for the authenticated user."""

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    session_token = db.scalar(
        select(SessionToken)
        .where(SessionToken.token_hash == token_hash)
        .where(SessionToken.user_id == user_id)
        .where(SessionToken.revoked_at.is_(None))
    )
    if session_token is not None:
        session_token.revoked_at = datetime.now(timezone.utc)
        db.commit()
