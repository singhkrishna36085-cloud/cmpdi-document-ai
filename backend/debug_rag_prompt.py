import sys
import json
from app.services.rag_service import retrieve_rag_context
from app.services.llm_service import generate_llm_answer, SYSTEM_PROMPT

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

query = "coal production"
ret = retrieve_rag_context(query, top_k=3)
chunks = ret.get("retrieved_chunks", [])
fmt_context = ret.get("formatted_context", "")

print("=== RETRIEVED CHUNKS ===")
for i, c in enumerate(chunks, 1):
    print(f"\n--- Chunk {i} ({c.get('original_filename')}, DocID: {c.get('document_id')}) ---")
    print(c.get("content"))

print("\n=== FORMATTED CONTEXT ===")
print(fmt_context)

res = generate_llm_answer(query, fmt_context, provider="groq", model="openai/gpt-oss-20b")
print("\n=== LLM RESPONSE ===")
print("Status:", res.get("status"))
print("Answer:\n", res.get("answer"))
