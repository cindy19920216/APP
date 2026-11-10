"""데이터 모델: 기사, 의견, 시장별 하루 결과."""
from dataclasses import dataclass, field, asdict
from datetime import date

STANCES = {"bull", "bear", "neutral", "unclear"}
SCOPES = {"country", "EM", "DM", "other"}
HORIZONS = {"short", "12m", "unknown"}
MARKETS = {"KR", "US"}


@dataclass
class Article:
    url: str
    title: str
    source: str
    published: date
    snippet: str
    text: str | None
    market_hint: str


@dataclass
class Opinion:
    house: str
    market: str
    stance: str
    scope: str
    horizon: str
    report_date: date | None
    article_date: date
    quote: str
    summary: str
    confidence: float
    url: str
    reason: str = ""          # 본문 기반 근거 1~2줄 (근거 보강 단계)
    body_stance: str = ""     # 본문만 보고 다시 판단한 방향. 제목 판단과 다르면 '확인 필요'
    source_url: str = ""      # Google News 주소를 푼 원래 기사 주소 (화면 링크용)
    enriched: bool = False    # 근거 보강이 끝났는지 (성공 또는 다시 시도하지 않는 실패)
    enrich_tries: int = 0     # 일시 실패 횟수
    title_summary: str = ""   # 근거 보강이 summary를 바꾸기 전의 제목 기반 요약 (사람이 본문 판단을 뒤집으면 되돌린다)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["report_date"] = self.report_date.isoformat() if self.report_date else None
        d["article_date"] = self.article_date.isoformat()
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Opinion":
        d = dict(d)
        d["report_date"] = date.fromisoformat(d["report_date"]) if d.get("report_date") else None
        d["article_date"] = date.fromisoformat(d["article_date"])
        return cls(**d)


def opinion_key(op: Opinion) -> tuple:
    """같은 의견인지 가리는 열쇠 (날짜별 파일 병합·갱신에 쓴다)."""
    return (op.url, op.house, op.market, op.horizon, op.scope)


@dataclass
class MarketDay:
    date: date
    market: str
    bull: int
    bear: int
    ratio: float | None
    badges: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)
    votes: list[Opinion] = field(default_factory=list)
    needs_review: list[Opinion] = field(default_factory=list)
    breakdown: dict[str, tuple[int, int]] = field(default_factory=dict)   # 시장별 (강세, 약세) 표 수
