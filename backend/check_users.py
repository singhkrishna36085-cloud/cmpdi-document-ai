import asyncio
from app.database import AsyncSessionLocal
from app.models import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"ID: {u.id}, Username: '{u.username}', Email: '{u.email}', Role: '{u.role}', Active: {u.is_active}")

if __name__ == "__main__":
    asyncio.run(main())
