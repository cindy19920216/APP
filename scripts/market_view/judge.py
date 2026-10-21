"""기사 판정: AI에게 외국계 의견을 뽑게 하고, 응답을 검증해 Opinion으로 바꾼다.
판단 기준은 스펙 4.2를 그대로 프롬프트에 고정한다."""
import json
import re
from datetime import date, timedelta

from .houses import normalize_house
from .llm import AllProvidersFailed, complete_json  # noqa: F401 (호출자가 쓰도록 다시 내보냄)
from .models import HORIZONS, MARKETS, SCOPES, STANCES, Article, Opinion

MAX_BODY_CHARS = 6000
MAX_QUOTE_CHARS = 200
MAX_REPORT_AGE_DAYS = 60   # 기사보다 이만큼 오래된 리포트 날짜는 잘못 읽었을 수 있어 '확인 필요'로
REVIEW_CONFIDENCE = 0.5    # 검증에 실패한 항목에 매기는 확신도 (MIN_CONFIDENCE보다 낮게)


class UnparsableResponse(Exception):
    """AI 응답에서 JSON을 찾지 못함 — 판정 실패로 센다."""

SYSTEM_PROMPT = """너는 주식 시장 뉴스에서 '외국계' 전문가의 시장 전망만 뽑아내는 분석가다.
기사 여러 개가 [1], [2] 처럼 번호와 함께 주어진다(대부분 제목만 있다). 각 기사에 나온 의견을 아래 규칙대로
JSON 배열로만 출력한다. 설명 문장은 쓰지 않는다. 해당 의견이 없으면 [] 를 출력한다.

[대상]
- 외국계만: 해외 IB 증권사(Goldman Sachs, Morgan Stanley, JPMorgan 등), 해외 자산운용사(BlackRock, PIMCO 등),
  독립 전략가(Fundstrat Tom Lee, Yardeni 등), 헤지펀드 매니저. 외국계 증권사 서울지점 리서치센터장도 포함.
- 제외: 국내 증권사·국내 운용사·개인 투자자·기자/칼럼니스트 본인의 의견.
- 제외: 투자자 설문·서베이 결과(BofA Fund Manager Survey, 투자자 설문 등). 설문 응답은 그 하우스의 의견이 아니다.
- 제외: 하우스가 시장 상황을 전달만 한 경우(자금 흐름 집계, 지수 등락 보도). 하우스 자신의 전망·권고만 센다.
- 이 기사에서 새로 발표되거나 다시 확인된 의견만 뽑는다. "앞서 ~를 전망했던", "지난달 ~했던" 처럼 배경으로 언급된
  과거 의견은 제외한다. 과거 의견을 꼭 넣어야 하면 report_date에 그 발표일을 반드시 적는다.
- 지수/시장 전반 의견만. 개별 종목 의견은 제외.

[항목 필드]
- id: 의견이 나온 기사의 번호(숫자).
- house: 하우스 이름(영문 정식 명칭). 독립 전략가는 소속(예: Fundstrat) 또는 본인 이름.
- market: "KR"(한국 증시) 또는 "US"(미국 증시).
- scope: 한국·코스피·코스닥 또는 미국·S&P 500·나스닥을 직접 언급 = "country",
  신흥국(EM, emerging markets) 전체 = "EM", 선진국(DM, developed markets) 전체 = "DM",
  그 밖의 넓은 범위(아시아, 글로벌 주식 등) = "other". EM이면 market="KR", DM이면 market="US"로 쓴다.
- stance:
  - 목표치 상향, 비중확대, Overweight, 매수 권고, 상승 전망 = "bull"
  - 목표치 하향, 비중축소, Underweight, 하락·조정 전망 = "bear"
  - Neutral, Market-weight, Equal-weight, 중립 = "neutral"
  - "목표치 유지"는 함께 밝힌 투자의견이나 단기 코멘트를 따른다. 다른 단서가 없으면 "unclear".
  - 판단이 애매하면 "unclear".
- horizon: 수 주~수 개월 단기 전망 = "short", 12개월·연말 목표 = "12m", 알 수 없음 = "unknown".
  같은 하우스가 단기 의견과 12개월 의견을 함께 내면 항목을 두 개로 나눠 각각 표기한다.
- report_date: 기사에 원 리포트 발표일이 명시된 경우에만 "YYYY-MM-DD", 아니면 null.
- quote: 판정 근거가 된 기사 원문(제목 또는 본문)을 그대로 옮긴 부분(번역하지 말 것).
  제목만으로 방향을 알 수 없으면(예: "골드만, 코스피 전망 발표") stance를 "unclear"로 한다.
- summary: 한국어 한 줄 요약. 밸류에이션, EPS, 비중확대 같은 주식 용어는 그대로 쓴다.
- confidence: 0~1 사이 숫자. 기사에서 의견이 명확할수록 높게.

[출력 예]
[{"id": 1, "house": "Goldman Sachs", "market": "KR", "stance": "bull", "scope": "country", "horizon": "12m",
  "report_date": null, "quote": "...", "summary": "코스피 12개월 목표치 상향", "confidence": 0.9}]"""

