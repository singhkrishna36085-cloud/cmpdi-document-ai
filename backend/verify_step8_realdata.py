"""
STEP 8 REAL-DATA VERIFICATION
Uses ONLY real document_chunks from PostgreSQL.
No synthetic data.

Run from backend/ with:
  .venv\\Scripts\\python.exe verify_step8_realdata.py
"""

import os
import sys
import json
import asyncio
import time

# Force UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

import psycopg2

DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "cmpdi")

SEP = "=" * 68

def section(title):
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)

def ok(msg):
    print(f"  [OK]    {msg}")

def info(msg):
    print(f"  [INFO]  {msg}")

def warn(msg):
    print(f"  [WARN]  {msg}")

def fail(msg):
    print(f"  [FAIL]  {msg}")


# ============================================================
# STEP 1: Connect to PostgreSQL and count real chunks
# ============================================================
section("1. COUNT REAL DOCUMENT CHUNKS IN POSTGRESQL")

try:
    conn = psycopg2.connect(
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
        host=DB_HOST, port=DB_PORT
    )
    cur = conn.cursor()
    ok(f"Connected to PostgreSQL: {DB_HOST}:{DB_PORT}/{DB_NAME}")
except Exception as e:
    fail(f"Cannot connect to PostgreSQL: {e}")
    sys.exit(1)

# Count documents
cur.execute("SELECT COUNT(*) FROM documents")
doc_count = cur.fetchone()[0]
info(f"Total documents in DB: {doc_count}")

# Count chunks
cur.execute("SELECT COUNT(*) FROM document_chunks")
total_chunks = cur.fetchone()[0]
info(f"Total document_chunks in DB: {total_chunks}")

if total_chunks == 0:
    fail("No real document chunks found in PostgreSQL. Cannot run real-data verification.")
    fail("Please upload at least one real document first via the UI or API.")
    sys.exit(1)

ok(f"Real chunks available for indexing: {total_chunks}")

# Show per-document chunk breakdown
cur.execute("""
    SELECT d.id, d.original_filename, d.processing_status, COUNT(dc.id) as chunk_count
    FROM documents d
    LEFT JOIN document_chunks dc ON dc.document_id = d.id
    GROUP BY d.id, d.original_filename, d.processing_status
    ORDER BY d.id
""")
rows = cur.fetchall()
print()
print(f"  {'DocID':<8} {'Filename':<40} {'Status':<15} {'Chunks':<8}")
print(f"  {'-'*8} {'-'*40} {'-'*15} {'-'*8}")
for doc_id, fname, status, ccount in rows:
    print(f"  {doc_id:<8} {str(fname):<40} {str(status):<15} {ccount:<8}")

# Fetch ALL real chunks with document metadata
cur.execute("""
    SELECT
        dc.id,
        dc.document_id,
        dc.page_number,
        dc.sheet_name,
        dc.chunk_type,
        dc.content,
        d.original_filename,
        d.name as document_name
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    ORDER BY dc.document_id, dc.id
""")
chunk_rows = cur.fetchall()

real_chunks = []
for row in chunk_rows:
    chunk_id, doc_id, page_num, sheet_name, chunk_type, content, orig_filename, doc_name = row
    if sheet_name:
        source_ref = f"Sheet: {sheet_name}"
    elif page_num:
        source_ref = f"Page {page_num}"
    else:
        source_ref = "Document text"
    real_chunks.append({
        "id": chunk_id,
        "document_id": doc_id,
        "original_filename": orig_filename,
        "document_name": doc_name,
        "page_number": page_num,
        "sheet_name": sheet_name,
        "chunk_type": chunk_type,
        "source_reference": source_ref,
        "content": content or ""
    })

info(f"Fetched {len(real_chunks)} real chunks from PostgreSQL")


# ============================================================
# STEP 2: Index real chunks into FAISS
# ============================================================
section("2. INDEX REAL CHUNKS INTO FAISS")

from app.services.vector_search import index_chunks, INDEX_PATH, METADATA_PATH

print(f"\n  Indexing {len(real_chunks)} real chunks...")
t0 = time.time()
result = index_chunks(real_chunks)
elapsed = time.time() - t0

if result.get("status") == "success":
    ok(f"Indexing complete in {elapsed:.1f}s")
    ok(f"Chunks indexed: {result['indexed_count']}")
    ok(f"Embedding dimension: {result['dimension']}")
    ok(f"FAISS index saved to: {result['index_path']}")
else:
    fail(f"Indexing returned unexpected status: {result}")
    sys.exit(1)


# ============================================================
# STEP 3: Confirm FAISS vector count matches real chunks
# ============================================================
section("3. CONFIRM FAISS VECTOR COUNT = REAL CHUNK COUNT")

import faiss as faiss_lib
import numpy as np

