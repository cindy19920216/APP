from datetime import date
from pathlib import Path

from market_view.corrections import apply_corrections, load_corrections
from market_view.models import Opinion


def op(**kw):
    base = dict(house="Goldman Sachs", market="KR", stance="bull", scope="country", horizon="short",
                report_date=None, article_date=date(2026, 10, 21), quote="q", summary="s",
                confidence=0.7, url="u1")
    base.update(kw)
    return Opinion(**base)


def test_stance_replaced_and_confidence_raised():
    out = apply_corrections([op()], [{"url": "u1", "house": "Goldman Sachs", "market": "KR", "stance": "bear"}])
    assert out[0].stance == "bear" and out[0].confidence == 1.0


def test_drop_removes_opinion():
    out = apply_corrections([op(), op(url="u2")], [{"url": "u1", "house": "Goldman Sachs", "market": "KR", "stance": "drop"}])
    assert [o.url for o in out] == ["u2"]


def test_non_matching_row_changes_nothing():
    out = apply_corrections([op()], [{"url": "u1", "house": "UBS", "market": "KR", "stance": "bear"}])
    assert out[0].stance == "bull" and out[0].confidence == 0.7


def test_missing_file_is_empty(tmp_path: Path):
    assert load_corrections(tmp_path / "nope.csv") == []


def test_load_csv(tmp_path: Path):
    p = tmp_path / "c.csv"
    p.write_text("url,house,market,stance,note\nu1,Goldman Sachs,KR,bear,오판\n", encoding="utf-8")
    assert load_corrections(p) == [{"url": "u1", "house": "Goldman Sachs", "market": "KR", "stance": "bear", "note": "오판"}]


def test_malformed_rows_skipped_and_values_normalized(tmp_path: Path):
    p = tmp_path / "c.csv"
    p.write_text("url,house,market,stance,note\nu1\nu1,골드만삭스,KR,Bear,x\n,,,,\n", encoding="utf-8")
    rows = load_corrections(p)
    out = apply_corrections([op()], rows)
    assert out[0].stance == "bear"


def test_invalid_stance_ignored():
    out = apply_corrections([op()], [{"url": "u1", "house": "Goldman Sachs", "market": "KR", "stance": "up"}])
    assert out[0].stance == "bull"


def test_bad_header_does_not_crash(tmp_path: Path):
    p = tmp_path / "c.csv"
    p.write_text("link,firm\nu1,GS\n", encoding="utf-8")
    assert apply_corrections([op()], load_corrections(p))[0].stance == "bull"
