"""
Authentication Pydantic Schemas (STEP 13.2 & STEP 13.3)
Defines LoginRequest and LoginResponse validation models.
Ensures zero exposure of password, password_hash, or secrets.
"""

from pydantic import BaseModel, Field
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Username or Email address")
    password: str = Field(..., min_length=1, description="Account password")


class LoginResponse(BaseModel):
    status: str = Field(default="success", description="Authentication outcome status")
    message: str = Field(default="Authentication successful", description="Status detail message")
    access_token: str = Field(..., description="JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token type (bearer)")
    user: UserResponse = Field(..., description="Authenticated user metadata")
