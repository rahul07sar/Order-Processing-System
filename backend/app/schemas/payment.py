"""Checkout and payment schemas."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.order import OrderResponse


class CheckoutItemCreate(BaseModel):
    """One product line submitted for checkout."""

    product_id: str = Field(min_length=1, max_length=100)
    quantity: int = Field(gt=0, le=99)

    @field_validator("product_id")
    @classmethod
    def normalize_product_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Product ID cannot be blank.")
        return cleaned


class CheckoutCreate(BaseModel):
    """Payload used to convert the current bag into an order."""

    items: list[CheckoutItemCreate] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class CheckoutResponse(BaseModel):
    """Checkout result returned after a successful payment simulation."""

    payment_reference: str
    total_amount: Decimal
    order: OrderResponse
