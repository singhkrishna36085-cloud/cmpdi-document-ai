"""
LLM Answer Generation Service (STEP 9.2)
Provides grounded natural-language answer generation using configurable LLM providers
(Groq, Gemini, Ollama, OpenAI, HuggingFace/Custom) and retrieved CMPDI document context.
"""

import os
import json
import logging
import requests
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("llm_service")

import time

_GROQ_MODELS_CACHE: List[str] = []
_GROQ_MODELS_CACHE_TIME: float = 0.0
_GROQ_LAST_WORKING_MODEL: Optional[str] = None

# High-quality verified Groq fallback models in preference order
_STATIC_GROQ_FALLBACKS = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "allam-2-7b",
]

_DEPRECATED_OR_INVALID_GROQ_MODELS = {
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "qwen-2.5-32b",
    "gemma2-9b-it",
    "llama-3.1-70b-versatile"
}

def get_live_groq_models(api_key: str) -> List[str]:
    """
    Dynamically discover active chat models from Groq's /v1/models endpoint using the API key.
    Filters out non-chat models (whisper, guard, embed, etc.) and caches for 1 hour.
    """
    global _GROQ_MODELS_CACHE, _GROQ_MODELS_CACHE_TIME
    now = time.time()
    if _GROQ_MODELS_CACHE and (now - _GROQ_MODELS_CACHE_TIME < 3600):
        return _GROQ_MODELS_CACHE

    clean_key = (api_key or "").strip().strip('"\'')
    if not clean_key:
        return _STATIC_GROQ_FALLBACKS

    try:
        resp = requests.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {clean_key}"},
            timeout=8
        )
        if resp.status_code == 200:
            data = resp.json()
            models_data = data.get("data", [])
            valid_chat_models = []
            for item in models_data:
                mid = item.get("id", "")
                mid_lower = mid.lower()
                # Skip non-chat/audio/guard/moderation models
                if any(skip in mid_lower for skip in ["whisper", "guard", "safeguard", "embed", "tts", "orpheus-arabic"]):
                    continue
                # Skip known deprecated models
                if mid in _DEPRECATED_OR_INVALID_GROQ_MODELS:
                    continue
                valid_chat_models.append(mid)
            
            # Prioritize top-tier models (120b, compound, 27b, 20b, compound-mini)
            def model_priority(m: str) -> int:
                m_low = m.lower()
                if "120b" in m_low:
                    return 0
                if "compound" in m_low and "mini" not in m_low:
                    return 1
                if "qwen3.8" in m_low or "27b" in m_low:
                    return 2
                if "20b" in m_low:
                    return 3
                if "compound-mini" in m_low:
                    return 4
                return 10

            valid_chat_models.sort(key=model_priority)
            if valid_chat_models:
                _GROQ_MODELS_CACHE = valid_chat_models
                _GROQ_MODELS_CACHE_TIME = now
                logger.info(f"Dynamically discovered {len(valid_chat_models)} active Groq models: {valid_chat_models}")
                return valid_chat_models
    except Exception as e:
        logger.warning(f"Failed to fetch live Groq models via API: {e}")

    return _STATIC_GROQ_FALLBACKS

# Default Environment Configuration
def get_default_provider() -> str:
    return os.getenv("LLM_PROVIDER", "groq").lower()

def get_default_model() -> str:
    provider = get_default_provider()
    if provider == "groq":
        return os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
    elif provider == "gemini":
        return os.getenv("LLM_MODEL", "gemini-1.5-flash")
    return os.getenv("LLM_MODEL", "openai/gpt-oss-120b")

def get_default_api_key(provider_name: str) -> str:
    key = ""
    if provider_name == "groq":
        key = os.getenv("GROQ_API_KEY") or os.getenv("LLM_API_KEY") or ""
    elif provider_name == "gemini":
        key = os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or ""
    elif provider_name == "openai":
        key = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or ""
    else:
        key = os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
    return key.strip().strip('"\'')


