import asyncio
import logging
from sqlalchemy import select, delete, or_
from app.database import AsyncSessionLocal
from app.models import Document, DocumentChunk, StructuredExtraction, ValidationResult, DocumentConflict, Report, TopicAnalysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cleanup_step15")

async def cleanup_step15():
    async with AsyncSessionLocal() as session:
        # 1. Identify Step 15 test documents (ID >= 28 or filename CIL_Q1_2026)
        res = await session.execute(
            select(Document).where(
                or_(
                    Document.id >= 28,
                    Document.original_filename.ilike("%CIL_Q1_2026%")
                )
            )
        )
        target_docs = res.scalars().all()
        target_ids = [d.id for d in target_docs]
        
        logger.info(f"Targeting Step 15 test document IDs for cleanup: {target_ids}")
        
        if not target_ids:
            logger.info("No test documents to clean up.")
            return

        # Delete extractions
        del_ext = await session.execute(delete(StructuredExtraction).where(StructuredExtraction.document_id.in_(target_ids)))
        logger.info(f"Deleted {del_ext.rowcount} structured extractions.")

        # Delete chunks
        del_chunks = await session.execute(delete(DocumentChunk).where(DocumentChunk.document_id.in_(target_ids)))
        logger.info(f"Deleted {del_chunks.rowcount} document chunks.")

        # Delete validation results
        del_val = await session.execute(delete(ValidationResult).where(ValidationResult.document_id.in_(target_ids)))
        logger.info(f"Deleted {del_val.rowcount} validation results.")

        # Delete conflicts
        del_conf = await session.execute(
            delete(DocumentConflict).where(
                or_(
                    DocumentConflict.doc_a_id.in_(target_ids),
                    DocumentConflict.doc_b_id.in_(target_ids)
                )
            )
        )
        logger.info(f"Deleted {del_conf.rowcount} document conflicts.")

        # Delete documents
        del_docs = await session.execute(delete(Document).where(Document.id.in_(target_ids)))
        logger.info(f"Deleted {del_docs.rowcount} document records.")

        await session.commit()
        logger.info("Database cleanup completed successfully.")

if __name__ == "__main__":
    asyncio.run(cleanup_step15())
