"""
Database Migration Script — Document Confidentiality & RBAC Field Update
Safely adds 'is_confidential' column to 'documents' table using unified app.database.
"""

import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal


async def update_documents_table():
    print("Connecting to PostgreSQL database via unified AsyncSessionLocal...")
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT FALSE;"))
            await session.execute(text("UPDATE documents SET is_confidential = FALSE WHERE is_confidential IS NULL;"))
            await session.commit()
            print("[SUCCESS] Documents confidentiality migration completed successfully!")
        except Exception as exc:
            await session.rollback()
            print(f"[ERROR] Migration failed: {exc}")


if __name__ == "__main__":
    asyncio.run(update_documents_table())