SYSTEM_PROMPT = """You are an Advanced AI Document & Knowledge Assistant for CMPDI (Central Mine Planning & Design Institute) / Coal India Limited and enterprise documentation.
Your objective is to thoroughly read, understand, and explain ALL content present in the uploaded documents and pages without narrow keyword limitations.

CRITICAL INSTRUCTIONS:
1. COMPLETE DOCUMENT & PAGE COMPREHENSION:
   - Understand, identify, and explain EVERYTHING present on the page or in the document: general narrative text, executive summaries, project backgrounds, objectives, mining plans, environmental clearances, operations, equipment, methodologies, conclusions, recommendations, tables, numbers, and dates.
   - Do NOT restrict yourself to only looking for specific mining parameters like coal seams, thickness, or boreholes. Every page contains valuable information (whether text, overview, history, or data) — analyze and explain whatever is actually written there!
   - STRICT PROHIBITION: NEVER output canned refusals such as "No specific geological, coal-seam, thickness, or bore-hole figures are provided on this page" or "If you need detailed quantitative data from other sections of the report, please indicate the page or chapter". If a page contains narrative, background, or qualitative discussion, summarize and explain that narrative fully!

2. PURE TEXT FORMAT & DIRECT SUBSTANCE:
   - Deliver all answers, facts, explanations, data, and analyses directly in rich, readable TEXT format.
   - Do NOT start your response with mechanical metadata headers like "**Document Title:** ...", "**Document Type:** PDF", etc., unless the user explicitly asked for document metadata or the source file name.
   - Do NOT pepper paragraphs with raw PDF file names or repetitively mention "[Document: filename.pdf]".
   - ONLY include specific source PDF file names or document references when the user explicitly asks for them (e.g., "which pdf?", "show pdf", "source document kya hai?", "pdf link"). Otherwise, present all findings thoroughly in text format!

3. THOROUGH & HELPFUL RESPONSES:
   - When asked "What is in this document?", "Explain this page", "Summarize", or any specific topic, provide a well-structured, detailed, and insightful breakdown covering all sections, key points, findings, and context available in the blocks.
   - If the user asks a question whose answer is partially covered, explain everything that IS available in the context blocks, and provide intelligent contextual analysis.

4. ACCURACY & INTEGRITY:
   - Preserve exact figures, numbers, dates, company names, percentages, and technical terms as reported in the text.
   - Do not fabricate facts that contradict the document.
"""


FORMATTING_RULES = """
PRESENTATION & TYPOGRAPHY RULES (CRITICAL FOR READABILITY):
1. BOLD CAPITALIZED SECTION HEADINGS:
   - Organize your response using clear uppercase headers: `### SECTION TITLE` or `### 1. SECTION TITLE`.
   - Always leave an empty blank line before and after each heading.

2. DO NOT USE ASCII PIPE TABLES OR DASHED GRID LINES:
   - DO NOT generate Markdown pipe tables (`| Col 1 | Col 2 |`) or dashed grid lines (`|---|---|`).
   - Instead of tables, present facts, indicators, reserves, and comparisons using stylish arrow points (`➤`) or numbered lists (`1.`, `2.`, `3.`)!

3. STYLISH ARROWS & NUMBERED POINTS:
   - For indicators, statistics, or general facts:
     ➤ **Indicator Name:** Detailed explanation or latest verified figure.
   - For step-by-step logic, rankings, or procedures:
     1. **Step / Item Name:** Concise description.
   - Leave an empty line between consecutive bullet/numbered points so the presentation is airy, clear, and spacious.

4. SPACIOUS GAP & BREATHING ROOM:
   - Keep paragraphs brief (2 to 3 sentences maximum).
   - Ensure natural spacing between words and clear paragraph separation.
   - Highlight key figures, dates, percentages, and company names in **bold**.
"""

def get_system_prompt_for_mode(mode: str) -> str:
    base = ""
    if mode in ["GENERAL", "WEB"]:
        base = (
            "You are an advanced, knowledgeable AI Assistant for CMPDI / Coal India Limited and global industry. "
            "You have deep expertise in mining engineering, geology, environmental policy, science, technology, mathematics, and world knowledge. "
            "Provide a thorough, accurate, and structured answer. Use Markdown formatting, clear headings, bullet points, and step-by-step logic."
        )
    elif mode in ["MIXED", "HYBRID"]:
        base = (
            "You are an advanced AI Document & Intelligence Assistant. "
            "First, address the broader conceptual or global aspects of the user's inquiry thoroughly. "
            "Then, synthesize any specific evidence, figures, and verified details from the provided CMPDI document context blocks below. "
            "Clearly distinguish general industry principles from verified document findings."
        )
    elif mode == "CALCULATION":
        base = (
            "You are an advanced analytical AI Assistant. "
            "Perform all calculations step-by-step with mathematical precision. "
            "State all formulas, intermediate steps, units, and assumptions clearly."
        )
    else:
        base = SYSTEM_PROMPT

    return base + "\n\n" + FORMATTING_RULES