idx = faiss_lib.read_index(INDEX_PATH)
faiss_count = idx.ntotal
expected = len(real_chunks)

info(f"Real chunks from PostgreSQL : {expected}")
info(f"Vectors in FAISS index      : {faiss_count}")

if faiss_count == expected:
    ok(f"FAISS vector count matches real chunk count ({faiss_count})")
else:
    fail(f"Mismatch: expected {expected}, got {faiss_count}")


# ============================================================
# STEP 4: Run 3 semantic queries against real data
# ============================================================
section("4. SEMANTIC SEARCH QUERIES AGAINST REAL DATA")

from app.services.vector_search import search_knowledge_base

QUERIES = [
    ("coal production",          "Coal production output, targets, actuals"),
    ("borehole depth seam",      "Borehole depth and seam data"),
    ("geological coal seam",     "Geological/seam information"),
]

all_search_ok = True

for q_idx, (query, description) in enumerate(QUERIES, 1):
    print(f"\n  --- Query {q_idx}: \"{query}\" ({description}) ---")
    results = search_knowledge_base(query, top_k=3)
    total = results.get("total_results", 0)
    hits = results.get("results", [])

    if total == 0 or not hits:
        warn(f"No results returned for query '{query}'")
        all_search_ok = False
        continue

    ok(f"Returned {total} result(s)")

    for rank, r in enumerate(hits, 1):
        print(f"\n    Rank {rank}:")
        print(f"      relevance_score : {r.get('relevance_score')}")
        print(f"      document_id     : {r.get('document_id')}")
        print(f"      chunk_id        : {r.get('chunk_id')}")
        print(f"      original_file   : {r.get('original_filename')}")
        print(f"      page_number     : {r.get('page_number')}")
        print(f"      sheet_name      : {r.get('sheet_name')}")
        print(f"      source_ref      : {r.get('source_reference')}")
        print(f"      chunk_type      : {r.get('chunk_type')}")
        snippet = str(r.get("content", ""))[:120].replace("\n", " ")
        print(f"      content (120)   : {snippet}...")


# ============================================================
# STEP 5: Verify content belongs to real source document
# ============================================================
section("5. VERIFY CONTENT BELONGS TO REAL SOURCE DOCUMENT")

# Build a quick lookup from chunk_id -> DB content for verification
chunk_lookup = {c["id"]: c for c in real_chunks}

results_test = search_knowledge_base("coal production", top_k=5)
verified_count = 0
mismatch_count = 0

for r in results_test.get("results", []):
    chunk_id = r.get("chunk_id")
    returned_content = r.get("content", "").strip()
    db_chunk = chunk_lookup.get(chunk_id)

    if db_chunk is None:
        warn(f"chunk_id {chunk_id} not found in PostgreSQL fetch — possible real DB chunk outside synthetic test set")
        continue

    db_content = db_chunk.get("content", "").strip()

    if returned_content == db_content:
        ok(f"chunk_id={chunk_id}: returned content matches PostgreSQL record exactly")
        verified_count += 1
    else:
        fail(f"chunk_id={chunk_id}: content MISMATCH")
        print(f"    Returned : {returned_content[:80]}")
        print(f"    DB record: {db_content[:80]}")
        mismatch_count += 1

if verified_count > 0:
    ok(f"Content traceability verified: {verified_count} chunks matched exactly")
if mismatch_count > 0:
    fail(f"{mismatch_count} chunk(s) had content mismatch")


# ============================================================
# STEP 6: FAISS index reload persistence
# ============================================================
section("6. FAISS INDEX RELOAD PERSISTENCE VERIFICATION")

# Simulate reload: del the in-memory reference and reload from disk
del idx
idx2 = faiss_lib.read_index(INDEX_PATH)
reloaded_count = idx2.ntotal

info(f"FAISS index reloaded from disk: {INDEX_PATH}")
info(f"Vector count after reload: {reloaded_count}")

if reloaded_count == expected:
    ok(f"Persistence verified: {reloaded_count} vectors survive disk reload")
else:
    fail(f"Persistence mismatch: expected {expected}, reloaded {reloaded_count}")

# Verify metadata file is valid JSON with correct count
with open(METADATA_PATH, "r", encoding="utf-8") as f:
    meta = json.load(f)

if len(meta) == expected:
    ok(f"vector_metadata.json: {len(meta)} entries (matches chunk count)")
else:
    fail(f"vector_metadata.json entry count mismatch: {len(meta)} vs {expected}")

# Check required fields on first and last entry
for key in ["0", str(expected - 1)]:
    entry = meta.get(key, {})
    missing = [f for f in ["chunk_id", "document_id", "source_reference", "content"] if f not in entry]
    if not missing:
        ok(f"Metadata entry [{key}]: all required fields present")
    else:
        fail(f"Metadata entry [{key}]: missing fields: {missing}")


