"""Background scheduler that advances pending orders automatically."""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.db.models import Order, OrderStatus
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def promote_pending_orders() -> None:
    """Move pending orders into processing on the configured interval."""

    db = SessionLocal()
    try:
        # The scheduler only performs the simple automated transition required
        # by the assignment and leaves later stages to explicit handlers.
        pending_orders = db.scalars(
            select(Order).where(Order.status == OrderStatus.PENDING)
        ).all()

        for order in pending_orders:
            order.status = OrderStatus.PROCESSING
            order.status_updated_at = datetime.now(timezone.utc)

        if pending_orders:
            db.commit()
            logger.info("Promoted %s pending orders to processing.", len(pending_orders))
    except Exception:
        db.rollback()
        logger.exception("Order status scheduler failed.")
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the order-status scheduler exactly once per process."""

    if scheduler.running:
        return
    scheduler.add_job(
        promote_pending_orders,
        IntervalTrigger(minutes=5),
        id="promote_pending_orders",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    """Stop the order-status scheduler during application shutdown."""

    if scheduler.running:
        scheduler.shutdown(wait=False)