def generate_llm_answer(
    query: str,
    formatted_context: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    timeout: int = 25,
    mode: str = "RAG"
) -> Dict[str, Any]:
    """
    Calls configured LLM provider to generate an intelligent answer.
    Supports Document RAG, Global Reasoning, and Live Google Search Grounding.
    """
    provider_name = (provider or os.getenv("LLM_PROVIDER") or get_default_provider()).lower()
    model_name = model or os.getenv("LLM_MODEL") or get_default_model()
    key = api_key or get_default_api_key(provider_name)
    url = base_url or os.getenv("LLM_BASE_URL", "")

    effective_mode = mode
    sys_prompt = get_system_prompt_for_mode(effective_mode)
    
    if formatted_context and formatted_context.strip():
        user_prompt = (
            f"User Question: {query}\n\n"
            f"Retrieved Document Content & Context Blocks:\n{formatted_context}\n\n"
            f"Task:\n"
            f"Provide a comprehensive, accurate, and structured answer to the user question using the context blocks above.\n"
            f"- FORMAT: Deliver full details directly in rich, readable TEXT format (clear uppercase headings, stylish arrow points '➤', and clean paragraphs).\n"
            f"- STRICT TEXT FORMAT: Explain everything purely in text format. Do NOT provide, attach, or recommend PDF files or links unless the user explicitly asks for a PDF recommendation or source file link.\n"
            f"- Do NOT start the answer with mechanical file headers like '**Document Title:** XYZ.pdf' or '**Document Type:** PDF' unless explicitly requested by the user. Focus directly on the actual content, facts, and insights!\n"
            f"- Do NOT inject raw PDF file names or document links into the text unless the user explicitly asked for the PDF or source file.\n"
            f"- Identify and explain ALL content, topics, summaries, narrative details, data, numbers, tables, and conclusions present in the blocks.\n"
            f"- STRICT RULE: Do NOT limit yourself to only mining terms or coal seams. Whatever is written on the page (text, introduction, findings, equipment, operations, etc.), summarize and explain it thoroughly.\n"
            f"- NEVER refuse or say that specific geological/coal-seam figures are missing when the user asks about the page or document content. Explain everything that IS present!"
        )
    elif mode == "WEB":
        user_prompt = f"User Question: {query}\n\nTask: Provide the latest live web information with citations."
    else:
        user_prompt = (
            f"User Question: {query}\n\n"
            f"Notice: No matching document context was found in the uploaded archive for this specific query. "
            f"Provide a helpful, structured, and insightful response answering the user's question using verified enterprise and domain knowledge, while noting that specific project files can be uploaded to the vault."
        )

    # Auto-route between Groq and Gemini if chosen provider key is absent
    if provider_name == "gemini" and not key:
        alt_groq_key = get_default_api_key("groq")
        if alt_groq_key:
            logger.info("GEMINI_API_KEY missing, auto-routing to available GROQ_API_KEY provider.")
            provider_name = "groq"
            model_name = os.getenv("LLM_MODEL") or "openai/gpt-oss-120b"
            key = alt_groq_key

    if provider_name == "groq" and not key:
        alt_gemini_key = get_default_api_key("gemini")
        if alt_gemini_key:
            logger.info("GROQ_API_KEY missing, auto-routing to available GEMINI_API_KEY provider.")
            provider_name = "gemini"
            model_name = "gemini-1.5-flash"
            key = alt_gemini_key

    # Validate cloud provider API keys
    if provider_name in ["groq", "gemini", "openai", "huggingface"] and not key:
        logger.warning(f"LLM_API_KEY missing for provider '{provider_name}'.")
        return {
            "answer": None,
            "provider": provider_name,
            "model": model_name,
            "status": "configuration_error",
            "error": f"API Key missing for LLM provider '{provider_name}'. Please set LLM_API_KEY or {provider_name.upper()}_API_KEY in environment variables."
        }

    enable_web = (mode == "WEB")
    try:
        res = None
        if provider_name == "groq":
            res = _call_groq(user_prompt, model_name, key, timeout, sys_prompt)
            # If Groq failed completely and Gemini key is configured, fallback to Gemini
            if res.get("status") != "success" and os.getenv("GEMINI_API_KEY"):
                gem_key = get_default_api_key("gemini")
                logger.info("Groq call failed; attempting fallback to Gemini...")
                res_gem = _call_gemini(user_prompt, "gemini-1.5-flash", gem_key, timeout, sys_prompt, enable_web_search=enable_web)
                if res_gem.get("status") == "success":
                    return res_gem
            return res
        elif provider_name == "gemini":
            res = _call_gemini(user_prompt, model_name, key, timeout, sys_prompt, enable_web_search=enable_web)
            # If Gemini failed and Groq key is configured, fallback to Groq
            if res.get("status") != "success" and os.getenv("GROQ_API_KEY"):
                groq_k = get_default_api_key("groq")
                logger.info("Gemini call failed; attempting fallback to Groq...")
                res_groq = _call_groq(user_prompt, "openai/gpt-oss-120b", groq_k, timeout, sys_prompt)
                if res_groq.get("status") == "success":
                    return res_groq
            return res
        elif provider_name == "ollama":
            return _call_ollama(user_prompt, model_name, url or "http://localhost:11434", timeout, sys_prompt)
        elif provider_name in ["openai", "custom", "huggingface"]:
            return _call_openai_compatible(user_prompt, model_name, key, url, timeout, sys_prompt)
        else:
            return {
                "answer": None,
                "provider": provider_name,
                "model": model_name,
                "status": "configuration_error",
                "error": f"Unsupported LLM provider '{provider_name}'. Supported providers: groq, gemini, ollama, openai, custom."
            }
    except requests.exceptions.Timeout:
        logger.error(f"LLM request to provider '{provider_name}' timed out after {timeout}s.")
        return {
            "answer": None,
            "provider": provider_name,
            "model": model_name,
            "status": "timeout_error",
            "error": f"LLM inference request timed out after {timeout} seconds."
        }
    except Exception as exc:
        logger.error(f"LLM inference error ({provider_name}): {str(exc)}")
        return {
            "answer": None,
            "provider": provider_name,
            "model": model_name,
            "status": "provider_error",
            "error": f"LLM API call failed: {str(exc)}"
        }


