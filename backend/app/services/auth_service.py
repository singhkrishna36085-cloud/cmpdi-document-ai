"""
Authentication Service Layer (STEP 13.2)
Handles database lookup by username or email, bcrypt password validation, and active status checks.
Uses security utilities from app.core.security.
"""

import logging
from typing import Tuple, Optional
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.core.security import verify_password

logger = logging.getLogger("auth_service")


async def authenticate_user(
    db: AsyncSession, 
    username_or_email: str, 
    password: str
) -> Tuple[bool, str, Optional[User]]:
    """
    Authenticates a user against PostgreSQL database:
    1. Trims and validates input parameters.
    2. Searches for User by username OR email (case-insensitive).
    3. Verifies bcrypt password hash securely.
    4. Checks if the account is active.
    Returns (success: bool, message: str, user: User | None).
    Uses generic error messages to prevent username/email enumeration.
    """
    if not username_or_email or not username_or_email.strip() or not password or not password.strip():
        return False, "Invalid username or password.", None

    identifier = username_or_email.strip().lower()

    # Search for user by username or email
    stmt = select(User).where(
        or_(
            func.lower(User.username) == identifier,
            func.lower(User.email) == identifier
        )
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        logger.warning(f"Login failed: Identifier '{identifier}' not found in database.")
        return False, "Invalid username or password.", None

    # Verify bcrypt password hash
    if not verify_password(password.strip(), user.password_hash):
        logger.warning(f"Login failed: Password verification failed for user '{user.username}'.")
        return False, "Invalid username or password.", None

    # Verify account active status
    if not user.is_active:
        logger.warning(f"Login failed: User account '{user.username}' is disabled.")
        return False, "Account is disabled. Please contact system administrator.", None

    logger.info(f"User '{user.username}' authenticated successfully.")
    return True, "Authentication successful.", user
