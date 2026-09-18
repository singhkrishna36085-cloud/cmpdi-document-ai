import re
import asyncio
from typing import List, Dict, Any, Optional

def classify_query_intent(query: str) -> str:
    """
    Classify the intent of the user's query deterministically.
    Modes: RAG, WEB, GENERAL, MIXED, CALCULATION
    """
    q = query.lower()
    
    # Define keywords
    cmpdi_keywords = [
        "cmpdi", "cil", "coal", "mining", "production", "overburden", "stripping ratio",
        "geological", "seam", "tonnes", "borehole", "dataset", "document", "report",
        "page", "reference", "gevra", "nigahi", "wani", "lithology", "reserves", "thickness",
        "ash content", "gcv", "drilling", "project", "mine", "q1", "block c", "north karanpura"
    ]
    
    calc_keywords = ['calculate', 'compute', 'sum', 'difference', 'multiply', 'divide', 'add', 'math', '%']
    
    web_keywords = [
        "latest", "news", "today", "yesterday", "recent", "current", "guidelines 2026", "2025", "2026",
        "market price", "stock", "tender", "press release", "ministry announcement", "internet", "google"
    ]

    general_keywords = [
        "python", "c++", "c program", "javascript", "api", "machine learning", "ai", "artificial intelligence",
        "deep learning", "recursion", "database", "sql", "explain", "what is the difference between", 
        "rag", "what are", "who is", "how does", "capital of", "why is", "tell me about", "define",
        "how to", "write a", "code", "summary of", "history of"
    ]
    
    has_calc = any(kw in q for kw in calc_keywords) or re.search(r'\d+\s*[\+\-\*\/]\s*\d+', q)
    has_cmpdi = any(re.search(rf'\b{kw}\b', q) for kw in cmpdi_keywords)
    has_web = any(re.search(rf'\b{kw}\b', q) for kw in web_keywords)
    has_general = any(re.search(rf'\b{kw}\b', q) for kw in general_keywords)
    
    if has_calc:
        if has_cmpdi:
            return "CALCULATION"
        return "GENERAL"
        
    if has_web:
        return "WEB"

    if has_cmpdi and has_general:
        return "MIXED"
        
    if has_cmpdi:
        return "RAG"
        
    # If no CMPDI keywords, it's a GENERAL question
    return "GENERAL"

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
