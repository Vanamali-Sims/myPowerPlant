"""drop submissions table

The starter /api/submit endpoint exposed its sequential integer primary key in
the response body, which Security Plan S6.1 forbids and S13.3 lists as the
illustrative High-severity finding. The endpoint had no callers in the
frontend, so the route, model and table are removed rather than retrofitted.

Revision ID: 003_drop_submissions
Revises: 002_create_household_profiles
Create Date: 2026-09-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_drop_submissions"
down_revision: Union[str, Sequence[str], None] = "002_create_household_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("submissions")


def downgrade() -> None:
    op.create_table(
        "submissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
