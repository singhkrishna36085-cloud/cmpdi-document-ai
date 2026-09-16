"""
Security & Password Hashing Core Utility (STEP 13.1)
Provides secure bcrypt password hashing and verification methods for CMPDI Document AI.
Does not log passwords or expose plaintext credentials.
"""

import logging
import bcrypt

logger = logging.getLogger("security")


def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using bcrypt.gensalt().
    Raises ValueError if password is empty or whitespace.
    """
    if not password or not password.strip():
        raise ValueError("Password cannot be empty or whitespace.")
    
    # Enforce bcrypt 72-byte max length limit safely if required
    pwd_bytes = password.strip().encode("utf-8")
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]
        
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verifies a plaintext password against a stored bcrypt hash.
    Returns True if matching, False otherwise.
    """
    if not password or not password_hash:
        return False
    try:
        pwd_bytes = password.strip().encode("utf-8")
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
        hash_bytes = password_hash.strip().encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as exc:
        logger.error(f"Error verifying password hash: {exc}")
        return False
