"""
STEP 8: Knowledge Base / Semantic Search - Verification Script
Tests all 12 requirements:
  1.  Imports (faiss, sentence_transformers) succeed
  2.  Embedding model loads without errors
  3.  Embed a known sentence -> vector of expected dimension (384)
  4.  FAISS IndexFlatIP accepts normalized vectors
  5.  Cosine similarity between identical vectors ~= 1.0
  6.  Cosine similarity between semantically different vectors < 0.99
  7.  index_chunks() indexes real DB chunks (or synthetic if DB empty) without error
  8.  FAISS index is persisted to disk (faiss_index.bin + vector_metadata.json)
  9.  search_knowledge_base() returns results with required traceability fields
  10. Relevance scores are in [0, 1] range
  11. Top-k limiting works correctly
  12. get_index_status() returns correct metadata

Run from backend/ with:
  .venv\\Scripts\\python.exe test_step8.py
"""

import os
import sys
import json
import traceback

# Force UTF-8 output so Windows cp1252 console doesn't choke on Unicode
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

PASS_STR = "PASS"
FAIL_STR = "FAIL"

results = []


def check(num, name, fn):
    """Run a single test function, capture pass/fail."""
    print(f"\n[{num:02d}] {name} ...", end=" ", flush=True)
    try:
        fn()
        print(PASS_STR)
        results.append((num, name, True, None))
    except Exception as exc:
        print(FAIL_STR)
        print(f"     ERROR: {exc}")
        results.append((num, name, False, str(exc)))


# ---------------------------------------------------------------------------
# TEST 1 - Imports
# ---------------------------------------------------------------------------
def test_01_imports():
    import faiss  # noqa: F401
    import sentence_transformers  # noqa: F401
    assert faiss is not None
    assert sentence_transformers is not None

check(1, "faiss + sentence_transformers imports succeed", test_01_imports)


# ---------------------------------------------------------------------------
# TEST 2 - Embedding model loads
# ---------------------------------------------------------------------------
_model = None

def test_02_model_loads():
    global _model
    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer("all-MiniLM-L6-v2")
    assert _model is not None, "Model returned None"

check(2, "SentenceTransformer model loads (all-MiniLM-L6-v2)", test_02_model_loads)


# ---------------------------------------------------------------------------
# TEST 3 - Vector dimension = 384
# ---------------------------------------------------------------------------
def test_03_embedding_dimension():
    assert _model is not None, "Model not loaded (test 2 failed?)"
    vec = _model.encode(["coal production report"], convert_to_numpy=True, normalize_embeddings=True)
    assert vec.shape == (1, 384), f"Expected (1, 384) got {vec.shape}"

check(3, "Embedding vector dimension is 384", test_03_embedding_dimension)


# ---------------------------------------------------------------------------
# TEST 4 - FAISS accepts normalized vectors
# ---------------------------------------------------------------------------
def test_04_faiss_index_accepts_vectors():
    import faiss
    import numpy as np
    idx = faiss.IndexFlatIP(384)
    vec = _model.encode(["test vector"], convert_to_numpy=True, normalize_embeddings=True)
    idx.add(np.array(vec, dtype=np.float32))
    assert idx.ntotal == 1, f"Expected 1 vector in index, got {idx.ntotal}"

check(4, "FAISS IndexFlatIP accepts normalized vectors", test_04_faiss_index_accepts_vectors)


# ---------------------------------------------------------------------------
# TEST 5 - Cosine sim between identical sentences ~= 1.0
# ---------------------------------------------------------------------------
def test_05_cosine_identity():
    import faiss
    import numpy as np
    idx = faiss.IndexFlatIP(384)
    text = "Amrapali Open Cast Production Report 2023"
    vec = _model.encode([text], convert_to_numpy=True, normalize_embeddings=True)
    vec32 = np.array(vec, dtype=np.float32)
    idx.add(vec32)
    scores, ids = idx.search(vec32, 1)
    score = float(scores[0][0])
    assert abs(score - 1.0) < 0.001, f"Expected ~1.0, got {score}"

check(5, "Cosine similarity of identical vectors ~= 1.0", test_05_cosine_identity)


