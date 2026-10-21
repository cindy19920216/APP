"""data/ 아래 JSON 저장: 날짜별 의견(opinions/YYYY-MM-DD.json)과 차트용 이력(history.json)."""
import json
from datetime import date, timedelta
from pathlib import Path

from .models import MarketDay, Opinion


def _write(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def save_opinions(day: date, opinions: list[Opinion], root: Path) -> None:
    _write(root / "opinions" / f"{day.isoformat()}.json", [o.to_dict() for o in opinions])


def load_recent_opinions(as_of: date, days: int, root: Path) -> list[Opinion]:
    out = []
    for i in range(days - 1, -1, -1):
        p = root / "opinions" / f"{(as_of - timedelta(days=i)).isoformat()}.json"
        if p.exists():
            out += [Opinion.from_dict(d) for d in json.loads(p.read_text(encoding="utf-8"))]
    return out


def load_history(root: Path) -> list[dict]:
    p = root / "history.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def upsert_history(entry: MarketDay, root: Path) -> None:
    row = {"date": entry.date.isoformat(), "market": entry.market, "bull": entry.bull, "bear": entry.bear,
           "ratio": entry.ratio, "badges": entry.badges, "reasons": entry.reasons,
           "breakdown": {m: list(v) for m, v in entry.breakdown.items()}}
    rows = [r for r in load_history(root) if (r["date"], r["market"]) != (row["date"], row["market"])]
    rows.append(row)
    rows.sort(key=lambda r: (r["date"], r["market"]))
    _write(root / "history.json", rows)


def load_judged(root: Path) -> dict[str, str]:
    """이미 판정한 기사 URL -> 판정한 날짜. 같은 기사를 다시 판정해 무료 한도를 쓰지 않도록."""
    p = root / "judged.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def save_judged(judged: dict[str, str], as_of: date, keep_days: int, root: Path) -> None:
    cutoff = (as_of - timedelta(days=keep_days)).isoformat()
    _write(root / "judged.json", {u: d for u, d in judged.items() if d >= cutoff})
