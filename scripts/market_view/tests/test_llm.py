import httpx
import openai
import pytest

from market_view import llm

P = [
    {"name": "a", "base_url": "http://a", "model": "m", "key_env": "KEY_A"},
    {"name": "b", "base_url": "http://b", "model": "m", "key_env": "KEY_B"},
]


def rate_limited():
    resp = httpx.Response(429, request=httpx.Request("POST", "http://a"))
    return openai.RateLimitError("quota", response=resp, body=None)


class FakeClient:
    def __init__(self, behavior, calls, name):
        self.behavior, self.calls, self.name = behavior, calls, name
        self.chat = self
        self.completions = self

    def create(self, **kw):
        self.calls.append(self.name)
        b = self.behavior[self.name]
        if isinstance(b, Exception):
            raise b
        msg = type("M", (), {"content": b})
        return type("R", (), {"choices": [type("C", (), {"message": msg})]})


@pytest.fixture
def fake(monkeypatch):
    calls, behavior = [], {}
    monkeypatch.setattr(llm, "_make_client", lambda p, key: FakeClient(behavior, calls, p["name"]))
    monkeypatch.setattr(llm, "_exhausted", set())
    monkeypatch.setattr(llm, "_sleep", lambda s: None)
    monkeypatch.setenv("KEY_A", "x")
    monkeypatch.setenv("KEY_B", "y")
    return calls, behavior


def test_falls_back_on_429(fake):
    calls, behavior = fake
    behavior.update(a=rate_limited(), b='{"ok": 1}')
    assert llm.complete_json("s", "u", P) == ('{"ok": 1}', "b")


def test_skips_provider_without_key(fake, monkeypatch):
    calls, behavior = fake
    monkeypatch.delenv("KEY_A")
    behavior.update(a="never", b="[]")
    assert llm.complete_json("s", "u", P) == ("[]", "b")
    assert calls == ["b"]


def test_all_fail_raises(fake):
    calls, behavior = fake
    behavior.update(a=rate_limited(), b=rate_limited())
    with pytest.raises(llm.AllProvidersFailed):
        llm.complete_json("s", "u", P)


def test_rate_limited_provider_not_retried_in_same_run(fake):
    calls, behavior = fake
    behavior.update(a=rate_limited(), b="[]")
    llm.complete_json("s", "u", P)
    llm.complete_json("s", "u", P)
    assert calls == ["a", "a", "b", "b"]


def test_429_retried_once_before_giving_up(fake, monkeypatch):
    calls, behavior = fake
    seq = [rate_limited(), "[]"]
    class Flaky(FakeClient):
        def create(self, **kw):
            self.calls.append(self.name)
            v = seq.pop(0)
            if isinstance(v, Exception):
                raise v
            msg = type("M", (), {"content": v})
            return type("R", (), {"choices": [type("C", (), {"message": msg})]})
    monkeypatch.setattr(llm, "_make_client", lambda p, key: Flaky(behavior, calls, p["name"]))
    assert llm.complete_json("s", "u", P) == ("[]", "a")
    assert calls == ["a", "a"]


def test_malformed_response_falls_through(fake):
    calls, behavior = fake
    behavior.update(a=IndexError("no choices"), b="[]")
    assert llm.complete_json("s", "u", P) == ("[]", "b")
    behavior.update(a=openai.APIResponseValidationError(response=httpx.Response(200, request=httpx.Request("POST", "http://a")), body=None), b="[]")
    assert llm.complete_json("s", "u", P) == ("[]", "b")
