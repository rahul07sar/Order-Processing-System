"""Product catalog request and response schemas."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class ProductResponse(BaseModel):
    """Serialized storefront product returned to frontend clients."""

    id: str
    sku: str
    name: str
    description: str
    price: Decimal
    image_url: str


class ProductListResponse(BaseModel):
    """Collection wrapper for product catalog endpoints."""

    items: list[ProductResponse]
