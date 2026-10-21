import pytest
import requests

from market_view import collect, fetch
from market_view.fetch import TemporaryFailure, fetch_body, resolve_url

G = "https://news.google.com/rss/articles/CBMiABC?oc=5"
HTML = "<html><body><article><p>" + ("JPMorgan strategists said rising yields are no longer a headwind. " * 10) + "</p></article></body></html>"


def boom(*a, **k):
    raise AssertionError("should not be called")


class Resp:
    def __init__(self, status, text=""):
        self.status_code, self.text = status, text


@pytest.fixture(autouse=True)
def robots_ok(monkeypatch):
    monkeypatch.setattr(collect, "_robots_allows", lambda url: True)


def test_non_google_url_unchanged():
    assert resolve_url("https://www.msn.com/a", decoder=boom) == "https://www.msn.com/a"


def test_google_url_decoded():
    assert resolve_url(G, decoder=lambda u: {"success": True, "decoded_url": "https://real.com/a"}) == "https://real.com/a"


def test_google_url_not_found_is_permanent():
    assert resolve_url(G, decoder=lambda u: {"success": False, "message": "No decoded URL in batchexecute response."}) is None


def test_decoder_request_error_is_temporary():
    with pytest.raises(TemporaryFailure):
        resolve_url(G, decoder=lambda u: {"success": False, "message": "Request error in decode: timed out"})


def test_decoder_exception_is_temporary():
    def raises(u):
        raise RuntimeError("x")
    with pytest.raises(TemporaryFailure):
        resolve_url(G, decoder=raises)


def test_paywall_403_is_permanent():
    assert fetch_body("https://real.com/a", get=lambda *a, **k: Resp(403)) is None


def test_short_text_is_permanent():
    assert fetch_body("https://real.com/a", get=lambda *a, **k: Resp(200, "<p>short</p>")) is None


@pytest.mark.parametrize("status", [429, 503])
def test_429_and_5xx_are_temporary(status):
    with pytest.raises(TemporaryFailure):
        fetch_body("https://real.com/a", get=lambda *a, **k: Resp(status))


def test_timeout_is_temporary():
    def get(*a, **k):
        raise requests.Timeout()
    with pytest.raises(TemporaryFailure):
        fetch_body("https://real.com/a", get=get)


def test_robots_disallow_is_permanent(monkeypatch):
    monkeypatch.setattr(collect, "_robots_allows", lambda url: False)
    assert fetch_body("https://real.com/a", get=boom) is None


def test_body_returned():
    text = fetch_body("https://real.com/a", get=lambda *a, **k: Resp(200, HTML))
    assert text and "no longer a headwind" in text
