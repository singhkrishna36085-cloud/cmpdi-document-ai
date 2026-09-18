import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        rows = res.fetchall()
        for r in rows:
            print(r[0])

if __name__ == '__main__':
    asyncio.run(main())