def _call_groq(user_prompt: str, model: str, api_key: str, timeout: int, sys_prompt: str) -> Dict[str, Any]:
    global _GROQ_LAST_WORKING_MODEL
    clean_key = (api_key or "").strip().strip('"\'')
    if not clean_key:
        return {
            "answer": None,
            "provider": "groq",
            "model": model or "openai/gpt-oss-120b",
            "status": "configuration_error",
            "error": "GROQ_API_KEY is empty or missing. Please configure GROQ_API_KEY."
        }

    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {clean_key}",
        "Content-Type": "application/json"
    }

    # Build prioritized candidate model list
    candidate_models: List[str] = []

    # 1. Last known working model for fast execution
    if _GROQ_LAST_WORKING_MODEL and _GROQ_LAST_WORKING_MODEL not in _DEPRECATED_OR_INVALID_GROQ_MODELS:
        candidate_models.append(_GROQ_LAST_WORKING_MODEL)

    # 2. User-requested model if provided and not explicitly deprecated
    req_model = (model or "").strip()
    if req_model and req_model not in _DEPRECATED_OR_INVALID_GROQ_MODELS and req_model not in candidate_models:
        candidate_models.insert(0, req_model)

    # 3. Discovered live models from Groq API
    live_models = get_live_groq_models(clean_key)
    for lm in live_models:
        if lm not in candidate_models and lm not in _DEPRECATED_OR_INVALID_GROQ_MODELS:
            candidate_models.append(lm)

    # 4. Static verified fallbacks
    for sm in _STATIC_GROQ_FALLBACKS:
        if sm not in candidate_models and sm not in _DEPRECATED_OR_INVALID_GROQ_MODELS:
            candidate_models.append(sm)

    # Pre-emptively enforce safe prompt length for Groq 8,000 TPM limit (~20,000 chars)
    def _truncate_prompt(text: str, max_len: int) -> str:
        if len(text) <= max_len:
            return text
        return text[:max_len] + "\n\n[Notice: Additional context truncated to satisfy TPM rate limit quota]"

    last_error = ""
    for candidate in candidate_models:
        for attempt_chars in [20000, 13000, 6500]:
            attempt_prompt = _truncate_prompt(user_prompt, attempt_chars)
            payload = {
                "model": candidate,
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": attempt_prompt}
                ],
                "temperature": 0.2
            }
            try:
                resp = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
                if resp.status_code == 200:
                    data = resp.json()
                    answer = data["choices"][0]["message"]["content"].strip()
                    _GROQ_LAST_WORKING_MODEL = candidate
                    return {
                        "answer": answer,
                        "provider": "groq",
                        "model": candidate,
                        "web_sources": [],
                        "status": "success"
                    }
                elif resp.status_code == 413 or (resp.status_code == 429 and "rate_limit_exceeded" in resp.text):
                    logger.warning(
                        f"Groq TPM limit 413/429 encountered for '{candidate}' ({len(attempt_prompt)} chars). "
                        f"Dynamically reducing context and retrying..."
                    )
                    last_error = f"Groq API HTTP {resp.status_code} ({candidate}): {resp.text}"
                    continue  # Try next smaller attempt_chars (13000, then 6500)
                else:
                    last_error = f"Groq API HTTP {resp.status_code} ({candidate}): {resp.text}"
                    logger.warning(f"Groq model '{candidate}' returned {resp.status_code} -> trying next candidate...")
                    if resp.status_code in [400, 404]:
                        _DEPRECATED_OR_INVALID_GROQ_MODELS.add(candidate)
                    break  # Don't retry non-413 errors with smaller context
            except requests.exceptions.Timeout:
                last_error = f"Groq request for '{candidate}' timed out after {timeout}s."
                break
            except Exception as exc:
                last_error = f"Groq request error on '{candidate}': {str(exc)}"
                break

    return {
        "answer": None,
        "provider": "groq",
        "model": candidate_models[0] if candidate_models else "openai/gpt-oss-120b",
        "status": "provider_error",
        "error": last_error or "All Groq candidate models failed."
    }


