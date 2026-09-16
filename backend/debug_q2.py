import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

def debug_query2():
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"username": "cmpdi_admin", "password": "CMPDI_Secure_Auth_2026!"}).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        token = json.loads(r.read().decode("utf-8"))["access_token"]
        
    req2 = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps({"query": "What was the total raw coal production?"}).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
    
    status, res = 200, {}
    req_q = urllib.request.Request(f"{BASE_URL}/api/assistant/query", data=json.dumps({"query": "What was the total raw coal production?"}).encode("utf-8"), headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
    with urllib.request.urlopen(req_q) as r:
        reply = json.loads(r.read().decode("utf-8"))
        print("REPLY RECV:")
        print(json.dumps(reply, indent=2))

if __name__ == "__main__":
    debug_query2()
