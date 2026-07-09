"""FastAPI application entrypoint for the order processing backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.init_db import seed_bootstrap_admin
from app.services.order_status_scheduler import stop_scheduler, start_scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Run startup and shutdown hooks around the application lifecycle."""

    # Seed-only startup tasks are safe here because schema creation itself is
    # owned by explicit Alembic migrations.
    seed_bootstrap_admin()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Cross-origin access is limited to configured frontend origins so browser
# clients can call the API without opening it broadly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)
