import json
from datetime import date

from market_view import judge
from market_view.models import Article

ART = Article("https://ex.com/1", "t", "src", date(2026, 10, 21), "snip", "body", "KR")


def item(**kw):
    base = {"house": "Goldman Sachs", "market": "KR", "stance": "bull", "scope": "country", "horizon": "short",
            "report_date": "2026-10-20", "quote": "We raise our KOSPI target", "summary": "코스피 목표치 상향",
            "confidence": 0.9}
    base.update(kw)
    return base


def test_parse_valid_items():
    raw = json.dumps([item(), item(house="Morgan Stanley", market="US", stance="neutral", report_date=None)])
    ops = judge.parse_opinions(raw, ART)
    assert len(ops) == 2
    a = ops[0]
    assert (a.house, a.market, a.stance, a.scope, a.horizon) == ("Goldman Sachs", "KR", "bull", "country", "short")
    assert a.report_date == date(2026, 10, 20) and a.article_date == date(2026, 10, 21)
    assert a.url == "https://ex.com/1" and a.confidence == 0.9
    assert ops[1].report_date is None


def test_parse_json_inside_code_fence():
    raw = "```json\n" + json.dumps([item()]) + "\n```"
    assert len(judge.parse_opinions(raw, ART)) == 1


def test_valid_empty_and_non_opinion_object():
    assert judge.parse_opinions("[]", ART) == []
    assert judge.parse_opinions('{"a": 1}', ART) == []


def test_out_of_schema_item_dropped():
    raw = json.dumps([item(stance="strong buy"), item(market="JP"), item(confidence="high"), item()])
    assert len(judge.parse_opinions(raw, ART)) == 1


def test_domestic_house_dropped_and_alias_normalized():
    raw = json.dumps([item(house="삼성증권"), item(house="GS")])
    ops = judge.parse_opinions(raw, ART)
    assert [o.house for o in ops] == ["Goldman Sachs"]


def test_quote_truncated():
    ops = judge.parse_opinions(json.dumps([item(quote="x" * 500)]), ART)
    assert len(ops[0].quote) == 200


def test_bad_report_date_becomes_none():
    ops = judge.parse_opinions(json.dumps([item(report_date="last week")]), ART)
    assert ops[0].report_date is None


def test_prompt_states_rules():
    for s in ["Neutral", "EM", "DM", "horizon", "short", "JSON"]:
        assert s in judge.SYSTEM_PROMPT


def test_judge_article_uses_snippet_when_no_text(monkeypatch):
    seen = {}
    def fake(system, user, providers=None):
        seen["user"] = user
        return "[]", "x"
    monkeypatch.setattr(judge, "complete_json", fake)
    a = Article("u", "제목", "s", date(2026, 10, 21), "요약문", None, "KR")
    assert judge.judge_article(a) == []
    assert "제목" in seen["user"] and "요약문" in seen["user"]


def test_summarize_reasons_max_three_and_failure_empty(monkeypatch):
    monkeypatch.setattr(judge, "complete_json", lambda s, u, providers=None: ('["a","b","c","d"]', "x"))
    ops = judge.parse_opinions(json.dumps([item()]), ART)
    assert judge.summarize_reasons(ops, "KR") == ["a", "b", "c"]
    def boom(s, u, providers=None):
        raise judge.AllProvidersFailed("x")
    monkeypatch.setattr(judge, "complete_json", boom)
    assert judge.summarize_reasons(ops, "KR") == []
    assert judge.summarize_reasons([], "KR") == []


def test_prompt_excludes_investor_surveys():
    assert "Fund Manager Survey" in judge.SYSTEM_PROMPT and "설문" in judge.SYSTEM_PROMPT


def test_prompt_skips_background_views():
    assert "과거" in judge.SYSTEM_PROMPT and "이 기사에서 새로" in judge.SYSTEM_PROMPT


def test_future_report_date_falls_back_to_article_date():
    ops = judge.parse_opinions(json.dumps([item(report_date="2026-11-30")]), ART)
    assert ops[0].report_date is None


def test_very_old_report_date_goes_to_review():
    ops = judge.parse_opinions(json.dumps([item(report_date="2025-10-20")]), ART)
    assert ops[0].confidence < 0.6


def test_quote_not_in_source_lowers_confidence():
    src = "Goldman said: We raise our  KOSPI target to 12,000."
    good = judge.parse_opinions(json.dumps([item(quote="We raise our KOSPI target to 12,000.")]), ART, source=src)
    bad = judge.parse_opinions(json.dumps([item(quote="We cut our KOSPI target")]), ART, source=src)
    assert good[0].confidence == 0.9 and bad[0].confidence < 0.6


def test_unparsable_reply_raises():
    import pytest
    with pytest.raises(judge.UnparsableResponse):
        judge.parse_opinions("[{not json", ART)


def test_prose_brackets_before_array_and_lone_object():
    raw = "[주의] 결과입니다:\n" + json.dumps([item()])
    assert len(judge.parse_opinions(raw, ART)) == 1
    assert len(judge.parse_opinions(json.dumps(item()), ART)) == 1


def test_summarize_reasons_swallows_any_error(monkeypatch):
    def boom(s, u, providers=None):
        raise IndexError("no choices")
    monkeypatch.setattr(judge, "complete_json", boom)
    ops = judge.parse_opinions(json.dumps([item()]), ART)
    assert judge.summarize_reasons(ops, "KR") == []
