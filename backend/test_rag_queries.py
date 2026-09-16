import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

def test_rag():
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"}).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        token = json.loads(r.read().decode("utf-8"))["access_token"]

    queries = [
        "Which project produced the highest raw coal in Q1 2026?",
        "What was the total raw coal production?",
        "Which project has the highest seam thickness?",
        "What risks were reported for Nigahi?",
        "What safety issue occurred at Ukni?",
        "What was reported for Block-4?",
        "Which subsidiary operates Piparwar?"
    ]

    for q in queries:
        req_q = urllib.request.Request(f"{BASE_URL}/api/assistant/query", data=json.dumps({"query": q}).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
        with urllib.request.urlopen(req_q) as r:
            res = json.loads(r.read().decode("utf-8"))
            print("="*80)
            print(f"QUERY: {q}")
            ans = res.get('answer', '').encode("ascii", "replace").decode("ascii")
            print(f"ANSWER:\n{ans}")
            print(f"SOURCES ({len(res.get('sources', []))}):")
            for s in res.get("sources", []):
                print(f"  - Doc #{s.get('document_id')}: {s.get('original_filename')} ({s.get('source_reference')})")

if __name__ == "__main__":
    test_rag()
