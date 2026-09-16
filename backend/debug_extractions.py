import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"}).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req) as r:
    token = json.loads(r.read().decode("utf-8"))["access_token"]

req_a = urllib.request.Request(f"{BASE_URL}/api/cross-document/analyze", data=json.dumps({}).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
with urllib.request.urlopen(req_a) as r:
    res = json.loads(r.read().decode("utf-8"))
    print("TOTAL RECORDS:", res.get("total_records"))
    for idx, rec in enumerate(res.get("records", [])):
        print(f"#{idx+1} Doc #{rec.get('document_id')} Ext #{rec.get('extraction_id')}: Project='{rec.get('Project')}', Mine='{rec.get('Mine_Name')}', RawCoal={rec.get('Raw_Coal_Produced_Tonnes')}")
