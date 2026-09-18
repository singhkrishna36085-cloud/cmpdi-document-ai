"""
FastAPI Authentication & RBAC Dependencies (STEP 13.3 & STEP 13.4)
Provides get_current_user, require_role, require_hod, and get_optional_user dependencies
for authenticating Bearer JWT tokens and enforcing role permissions (NORMAL_USER vs HOD).
"""

import logging
from typing import Optional, List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.core.jwt import decode_access_token
from app.core.roles import UserRole

logger = logging.getLogger("dependencies")

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency for authenticating Bearer JWT tokens:
    1. Extracts token from Authorization: Bearer <token> header.
    2. Decodes & verifies JWT signature & expiry.
    3. Extracts user_id from token payload.
    4. Fetches User record from PostgreSQL database.
    5. Confirms user exists and is_active is True.
    Raises HTTP 401 Unauthorized if any check fails.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not auth or not auth.credentials:
        raise credentials_exception

    token = auth.credentials
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id_str = payload.get("sub")
    if not user_id_str or not str(user_id_str).isdigit():
        raise credentials_exception

    user_id = int(user_id_str)

    # Query PostgreSQL database for user
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        logger.warning(f"Authentication failed: User ID {user_id} not found in database.")
        raise credentials_exception

    if not user.is_active:
        logger.warning(f"Authentication failed: User ID {user_id} is inactive.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled. Please contact system administrator.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication dependency:
    Returns User object if a valid JWT Bearer header is provided, or None if unauthenticated.
    Does not raise HTTP 401 on missing/invalid token.
    """
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_access_token(auth.credentials)
        if not payload:
            return None
        user_id_str = payload.get("sub")
        if not user_id_str or not str(user_id_str).isdigit():
            return None
        user_id = int(user_id_str)
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if user and user.is_active:
            return user
    except Exception as exc:
        logger.debug(f"Optional user authentication failed: {exc}")
    return None


def require_role(allowed_roles: List[UserRole]) -> Callable:
    """
    Dependency factory that checks if the authenticated current_user has one of the allowed_roles.
    Raises HTTP 403 Forbidden if user lacks required role.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role
        allowed_str = [r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles]
        if user_role not in allowed_str:
            logger.warning(f"Access denied: User '{current_user.username}' with role '{user_role}' attempted role-restricted operation.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. Access restricted to authorized roles."
            )
        return current_user

    return role_checker


# Reusable dependency requiring HOD role
require_hod = require_role([UserRole.HOD])
require_authenticated_user = get_current_user


async def get_allowed_document_ids(db: AsyncSession, user: Optional[User]) -> Optional[set]:
    """
    Returns set of document IDs allowed for the given user, or None if user has full access (HOD).
    - HOD -> None (all document IDs allowed)
    - NORMAL_USER or unauthenticated -> set of non-confidential document IDs
    """
    if user and (user.role == "HOD" or user.role == UserRole.HOD.value):
        return None
    try:
        from app.models import Document
        from sqlalchemy import or_
        res = await db.execute(select(Document.id).where(or_(Document.is_confidential == False, Document.is_confidential.is_(None))))
        return set(res.scalars().all())
    except Exception as exc:
        logger.warning(f"Note on allowed document IDs: {exc}")
        return None

