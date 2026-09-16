import asyncio
from app.database import AsyncSessionLocal
from app.models import Document
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Document).order_by(Document.id.desc()).limit(1))
        doc = res.scalar_one_or_none()
        if doc:
            doc.is_confidential = True
            await db.commit()
            print(f"Set Document ID {doc.id} ('{doc.name}') as confidential.")
        else:
            print("No documents found in DB.")

if __name__ == "__main__":
    asyncio.run(main())
