import json
from datetime import date

from market_view import config
from market_view.enrich import enrich
from market_view.fetch import TemporaryFailure
from market_view.llm import AllProvidersFailed
from market_view.models import Opinion

D = date(2026, 10, 21)
G = "https://news.google.com/rss/articles/X"
EVID = "rising yields are no longer the biggest headwind for equities"
BODY = ("JPMorgan strategists said " + EVID + ". Third-quarter earnings also beat consensus. ") * 6


def op(**kw):
    base = dict(house="JPMorgan", market="US", stance="bull", scope="country", horizon="short", report_date=None,
                article_date=D, quote="q", summary="원래 요약", confidence=0.9, url=G)
    base.update(kw)
    return Opinion(**base)


def answer(comment="증시를 누르던 부담이 줄어드는 중이라고 봄.", evidence=EVID, body_stance="bull"):
    return lambda system, user: (json.dumps({"comment": comment, "reason": "금리 상승세가 꺾였음.",
                                             "evidence": evidence, "body_stance": body_stance}), "fake")


def run(ops, llm=None, resolve=lambda u: "https://real.com/a", fetch=lambda u: BODY, **kw):
    return enrich(ops, resolve=resolve, fetch=fetch, llm=llm or answer(), **kw)


def test_success_sets_comment_reason_body_stance():
    [o] = run([op()])
    assert o.summary == "증시를 누르던 부담이 줄어드는 중이라고 봄."
    assert o.reason == "금리 상승세가 꺾였음." and o.body_stance == "bull"
    assert o.enriched and o.source_url == "https://real.com/a"


def test_evidence_not_in_body_drops_reason_and_counts_try():
    [o] = run([op()], llm=answer(evidence="made up sentence"))
    assert o.reason == "" and o.summary == "원래 요약" and o.body_stance == ""
    assert not o.enriched and o.enrich_tries == 1


def test_third_temporary_failure_finishes():
    def fetch(u):
        raise TemporaryFailure("timeout")
    [o] = run([op(enrich_tries=2)], fetch=fetch)
    assert o.enriched and o.enrich_tries == 3 and o.reason == ""


def test_permanent_failure_finishes_without_reason():
    [o] = run([op()], fetch=lambda u: None)
    assert o.enriched and o.reason == "" and o.enrich_tries == 0 and o.source_url == "https://real.com/a"


def test_unresolvable_google_link_is_permanent():
    [o] = run([op()], resolve=lambda u: None, fetch=lambda u: (_ for _ in ()).throw(AssertionError()))
    assert o.enriched and o.source_url == ""


def test_same_url_fetched_once_each_gets_own_comment():
    calls = {"fetch": 0, "llm": 0}

    def fetch(u):
        calls["fetch"] += 1
        return BODY

    def llm(system, user):
        calls["llm"] += 1
        house = "Morgan Stanley" if "Morgan Stanley" in user else "JPMorgan"
        return answer(comment=f"{house} 코멘트임.")(system, user)

    out = run([op(), op(house="Morgan Stanley")], llm=llm, fetch=fetch)
    assert calls == {"fetch": 1, "llm": 2}
    assert {o.summary for o in out} == {"JPMorgan 코멘트임.", "Morgan Stanley 코멘트임."}


def test_already_enriched_skipped_and_limit_respected():
    ops = [op(enriched=True, house="Citi")] + [op(url=f"https://ex.com/{i}") for i in range(25)]
    out = run(ops, limit=20)
    assert len(out) == 20 and all(o.house == "JPMorgan" for o in out)


def test_default_limit_is_config():
    assert config.ENRICH_MAX_PER_RUN == 20


def test_llm_exception_is_temporary():
    def llm(system, user):
        raise AllProvidersFailed("quota")
    [o] = run([op()], llm=llm)
    assert o.enrich_tries == 1 and not o.enriched


def test_invalid_body_stance_is_temporary():
    [o] = run([op()], llm=answer(body_stance="up"))
    assert o.enrich_tries == 1 and o.reason == ""


def test_input_not_mutated():
    ops = [op()]
    run(ops)
    assert ops[0].summary == "원래 요약" and not ops[0].enriched
