from datetime import date

from market_view.aggregate import select_votes, summarize_day, to_vote_stance
from market_view.models import Opinion

AS_OF = date(2026, 10, 21)


def op(**kw) -> Opinion:
    base = dict(
        house="Goldman Sachs", market="KR", stance="bull", scope="country", horizon="short",
        report_date=None, article_date=AS_OF, quote="q", summary="s", confidence=0.9, url="u",
    )
    base.update(kw)
    return Opinion(**base)


def test_neutral_counts_as_bear():
    assert to_vote_stance(op(stance="neutral")) == "bear"


def test_unclear_is_not_a_vote():
    assert to_vote_stance(op(stance="unclear")) is None


def test_same_house_same_day_is_one_vote():
    ops = [op(url=f"u{i}") for i in range(5)]
    votes, _ = select_votes(ops, "KR", AS_OF)
    assert len(votes) == 1


def test_short_term_beats_12m():
    ops = [op(market="US", stance="bull", horizon="12m"), op(market="US", stance="bear", horizon="short")]
    votes, _ = select_votes(ops, "US", AS_OF)
    assert to_vote_stance(votes[0]) == "bear"


def test_seven_day_window():
    assert len(select_votes([op(report_date=date(2026, 10, 15))], "KR", AS_OF)[0]) == 1
    assert len(select_votes([op(report_date=date(2026, 10, 14))], "KR", AS_OF)[0]) == 0


def test_future_dated_opinion_ignored():
    assert len(select_votes([op(report_date=date(2026, 10, 22))], "KR", AS_OF)[0]) == 0


def test_newer_view_replaces_older_and_late_reprint_does_not_override():
    new = op(stance="bear", report_date=date(2026, 10, 20), article_date=date(2026, 10, 20))
    old_reprint = op(stance="bull", report_date=date(2026, 10, 16), article_date=date(2026, 10, 21))
    votes, _ = select_votes([new, old_reprint], "KR", AS_OF)
    assert [to_vote_stance(v) for v in votes] == ["bear"]


def test_em_maps_to_kr_dm_maps_to_us_country_wins():
    em = op(house="UBS", market="KR", scope="EM", stance="bull")
    kr = op(house="UBS", market="KR", scope="country", stance="bear")
    assert to_vote_stance(select_votes([em, kr], "KR", AS_OF)[0][0]) == "bear"
    dm = op(house="Citi", market="KR", scope="DM", stance="bull")
    assert len(select_votes([dm], "US", AS_OF)[0]) == 1
    assert len(select_votes([dm], "KR", AS_OF)[0]) == 0


def test_review_bucket():
    ops = [op(stance="unclear", house="A"), op(confidence=0.4, house="B"), op(scope="other", house="C")]
    votes, review = select_votes(ops, "KR", AS_OF)
    assert votes == [] and len(review) == 3


def test_other_market_not_counted():
    votes, review = select_votes([op(market="US")], "KR", AS_OF)
    assert votes == [] and review == []


def test_zero_votes_no_division():
    d = summarize_day([], "US", AS_OF, [])
    assert d.ratio is None and "의견 없음" in d.badges


def test_ratio_and_badges():
    ops = [op(house=h, stance=s) for h, s in [("A", "bull"), ("B", "bear")]]
    d = summarize_day(ops, "KR", AS_OF, ["r1"])
    assert (d.bull, d.bear, d.ratio) == (1, 1, 0.5)
    assert "의견 적음" in d.badges and "의견 갈림" in d.badges
    assert d.reasons == ["r1"]


def test_no_badges_when_clear_majority():
    ops = [op(house=h, stance="bull") for h in "ABC"] + [op(house="D", stance="bear")]
    d = summarize_day(ops, "KR", AS_OF, [])
    assert d.ratio == 0.75 and d.badges == []


def test_conflicting_same_rank_views_go_to_review():
    a = op(house="JPMorgan", stance="neutral", horizon="unknown", url="a")
    b = op(house="JPMorgan", stance="bull", horizon="unknown", url="b")
    votes, review = select_votes([a, b], "KR", AS_OF)
    assert votes == [] and {o.url for o in review} == {"a", "b"}


def test_same_direction_duplicates_still_one_vote():
    a = op(house="JPMorgan", stance="neutral", url="a")
    b = op(house="JPMorgan", stance="bear", url="b")
    votes, review = select_votes([a, b], "KR", AS_OF)
    assert len(votes) == 1 and review == []


def test_conflict_at_lower_rank_does_not_matter():
    short = op(house="UBS", stance="bull", horizon="short", url="s")
    long_a = op(house="UBS", stance="bear", horizon="12m", url="l1")
    long_b = op(house="UBS", stance="bull", horizon="12m", url="l2")
    votes, review = select_votes([long_a, short, long_b], "KR", AS_OF)
    assert [v.url for v in votes] == ["s"] and review == []


def test_combined_sums_both_markets_with_breakdown():
    from market_view.aggregate import summarize_combined
    ops = [op(house="A", market="US", stance="bull"), op(house="B", market="US", stance="bull"),
           op(house="A", market="KR", stance="bear"), op(house="C", market="KR", scope="DM", stance="bull")]
    d = summarize_combined(ops, AS_OF, ["r"])
    assert d.market == "ALL"
    assert (d.bull, d.bear, d.ratio) == (3, 1, 0.75)
    assert d.breakdown == {"US": (3, 0), "KR": (0, 1)}
    assert d.reasons == ["r"] and len(d.votes) == 4


def test_combined_empty():
    from market_view.aggregate import summarize_combined
    d = summarize_combined([], AS_OF, [])
    assert d.ratio is None and "의견 없음" in d.badges and d.breakdown == {"US": (0, 0), "KR": (0, 0)}
