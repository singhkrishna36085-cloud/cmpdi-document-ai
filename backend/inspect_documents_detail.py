import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Document, StructuredExtraction, DocumentChunk

async def inspect_detail():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Document).order_by(Document.id))
        docs = res.scalars().all()
        print(f"Total Documents in DB: {len(docs)}\n")
        print(f"{'ID':<5} | {'Filename':<45} | {'Type':<12} | {'Category':<18} | {'Status':<10} | {'Created At'}")
        print("-" * 110)
        
        step15_doc_ids = []
        pre_step15_doc_ids = []
        
        for d in docs:
            fn = d.original_filename or ""
            dtype = (d.type or "").lower()
            dcat = d.category or ""
            dstat = d.processing_status or ""
            
            # Step 15 test documents: filename contains CIL_Q1_2026 or uploaded during step 15 (ID >= 28)
            is_step15 = "cil_q1_2026_mine_operations_report" in fn.lower() or d.id >= 28
            if is_step15:
                step15_doc_ids.append(d.id)
            else:
                pre_step15_doc_ids.append(d.id)
                
            print(f"{d.id:<5} | {fn:<45} | {dtype:<12} | {dcat:<18} | {dstat:<10} | {d.created_at}")
            
        print("\n" + "="*80)
        print(f"Pre-Step-15 Documents to PRESERVE ({len(pre_step15_doc_ids)}): {pre_step15_doc_ids}")
        print(f"Step-15 Test Documents to CLEANUP/QUARANTINE ({len(step15_doc_ids)}): {step15_doc_ids}")
        print("="*80)

if __name__ == "__main__":
    asyncio.run(inspect_detail())
