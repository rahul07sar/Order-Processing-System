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
    db = SessionLocal()
    try:
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
    if scheduler.running:
        scheduler.shutdown(wait=False)
