from datetime import date

from market_view.models import MarketDay, Opinion
from market_view.render import render_page

D = date(2026, 10, 21)
STATUS = {"collected": 12, "failed": 1, "stale": False, "updated_at": "2026-10-21 07:05 KST"}


def op(**kw):
    base = dict(house="Goldman Sachs", market="KR", stance="bull", scope="country", horizon="short",
                report_date=None, article_date=D, quote="We raise our target", summary="목표치 상향",
                confidence=0.9, url="https://ex.com/a")
    base.update(kw)
    return Opinion(**base)


def day(market="KR", bull=5, bear=3, ratio=0.625, badges=(), votes=(), review=()):
    return MarketDay(D, market, bull, bear, ratio, list(badges), ["금리 인하 기대"], list(votes), list(review))


def page(kr=None, us=None, history=(), status=STATUS):
    return render_page({"KR": kr or day(), "US": us or day("US")}, list(history), status)


def test_verdict_percentages():
    html = page(kr=day(ratio=0.62, bull=62, bear=38))
    assert "강세 62%" in html and "약세 38%" in html


def test_change_vs_previous_day():
    hist = [{"date": "2026-10-20", "market": "KR", "bull": 1, "bear": 1, "ratio": 0.54, "badges": [], "reasons": []}]
    assert "▲8" in page(kr=day(ratio=0.62), history=hist)


def test_no_votes_shows_badge_without_error():
    html = page(us=day("US", 0, 0, None, ["의견 없음"]))
    assert "의견 없음" in html


def test_stale_shows_failure_badge():
    assert "갱신 실패" in page(status={**STATUS, "stale": True})


def test_status_counts_shown():
    assert "수집 12건" in page() and "실패 1건" in page()


def test_quote_is_escaped():
    html = page(kr=day(votes=[op(quote="<script>alert(1)</script>")]))
    assert "<script>alert(1)</script>" not in html and "&lt;script&gt;" in html


def test_table_rows_and_review_section():
    html = page(kr=day(votes=[op(), op(house="UBS", stance="neutral")], review=[op(house="Citi", stance="unclear")]))
    assert "Goldman Sachs" in html and "UBS" in html and "약세(중립)" in html
    assert "확인 필요 (1)" in html and "https://ex.com/a" in html


def test_disclaimer_and_mobile_meta():
    html = page()
    assert "참고 자료이며 매매 신호가 아닙니다." in html
    assert '<meta name="viewport"' in html
