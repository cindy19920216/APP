"""뉴스 수집: Google News RSS 검색 결과 -> Article.
Google News 링크로는 본문을 가져올 수 없어 제목으로 판정한다(본문이 있는 다른 링크는 trafilatura로 추출).
하우스별 검색어로 모은 뒤, 제목에 외국계 하우스 이름이 있는 기사만 AI 판정에 보낸다."""
import time
import urllib.parse
import urllib.robotparser
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests
import trafilatura

from . import config
from .houses import find_house
from .models import Article

KST = timezone(timedelta(hours=9))


def feed_url(query: str, lang: str) -> str:
    q = urllib.parse.quote(f"{query} when:{config.RECENT_DAYS}d")
    loc = "hl=ko&gl=KR&ceid=KR:ko" if lang == "ko" else "hl=en-US&gl=US&ceid=US:en"
    return f"https://news.google.com/rss/search?q={q}&{loc}"


def build_queries() -> list[tuple[str, str, str]]:
    """(검색어, 대상 시장, 언어). 하우스마다 미국·한국 검색어를 만들고, EM/DM 일반 검색어를 더한다."""
    qs = []
    for en, ko in config.HOUSE_QUERY_NAMES:
        qs.append((f"{en} S&P 500", "US", "en"))
        qs.append((f"{en} KOSPI", "KR", "en"))
        if ko:
            qs.append((f"{ko} 코스피", "KR", "ko"))
    return qs + config.EXTRA_QUERIES


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
        src = e.get("source")
        source = ((src.get("title") if isinstance(src, dict) else None) or e.get("news_source") or "").strip()
        title = e.get("title", "").strip()
        if source and title.endswith(f" - {source}"):   # Google News는 제목 끝에 " - 언론사"를 붙인다
            title = title[: -len(source) - 3].strip()
        snippet = e.get("summary", "").strip()
        out.append(Article(
            url=_real_url(e.link),
            title=title,
            source=source,
            published=published,
            snippet="" if snippet.startswith("<a ") else snippet,
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


def with_house_in_title(articles: list[Article]) -> list[Article]:
    return [a for a in articles if find_house(a.title)]


def collect(as_of: date) -> list[Article]:
    found = []
    for query, market, lang in build_queries():
        try:
            r = requests.get(feed_url(query, lang), headers={"User-Agent": config.USER_AGENT}, timeout=20)
            found += parse_feed(r.text, market)
        except requests.RequestException:
            pass
        time.sleep(config.REQUEST_PAUSE)
    return with_house_in_title(dedupe_recent(found, as_of, config.RECENT_DAYS))[: config.MAX_ARTICLES_PER_RUN]


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
    if urllib.parse.urlparse(article.url).netloc == "news.google.com":   # 본문으로 이어지지 않는 링크
        return article
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
