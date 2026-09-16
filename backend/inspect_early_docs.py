import asyncio
import json
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Document, StructuredExtraction

async def inspect_early_docs():
    async with AsyncSessionLocal() as session:
        ext_res = await session.execute(
            select(StructuredExtraction).where(StructuredExtraction.document_id < 35)
        )
        exts = ext_res.scalars().all()
        print(f"Total Extractions for Docs < 35: {len(exts)}")
        for e in exts:
            p_data = json.loads(e.data) if isinstance(e.data, str) else e.data
            m_name = p_data.get("Mine_Name") or p_data.get("mine_name") or p_data.get("project") or p_data.get("period")
            print(f"Ext #{e.id} (Doc #{e.document_id}): entity='{e.entity_type}', mine='{m_name}'")

if __name__ == "__main__":
    asyncio.run(inspect_early_docs())
