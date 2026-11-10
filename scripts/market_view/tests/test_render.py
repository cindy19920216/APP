from datetime import date

from market_view.models import MarketDay, Opinion
import pytest

from market_view.render import render_page, signal

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


def test_count_line():
    html = page(day(ratio=0.62, bull=62, bear=38))
    assert "강세 62 · 약세 38 (62%)" in html


def test_title_is_todays_view():
    html = page()
    assert "<title>오늘의 뷰</title>" in html and "오늘의 뷰 · 2026-10-21" in html and "외국계 시각" not in html


@pytest.mark.parametrize("ratio,cls,label", [(0.86, "green", "좋음"), (0.61, "green", "좋음"), (0.6, "yellow", "중립"),
                                             (0.5, "yellow", "중립"), (0.4, "yellow", "중립"), (0.39, "red", "나쁨"),
                                             (None, "off", "오늘은 의견 없음")])
def test_signal_thresholds(ratio, cls, label):
    assert signal(ratio) == (cls, label)


def test_big_light_lit_for_verdict():
    html = page(day(ratio=0.86, bull=6, bear=1))
    assert '<div class="lamp big green">' in html and ">좋음<" in html


def test_breakdown_and_reasons_removed():
    html = page()
    assert "표 없음" not in html and "금리 인하 기대" not in html and "미국 강세" not in html


def test_order_light_then_experts_then_chart():
    html = page(day(votes=[op()]))
    assert html.index('class="lamp big') < html.index("전문가별 의견") < html.index('id="chart"')


def test_row_shows_reason_and_source_link():
    html = page(day(votes=[op(reason="금리 하락 영향", source_url="https://real.com/a")]))
    assert '<div class="rs">금리 하락 영향</div>' in html and 'href="https://real.com/a"' in html


def test_row_falls_back_to_url_without_source():
    assert 'href="https://ex.com/a"' in page(day(votes=[op()]))


def test_empty_reason_line_omitted():
    assert 'class="rs"' not in page(day(votes=[op()]))


def test_row_lamps_by_stance():
    html = page(day(votes=[op(), op(house="UBS", stance="bear"), op(house="Citi", stance="neutral")],
                    review=[op(house="Nomura", stance="unclear")]))
    assert '<div class="lamp green"' in html and '<div class="lamp red"' in html
    assert '<div class="lamp yellow"' in html and '<div class="lamp off"' in html


def test_review_row_shows_title_vs_body_judgment():
    html = page(day(review=[op(stance="bull", body_stance="bear")]))
    assert "제목 판단 강세 · 본문 판단 약세" in html


def test_reason_is_escaped():
    html = page(day(votes=[op(reason="<script>x</script> & y")]))
    assert "<script>x" not in html and "&amp; y" in html


def test_chart_has_guide_lines():
    html = page()
    assert "[60,40]" in html.replace(" ", "")


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
    assert "<b>Goldman Sachs</b> <span class=\"muted\">미국 · 10-21</span>" in html
    assert "<b>UBS</b> <span class=\"muted\">한국 · 10-21</span>" in html
    assert "<b>Citi</b> <span class=\"muted\">미국 · 10-21</span>" in html   # DM 의견은 미국 표
    assert "확인 필요 (1)" in html and "전문가별 의견 (3)" in html


def test_disclaimer_and_mobile_meta():
    html = page()
    assert "참고 자료이며 매매 신호가 아닙니다." in html
    assert '<meta name="viewport"' in html
