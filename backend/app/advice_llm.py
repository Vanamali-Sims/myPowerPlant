"""
Ask Groq or Gemini to phrase a What if comparison.

The key never lives in the frontend. Locally it is LLM_API_KEY. In production
the Lambda reads SSM at runtime, so a later key update survives the next
deploy. A missing key, a timeout, or a sentence that invents a figure all
come back as "not available" and the page uses its fixed line.
"""

import json
import os
import re
from typing import Any

import httpx

from app.advice_guard import numbers_are_known

_TIMEOUT = 12.0
_cached_key: str | None = None

_DEFAULT_MODELS = {
    "groq": "openai/gpt-oss-20b",
    "gemini": "gemini-2.5-flash",
}


def _key() -> str:
    """Return the API key, or an empty string when the model should stay off."""
    global _cached_key
    env = os.getenv("LLM_API_KEY", "").strip()
    if env and env != "unset":
        return env
    if os.getenv("ENVIRONMENT", "local") != "production":
        return ""
    if _cached_key is not None:
        return _cached_key
    name = os.getenv("LLM_API_KEY_PARAM", "").strip()
    if not name:
        _cached_key = ""
        return ""
    try:
        import boto3

        value = boto3.client("ssm").get_parameter(Name=name, WithDecryption=True)["Parameter"]["Value"]
    except Exception:
        value = ""
    value = "" if value.strip() in {"", "unset"} else value.strip()
    _cached_key = value
    return value


def _prompt(body: dict[str, Any]) -> str:
    lines = [f"- {fact['label']}: {fact['display']}" for fact in body["facts"]]
    caveats = []
    if body.get("lowControl"):
        caveats.append("The matched plan leaves the household less say over the battery.")
    if body.get("staleTerms"):
        caveats.append("Some plan terms have not been checked in over 90 days.")
    return "\n".join(
        [
            "You explain a household energy comparison that has already been decided.",
            "Write two or three short sentences.",
            "Use only the figures listed. Do not add numbers, dollars, or kWh.",
            "The word was means the saved setup. The word now means the setup on screen.",
            "Never swap them. Do not call the saved number now, and do not call the on-screen number after.",
            "People are people in the home. Dishwasher and washing figures are cycles per week, not a count of machines.",
            "If weekly use before and weekly use now match, do not say the household size changed how much power the home uses.",
            "Describe the day chart using the spare-solar hours given, which are clock words.",
            "Say the figures are a model, not a bill. Do not start with the words the model shows.",
            "",
            f"Decision: {body['decision']}",
            f"What changed: {'; '.join(body['changes'])}",
            f"Spare solar before: {body['surplusNow']}",
            f"Spare solar now: {body['surplusDraft']}",
            *caveats,
            "",
            "Figures you may use:",
            *lines,
        ]
    )


def _parse_text(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return cleaned
    if isinstance(parsed, dict) and isinstance(parsed.get("text"), str):
        return parsed["text"].strip()
    return ""


async def _complete(prompt: str) -> str:
    provider = os.getenv("LLM_PROVIDER", "groq").strip().lower()
    model = os.getenv("LLM_MODEL", "").strip() or _DEFAULT_MODELS.get(provider, _DEFAULT_MODELS["groq"])
    key = _key()
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            response = await client.post(
                url,
                headers={"x-goog-api-key": key, "Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 180,
                        "responseMimeType": "application/json",
                    },
                },
            )
            response.raise_for_status()
            parts = response.json()["candidates"][0]["content"]["parts"]
            return _parse_text(parts[0].get("text", ""))

        payload: dict = {
            "model": model,
            "temperature": 0.2,
            "max_tokens": 700,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": 'Reply as JSON: {"text": "..."}'},
                {"role": "user", "content": prompt},
            ],
        }
        if "gpt-oss" in model:
            payload["reasoning_effort"] = "low"
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        return _parse_text(response.json()["choices"][0]["message"]["content"])


async def write_advice(body: dict[str, Any]) -> str | None:
    """
    write_advice

    Args:
        body: The validated comparison. It is not stored.

    Returns:
        str | None: A sentence whose figures are all in the pack, or None when
        the model should be skipped.

    None covers a missing key, a failed call, and a sentence that invents a number.
    """
    if not _key():
        return None
    try:
        text = await _complete(_prompt(body))
    except Exception:
        return None
    if not text:
        return None
    allowed = [fact["numeric"] for fact in body["facts"] if isinstance(fact.get("numeric"), (int, float))]
    for line in body.get("changes") or []:
        for raw in re.findall(r"\d+(?:\.\d+)?", str(line)):
            allowed.append(float(raw))
    if not numbers_are_known(text, allowed):
        return None
    return text
