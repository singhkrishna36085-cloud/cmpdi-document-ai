"""
Database Seeding Module
Ensures essential system administrative & standard user accounts exist on initial deployment.
"""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.core.security import hash_password
from app.core.roles import UserRole

logger = logging.getLogger("seed")

DEFAULT_ADMIN_USER = "cmpdi_admin"
DEFAULT_ADMIN_EMAIL = "admin@cmpdi.co.in"
DEFAULT_ADMIN_PASS = "CMPDI_Secure_Auth_2026!"

DEFAULT_NORMAL_USER = "normal_user"
DEFAULT_NORMAL_EMAIL = "normal@cmpdi.co.in"
DEFAULT_NORMAL_PASS = "CMPDI_Secure_Auth_2026!"


async def seed_initial_users(db: AsyncSession) -> None:
    """
    Checks if default system users exist in the database; if not, seeds them.
    Ensures that fresh cloud deployments are immediately functional.
    """
    try:
        # Check admin user
        stmt_admin = select(User).where((User.username == DEFAULT_ADMIN_USER) | (User.email == DEFAULT_ADMIN_EMAIL))
        res_admin = await db.execute(stmt_admin)
        admin = res_admin.scalar_one_or_none()

        if not admin:
            admin_hash = hash_password(DEFAULT_ADMIN_PASS)
            new_admin = User(
                username=DEFAULT_ADMIN_USER,
                email=DEFAULT_ADMIN_EMAIL,
                full_name="CMPDI HOD Administrator",
                password_hash=admin_hash,
                hashed_password=admin_hash,
                role=UserRole.HOD.value,
                is_active=True,
            )
            db.add(new_admin)
            logger.info(f"Seeded default administrator user '{DEFAULT_ADMIN_USER}'.")

        # Check standard user
        stmt_user = select(User).where((User.username == DEFAULT_NORMAL_USER) | (User.email == DEFAULT_NORMAL_EMAIL))
        res_user = await db.execute(stmt_user)
        normal = res_user.scalar_one_or_none()

        if not normal:
            user_hash = hash_password(DEFAULT_NORMAL_PASS)
            new_user = User(
                username=DEFAULT_NORMAL_USER,
                email=DEFAULT_NORMAL_EMAIL,
                full_name="CMPDI Standard Analyst",
                password_hash=user_hash,
                hashed_password=user_hash,
                role=UserRole.NORMAL_USER.value,
                is_active=True,
            )
            db.add(new_user)
            logger.info(f"Seeded default standard user '{DEFAULT_NORMAL_USER}'.")

        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.warning(f"Note on initial seed: {exc}")
