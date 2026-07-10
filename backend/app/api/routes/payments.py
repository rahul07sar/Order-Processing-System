"""Payment and checkout routes."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.payment import CheckoutCreate, CheckoutResponse
from app.services.payments import checkout_order_for_user

router = APIRouter()


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    payload: CheckoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    """Simulate payment completion and persist the resulting order."""

    return checkout_order_for_user(db=db, user=current_user, payload=payload)
