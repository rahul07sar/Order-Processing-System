"""Order routes for customer and admin operations."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user
from app.db.models import OrderStatus, User
from app.db.session import get_db
from app.schemas.order import (
    OrderCreate,
    OrderListResponse,
    OrderResponse,
    OrderStatusUpdate,
)
from app.services.orders import (
    cancel_order_for_user,
    create_order_for_user,
    get_order_for_user,
    list_orders_for_user,
    return_order_for_user,
    update_order_status,
)

router = APIRouter()


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """Create a new order for the authenticated user."""

    order = create_order_for_user(db=db, user=current_user, payload=payload)
    return OrderResponse.model_validate(order)


@router.get("", response_model=OrderListResponse)
def list_orders(
    status_filter: Optional[OrderStatus] = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderListResponse:
    """List orders, optionally filtered by status."""

    orders = list_orders_for_user(db=db, user=current_user, status_filter=status_filter)
    return OrderListResponse(items=[OrderResponse.model_validate(order) for order in orders])


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """Fetch a single order visible to the current user."""

    order = get_order_for_user(db=db, order_id=order_id, user=current_user)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """Cancel a pending order owned by the current user."""

    order = cancel_order_for_user(db=db, order_id=order_id, user=current_user)
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/return", response_model=OrderResponse)
def return_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """Allow a customer to mark a delivered order as returned."""

    order = return_order_for_user(db=db, order_id=order_id, user=current_user)
    return OrderResponse.model_validate(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def patch_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> OrderResponse:
    """Allow an admin to advance an order through its workflow."""

    order = update_order_status(db=db, order_id=order_id, next_status=payload.status)
    return OrderResponse.model_validate(order)
