"""Authentication routes for registration, login, and session lifecycle."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    enforce_login_rate_limit,
    enforce_registration_rate_limit,
    get_current_user,
)
from app.core.config import get_settings
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import LoginRequest, SessionResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import (
    authenticate,
    clear_auth_cookie,
    create_session_for_user,
    create_user,
    revoke_session,
    set_auth_cookie,
)

router = APIRouter()
settings = get_settings()


@router.post("/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserCreate,
    request: Request,
    response: Response,
    _: None = Depends(enforce_registration_rate_limit),
    db: Session = Depends(get_db),
) -> SessionResponse:
    """Register a new customer account and immediately open a session."""

    # Duplicate email checks stay explicit at the API boundary so users get a
    # clear, stable error message.
    existing_user = db.scalar(select(User).where(User.email == payload.normalized_email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in.",
        )

    try:
        user = create_user(
            db=db,
            full_name=payload.full_name,
            email=payload.normalized_email,
            password=payload.password,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in.",
        ) from None

    raw_token, session_token = create_session_for_user(
        db=db,
        user=user,
        user_agent=request.headers.get("user-agent"),
    )
    set_auth_cookie(response, raw_token)
    return SessionResponse(
        expires_at=session_token.expires_at,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=SessionResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    _: None = Depends(enforce_login_rate_limit),
    db: Session = Depends(get_db),
) -> SessionResponse:
    """Authenticate a user and return a fresh session."""

    user = authenticate(db=db, email=payload.normalized_email, password=payload.password)
    raw_token, session_token = create_session_for_user(
        db=db,
        user=user,
        user_agent=request.headers.get("user-agent"),
    )
    set_auth_cookie(response, raw_token)
    return SessionResponse(
        expires_at=session_token.expires_at,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the current authenticated user."""

    return UserResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> None:
    """Revoke the supplied session when present and always clear the browser cookie."""

    authorization_header = request.headers.get("authorization", "")
    raw_token = authorization_header.removeprefix("Bearer ").strip() or request.cookies.get(
        settings.auth_cookie_name, ""
    )
    if raw_token:
        revoke_session(db=db, raw_token=raw_token)
    clear_auth_cookie(response)
