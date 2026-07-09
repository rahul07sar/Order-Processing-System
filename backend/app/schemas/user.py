"""User request and response schemas."""

from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.db.models import UserRole

EMAIL_PATTERN = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)


class UserCreate(BaseModel):
    """Registration payload used to create a new customer account."""

    full_name: str = Field(min_length=2, max_length=120)
    email: str
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 2:
            raise ValueError("Full name must contain at least 2 characters.")
        return trimmed

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("A valid email address is required.")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(character.islower() for character in value):
            raise ValueError("Password must include at least one lowercase letter.")
        if not any(character.isupper() for character in value):
            raise ValueError("Password must include at least one uppercase letter.")
        if not any(not character.isalnum() for character in value):
            raise ValueError("Password must include at least one special character.")
        return value

    @model_validator(mode="after")
    def validate_password_confirmation(self) -> "UserCreate":
        if self.password != self.confirm_password:
            raise ValueError("Password and confirm password must match.")
        return self

    @property
    def normalized_email(self) -> str:
        return self.email.strip().lower()


class UserResponse(BaseModel):
    """Serialized user profile returned by auth endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
