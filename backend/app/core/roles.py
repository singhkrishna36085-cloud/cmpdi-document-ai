"""
Role-Based Access Control (RBAC) Core Architecture (STEP 13.1)
Defines central user roles (NORMAL_USER, HOD) and permission definitions for CMPDI Document AI.
"""

from enum import Enum
from typing import List, Dict, Set


class UserRole(str, Enum):
    NORMAL_USER = "NORMAL_USER"
    HOD = "HOD"


# ── Permission Definitions ───────────────────────────────────────────────────
# Central permission matrix mapping roles to allowed operations.
ROLE_PERMISSIONS: Dict[UserRole, Set[str]] = {
    UserRole.NORMAL_USER: {
        "doc:read_nonsensitive",
        "search:execute",
        "assistant:query",
        "reports:read_permitted",
    },
    UserRole.HOD: {
        "doc:read_all",
        "doc:read_confidential",
        "reports:read_all",
        "reports:generate",
        "validation:read_all",
        "audit:read_all",
        "analytics:read_all",
        "users:admin",
        "processing:read_all",
        "doc:read_nonsensitive",
        "search:execute",
        "assistant:query",
        "reports:read_permitted",
    },
}


def has_permission(role: str, permission: str) -> bool:
    """
    Utility function to check if a given user role possesses a specific permission string.
    """
    if not role or not permission:
        return False
    try:
        role_enum = UserRole(role)
        allowed_perms = ROLE_PERMISSIONS.get(role_enum, set())
        return permission in allowed_perms
    except ValueError:
        return False
