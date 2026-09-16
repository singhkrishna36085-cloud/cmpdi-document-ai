"""
User Administration API Router (STEP 13.4)
GET /api/users — List all user accounts (HOD only)
GET /api/users/{user_id} — Get details for a specific user (HOD only)
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas.user import UserResponse
from app.core.dependencies import require_hod

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get(
    "",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List all user accounts in the organization (HOD only)"
)
async def list_users_endpoint(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_hod)
):
    """
    Returns list of all user accounts.
    Protected endpoint restricted to HOD role.
    """
    res = await db.execute(select(User).order_by(User.id))
    users = res.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user account details by ID (HOD only)"
)
async def get_user_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_hod)
):
    """
    Returns user details for a specific user ID.
    Protected endpoint restricted to HOD role.
    """
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User ID {user_id} not found."
        )
    return UserResponse.model_validate(user)
