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

logger = logging.getLogger("llm_service")

# Default Environment Configuration
DEFAULT_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
DEFAULT_MODEL = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
DEFAULT_API_KEY = (
    os.getenv("LLM_API_KEY") or
    os.getenv("GROQ_API_KEY") or
    os.getenv("GEMINI_API_KEY") or
    os.getenv("OPENAI_API_KEY") or
    ""
)
DEFAULT_BASE_URL = os.getenv("LLM_BASE_URL", "")

SYSTEM_PROMPT = """You are an AI Document Assistant for CMPDI (Central Mine Planning & Design Institute) / Coal India Limited.
Your task is to answer user queries using the retrieved CMPDI document context blocks provided below.

CRITICAL INSTRUCTIONS FOR ANSWERING:
1. SUMMARIZE RELEVANT DATA: When retrieved context blocks contain relevant coal parameters (such as Proved Reserves, Coal Seams, Lithology, Thickness, Ash Content, GCV, or Drilling Logs), ALWAYS summarize and report those details to the user.
2. ABSENCE OF SPECIFIC PRODUCTION FIGURES: If the user asks for "coal production" or annual production figures, and exact annual production figures are not explicitly given in the text, explicitly state:
   "Exact annual production figures are not explicitly detailed in the retrieved document blocks. However, the relevant coal reserves, seam specifications, and exploration details found in the available CMPDI documents are summarized below:"
   Then provide a structured summary of the available coal seam thickness, proved reserves (e.g. 14.8 Million Tonnes in North Karanpura Block C), calorific value, and lithology.
3. NEVER INVENT VALUES: Do NOT fabricate annual production numbers, dates, or figures not present in the context.
4. UNRELATED TOPICS: ONLY state "The requested information was not found in the available CMPDI documents." if the retrieved context blocks contain ZERO relevant coal or geological data whatsoever (or are completely off-topic).
5. PRESERVE NUMBERS AND UNITS: Preserve exact numbers, reserves (e.g. 14.8 Million Tonnes), depth meters, ash content (%), GCV (kcal/kg), and seam codes exactly as reported in the context.
6. CITATION MAPPING: Cite the relevant document names and page/sheet references in your answer.
"""


def get_system_prompt_for_mode(mode: str) -> str:
    if mode == "GENERAL":
        return "You are a helpful and knowledgeable AI Assistant. Answer the user's question clearly and accurately."
    elif mode == "MIXED":
        return "You are an AI Document Assistant. First, provide a clear general explanation for the concept asked. Then, if CMPDI context is provided below, summarize the specific evidence related to the user's question. If CMPDI context is insufficient for the specific part, state that."
    elif mode == "CALCULATION":
        return "You are an AI Assistant. Perform the requested calculation accurately step-by-step. If CMPDI context is provided, first extract the stated values exactly as they appear, then perform the calculation."
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
    Calls configured LLM provider to generate a grounded answer from retrieved context.
    """
    provider_name = (provider or os.getenv("LLM_PROVIDER") or DEFAULT_PROVIDER).lower()
    model_name = model or os.getenv("LLM_MODEL") or DEFAULT_MODEL
    key = api_key or os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or DEFAULT_API_KEY
    url = base_url or os.getenv("LLM_BASE_URL") or DEFAULT_BASE_URL

    if mode == "RAG" and (not formatted_context or not formatted_context.strip()):
        return {
            "answer": "The requested information was not found in the available CMPDI documents.",
            "provider": provider_name,
            "model": model_name,
            "status": "not_found"
        }

    sys_prompt = get_system_prompt_for_mode(mode)
    
    if mode == "GENERAL":
        user_prompt = f"User Question: {query}"
    else:
        user_prompt = (
            f"User Question: {query}\n\n"
            f"Retrieved CMPDI Document Context Blocks:\n{formatted_context}\n\n"
            f"Task:\n"
            f"Answer the user question based strictly on the context blocks above (or provide general explanation if MIXED/CALCULATION).\n"
            f"- If relevant coal, seam, geological, or report details are present, summarize them clearly.\n"
            f"- If exact figures (like annual production tonnages) are missing or if the context blocks are empty, state that exact numbers are not found in the current knowledge base, but summarize what IS present or provide the general explanation.\n"
            f"- Follow all system grounding rules."
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
    payload = {
        "model": model or "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1
    }
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
    if resp.status_code == 200:
        data = resp.json()
        answer = data["choices"][0]["message"]["content"].strip()
        return {
            "answer": answer,
            "provider": "groq",
            "model": model or "llama-3.1-8b-instant",
            "status": "success"
        }
    else:
        return {
            "answer": None,
            "provider": "groq",
            "model": model,
            "status": "provider_error",
            "error": f"Groq API HTTP {resp.status_code}: {resp.text}"
        }


def _call_gemini(user_prompt: str, model: str, api_key: str, timeout: int, sys_prompt: str) -> Dict[str, Any]:
    model_name = model or "gemini-1.5-flash"
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{sys_prompt}\n\n{user_prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1
        }
    }
    resp = requests.post(endpoint, json=payload, timeout=timeout)
    if resp.status_code == 200:
        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            answer = "".join([p.get("text", "") for p in parts]).strip()
            return {
                "answer": answer,
                "provider": "gemini",
                "model": model_name,
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
