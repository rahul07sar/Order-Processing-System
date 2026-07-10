"""Background scheduler that advances order statuses automatically."""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.db.models import Order, OrderStatus
from app.db.session import SessionLocal
from app.services.orders import synchronize_automatic_order_statuses

logger = logging.getLogger(__name__)

SCHEDULER_POLL_INTERVAL_MINUTES = 1

# Coalescing prevents stacked runs after pauses or reloads, and max_instances
# keeps a single scheduler tick from overlapping with the next one.
scheduler = AsyncIOScheduler(job_defaults={"coalesce": True, "max_instances": 1})
AUTOMATED_STATUSES = (
    OrderStatus.PENDING,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
)


async def advance_order_statuses() -> None:
    """Advance eligible orders based on each order's own elapsed timeline."""

    db = SessionLocal()
    try:
        active_orders = db.scalars(select(Order).where(Order.status.in_(AUTOMATED_STATUSES))).all()
        if synchronize_automatic_order_statuses(db=db, orders=active_orders):
            logger.info("Automatically advanced one or more orders to the next status.")
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
        advance_order_statuses,
        IntervalTrigger(minutes=SCHEDULER_POLL_INTERVAL_MINUTES),
        id="advance_order_statuses",
        next_run_time=datetime.now(timezone.utc),
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    """Stop the order-status scheduler during application shutdown."""

    if scheduler.running:
        scheduler.shutdown(wait=False)