# ---------------------------------------------------------------------------
# TEST 6 - Cosine sim between semantically different sentences < 0.99
# ---------------------------------------------------------------------------
def test_06_cosine_different():
    import faiss
    import numpy as np
    idx = faiss.IndexFlatIP(384)
    doc_vec = _model.encode(["coal seam thickness geological borehole"], convert_to_numpy=True, normalize_embeddings=True)
    query_vec = _model.encode(["quarterly financial audit report"], convert_to_numpy=True, normalize_embeddings=True)
    idx.add(np.array(doc_vec, dtype=np.float32))
    scores, _ = idx.search(np.array(query_vec, dtype=np.float32), 1)
    score = float(scores[0][0])
    assert score < 0.99, f"Expected dissimilar score < 0.99, got {score}"

check(6, "Cosine similarity of different topics < 0.99", test_06_cosine_different)


# ---------------------------------------------------------------------------
# TEST 7 - index_chunks() runs successfully (uses synthetic chunks if DB empty)
# ---------------------------------------------------------------------------
def test_07_index_chunks():
    from app.services.vector_search import index_chunks

    synthetic_chunks = [
        {
            "id": 9001,
            "document_id": 1,
            "original_filename": "test_production_report.pdf",
            "document_name": "Test Production Report",
            "page_number": 1,
            "sheet_name": None,
            "chunk_type": "text",
            "source_reference": "Page 1",
            "content": "Total coal production for Amrapali OCP in FY 2022-23 was 12.5 MT."
        },
        {
            "id": 9002,
            "document_id": 1,
            "original_filename": "test_production_report.pdf",
            "document_name": "Test Production Report",
            "page_number": 2,
            "sheet_name": None,
            "chunk_type": "text",
            "source_reference": "Page 2",
            "content": "Coal seam depth is 45 meters. Borehole BH-101 encountered good quality coking coal."
        },
        {
            "id": 9003,
            "document_id": 2,
            "original_filename": "borehole_data.xlsx",
            "document_name": "Borehole Survey Data",
            "page_number": None,
            "sheet_name": "Sheet1",
            "chunk_type": "table",
            "source_reference": "Sheet: Sheet1",
            "content": "BH-102 | Depth: 60m | Seam thickness: 3.2m | Ash: 18% | Moisture: 8%"
        },
        {
            "id": 9004,
            "document_id": 3,
            "original_filename": "geological_report.docx",
            "document_name": "Geological Survey Report",
            "page_number": 3,
            "sheet_name": None,
            "chunk_type": "text",
            "source_reference": "Page 3",
            "content": "The seam dips at approximately 5 degrees to the south-southeast. Average GCV is 4200 kcal/kg."
        },
        {
            "id": 9005,
            "document_id": 3,
            "original_filename": "geological_report.docx",
            "document_name": "Geological Survey Report",
            "page_number": 4,
            "sheet_name": None,
            "chunk_type": "text",
            "source_reference": "Page 4",
            "content": "Overburden removal target for Q2 FY2024: 15 BCM. Stripping ratio: 3.5:1."
        },
    ]

    result = index_chunks(synthetic_chunks)
    assert result["status"] == "success", f"Expected 'success', got: {result}"
    assert result["indexed_count"] == 5, f"Expected 5, got: {result['indexed_count']}"
    assert result["dimension"] == 384

check(7, "index_chunks() indexes 5 synthetic chunks successfully", test_07_index_chunks)


# ---------------------------------------------------------------------------
# TEST 8 - FAISS index persisted to disk
# ---------------------------------------------------------------------------
def test_08_index_persisted():
    from app.services.vector_search import INDEX_PATH, METADATA_PATH
    assert os.path.exists(INDEX_PATH), f"FAISS index not found at: {INDEX_PATH}"
    assert os.path.exists(METADATA_PATH), f"Metadata file not found at: {METADATA_PATH}"
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)
    assert len(meta) == 5, f"Expected 5 metadata entries, got {len(meta)}"
    entry = meta["0"]
    required = ["chunk_id", "document_id", "source_reference", "content"]
    for field in required:
        assert field in entry, f"Missing field '{field}' in metadata entry"

check(8, "FAISS index & metadata persisted to disk with correct structure", test_08_index_persisted)


