import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.models import AuditLog

logger = logging.getLogger("audit_service")

SENSITIVE_KEYS = {"password", "password_hash", "token", "access_token", "jwt", "api_key", "secret", "authorization", "bearer"}

def sanitize_metadata(data: Any) -> Optional[str]:
    """Sanitizes metadata dictionary to ensure secrets are never stored in audit logs."""
    if data is None:
        return None
    if isinstance(data, str):
        # Quick check for potential token strings or JSON
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                data = parsed
            else:
                return data
        except Exception:
            return data

    if isinstance(data, dict):
        clean_dict = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                clean_dict[k] = "[REDACTED_SECRET]"
            elif isinstance(v, dict):
                clean_dict[k] = json.loads(sanitize_metadata(v) or "{}")
            else:
                clean_dict[k] = v
        return json.dumps(clean_dict, default=str)
    
    return str(data)

async def ensure_audit_schema(db: AsyncSession):
    """Safely adds missing columns and indexes to the existing audit_logs table if required."""
    statements = [
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS username VARCHAR;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id INTEGER;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS document_id INTEGER;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS report_id INTEGER;",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'SUCCESS';",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR;",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs (resource_type);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs (status);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs (document_id);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_report_id ON audit_logs (report_id);",
        "ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'OPEN';",
        "ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS reviewed_by_id INTEGER;",
        "ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;",
        "ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS review_note TEXT;",
        "CREATE INDEX IF NOT EXISTS idx_val_results_status ON validation_results (status);",
        "CREATE INDEX IF NOT EXISTS idx_val_results_severity ON validation_results (severity);",
        "CREATE INDEX IF NOT EXISTS idx_val_results_rule_type ON validation_results (rule_type);"
    ]
    for stmt in statements:
        try:
            await db.execute(text(stmt))
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.warning(f"Audit schema migration statement warning: {e}")

async def log_audit_event(
    db: AsyncSession,
    action: str,
    user: Optional[Any] = None,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    user_role: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    document_id: Optional[int] = None,
    report_id: Optional[int] = None,
    status: str = "SUCCESS",
    details: Optional[Union[str, Dict[str, Any]]] = None,
    ip_address: Optional[str] = None,
) -> Optional[AuditLog]:
    """
    Centralized, fail-safe audit logging function.
    Fails safely so database audit issues never break primary business operations.
    """
    try:
        # Extract user info if user model is supplied
        if user:
            eff_user_id = user_id or getattr(user, "id", None)
            eff_username = username or getattr(user, "username", None)
            eff_user_role = user_role or getattr(user, "role", None)
        else:
            eff_user_id = user_id
            eff_username = username
            eff_user_role = user_role

        # Sanitize details string / JSON
        clean_details = sanitize_metadata(details)

        audit_entry = AuditLog(
            user_id=eff_user_id,
            username=eff_username,
            user_role=eff_user_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            document_id=document_id,
            report_id=report_id,
            status=status,
            ip_address=ip_address,
            timestamp=datetime.utcnow(),
            details=clean_details
        )

        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        return audit_entry

    except Exception as exc:
        logger.error(f"Failed to record audit event '{action}': {exc}", exc_info=True)
        try:
            await db.rollback()
        except Exception:
            pass
        return None
