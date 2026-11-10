"""근거 보강용: Google News 링크를 원래 기사 주소로 풀고, 본문을 가져온다.
None = 다시 시도해도 소용없는 실패(유료 기사, robots 차단, 기사 없음), TemporaryFailure = 다음 실행에서 다시 시도."""
import urllib.parse

import requests
import trafilatura

from . import collect, config

_GOOGLE_PATHS = ("/rss/articles/", "/articles/", "/read/")


class TemporaryFailure(Exception):
    """네트워크·시간 초과·요청 제한처럼 다음에 다시 해 볼 만한 실패."""


def _is_google_news(url: str) -> bool:
    p = urllib.parse.urlparse(url)
    return p.netloc == "news.google.com" and p.path.startswith(_GOOGLE_PATHS)


def _default_decoder(url: str) -> dict:
    from googlenewsdecoder import gnewsdecoder
    return gnewsdecoder(url, interval=1, timeout=config.ENRICH_TIMEOUT)


def resolve_url(url: str, decoder=None) -> str | None:
    if not _is_google_news(url):
        return url
    try:
        r = (decoder or _default_decoder)(url)
    except Exception as e:
        raise TemporaryFailure(str(e)) from e
    if r.get("success") and r.get("decoded_url"):
        return r["decoded_url"]
    if r.get("message") == "Invalid Google News URL format.":   # 이 경우만 다시 해도 소용없다
        return None
    raise TemporaryFailure(str(r.get("message")))   # 네트워크 오류·Google 요청 제한·빈 응답


def fetch_body(url: str, get=requests.get) -> str | None:
    if not collect._robots_allows(url):
        return None
    try:
        r = get(url, headers={"User-Agent": config.USER_AGENT}, timeout=config.ENRICH_TIMEOUT)
    except requests.RequestException as e:
        raise TemporaryFailure(str(e)) from e
    if r.status_code == 429 or r.status_code >= 500:
        raise TemporaryFailure(f"HTTP {r.status_code}")
    if r.status_code != 200:   # 401·402·403·404·410 등: 유료·차단·없는 기사
        return None
    text = trafilatura.extract(r.content)   # 바이트로 넘겨 meta charset(euc-kr 등)을 trafilatura가 읽게 한다
    return text if text and len(text) >= config.MIN_TEXT_CHARS else None
