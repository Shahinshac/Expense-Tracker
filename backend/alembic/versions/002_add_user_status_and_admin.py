"""Add status and is_admin to users and migrate existing users to APPROVED

Revision ID: 002_add_user_status_and_admin
Revises: 001_initial_schema
Create Date: 2026-09-17 21:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_user_status_and_admin'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False))
        batch_op.add_column(sa.Column('is_admin', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    # Migrate all existing users to APPROVED so existing users are never locked out
    op.execute("UPDATE users SET status = 'APPROVED'")


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_admin')
        batch_op.drop_column('status')