# ============================================================
# STEP 7: /api/search/status
# ============================================================
section("7. /api/search/status CHECK (direct service call)")

from app.services.vector_search import get_index_status

status = get_index_status()
info(f"status        : {status.get('status')}")
info(f"total_vectors : {status.get('total_vectors')}")
info(f"dimension     : {status.get('dimension')}")
info(f"model_name    : {status.get('model_name')}")

if status.get("status") == "ready":
    ok("Index status: ready")
else:
    fail(f"Unexpected status: {status.get('status')}")

if status.get("total_vectors") == expected:
    ok(f"total_vectors ({status['total_vectors']}) matches real chunk count ({expected})")
else:
    warn(f"total_vectors={status.get('total_vectors')}, expected={expected}")

if status.get("dimension") == 384:
    ok("Embedding dimension: 384")
else:
    fail(f"Unexpected dimension: {status.get('dimension')}")


# ============================================================
# STEP 8: /api/health and /api/health/db via requests
# ============================================================
section("8. BACKEND HEALTH ENDPOINTS (HTTP)")

try:
    import requests

    try:
        r = requests.get("http://localhost:8000/api/health", timeout=5)
        if r.status_code == 200 and r.json().get("status") == "ok":
            ok(f"/api/health -> 200 OK | {r.json()}")
        else:
            warn(f"/api/health -> {r.status_code} {r.text}")
    except requests.exceptions.ConnectionError:
        warn("/api/health: backend not running on localhost:8000 (start uvicorn separately)")

    try:
        r2 = requests.get("http://localhost:8000/api/health/db", timeout=5)
        if r2.status_code == 200 and r2.json().get("status") == "ok":
            ok(f"/api/health/db -> 200 OK | {r2.json()}")
        else:
            warn(f"/api/health/db -> {r2.status_code} {r2.text}")
    except requests.exceptions.ConnectionError:
        warn("/api/health/db: backend not running on localhost:8000 (start uvicorn separately)")

    # Try /api/search/status via HTTP too
    try:
        r3 = requests.get("http://localhost:8000/api/search/status", timeout=5)
        if r3.status_code == 200:
            ok(f"/api/search/status -> 200 OK | total_vectors={r3.json().get('total_vectors')}")
        else:
            warn(f"/api/search/status -> {r3.status_code}")
    except requests.exceptions.ConnectionError:
        warn("/api/search/status: backend not running (start uvicorn separately)")

    # Try POST /api/search/reindex via HTTP
    try:
        r4 = requests.post("http://localhost:8000/api/search/reindex", timeout=120)
        if r4.status_code == 200:
            ok(f"/api/search/reindex -> 200 OK | indexed={r4.json().get('indexed_count')}")
        else:
            warn(f"/api/search/reindex -> {r4.status_code} {r4.text[:200]}")
    except requests.exceptions.ConnectionError:
        warn("/api/search/reindex: backend not running (start uvicorn separately)")

    # Try POST /api/search
    try:
        r5 = requests.post(
            "http://localhost:8000/api/search",
            json={"query": "coal production", "top_k": 3},
            timeout=30
        )
        if r5.status_code == 200:
            d = r5.json()
            ok(f"/api/search -> 200 OK | total_results={d.get('total_results')}")
        else:
            warn(f"/api/search -> {r5.status_code} {r5.text[:200]}")
    except requests.exceptions.ConnectionError:
        warn("/api/search: backend not running (start uvicorn separately)")

except ImportError:
    warn("'requests' not installed — skipping HTTP endpoint checks")
    info("  Run: pip install requests")


# ============================================================
# FINAL SUMMARY
# ============================================================
section("FINAL REAL-DATA VERIFICATION SUMMARY")

print(f"""
  Real documents in PostgreSQL  : {doc_count}
  Real chunks in PostgreSQL     : {total_chunks}
  Chunks successfully indexed   : {result.get('indexed_count')}
  FAISS vector count (disk)     : {faiss_count}
  FAISS vector count (reload)   : {reloaded_count}
  Embedding dimension           : {result.get('dimension')}
  Model used                    : all-MiniLM-L6-v2 (sentence-transformers)
  Content traceability checks   : {verified_count} passed, {mismatch_count} failed
  Queries executed              : {len(QUERIES)}
  Metadata entries              : {len(meta)}
""")

if faiss_count == total_chunks and reloaded_count == total_chunks and verified_count > 0:
    print("  [RESULT] STEP 8 REAL-DATA VERIFICATION: PASSED")
else:
    print("  [RESULT] STEP 8 REAL-DATA VERIFICATION: ISSUES FOUND (see above)")

print()
cur.close()
conn.close()
