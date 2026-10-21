from datetime import date

from market_view.models import MarketDay, Opinion
from market_view.render import render_page

D = date(2026, 10, 21)
STATUS = {"collected": 12, "failed": 1, "stale": False, "updated_at": "2026-10-21 07:05 KST"}


def op(**kw):
    base = dict(house="Goldman Sachs", market="US", stance="bull", scope="country", horizon="short",
                report_date=None, article_date=D, quote="We raise our target", summary="목표치 상향",
                confidence=0.9, url="https://ex.com/a")
    base.update(kw)
    return Opinion(**base)


def day(bull=5, bear=3, ratio=0.625, badges=(), votes=(), review=(), breakdown=None):
    return MarketDay(D, "ALL", bull, bear, ratio, list(badges), ["금리 인하 기대"], list(votes), list(review),
                     breakdown if breakdown is not None else {"US": (5, 1), "KR": (0, 2)})


def page(d=None, history=(), status=STATUS):
    return render_page(d or day(), list(history), status)


def test_verdict_percentages():
    html = page(day(ratio=0.62, bull=62, bear=38))
    assert "강세 62%" in html and "약세 38%" in html


def test_breakdown_line():
    html = page(day(breakdown={"US": (5, 1), "KR": (0, 0)}))
    assert "미국 강세 5 · 약세 1" in html and "한국 표 없음" in html


def test_no_market_tabs():
    assert 'class="tabs"' not in page()


def test_change_vs_previous_day():
    hist = [{"date": "2026-10-20", "market": "ALL", "bull": 1, "bear": 1, "ratio": 0.54, "badges": [], "reasons": []}]
    assert "▲8" in page(day(ratio=0.62), history=hist)


def test_no_votes_shows_badge_without_error():
    assert "의견 없음" in page(day(0, 0, None, ["의견 없음"], breakdown={"US": (0, 0), "KR": (0, 0)}))


def test_stale_shows_failure_badge():
    assert "갱신 실패" in page(status={**STATUS, "stale": True})


def test_status_counts_shown():
    assert "수집 12건" in page() and "실패 1건" in page()


def test_quote_is_escaped():
    html = page(day(votes=[op(quote="<script>alert(1)</script>")]))
    assert "<script>alert(1)</script>" not in html and "&lt;script&gt;" in html


def test_rows_flag_market_and_review_section():
    html = page(day(votes=[op(), op(house="UBS", market="KR", stance="neutral"), op(house="Citi", market="KR", scope="DM")],
                    review=[op(house="Nomura", stance="unclear")]))
    assert '<span class="mk">미국</span> <b>Goldman Sachs</b>' in html
    assert '<span class="mk">한국</span> <b>UBS</b>' in html and "약세(중립)" in html
    assert '<span class="mk">미국</span> <b>Citi</b>' in html   # DM 의견은 미국 표
    assert "🇺🇸" not in html
    assert "확인 필요 (1)" in html and "https://ex.com/a" in html


def test_disclaimer_and_mobile_meta():
    html = page()
    assert "참고 자료이며 매매 신호가 아닙니다." in html
    assert '<meta name="viewport"' in html
