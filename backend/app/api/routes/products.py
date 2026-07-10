"""Product catalog routes for storefront clients."""

from fastapi import APIRouter

from app.schemas.product import ProductListResponse
from app.services.products import list_products

router = APIRouter()


@router.get("", response_model=ProductListResponse)
def get_products() -> ProductListResponse:
    """Return the current storefront product catalog."""

    return ProductListResponse(items=list_products())
