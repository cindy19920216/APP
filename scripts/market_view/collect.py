"""뉴스 수집: Bing News RSS 검색 결과 -> Article, 본문은 trafilatura로 추출.
본문 추출이 실패해도 예외를 던지지 않고 text=None으로 둔다(제목+요약으로 판정)."""
import time
import urllib.parse
import urllib.robotparser
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests
import trafilatura

from . import config
from .models import Article

KST = timezone(timedelta(hours=9))


def feed_url(query: str, lang: str) -> str:
    cc = "kr" if lang == "ko" else "us"
    return ("https://www.bing.com/news/search?q=" + urllib.parse.quote(query)
            + f"&format=rss&setlang={lang}&cc={cc}")


def _real_url(link: str) -> str:
    qs = urllib.parse.parse_qs(urllib.parse.urlparse(link).query)
    return qs.get("url", [link])[0]


def _kst_date(s: str) -> date | None:
    try:
        return parsedate_to_datetime(s).astimezone(KST).date()
    except (TypeError, ValueError):
        return None


def parse_feed(xml: str, market: str) -> list[Article]:
    out = []
    for e in feedparser.parse(xml).entries:
        published = _kst_date(e.get("published", ""))
        if not published or not e.get("link"):
            continue
        out.append(Article(
            url=_real_url(e.link),
            title=e.get("title", "").strip(),
            source=(e.get("news_source") or "").strip(),
            published=published,
            snippet=e.get("summary", "").strip(),
            text=None,
            market_hint=market,
        ))
    return out


def dedupe_recent(articles: list[Article], as_of: date, days: int) -> list[Article]:
    seen, out = set(), []
    for a in articles:
        if not 0 <= (as_of - a.published).days < days:
            continue
        key = (a.url, a.title)
        if a.url in seen or a.title in seen:
            continue
        seen.update(key)
        out.append(a)
    return out


def collect(as_of: date) -> list[Article]:
    found = []
    for query, market, lang in config.QUERIES:
        try:
            r = requests.get(feed_url(query, lang), headers={"User-Agent": config.USER_AGENT}, timeout=20)
            found += parse_feed(r.text, market)
        except requests.RequestException:
            pass
        time.sleep(config.REQUEST_PAUSE)
    return dedupe_recent(found, as_of, config.RECENT_DAYS)


_robots_cache: dict[str, urllib.robotparser.RobotFileParser | None] = {}


def _robots_allows(url: str) -> bool:
    """사이트의 robots.txt를 지킨다. robots.txt를 못 읽으면 허용으로 본다."""
    parts = urllib.parse.urlparse(url)
    origin = f"{parts.scheme}://{parts.netloc}"
    if origin not in _robots_cache:
        rp = None
        try:
            r = requests.get(origin + "/robots.txt", headers={"User-Agent": config.USER_AGENT}, timeout=10)
            if r.status_code == 200:
                rp = urllib.robotparser.RobotFileParser()
                rp.parse(r.text.splitlines())
        except Exception:
            rp = None
        _robots_cache[origin] = rp
    rp = _robots_cache[origin]
    return rp is None or rp.can_fetch(config.USER_AGENT, url)


def fill_text(article: Article, timeout: float = 15) -> Article:
    if not _robots_allows(article.url):
        return article
    try:
        r = requests.get(article.url, headers={"User-Agent": config.USER_AGENT}, timeout=timeout)
        text = trafilatura.extract(r.text) if r.status_code == 200 else None
    except Exception:
        text = None
    if text and len(text) >= config.MIN_TEXT_CHARS:
        article.text = text
    return article
