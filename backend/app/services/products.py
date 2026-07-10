"""Product catalog service helpers."""

from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status

from app.schemas.product import ProductResponse

PRODUCT_CATALOG: tuple[ProductResponse, ...] = (
    ProductResponse(
        id="allergix-medicine",
        sku="OPS-MED-001",
        name="Allergix Relief Tablets",
        description="Daily allergy relief medicine designed to help manage sneezing, runny nose, and itchy eyes.",
        price=Decimal("89.00"),
        image_url="/Products/product1.jpg",
    ),
    ProductResponse(
        id="street-basketball",
        sku="OPS-SPT-002",
        name="Street Basketball",
        description="Durable outdoor basketball built for grip, bounce consistency, and everyday court practice.",
        price=Decimal("74.00"),
        image_url="/Products/product2.jpg",
    ),
    ProductResponse(
        id="pro-football",
        sku="OPS-SPT-003",
        name="Pro Training Football",
        description="Match-style football made for training sessions, casual games, and reliable field performance.",
        price=Decimal("96.00"),
        image_url="/Products/product3.jpg",
    ),
    ProductResponse(
        id="portable-ev-charger",
        sku="OPS-EV-004",
        name="Portable EV Charger",
        description="Compact car charging unit for convenient portable electric-vehicle top-ups during travel.",
        price=Decimal("235.00"),
        image_url="/Products/product4.jpg",
    ),
    ProductResponse(
        id="sleep-booster",
        sku="OPS-WEL-005",
        name="Sleep Booster Formula",
        description="Night-time wellness supplement intended to support restful sleep and a calmer bedtime routine.",
        price=Decimal("112.00"),
        image_url="/Products/product5.jpg",
    ),
)


def list_products() -> list[ProductResponse]:
    """Return the full storefront catalog."""

    return list(PRODUCT_CATALOG)


def get_product_by_id(product_id: str) -> ProductResponse:
    """Fetch one catalog product by its stable identifier."""

    normalized_product_id = product_id.strip()
    for product in PRODUCT_CATALOG:
        if product.id == normalized_product_id:
            return product

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Product '{normalized_product_id}' was not found.",
    )
