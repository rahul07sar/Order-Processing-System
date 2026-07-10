"""Order-domain business logic used by API handlers and background jobs."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Order, OrderItem, OrderStatus, User, UserRole
from app.schemas.order import OrderCreate

MONEY_QUANTUM = Decimal("0.01")
STATUS_ADVANCE_INTERVAL = timedelta(minutes=5)

# Status transitions are intentionally constrained so invalid jumps are rejected
# before they reach persistence.
ALLOWED_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: {OrderStatus.RETURNED},
    OrderStatus.RETURNED: set(),
    OrderStatus.CANCELLED: set(),
}

AUTOMATED_STATUS_TRANSITIONS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.PENDING: OrderStatus.PROCESSING,
    OrderStatus.PROCESSING: OrderStatus.SHIPPED,
    OrderStatus.SHIPPED: OrderStatus.DELIVERED,
}


def _round_money(value: Decimal) -> Decimal:
    """Normalize monetary values to two decimal places."""

    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def _order_query():
    """Base query that eagerly loads order items for API responses."""

    return select(Order).options(selectinload(Order.items))


def _coerce_utc(timestamp: datetime) -> datetime:
    """Normalize database timestamps so elapsed-time math stays reliable."""

    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def synchronize_automatic_order_statuses(
    db: Session,
    orders: Iterable[Order],
    *,
    now: Optional[datetime] = None,
) -> bool:
    """Advance orders through their timed lifecycle based on elapsed five-minute windows."""

    current_time = _coerce_utc(now or datetime.now(timezone.utc))
    changed = False

    for order in orders:
        last_transition_at = _coerce_utc(order.status_updated_at)
        next_status = AUTOMATED_STATUS_TRANSITIONS.get(order.status)
        order_changed = False

        while next_status is not None and last_transition_at + STATUS_ADVANCE_INTERVAL <= current_time:
            order.status = next_status
            last_transition_at += STATUS_ADVANCE_INTERVAL
            next_status = AUTOMATED_STATUS_TRANSITIONS.get(order.status)
            order_changed = True
            changed = True

        if order_changed:
            order.status_updated_at = last_transition_at

    if changed:
        db.commit()

    return changed


def create_order_for_user(db: Session, user: User, payload: OrderCreate) -> Order:
    """Create an order and compute its totals server-side."""

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
    """List orders visible to the current user or admin."""

    query = _order_query().order_by(Order.created_at.desc())
    if user.role != UserRole.ADMIN:
        query = query.where(Order.user_id == user.id)
    orders = list(db.scalars(query).unique())
    synchronize_automatic_order_statuses(db=db, orders=orders)

    if status_filter is None:
        return orders

    return [order for order in orders if order.status == status_filter]


def get_order_for_user(db: Session, order_id: UUID, user: User) -> Order:
    """Fetch one order while enforcing ownership rules."""

    order = db.scalar(_order_query().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if user.role != UserRole.ADMIN and order.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this order.",
        )
    synchronize_automatic_order_statuses(db=db, orders=[order])
    return order


def cancel_order_for_user(db: Session, order_id: UUID, user: User) -> Order:
    """Cancel a pending order owned by the current user."""

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


def return_order_for_user(db: Session, order_id: UUID, user: User) -> Order:
    """Mark a delivered order as returned for the authenticated owner."""

    order = get_order_for_user(db=db, order_id=order_id, user=user)
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only delivered orders can be returned.",
        )

    order.status = OrderStatus.RETURNED
    order.status_updated_at = datetime.now(timezone.utc)
    db.commit()
    return get_order_for_user(db=db, order_id=order_id, user=user)


def update_order_status(db: Session, order_id: UUID, next_status: OrderStatus) -> Order:
    """Update an order status while respecting allowed transitions."""

    order = db.scalar(_order_query().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    synchronize_automatic_order_statuses(db=db, orders=[order])

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
