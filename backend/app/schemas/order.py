"""Order request and response schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models import OrderStatus


class OrderItemCreate(BaseModel):
    """One item submitted while creating an order."""

    product_name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=100)
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)

    @field_validator("product_name", "sku")
    @classmethod
    def strip_text_fields(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("This field cannot be blank.")
        return trimmed


class OrderCreate(BaseModel):
    """Payload used when a customer places a new order."""

    items: list[OrderItemCreate] = Field(min_length=1)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class OrderItemResponse(BaseModel):
    """Serialized order item returned to API clients."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_name: str
    sku: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderResponse(BaseModel):
    """Serialized order aggregate returned to API clients."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: OrderStatus
    total_amount: Decimal
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    status_updated_at: datetime
    cancelled_at: Optional[datetime]
    items: list[OrderItemResponse]


class OrderListResponse(BaseModel):
    """Collection wrapper for order list endpoints."""

    items: list[OrderResponse]


class OrderStatusUpdate(BaseModel):
    """Payload used by admins to move an order to its next state."""

    status: OrderStatus
