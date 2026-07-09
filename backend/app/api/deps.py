"""Reusable API dependencies for authentication and rate limiting."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import SessionToken, User, UserRole
from app.db.session import get_db
from app.services.rate_limiter import rate_limiter

bearer_scheme = HTTPBearer(auto_error=False)
settings = get_settings()


def get_client_ip(request: Request) -> str:
    """Resolve the most useful client IP from proxy headers or the socket."""

    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_forwarded = forwarded_for.split(",")[0].strip()
        if first_forwarded:
            return first_forwarded
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_registration_rate_limit(request: Request) -> None:
    """Protect the registration endpoint from burst abuse."""

    client_ip = get_client_ip(request)
    allowed, retry_after = rate_limiter.check(
        key=f"register:{client_ip}",
        limit=settings.registration_rate_limit_attempts,
        window_seconds=settings.registration_rate_limit_window_seconds,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def enforce_login_rate_limit(request: Request) -> None:
    """Protect the login endpoint from repeated guessing attempts."""

    client_ip = get_client_ip(request)
    allowed, retry_after = rate_limiter.check(
        key=f"login:{client_ip}",
        limit=settings.login_rate_limit_attempts,
        window_seconds=settings.login_rate_limit_window_seconds,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate a user from bearer credentials or the session cookie."""

    raw_token = None

    # Browser clients can rely on the HttpOnly cookie, while API tooling can
    # still send the same session token as a bearer credential.
    if credentials is not None and credentials.scheme.lower() == "bearer":
        raw_token = credentials.credentials
    elif request.cookies.get(settings.auth_cookie_name):
        raw_token = request.cookies.get(settings.auth_cookie_name)

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    token_hash = sha256(raw_token.encode("utf-8")).hexdigest()
    session_token = db.scalar(
        select(SessionToken)
        .where(SessionToken.token_hash == token_hash)
        .where(SessionToken.revoked_at.is_(None))
        .where(SessionToken.expires_at > datetime.now(timezone.utc))
    )

    if session_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
        )

    user = db.get(User, session_token.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The authenticated user is no longer active.",
        )

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to have administrator privileges."""

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges are required for this operation.",
        )
    return current_user
