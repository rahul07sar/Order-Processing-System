"""Top-level API router composition."""

from fastapi import APIRouter

from app.api.routes import auth, health, orders, payments, products

api_router = APIRouter()

# Public endpoint groups are attached here so the application can expose them
# under a single `/api` prefix from the main FastAPI app.
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
