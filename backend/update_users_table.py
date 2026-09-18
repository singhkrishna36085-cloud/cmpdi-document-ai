"""
Database Migration Script — User Model Schema Update
Removes legacy constraints using unified app.database.
"""

import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal


async def migrate_users_table():
    print("Connecting to PostgreSQL database via unified AsyncSessionLocal...")
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;"))
            await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR;"))
            await session.commit()
            print("[SUCCESS] Legacy constraint update completed successfully!")
        except Exception as exc:
            await session.rollback()
            print(f"[ERROR] Migration failed: {exc}")


if __name__ == "__main__":
    asyncio.run(migrate_users_table())
