"""Alter chat_messages content column to Text

Revision ID: a78b9c1d2e3f
Revises: d675b5d4a7e3
Create Date: 2026-08-07 20:53:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a78b9c1d2e3f'
down_revision: Union[str, None] = 'd675b5d4a7e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('chat_messages', 'content',
               existing_type=sa.VARCHAR(length=1000),
               type_=sa.Text(),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('chat_messages', 'content',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(length=1000),
               existing_nullable=False)
