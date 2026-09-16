import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"}).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req) as r:
    token = json.loads(r.read().decode("utf-8"))["access_token"]

q = "Which project produced the highest raw coal in Q1 2026?"
req_q = urllib.request.Request(f"{BASE_URL}/api/assistant/query", data=json.dumps({"query": q, "top_k": 15}).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
with urllib.request.urlopen(req_q) as r:
    res = json.loads(r.read().decode("utf-8"))
    print("RETRIVED CHUNKS:")
    for idx, c in enumerate(res.get("retrieved_chunks", [])):
        print(f"#{idx+1} [Score: {c.get('relevance_score')}] Doc {c.get('document_id')} Ref: {c.get('source_reference')}\nContent snippet: {c.get('content', '')[:120]}...\n")
