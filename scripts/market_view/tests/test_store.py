from datetime import date
from pathlib import Path

from market_view.models import MarketDay, Opinion
from market_view.store import load_history, load_recent_opinions, save_opinions, upsert_history


def op(**kw):
    base = dict(house="Goldman Sachs", market="KR", stance="bull", scope="country", horizon="short",
                report_date=date(2026, 10, 20), article_date=date(2026, 10, 21), quote="인용", summary="요약",
                confidence=0.9, url="u1")
    base.update(kw)
    return Opinion(**base)


def test_roundtrip(tmp_path: Path):
    save_opinions(date(2026, 10, 21), [op()], tmp_path)
    assert load_recent_opinions(date(2026, 10, 21), 7, tmp_path) == [op()]


def test_window_excludes_old_files(tmp_path: Path):
    save_opinions(date(2026, 10, 14), [op(url="old")], tmp_path)
    save_opinions(date(2026, 10, 15), [op(url="in")], tmp_path)
    got = load_recent_opinions(date(2026, 10, 21), 7, tmp_path)
    assert [o.url for o in got] == ["in"]


def test_history_upsert_same_day_once(tmp_path: Path):
    d = MarketDay(date(2026, 10, 21), "KR", 2, 1, 2 / 3, ["의견 적음"], ["r"], [op()], [])
    upsert_history(d, tmp_path)
    upsert_history(d, tmp_path)
    h = load_history(tmp_path)
    assert len(h) == 1
    assert h[0] == {"date": "2026-10-21", "market": "KR", "bull": 2, "bear": 1, "ratio": 2 / 3,
                    "badges": ["의견 적음"], "reasons": ["r"]}


def test_history_empty_when_missing(tmp_path: Path):
    assert load_history(tmp_path) == []