# ---------------------------------------------------------------------------
# TEST 9 - search_knowledge_base() returns results with required fields
# ---------------------------------------------------------------------------
_search_result = None

def test_09_search_returns_results():
    global _search_result
    from app.services.vector_search import search_knowledge_base
    _search_result = search_knowledge_base("coal production quarterly output", top_k=3)
    assert "results" in _search_result, "Missing 'results' key"
    assert "total_results" in _search_result, "Missing 'total_results' key"
    assert "query" in _search_result, "Missing 'query' key"
    assert _search_result["total_results"] > 0, "Expected at least 1 result"
    assert len(_search_result["results"]) > 0, "Results list is empty"
    required_fields = ["relevance_score", "document_id", "chunk_id", "source_reference", "content"]
    for r in _search_result["results"]:
        for field in required_fields:
            assert field in r, f"Missing field '{field}' in search result"

check(9, "search_knowledge_base() returns results with all required traceability fields", test_09_search_returns_results)


# ---------------------------------------------------------------------------
# TEST 10 - Relevance scores are in [0, 1]
# ---------------------------------------------------------------------------
def test_10_relevance_scores_valid():
    assert _search_result is not None, "No search result from test 9"
    for r in _search_result["results"]:
        score = r["relevance_score"]
        assert isinstance(score, float), f"Score not float: {type(score)}"
        assert -0.01 <= score <= 1.01, f"Score out of [0,1] range: {score}"

check(10, "Relevance scores are within [0, 1] range", test_10_relevance_scores_valid)


# ---------------------------------------------------------------------------
# TEST 11 - Top-k limiting works correctly
# ---------------------------------------------------------------------------
def test_11_topk_limiting():
    from app.services.vector_search import search_knowledge_base
    result_k2 = search_knowledge_base("borehole geological survey data", top_k=2)
    result_k5 = search_knowledge_base("coal seam stripping ratio overburden", top_k=5)
    assert len(result_k2["results"]) <= 2, f"Expected <= 2 results, got {len(result_k2['results'])}"
    assert len(result_k5["results"]) <= 5, f"Expected <= 5 results, got {len(result_k5['results'])}"
    assert result_k2["total_results"] <= 2, f"total_results exceeds top_k=2: {result_k2['total_results']}"

check(11, "Top-k limiting returns correct number of results", test_11_topk_limiting)


# ---------------------------------------------------------------------------
# TEST 12 - get_index_status() returns correct metadata
# ---------------------------------------------------------------------------
def test_12_index_status():
    from app.services.vector_search import get_index_status
    st = get_index_status()
    assert "status" in st, "Missing 'status' key"
    assert "total_vectors" in st, "Missing 'total_vectors' key"
    assert "dimension" in st, "Missing 'dimension' key"
    assert "model_name" in st, "Missing 'model_name' key"
    assert st["status"] == "ready", f"Expected 'ready', got '{st['status']}'"
    assert st["total_vectors"] == 5, f"Expected 5 vectors, got {st['total_vectors']}"
    assert st["dimension"] == 384, f"Expected dim 384, got {st['dimension']}"
    assert "MiniLM" in st["model_name"] or "minilm" in st["model_name"].lower(), \
        f"Expected model name to contain 'MiniLM', got: {st['model_name']}"

check(12, "get_index_status() returns correct metadata (ready, 5 vectors, dim=384)", test_12_index_status)


# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("STEP 8 VERIFICATION SUMMARY")
print("=" * 60)

passed = sum(1 for _, _, ok, _ in results if ok)
failed = sum(1 for _, _, ok, _ in results if not ok)

for num, name, ok, err in results:
    status_label = PASS_STR if ok else FAIL_STR
    print(f"  [{num:02d}] {status_label}  {name}")
    if err:
        print(f"         -> {err}")

print("=" * 60)
print(f"  Total: {len(results)} | Passed: {passed} | Failed: {failed}")
print("=" * 60)

if failed == 0:
    print("\n[ALL PASS] STEP 8 COMPLETE - All 12 tests passed.")
else:
    print(f"\n[FAILED] {failed} test(s) failed - STEP 8 NOT complete yet.")
    sys.exit(1)
