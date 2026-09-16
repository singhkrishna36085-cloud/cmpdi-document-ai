"""
JWT Token Service (STEP 13.3)
Generates and decodes signed JWT access tokens for user authentication.
Ensures zero exposure of passwords, password hashes, or API secrets inside JWT payload.
"""

import jwt
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from app.core.config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

logger = logging.getLogger("jwt_service")


def create_access_token(user_id: int, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a signed JWT access token containing only minimal identity claims:
    - sub: user_id (string)
    - role: assigned RBAC role
    - exp: expiration timestamp
    - iat: issued-at timestamp
    NEVER includes passwords, password hashes, secrets, or document data inside JWT.
    """
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "role": str(role),
        "exp": expire,
        "iat": now,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT access token using the system secret & algorithm.
    Returns payload dict if valid, None if expired, malformed, or invalid signature.
    """
    if not token or not token.strip():
        return None
    try:
        payload = jwt.decode(token.strip(), JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT verification failed: Token has expired.")
        return None
    except jwt.PyJWTError as exc:
        logger.warning(f"JWT verification failed: {exc}")
        return None
