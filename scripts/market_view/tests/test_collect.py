from datetime import date
from pathlib import Path

import requests

from market_view import collect as c
from market_view.models import Article

FIX = (Path(__file__).parent / "fixtures" / "bing_kr.xml").read_text(encoding="utf-8")


def test_parse_feed_fields_and_kst_date():
    arts = c.parse_feed(FIX, "KR")
    a = arts[0]
    assert a.url == "https://www.hankyung.com/article/1"
    assert a.title == '골드만삭스 "코스피 1만2000 유지"'
    assert a.source == "한국경제"
    assert a.published == date(2026, 10, 21)  # 23:10 GMT = 다음날 08:10 KST
    assert a.snippet == "골드만삭스가 코스피 목표치를 유지했다."
    assert a.text is None and a.market_hint == "KR"


def test_dedupe_and_recent_only():
    arts = c.dedupe_recent(c.parse_feed(FIX, "KR"), date(2026, 10, 21), days=2)
    assert [a.url for a in arts] == ["https://www.hankyung.com/article/1"]


def test_feed_url_lang():
    assert "setlang=ko" in c.feed_url("골드만삭스 코스피", "ko")
    assert "setlang=en" in c.feed_url("Goldman Sachs KOSPI", "en")
    assert "format=rss" in c.feed_url("x", "en")


def test_fill_text_survives_network_error(monkeypatch):
    def boom(*a, **k):
        raise requests.ConnectionError("down")
    monkeypatch.setattr(c.requests, "get", boom)
    a = Article("https://x", "t", "s", date(2026, 10, 21), "snip", None, "KR")
    assert c.fill_text(a).text is None


def test_fill_text_rejects_js_wall(monkeypatch):
    class R:
        status_code = 200
        text = "<html><body><p>Enable JavaScript and cookies to continue</p></body></html>"
    monkeypatch.setattr(c.requests, "get", lambda *a, **k: R())
    a = Article("https://x", "t", "s", date(2026, 10, 21), "snip", None, "KR")
    assert c.fill_text(a).text is None


def test_robots_disallow_skips_body_fetch(monkeypatch):
    fetched = []
    class R:
        def __init__(self, status, text):
            self.status_code, self.text = status, text
    def get(url, **k):
        fetched.append(url)
        if url.endswith("/robots.txt"):
            return R(200, "User-agent: *\nDisallow: /\n")
        return R(200, "<p>" + "body " * 200 + "</p>")
    monkeypatch.setattr(c.requests, "get", get)
    monkeypatch.setattr(c, "_robots_cache", {})
    a = Article("https://blocked.example/a", "t", "s", date(2026, 10, 21), "snip", None, "KR")
    assert c.fill_text(a).text is None
    assert fetched == ["https://blocked.example/robots.txt"]
