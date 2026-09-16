"""
User Pydantic Schemas (STEP 13.1)
Defines request and response validation schemas for User entity.
Ensures password_hash is NEVER returned in public API responses.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.core.roles import UserRole


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Unique email address")
    full_name: Optional[str] = Field(default=None, description="Full name of user")
    role: UserRole = Field(default=UserRole.NORMAL_USER, description="Assigned RBAC role (NORMAL_USER or HOD)")
    is_active: bool = Field(default=True, description="Account active status")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Plaintext password for registration")


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
