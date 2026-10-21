"""표 집계 규칙 (스펙 4.2·4.3).
- 하우스·시장별 1표, 기준일(리포트일 우선)부터 7일 유효, 최신 의견이 이전 의견을 대체
- 같은 기준일이면 단기 > 12개월, 국가 명시 > EM/DM
- 중립은 약세, EM은 한국 표, DM은 미국 표
- 우선순위가 같은 의견끼리 방향이 엇갈리면 표로 세지 않고 '확인 필요'로 보낸다
"""
from datetime import date

from . import config
from .models import MarketDay, Opinion

_HORIZON_RANK = {"short": 0, "12m": 1, "unknown": 2}


def to_vote_stance(op: Opinion) -> str | None:
    if op.stance == "bull":
        return "bull"
    if op.stance in ("bear", "neutral"):
        return "bear"
    return None


def _target_market(op: Opinion) -> str | None:
    if op.scope == "EM":
        return "KR"
    if op.scope == "DM":
        return "US"
    return op.market


def _effective_date(op: Opinion) -> date:
    return op.report_date or op.article_date


def _needs_review(op: Opinion) -> bool:
    return to_vote_stance(op) is None or op.confidence < config.MIN_CONFIDENCE or op.scope == "other"


def select_votes(opinions: list[Opinion], market: str, as_of: date) -> tuple[list[Opinion], list[Opinion]]:
    candidates: dict[str, list[Opinion]] = {}
    review: list[Opinion] = []
    for op in opinions:
        if _target_market(op) != market:
            continue
        age = (as_of - _effective_date(op)).days
        if not 0 <= age < config.VALID_DAYS:
            continue
        if _needs_review(op):
            review.append(op)
        else:
            candidates.setdefault(op.house, []).append(op)

    votes = []
    for ops in candidates.values():
        rank = lambda o: (-_effective_date(o).toordinal(), _HORIZON_RANK.get(o.horizon, 2),
                          0 if o.scope == "country" else 1)
        ops.sort(key=rank)
        top = [o for o in ops if rank(o) == rank(ops[0])]
        if len({to_vote_stance(o) for o in top}) > 1:
            review += top   # 같은 날·같은 기간·같은 범위에서 의견이 엇갈리면 세지 않고 사람이 확인
        else:
            votes.append(ops[0])
    votes.sort(key=lambda o: o.house)
    return votes, review


def _badges(n_votes: int, ratio: float | None) -> list[str]:
    if not n_votes:
        return ["의견 없음"]
    badges = []
    if n_votes < config.FEW_VOTES:
        badges.append("의견 적음")
    if config.SPLIT_LOW <= ratio <= config.SPLIT_HIGH:
        badges.append("의견 갈림")
    return badges


def _count(votes: list[Opinion]) -> tuple[int, int]:
    bull = sum(1 for v in votes if to_vote_stance(v) == "bull")
    return bull, len(votes) - bull


def summarize_day(opinions: list[Opinion], market: str, as_of: date, reasons: list[str]) -> MarketDay:
    votes, review = select_votes(opinions, market, as_of)
    bull, bear = _count(votes)
    ratio = bull / len(votes) if votes else None
    return MarketDay(as_of, market, bull, bear, ratio, _badges(len(votes), ratio), list(reasons), votes, review,
                     {market: (bull, bear)})


def summarize_combined(opinions: list[Opinion], as_of: date, reasons: list[str]) -> MarketDay:
    """한국·미국 표를 합쳐 '주식시장' 하나로 판정한다. 표는 하우스·시장별로 세므로 한 하우스가 최대 2표."""
    votes, review, breakdown = [], [], {}
    for m in ("US", "KR"):
        v, r = select_votes(opinions, m, as_of)
        votes += v
        review += r
        breakdown[m] = _count(v)
    bull, bear = _count(votes)
    ratio = bull / len(votes) if votes else None
    return MarketDay(as_of, "ALL", bull, bear, ratio, _badges(len(votes), ratio), list(reasons), votes, review,
                     breakdown)