REASONS_PROMPT = """아래는 오늘 집계된 외국계 전문가 의견 요약이다. 강세/약세 논리 중 가장 많이 언급된 근거를
최대 3줄로 정리해 JSON 문자열 배열로만 출력한다. 주식 용어는 그대로 쓴다. 예: ["금리 인하 기대 확대", "반도체 EPS 상향", "밸류에이션 부담 지적"]"""


def _extract_json(raw: str):
    """응답에서 JSON 배열(또는 객체 하나)을 찾는다. 못 찾으면 UnparsableResponse."""
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", (raw or "").strip())
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    dec = json.JSONDecoder()
    for m in re.finditer(r"[\[{]", text):
        try:
            return dec.raw_decode(text, m.start())[0]
        except json.JSONDecodeError:
            continue
    raise UnparsableResponse((raw or "")[:200])


def _parse_date(s) -> date | None:
    try:
        return date.fromisoformat(s) if isinstance(s, str) else None
    except ValueError:
        return None


def _norm(s: str) -> str:
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    return re.sub(r"\s+", " ", s).strip().lower()


def _to_opinion(d: dict, article: Article, src: str | None) -> Opinion | None:
    house = normalize_house(str(d.get("house", "")))
    conf = d.get("confidence")
    if (house is None or d.get("market") not in MARKETS or d.get("stance") not in STANCES
            or d.get("scope") not in SCOPES or d.get("horizon") not in HORIZONS
            or isinstance(conf, bool) or not isinstance(conf, (int, float))):
        return None
    conf = float(conf)
    quote = str(d.get("quote", ""))
    report_date = _parse_date(d.get("report_date"))
    if report_date and report_date > article.published:
        report_date = None   # 기사보다 미래 날짜는 잘못 읽은 것 -> 기사 날짜 사용
    if report_date and article.published - report_date > timedelta(days=MAX_REPORT_AGE_DAYS):
        conf = min(conf, REVIEW_CONFIDENCE)
    if src is not None and _norm(quote) not in src:
        conf = min(conf, REVIEW_CONFIDENCE)   # 원문에 없는 인용 -> 확인 필요
    return Opinion(
        house=house, market=d["market"], stance=d["stance"], scope=d["scope"], horizon=d["horizon"],
        report_date=report_date, article_date=article.published,
        quote=quote[:MAX_QUOTE_CHARS], summary=str(d.get("summary", "")),
        confidence=conf, url=article.url,
    )


def _items(raw: str) -> list:
    data = _extract_json(raw)
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise UnparsableResponse(str(raw)[:200])
    return [d for d in data if isinstance(d, dict)]


def parse_opinions(raw: str, article: Article, source: str | None = None) -> list[Opinion]:
    """기사 하나에 대한 AI 응답을 검증해 Opinion으로 바꾼다. source를 주면 인용문이 원문에 있는지 확인한다."""
    src = _norm(source) if source else None
    return [o for d in _items(raw) if (o := _to_opinion(d, article, src))]


def _source_text(a: Article) -> str:
    return f"{a.title}\n{(a.text or a.snippet or '')[:MAX_BODY_CHARS]}"


def judge_batch(articles: list[Article]) -> list[Opinion]:
    """기사 여러 개를 한 번에 판정. 모든 제공자가 실패하면 AllProvidersFailed를 그대로 던진다."""
    parts = []
    for i, a in enumerate(articles, 1):
        body = (a.text or a.snippet or "")[:MAX_BODY_CHARS]
        parts.append(f"[{i}] 날짜: {a.published.isoformat()} | 출처: {a.source}\n제목: {a.title}"
                     + (f"\n{body}" if body else ""))
    raw, _ = complete_json(SYSTEM_PROMPT, "\n\n".join(parts))
    out = []
    for d in _items(raw):
        i = d.get("id")
        if isinstance(i, bool) or not isinstance(i, int) or not 1 <= i <= len(articles):
            continue
        a = articles[i - 1]
        if o := _to_opinion(d, a, _norm(_source_text(a))):
            out.append(o)
    return out


def judge_article(article: Article) -> list[Opinion]:
    return judge_batch([article])


def summarize_reasons(votes: list[Opinion], market: str) -> list[str]:
    if not votes:
        return []
    lines = "\n".join(f"- {v.house} ({'강세' if v.stance == 'bull' else '약세'}): {v.summary}" for v in votes)
    try:
        label = {"ALL": "한국·미국 주식시장", "KR": "한국 증시", "US": "미국 증시"}.get(market, market)
        raw, _ = complete_json(REASONS_PROMPT, f"시장: {label}\n{lines}")
        data = _extract_json(raw)
    except Exception:
        return []
    if not isinstance(data, list):
        return []
    return [str(x) for x in data if isinstance(x, str)][:3]
