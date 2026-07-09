"""Payment-domain logic for simulated checkout completion."""

from __future__ import annotations

import secrets

from sqlalchemy.orm import Session

from app.db.models import User
from app.schemas.order import OrderCreate, OrderItemCreate, OrderResponse
from app.schemas.payment import CheckoutCreate, CheckoutResponse
from app.services.orders import create_order_for_user
from app.services.products import get_product_by_id


def checkout_order_for_user(db: Session, user: User, payload: CheckoutCreate) -> CheckoutResponse:
    """Validate bag items against the catalog and create the final order."""

    order_items: list[OrderItemCreate] = []
    for item in payload.items:
        product = get_product_by_id(item.product_id)
        order_items.append(
            OrderItemCreate(
                product_name=product.name,
                sku=product.sku,
                quantity=item.quantity,
                unit_price=product.price,
            )
        )

    order_payload = OrderCreate(
        items=order_items,
        notes=payload.notes,
    )
    order = create_order_for_user(db=db, user=user, payload=order_payload)

    return CheckoutResponse(
        payment_reference=f"PAY-{secrets.token_hex(6).upper()}",
        total_amount=order.total_amount,
        order=OrderResponse.model_validate(order),
    )
