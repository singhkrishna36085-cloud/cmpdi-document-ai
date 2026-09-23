import re
import asyncio
from typing import List, Dict, Any, Optional

def classify_query_intent(query: str) -> str:
    """
    Classify the intent of the user's query deterministically.
    Always prioritizes uploaded document RAG context first.
    Modes: RAG, WEB, CALCULATION, GENERAL
    """
    q = query.lower().strip()
    
    # Only route to WEB if user explicitly asks for live internet/google search
    explicit_web_triggers = [
        "search web", "google search", "search internet", "search google",
        "live web search", "browse web", "check internet", "internet se"
    ]
    if any(trigger in q for trigger in explicit_web_triggers):
        return "WEB"
    
    calc_keywords = ['calculate', 'compute', 'sum', 'difference', 'multiply', 'divide', 'add', 'math', '%']
    has_calc = any(kw in q for kw in calc_keywords) or bool(re.search(r'\d+\s*[\+\-\*\/]\s*\d+', q))
    if has_calc:
        return "CALCULATION"
        
    # By default, EVERY user question in this assistant routes to RAG (Uploaded Document Knowledge)
    return "RAG"

async def rewrite_query(query: str, history: List[Dict[str, str]], provider: Optional[str] = None, model: Optional[str] = None, api_key: Optional[str] = None) -> str:
    """
    Given the recent conversation history, use a lightweight LLM call to rewrite the latest query
    to be fully self-contained.
    """
    if not history:
        return query
        
    from app.services.llm_service import (
        _call_groq,
        _call_gemini,
        _call_ollama,
        _call_openai_compatible,
        get_default_provider,
        get_default_model,
        get_default_api_key,
    )
    import os
    
    provider_name = (provider or os.getenv("LLM_PROVIDER") or get_default_provider()).lower()
    model_name = model or os.getenv("LLM_MODEL") or get_default_model()
    key = api_key or get_default_api_key(provider_name)
    url = os.getenv("LLM_BASE_URL", "")

    
    sys_prompt = "You are a helpful assistant. Given a conversation history and a follow-up query, rewrite the follow-up query to be fully self-contained without changing its core meaning. Do not answer the question, just output the rewritten query string. If the query is already self-contained, just output the exact query."
    
    # Build prompt string
    hist_text = ""
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        hist_text += f"{role}: {msg['content']}\n"
        
    user_prompt = f"History:\n{hist_text}\nFollow-up query: {query}\n\nRewritten query:"
    
    timeout = 15
    try:
        # Re-use the existing internal functions to avoid code duplication
        import asyncio
        if provider_name == "groq":
            res = await asyncio.to_thread(_call_groq, user_prompt, model_name, key, timeout, sys_prompt)
        elif provider_name == "gemini":
            res = await asyncio.to_thread(_call_gemini, user_prompt, model_name, key, timeout, sys_prompt)
        elif provider_name == "ollama":
            res = await asyncio.to_thread(_call_ollama, user_prompt, model_name, url or "http://localhost:11434", timeout, sys_prompt)
        elif provider_name in ["openai", "custom", "huggingface"]:
            res = await asyncio.to_thread(_call_openai_compatible, user_prompt, model_name, key, url, timeout, sys_prompt)
        else:
            return query
            
        if res.get("status") == "success" and res.get("answer"):
            rewritten = res["answer"].strip()
            # If the LLM returned quotes, strip them
            rewritten = rewritten.strip('"\'')
            return rewritten
    except Exception as e:
        import logging
        logging.getLogger("query_router").warning(f"Failed to rewrite query: {e}")
        
    return query
