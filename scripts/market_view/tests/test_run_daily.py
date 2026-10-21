import json
from datetime import date
from pathlib import Path

from market_view import run_daily
from market_view.llm import AllProvidersFailed
from market_view.models import Article, Opinion

D = date(2026, 10, 21)


def art(i, market="KR"):
    return Article(f"https://ex.com/{i}", f"t{i}", "s", D, "snip", None, market)


def opinion_for(a, house, stance="bull"):
    return Opinion(house, a.market_hint, stance, "country", "short", None, a.published, "q", "s", 0.9, a.url)


def run(tmp_path, arts, judge):
    return run_daily.main(as_of=D, data_dir=tmp_path / "data", site_dir=tmp_path / "site",
                          collect_fn=lambda d: arts, judge_fn=judge,
                          fill_fn=lambda a: a, reasons_fn=lambda v, m: ["근거"], pause=0)


def test_normal_flow_writes_page_and_data(tmp_path: Path):
    arts = [art(1), art(2, "US")]
    judge = lambda a: [opinion_for(a, "Goldman Sachs" if a.market_hint == "KR" else "Fundstrat")]
    assert run(tmp_path, arts, judge) == 0
    html = (tmp_path / "site" / "index.html").read_text(encoding="utf-8")
    assert "강세 100%" in html and "근거" in html
    assert len(json.loads((tmp_path / "data" / "opinions" / "2026-10-21.json").read_text(encoding="utf-8"))) == 2
    assert len(json.loads((tmp_path / "data" / "history.json").read_text(encoding="utf-8"))) == 2


def test_partial_failure_counted(tmp_path: Path):
    def judge(a):
        if a.url.endswith("2"):
            raise ValueError("bad")
        return [opinion_for(a, "Goldman Sachs")]
    assert run(tmp_path, [art(1), art(2)], judge) == 0
    assert "실패 1건" in (tmp_path / "site" / "index.html").read_text(encoding="utf-8")


def test_all_providers_failed_keeps_previous_votes_and_marks_stale(tmp_path: Path):
    run(tmp_path, [art(1)], lambda a: [opinion_for(a, "UBS", "bear")])
    def judge(a):
        raise AllProvidersFailed("quota")
    assert run(tmp_path, [art(2)], judge) == 1
    html = (tmp_path / "site" / "index.html").read_text(encoding="utf-8")
    assert "갱신 실패" in html and "UBS" in html


def test_second_run_same_day_merges_not_overwrites(tmp_path: Path):
    run(tmp_path, [art(1)], lambda a: [opinion_for(a, "UBS")])
    run(tmp_path, [art(2)], lambda a: [opinion_for(a, "Citi")])
    data = json.loads((tmp_path / "data" / "opinions" / "2026-10-21.json").read_text(encoding="utf-8"))
    assert sorted(d["house"] for d in data) == ["Citi", "UBS"]


def test_corrections_applied(tmp_path: Path):
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "corrections.csv").write_text(
        "url,house,market,stance,note\nhttps://ex.com/1,UBS,KR,bear,오판\n", encoding="utf-8")
    run(tmp_path, [art(1)], lambda a: [opinion_for(a, "UBS", "bull")])
    assert "약세 100%" in (tmp_path / "site" / "index.html").read_text(encoding="utf-8")


def test_no_articles_collected_marks_stale(tmp_path: Path):
    assert run(tmp_path, [], lambda a: []) == 1
    assert "갱신 실패" in (tmp_path / "site" / "index.html").read_text(encoding="utf-8")


def test_unparsable_reply_counted_as_failure(tmp_path: Path):
    from market_view.judge import UnparsableResponse
    def judge(a):
        raise UnparsableResponse("x")
    run(tmp_path, [art(1), art(2)], lambda a: [opinion_for(a, "UBS")] if a.url.endswith("1") else judge(a))
    assert "실패 1건" in (tmp_path / "site" / "index.html").read_text(encoding="utf-8")


def test_already_judged_url_not_rejudged(tmp_path: Path):
    calls = []
    def judge(a):
        calls.append(a.url)
        return []
    run(tmp_path, [art(1)], judge)
    run(tmp_path, [art(1), art(2)], judge)
    assert calls == ["https://ex.com/1", "https://ex.com/2"]


def test_reasons_crash_does_not_kill_run(tmp_path: Path):
    def bad_reasons(v, m):
        raise TypeError("boom")
    rc = run_daily.main(as_of=D, data_dir=tmp_path / "data", site_dir=tmp_path / "site", collect_fn=lambda d: [art(1)],
                        judge_fn=lambda a: [opinion_for(a, "UBS")], fill_fn=lambda a: a,
                        reasons_fn=bad_reasons, pause=0)
    assert rc == 0 and (tmp_path / "site" / "index.html").exists()


def test_default_paths_point_into_herencia_repo():
    from market_view import config
    assert config.SITE_DIR.as_posix().endswith("public/market-view")
    assert config.DATA_DIR.as_posix().endswith("scripts/market_view/data")
