"""무료 AI 제공자 폴백 클라이언트.
키가 없는 제공자는 건너뛰고, 오류가 나면 다음 제공자로 넘어간다.
429(한도)는 분당 한도일 수 있으므로 잠깐 기다렸다 한 번 더 시도하고, 그래도 막히면
이번 실행 동안 그 제공자를 다시 쓰지 않는다."""
import os
import time

import openai

from . import config


class AllProvidersFailed(Exception):
    pass


_exhausted: set[str] = set()
_sleep = time.sleep


def _make_client(provider: dict, key: str):
    return openai.OpenAI(base_url=provider["base_url"], api_key=key, timeout=60, max_retries=1)


def _retry_after(e: openai.RateLimitError) -> float:
    try:
        return min(float(e.response.headers.get("retry-after", "")), config.RATE_LIMIT_WAIT_MAX)
    except (TypeError, ValueError, AttributeError):
        return config.RATE_LIMIT_WAIT


def _call(p: dict, key: str, system: str, user: str) -> str:
    model = os.environ.get(p.get("model_env", ""), "") or p["model"]
    r = _make_client(p, key).chat.completions.create(
        model=model,
        temperature=0,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    return r.choices[0].message.content or ""


def complete_json(system: str, user: str, providers=None) -> tuple[str, str]:
    errors = []
    for p in providers or config.PROVIDERS:
        key = os.environ.get(p["key_env"])
        if not key or p["name"] in _exhausted:
            continue
        for attempt in (1, 2):
            try:
                return _call(p, key, system, user), p["name"]
            except openai.RateLimitError as e:
                if attempt == 1:
                    _sleep(_retry_after(e))
                    continue
                _exhausted.add(p["name"])
                errors.append(f"{p['name']}: {e}")
            except (openai.APIError, IndexError, TypeError, AttributeError) as e:
                errors.append(f"{p['name']}: {e}")
                break
    raise AllProvidersFailed("; ".join(errors) or "no provider has an API key")
