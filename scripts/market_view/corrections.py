"""사람이 적은 수정(data/corrections.csv)을 AI 판정보다 우선 적용한다.
(url, house, market)이 같으면 stance를 바꾸고(url은 원래 기사 주소 source_url이어도 된다), stance가 'drop'이면 그 의견을 뺀다.
손으로 고치는 파일이라 잘못된 줄은 경고만 찍고 건너뛴다."""
import csv
from dataclasses import replace
from pathlib import Path

from .houses import normalize_house
from .models import STANCES, Opinion

_FIELDS = ("url", "house", "market", "stance")


def load_corrections(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, encoding="utf-8-sig", newline="") as f:
        return [dict(row) for row in csv.DictReader(f)]


def _clean(row: dict) -> tuple[tuple[str, str, str], str] | None:
    vals = {k: (row.get(k) or "").strip() for k in _FIELDS}
    if not all(vals.values()):
        return None
    house = normalize_house(vals["house"]) or vals["house"]
    stance = vals["stance"].lower()
    if stance not in STANCES | {"drop"}:
        return None
    return (vals["url"], house, vals["market"].upper()), stance


def apply_corrections(opinions: list[Opinion], corrections: list[dict]) -> list[Opinion]:
    fixes = {}
    for row in corrections:
        c = _clean(row)
        if c is None:
            if any((v or "").strip() for v in row.values() if isinstance(v, str)):
                print(f"[corrections] 잘못된 줄 건너뜀: {row}")
            continue
        fixes[c[0]] = c[1]
    out = []
    for op in opinions:
        stance = fixes.get((op.url, op.house, op.market))
        if stance is None and op.source_url:
            stance = fixes.get((op.source_url, op.house, op.market))
        if stance is None:
            out.append(op)
        elif stance != "drop":   # 사람이 고친 판정이 본문 판단보다 우선
            out.append(replace(op, stance=stance, confidence=1.0, body_stance=""))
    return out
