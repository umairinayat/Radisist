import logging
import json

import httpx

from app.config import GEMINI_API_KEY, OPENAI_API_KEY, GLM_API_KEY, OPENROUTER_API_KEY, OPENROUTER_MODEL

logger = logging.getLogger(__name__)

TIMEOUT = 60.0


GEMINI_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.6-flash",
    "gemma-4-26b-a4b-it",
    "gemma-4-31b-it",
]

async def _call_gemini(prompt: str) -> str:
    last_error = None
    for model in GEMINI_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096},
            }
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                logger.info(f"Gemini {model} succeeded")
                return text
        except Exception as e:
            last_error = e
            logger.warning(f"Gemini {model} failed: {e}")
            continue
    raise last_error or RuntimeError("All Gemini models failed")


async def _call_openai(prompt: str) -> str:
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 4096,
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def _call_glm(prompt: str) -> str:
    url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    headers = {"Authorization": f"Bearer {GLM_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "glm-4.5-flash",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 8192,
        "thinking": {"type": "disabled"},
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def _call_openrouter(prompt: str) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 4096,
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


PROVIDERS = [
    ("Gemini", GEMINI_API_KEY, _call_gemini),
    ("OpenAI", OPENAI_API_KEY, _call_openai),
    ("GLM", GLM_API_KEY, _call_glm),
    ("OpenRouter", OPENROUTER_API_KEY, _call_openrouter),
]


async def call_llm(prompt: str) -> dict:
    """Call LLM with fallback: Gemini -> OpenAI -> GLM -> OpenRouter."""
    errors = []

    for name, api_key, call_fn in PROVIDERS:
        if not api_key:
            logger.info(f"Skipping {name}: no API key configured")
            continue

        try:
            logger.info(f"Trying {name}...")
            response = await call_fn(prompt)
            logger.info(f"{name} succeeded")
            return {"provider": name, "response": response, "error": None}
        except Exception as e:
            error_msg = f"{name} failed: {str(e)}"
            logger.warning(error_msg)
            errors.append(error_msg)

    return {
        "provider": None,
        "response": None,
        "error": f"All LLM providers failed: {'; '.join(errors)}",
    }
