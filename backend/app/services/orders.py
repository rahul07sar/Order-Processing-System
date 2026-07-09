from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Order, OrderItem, OrderStatus, User, UserRole
from app.schemas.order import OrderCreate

MONEY_QUANTUM = Decimal("0.01")
ALLOWED_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def _order_query():
    return select(Order).options(selectinload(Order.items))


def create_order_for_user(db: Session, user: User, payload: OrderCreate) -> Order:
    order = Order(user_id=user.id, status=OrderStatus.PENDING, total_amount=Decimal("0.00"))
    order.notes = payload.notes

    total_amount = Decimal("0.00")
    for item in payload.items:
        unit_price = _round_money(item.unit_price)
        line_total = _round_money(unit_price * item.quantity)
        total_amount += line_total
        order.items.append(
            OrderItem(
                product_name=item.product_name,
                sku=item.sku,
                quantity=item.quantity,
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    order.total_amount = _round_money(total_amount)
    db.add(order)
    db.commit()
    return get_order_for_user(db=db, order_id=order.id, user=user)


def list_orders_for_user(
    db: Session,
    user: User,
    status_filter: Optional[OrderStatus],
) -> list[Order]:
    query = _order_query().order_by(Order.created_at.desc())
    if user.role != UserRole.ADMIN:
        query = query.where(Order.user_id == user.id)
    if status_filter is not None:
        query = query.where(Order.status == status_filter)
    return list(db.scalars(query).unique())


def get_order_for_user(db: Session, order_id: UUID, user: User) -> Order:
    order = db.scalar(_order_query().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if user.role != UserRole.ADMIN and order.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this order.",
        )
    return order


def cancel_order_for_user(db: Session, order_id: UUID, user: User) -> Order:
    order = get_order_for_user(db=db, order_id=order_id, user=user)
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending orders can be cancelled.",
        )

    now = datetime.now(timezone.utc)
    order.status = OrderStatus.CANCELLED
    order.cancelled_at = now
    order.status_updated_at = now
    db.commit()
    return get_order_for_user(db=db, order_id=order_id, user=user)


def update_order_status(db: Session, order_id: UUID, next_status: OrderStatus) -> Order:
    order = db.scalar(_order_query().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if next_status == order.status:
        return order

    allowed_next_statuses = ALLOWED_STATUS_TRANSITIONS[order.status]
    if next_status not in allowed_next_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition order from {order.status.value} to {next_status.value}.",
        )

    order.status = next_status
    order.status_updated_at = datetime.now(timezone.utc)
    if next_status == OrderStatus.CANCELLED:
        order.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    return order
