"""
Authentication API Router (STEP 13.2 & STEP 13.3)
POST /api/auth/login — Authenticates users and generates signed JWT access token.
GET  /api/auth/me    — Returns profile metadata of currently authenticated user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.user import UserResponse
from app.services.auth_service import authenticate_user
from app.core.jwt import create_access_token
from app.core.dependencies import get_current_user

from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user credentials & issue JWT access token"
)
async def login_endpoint(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticates user via username/email and password:
    1. Validates request payload.
    2. Searches PostgreSQL User records for matching username or email.
    3. Verifies bcrypt password hash.
    4. Confirms user active status.
    5. Issues signed JWT access token.
    6. Returns safe UserResponse metadata (password_hash is strictly omitted).
    """
    success, message, user = await authenticate_user(db, req.username, req.password)

    if not success or not user:
        await log_audit_event(
            db,
            action="LOGIN_FAILED",
            username=req.username,
            resource_type="AUTH",
            status="FAILURE",
            details={"username": req.username, "reason": message}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message,
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Issue signed JWT access token
    token = create_access_token(user_id=user.id, role=user.role)

    await log_audit_event(
        db,
        action="LOGIN_SUCCESS",
        user=user,
        resource_type="AUTH",
        resource_id=user.id,
        status="SUCCESS",
        details={"username": user.username, "role": user.role}
    )

    return LoginResponse(
        status="success",
        message="Authentication successful",
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile"
)
async def get_current_user_profile_endpoint(current_user: User = Depends(get_current_user)):
    """
    Protected endpoint requiring Bearer JWT authentication.
    Returns the authenticated user's safe profile metadata.
    Does not expose password, password_hash, or secrets.
    """
    return UserResponse.model_validate(current_user)
