from market_view.models import Opinion, opinion_key

OLD = {"house": "JPMorgan", "market": "US", "stance": "bull", "scope": "country", "horizon": "short",
       "report_date": None, "article_date": "2026-10-21", "quote": "q", "summary": "s",
       "confidence": 0.9, "url": "https://news.google.com/rss/articles/X"}


def test_from_dict_old_json_defaults():
    op = Opinion.from_dict(OLD)
    assert (op.reason, op.body_stance, op.source_url, op.enriched, op.enrich_tries) == ("", "", "", False, 0)


def test_new_fields_round_trip():
    op = Opinion.from_dict({**OLD, "reason": "근거", "body_stance": "bear", "source_url": "https://a",
                            "enriched": True, "enrich_tries": 2})
    assert Opinion.from_dict(op.to_dict()) == op


def test_opinion_key():
    op = Opinion.from_dict(OLD)
    assert opinion_key(op) == (OLD["url"], "JPMorgan", "US", "short", "country")
