"""Add RETURNED to the order status enum.

Revision ID: 20260710_0002
Revises: 20260709_0001
Create Date: 2026-07-10 12:30:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260710_0002"
down_revision = "20260709_0001"
branch_labels = None
depends_on = None


previous_order_status_enum = postgresql.ENUM(
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    name="order_status",
)

expanded_order_status_enum = postgresql.ENUM(
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "RETURNED",
    "CANCELLED",
    name="order_status",
)

legacy_order_status_enum = postgresql.ENUM(
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "RETURNED",
    "CANCELLED",
    name="order_status_old",
)


def upgrade() -> None:
    """Allow delivered orders to move into a returned state."""

    context = op.get_context()
    with context.autocommit_block():
        op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'RETURNED'")


def downgrade() -> None:
    """Recreate the enum without RETURNED after restoring returned rows."""

    op.execute("UPDATE orders SET status = 'DELIVERED' WHERE status = 'RETURNED'")

    bind = op.get_bind()
    op.execute("ALTER TYPE order_status RENAME TO order_status_old")
    previous_order_status_enum.create(bind, checkfirst=False)
    op.execute(
        sa.text(
            "ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::text::order_status"
        )
    )
    legacy_order_status_enum.drop(bind, checkfirst=False)