def _call_gemini(user_prompt: str, model: str, api_key: str, timeout: int, sys_prompt: str, enable_web_search: bool = False) -> Dict[str, Any]:
    model_name = model or "gemini-1.5-flash"
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    
    resp = None
    # Only enable Google Search Grounding when explicitly requested (mode == "WEB")
    if enable_web_search:
        payload_with_search = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{sys_prompt}\n\n{user_prompt}"}
                    ]
                }
            ],
            "tools": [
                {"googleSearch": {}}
            ],
            "generationConfig": {
                "temperature": 0.2
            }
        }
        try:
            resp = requests.post(endpoint, json=payload_with_search, timeout=timeout)
        except Exception as exc:
            logger.warning(f"Gemini with search request failed: {exc}")
            resp = None

    # Standard pure document / reasoning call (NO Google Search tool attached)
    if resp is None or resp.status_code != 200:
        standard_payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{sys_prompt}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2
            }
        }
        resp = requests.post(endpoint, json=standard_payload, timeout=timeout)

    if resp.status_code == 200:
        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            candidate = candidates[0]
            parts = candidate["content"].get("parts", [])
            answer = "".join([p.get("text", "") for p in parts]).strip()
            
            # Extract live web grounding citations if returned
            web_sources = []
            grounding = candidate.get("groundingMetadata", {})
            for chunk in grounding.get("groundingChunks", []):
                web = chunk.get("web", {})
                if web.get("uri"):
                    web_sources.append({
                        "title": web.get("title") or web.get("uri"),
                        "url": web.get("uri")
                    })

            return {
                "answer": answer,
                "provider": "gemini",
                "model": model_name,
                "web_sources": web_sources,
                "web_search_queries": grounding.get("webSearchQueries", []),
                "status": "success"
            }

    return {
        "answer": None,
        "provider": "gemini",
        "model": model_name,
        "status": "provider_error",
        "error": f"Gemini API HTTP {resp.status_code}: {resp.text}"
    }


def _call_ollama(user_prompt: str, model: str, base_url: str, timeout: int, sys_prompt: str) -> Dict[str, Any]:
    model_name = model or "llama3"
    url = f"{base_url.rstrip('/')}/api/generate"
    payload = {
        "model": model_name,
        "prompt": f"{sys_prompt}\n\n{user_prompt}",
        "stream": False,
        "options": {"temperature": 0.1}
    }
    resp = requests.post(url, json=payload, timeout=timeout)
    if resp.status_code == 200:
        data = resp.json()
        return {
            "answer": data.get("response", "").strip(),
            "provider": "ollama",
            "model": model_name,
            "status": "success"
        }
    return {
        "answer": None,
        "provider": "ollama",
        "model": model_name,
        "status": "provider_error",
        "error": f"Ollama HTTP {resp.status_code}: {resp.text}"
    }


def _call_openai_compatible(user_prompt: str, model: str, api_key: str, base_url: str, timeout: int, sys_prompt: str) -> Dict[str, Any]:
    url = f"{(base_url or 'https://api.openai.com/v1').rstrip('/')}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model or "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
    if resp.status_code == 200:
        data = resp.json()
        answer = data["choices"][0]["message"]["content"].strip()
        return {
            "answer": answer,
            "provider": "openai",
            "model": model or "gpt-4o-mini",
            "status": "success"
        }
    return {
        "answer": None,
        "provider": "openai",
        "model": model,
        "status": "provider_error",
        "error": f"OpenAI API HTTP {resp.status_code}: {resp.text}"
    }
