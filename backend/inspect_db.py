import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Document, StructuredExtraction, DocumentChunk

async def inspect_db():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Document).order_by(Document.id))
        docs = res.scalars().all()
        print(f"Total Documents in DB: {len(docs)}")
        for d in docs:
            print(f"Doc #{d.id}: filename='{d.original_filename}', type='{d.type}', category='{d.category}', status='{d.processing_status}'")
            
        ext_res = await session.execute(select(StructuredExtraction).order_by(StructuredExtraction.id))
        exts = ext_res.scalars().all()
        print(f"\nTotal Extractions in DB: {len(exts)}")
        for e in exts:
            print(f"Ext #{e.id}: doc_id={e.document_id}, entity='{e.entity_type}', data={e.data[:100]}...")

if __name__ == "__main__":
    asyncio.run(inspect_db())
