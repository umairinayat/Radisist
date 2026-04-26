import logging
import json

import httpx

from app.config import GEMINI_API_KEY, GLM_API_KEY, OPENROUTER_API_KEY, OPENROUTER_MODEL

logger = logging.getLogger(__name__)

TIMEOUT = 60.0


async def _call_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096},
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


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
    ("GLM", GLM_API_KEY, _call_glm),
    ("OpenRouter", OPENROUTER_API_KEY, _call_openrouter),
]


async def call_llm(prompt: str) -> dict:
    """Call LLM with fallback: Gemini -> GLM -> OpenRouter."""
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
