"""표 집계 규칙 (스펙 4.2·4.3).
- 하우스·시장별 1표, 기준일(리포트일 우선)부터 7일 유효, 최신 의견이 이전 의견을 대체
- 같은 기준일이면 단기 > 12개월, 국가 명시 > EM/DM
- 중립은 약세, EM은 한국 표, DM은 미국 표
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
        ops.sort(key=lambda o: (
            -_effective_date(o).toordinal(),
            _HORIZON_RANK.get(o.horizon, 2),
            0 if o.scope == "country" else 1,
        ))
        votes.append(ops[0])
    votes.sort(key=lambda o: o.house)
    return votes, review


def summarize_day(opinions: list[Opinion], market: str, as_of: date, reasons: list[str]) -> MarketDay:
    votes, review = select_votes(opinions, market, as_of)
    bull = sum(1 for v in votes if to_vote_stance(v) == "bull")
    bear = len(votes) - bull
    ratio = bull / len(votes) if votes else None

    badges = []
    if not votes:
        badges.append("의견 없음")
    else:
        if len(votes) < config.FEW_VOTES:
            badges.append("의견 적음")
        if config.SPLIT_LOW <= ratio <= config.SPLIT_HIGH:
            badges.append("의견 갈림")
    return MarketDay(as_of, market, bull, bear, ratio, badges, list(reasons), votes, review)
