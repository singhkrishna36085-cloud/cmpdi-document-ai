import os
import sys
import requests
from app.services.rag_service import retrieve_rag_context
from app.services.llm_service import SYSTEM_PROMPT

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

query = "coal production"
ret = retrieve_rag_context(query, top_k=3)
fmt_context = ret.get("formatted_context", "")

api_key = os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or ""
print("API Key present:", bool(api_key))

endpoint = "https://api.groq.com/openai/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
user_prompt = (
    f"User Question: {query}\n\n"
    f"Retrieved CMPDI Document Context Blocks:\n{fmt_context}\n\n"
    f"Task:\n"
    f"Answer the user question based strictly on the context blocks above.\n"
    f"- If relevant coal, seam, geological, or report details are present, summarize them clearly.\n"
    f"- If exact figures (like annual production tonnages) are missing, state that exact numbers are not specified in these documents, but summarize what IS present.\n"
    f"- Follow all system grounding rules."
)

payload = {
    "model": "openai/gpt-oss-20b",
    "messages": [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ],
    "temperature": 0.1
}

resp = requests.post(endpoint, headers=headers, json=payload, timeout=25)
print("HTTP Status:", resp.status_code)
print("Raw Response:", resp.text)
