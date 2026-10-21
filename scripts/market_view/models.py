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
