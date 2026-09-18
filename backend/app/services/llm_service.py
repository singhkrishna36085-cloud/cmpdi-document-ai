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

# Default Environment Configuration
# Default Environment Configuration
def get_default_provider() -> str:
    return os.getenv("LLM_PROVIDER", "groq").lower()

def get_default_model() -> str:
    provider = get_default_provider()
    if provider == "groq":
        return os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    elif provider == "gemini":
        return os.getenv("LLM_MODEL", "gemini-1.5-flash")
    return os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

def get_default_api_key(provider_name: str) -> str:
    if provider_name == "groq":
        return os.getenv("GROQ_API_KEY") or os.getenv("LLM_API_KEY") or ""
    elif provider_name == "gemini":
        return os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or ""
    elif provider_name == "openai":
        return os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or ""
    return os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""


SYSTEM_PROMPT = """You are an Advanced AI Document & Knowledge Assistant for CMPDI (Central Mine Planning & Design Institute) / Coal India Limited and global industry.
Your objective is to provide comprehensive, grounded, and insightful answers.

CRITICAL INSTRUCTIONS:
1. DOCUMENT GROUNDING: When retrieved CMPDI context blocks are provided below, extract, summarize, and cite all relevant parameters (proved reserves, coal seams, lithology, thickness, ash content, GCV, stripping ratio, borehole logs). Always cite source document names and page/sheet references.
2. ABSENCE OF SPECIFIC FIGURES: If the user asks for exact annual production tonnages or figures not explicitly in the context, clearly explain what is verified in the documents, and supplement with authorized industry reasoning or global knowledge.
3. NEVER INVENT LOCAL VALUES: Do not fabricate specific CMPDI project numbers or dates not present in the verified context blocks.
4. GLOBAL & TECHNICAL INTELLIGENCE: If no document context blocks are provided (or if the question is general/conceptual/global), provide a thorough, structured, and helpful explanation using your extensive global knowledge base and live web intelligence.
5. PRESERVE UNITS: Preserve exact numbers, reserves (e.g. 14.8 Million Tonnes), depth meters, ash content (%), GCV (kcal/kg), and seam codes exactly as reported.
"""


def get_system_prompt_for_mode(mode: str) -> str:
    if mode in ["GENERAL", "WEB"]:
        return (
            "You are an advanced, knowledgeable AI Assistant for CMPDI / Coal India Limited and global industry. "
            "You have deep expertise in mining engineering, geology, environmental policy, science, technology, mathematics, and world knowledge. "
            "Provide a thorough, accurate, and structured answer. Use Markdown formatting, clear headings, bullet points, and step-by-step logic."
        )
    elif mode in ["MIXED", "HYBRID"]:
        return (
            "You are an advanced AI Document & Intelligence Assistant. "
            "First, address the broader conceptual or global aspects of the user's inquiry thoroughly. "
            "Then, synthesize any specific evidence, figures, and verified details from the provided CMPDI document context blocks below. "
            "Clearly distinguish general industry principles from verified document findings."
        )
    elif mode == "CALCULATION":
        return (
            "You are an advanced analytical AI Assistant. "
            "Perform all calculations step-by-step with mathematical precision. "
            "State all formulas, intermediate steps, units, and assumptions clearly."
        )
    else:
        return SYSTEM_PROMPT

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

    # For pure RAG where context is empty, promote to GENERAL mode so the user gets a helpful answer
    effective_mode = mode
    if mode == "RAG" and (not formatted_context or not formatted_context.strip()):
        effective_mode = "GENERAL"

    sys_prompt = get_system_prompt_for_mode(effective_mode)
    
    if effective_mode in ["GENERAL", "WEB"] or not formatted_context or not formatted_context.strip():
        user_prompt = f"User Question: {query}"
    else:
        user_prompt = (
            f"User Question: {query}\n\n"
            f"Retrieved CMPDI Document Context Blocks:\n{formatted_context}\n\n"
            f"Task:\n"
            f"Answer the user question based on the verified context blocks above.\n"
            f"- If relevant coal, seam, geological, or report details are present, summarize them clearly.\n"
            f"- If exact figures are missing, summarize what IS verified and explain any related background.\n"
            f"- Cite source document references where available."
        )

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

    try:
        if provider_name == "groq":
            return _call_groq(user_prompt, model_name, key, timeout, sys_prompt)
        elif provider_name == "gemini":
            return _call_gemini(user_prompt, model_name, key, timeout, sys_prompt)
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
    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    primary_model = model or "llama-3.3-70b-versatile"
    payload = {
        "model": primary_model,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2
    }
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
    if resp.status_code == 200:
        data = resp.json()
        answer = data["choices"][0]["message"]["content"].strip()
        return {
            "answer": answer,
            "provider": "groq",
            "model": primary_model,
            "web_sources": [],
            "status": "success"
        }
    elif resp.status_code in [400, 404] and primary_model != "llama-3.1-8b-instant":
        # Fallback to llama-3.1-8b-instant if 70b model name is unavailable on specific key
        fallback_model = "llama-3.1-8b-instant"
        payload["model"] = fallback_model
        fallback_resp = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
        if fallback_resp.status_code == 200:
            data = fallback_resp.json()
            answer = data["choices"][0]["message"]["content"].strip()
            return {
                "answer": answer,
                "provider": "groq",
                "model": fallback_model,
                "web_sources": [],
                "status": "success"
            }

    return {
        "answer": None,
        "provider": "groq",
        "model": primary_model,
        "status": "provider_error",
        "error": f"Groq API HTTP {resp.status_code}: {resp.text}"
    }


def _call_gemini(user_prompt: str, model: str, api_key: str, timeout: int, sys_prompt: str) -> Dict[str, Any]:
    model_name = model or "gemini-1.5-flash"
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    
    # Enable Google Search Grounding for live internet search
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
    
    # Try with Google Search Grounding first
    try:
        resp = requests.post(endpoint, json=payload_with_search, timeout=timeout)
    except Exception as exc:
        logger.warning(f"Gemini with search request failed: {exc}")
        resp = None

    # If Search Grounding is not supported on this model or returned error, fallback to standard Gemini call
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
