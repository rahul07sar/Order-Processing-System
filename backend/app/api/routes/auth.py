from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import LoginRequest, SessionResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import authenticate, create_session_for_user, create_user, revoke_session

router = APIRouter()


@router.post("/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> SessionResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.normalized_email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = create_user(
        db=db,
        full_name=payload.full_name,
        email=payload.normalized_email,
        password=payload.password,
    )
    raw_token, session_token = create_session_for_user(
        db=db,
        user=user,
        user_agent=request.headers.get("user-agent"),
    )
    return SessionResponse(
        access_token=raw_token,
        expires_at=session_token.expires_at,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=SessionResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> SessionResponse:
    user = authenticate(db=db, email=payload.normalized_email, password=payload.password)
    raw_token, session_token = create_session_for_user(
        db=db,
        user=user,
        user_agent=request.headers.get("user-agent"),
    )
    return SessionResponse(
        access_token=raw_token,
        expires_at=session_token.expires_at,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    authorization_header = request.headers.get("authorization", "")
    raw_token = authorization_header.removeprefix("Bearer ").strip()
    if raw_token:
        revoke_session(db=db, raw_token=raw_token, user_id=current_user.id)
