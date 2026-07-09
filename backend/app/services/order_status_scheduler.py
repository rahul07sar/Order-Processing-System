import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def promote_pending_orders() -> None:
    # This hook will execute the real status transition query once models are added.
    logger.info("Order status scheduler tick executed.")


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
