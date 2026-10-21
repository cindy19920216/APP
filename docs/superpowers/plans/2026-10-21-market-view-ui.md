# 오늘의 뷰 (신호등 화면 + 근거 보강) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** market-view 페이지를 "오늘의 뷰" 신호등 화면으로 바꾸고, 표가 되는 전문가 의견마다 본문 기반의 자연스러운 음슴체 코멘트 + 근거 1~2줄을 붙인다.

**Architecture:** 기존 흐름(수집 → 제목 기반 묶음 판정 → 저장 → 수정 적용 → 집계 → 렌더)은 그대로 둔다. 집계 뒤에 새 2단계 `enrich`를 넣는다. 화면에 나갈 의견만 Google News 주소를 원래 주소로 풀고, 본문을 읽고, AI에 코멘트·근거·본문 판단을 받아 날짜별 의견 파일에 다시 쓴다. 그런 다음 다시 집계하고 렌더한다. 본문 판단이 제목 판단과 다르면 집계에서 "확인 필요"로 보낸다.

**Tech Stack:** Python 3.12, requests, trafilatura, openai(호환 클라이언트, 기존 `llm.complete_json`), `googlenewsdecoder` 0.2.2(새 의존성), pytest, 정적 HTML + Chart.js 4.4.1.

**Spec:** `docs/superpowers/specs/2026-10-21-market-view-ui-design.md`

## Global Constraints

- 모든 명령은 `scripts/market_view` 폴더에서 실행한다: `python -m pytest -q` (현재 95개 통과).
- 비용 0원: 무료 LLM만 쓴다. 기존 `llm.complete_json(system, user) -> (raw, provider)`를 재사용한다.
- 판정·집계 규칙은 바꾸지 않는다: 하우스·시장당 1표, `VALID_DAYS=7`, 중립=약세로 집계, EM→KR, DM→US.
- Next.js·npm 파일은 건드리지 않는다. Python 의존성은 `scripts/market_view/requirements.txt`에만 추가한다.
- 화면 문구: 제목 "오늘의 뷰", 신호등 라벨 "좋음"/"중립"/"나쁨", 0표 "오늘은 의견 없음", 푸터 "참고 자료이며 매매 신호가 아닙니다."
- 신호등: ratio > 0.6 → green/좋음, 0.4 ≤ ratio ≤ 0.6 → yellow/중립, ratio < 0.4 → red/나쁨.
- 코멘트·근거 말투: 음슴체("~봄", "~했음", "~임"), 번역투 금지, 주식 용어는 그대로 쓴다.
- 근거는 본문에 있는 내용만 쓴다. `evidence`가 정규화 후 본문에 없으면 근거를 버린다. evidence는 저장하지도 화면에 보이지도 않는다.
- 2단계 대상은 한 번 실행에 최대 20건(`ENRICH_MAX_PER_RUN = 20`)이고, 일시 실패는 최대 3번(`ENRICH_MAX_TRIES = 3`)까지 다시 시도한다.
- 2단계 실패는 `stale`(갱신 실패)에 영향을 주지 않는다.
- `.github/workflows/*`는 바꾸지 않는다. 워크플로를 수동 실행하기 전에는 사용자에게 먼저 묻는다.

## Review Focus

1. 새 필드가 없는 예전 `opinions/*.json`(10-14~10-21 파일)도 그대로 읽혀야 한다 → Task 1 `test_from_dict_old_json_defaults`.
2. 사용자가 `corrections.csv`에 화면의 원래 기사 주소를 붙여 넣어도 매칭돼야 하고, 수정된 의견은 본문 판단이 달라도 다시 표로 세야 한다 → Task 1 `test_correction_matches_source_url`, `test_correction_clears_body_stance`.
3. 같은 기사에서 의견 여러 개가 나와도 본문은 한 번만 가져오고, 각 의견은 자기 코멘트를 받아야 한다 → Task 3 `test_same_url_fetched_once_each_gets_own_comment`.
4. AI가 근거·코멘트에 `<script>`나 `&` 같은 문자를 넣어도 페이지가 깨지지 않아야 한다 → Task 5 `test_reason_is_escaped`.
5. 2단계가 통째로 실패해도(네트워크 끊김, 모든 AI 한도 초과) 페이지는 1단계 결과로 정상 생성되고 반환값은 0이어야 한다 → Task 4 `test_enrich_crash_does_not_fail_run`.

---

### Task 1: 의견 필드 추가, 수정 매칭, 본문 판단 불일치 → 확인 필요

**Files:**
- Modify: `models.py` (`Opinion`, `from_dict`)
- Modify: `corrections.py` (`apply_corrections`)
- Modify: `aggregate.py` (`_needs_review`)
- Test: `tests/test_models.py`(새 파일), `tests/test_corrections.py`, `tests/test_aggregate.py`

**Interfaces:**
- Produces: `Opinion`에 기본값이 있는 필드 5개를 기존 필드 뒤에 추가한다. `reason: str = ""`, `body_stance: str = ""`, `source_url: str = ""`, `enriched: bool = False`, `enrich_tries: int = 0`. `to_dict`/`from_dict`가 이 필드도 왕복해야 한다. 키 `opinion_key(op) -> tuple` = `(op.url, op.house, op.market, op.horizon, op.scope)`를 `models.py`에 두고, `run_daily._merge_today`도 이 함수를 쓰게 바꾼다.

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# tests/test_models.py
def test_from_dict_old_json_defaults():
    old = {"house": "JPMorgan", "market": "US", "stance": "bull", "scope": "country", "horizon": "short",
           "report_date": None, "article_date": "2026-10-21", "quote": "q", "summary": "s",
           "confidence": 0.9, "url": "https://news.google.com/rss/articles/X"}
    op = Opinion.from_dict(old)
    assert (op.reason, op.body_stance, op.source_url, op.enriched, op.enrich_tries) == ("", "", "", False, 0)

def test_new_fields_round_trip():
    op = Opinion.from_dict({**OLD, "reason": "근거", "body_stance": "bear", "source_url": "https://a",
                            "enriched": True, "enrich_tries": 2})
    assert Opinion.from_dict(op.to_dict()) == op

# tests/test_corrections.py
def test_correction_matches_source_url():
    o = op(url="https://news.google.com/rss/articles/X", source_url="https://real.com/a")
    rows = [{"url": "https://real.com/a", "house": o.house, "market": o.market, "stance": "bear"}]
    assert apply_corrections([o], rows)[0].stance == "bear"

def test_correction_clears_body_stance():
    o = op(stance="bull", body_stance="bear")
    rows = [{"url": o.url, "house": o.house, "market": o.market, "stance": "bull"}]
    assert apply_corrections([o], rows)[0].body_stance == ""

# tests/test_aggregate.py
def test_body_stance_mismatch_goes_to_review():
    votes, review = select_votes([op(stance="bull", body_stance="bear")], "US", D)
    assert votes == [] and len(review) == 1

def test_body_stance_same_or_empty_still_votes():
    for bs in ("", "bull"):
        votes, _ = select_votes([op(stance="bull", body_stance=bs)], "US", D)
        assert len(votes) == 1
```

`OLD`와 `op(...)`는 각 테스트 파일에 있는 기존 헬퍼 모양을 따른다. 없으면 위 `old` dict로 만든다.

- [ ] **Step 2: 실패 확인** — `python -m pytest -q tests/test_models.py tests/test_corrections.py tests/test_aggregate.py` → 새 테스트 FAIL.
- [ ] **Step 3: 구현**
  - `models.py`: 위 필드와 `opinion_key`를 추가한다. `from_dict`는 모르는 키를 무시하지 않아도 된다(예전 JSON에는 키가 적을 뿐).
  - `corrections.py`: 수정 키는 `(op.url, ...)` 또는 `(op.source_url, ...)` 중 하나라도 맞으면 적용한다. 적용할 때 `replace(op, stance=..., confidence=1.0, body_stance="")`로 한다.
  - `aggregate._needs_review`: 기존 조건에 `or (op.body_stance and op.body_stance != op.stance)`를 더한다.
- [ ] **Step 4: 통과 확인** — `python -m pytest -q` → 전부 PASS.
- [ ] **Step 5: 커밋** — `git commit -m "feat(market-view): 의견 근거·본문판단 필드, 원래 주소로도 수정 매칭"`

---

### Task 2: 원래 주소 풀기 + 본문 가져오기 (`fetch.py`)

**Files:**
- Create: `fetch.py`
- Modify: `requirements.txt` (`googlenewsdecoder==0.2.2` 추가), `config.py` (`ENRICH_MAX_PER_RUN = 20`, `ENRICH_MAX_TRIES = 3`, `ENRICH_TIMEOUT = 15`)
- Test: `tests/test_fetch.py`

**Interfaces:**
- Produces:
  - `class TemporaryFailure(Exception)`: 다시 해 볼 만한 실패(네트워크, 시간 초과, HTTP 429/5xx, 디코더 예외).
  - `resolve_url(url: str, decoder=None) -> str | None`: Google News 주소(`news.google.com/rss/articles/` 또는 `news.google.com/articles/`)가 아니면 그대로 돌려준다. 맞으면 `decoder(url)`을 부른다(기본 `googlenewsdecoder.gnewsdecoder(url, interval=1)`, 반환은 `{"status": bool, "decoded_url": str, ...}`). `status`가 False면 `None`(영구 실패)을 돌려준다. 디코더가 예외를 던지면 `TemporaryFailure`를 던진다.
  - `fetch_body(url: str, get=requests.get) -> str | None`: `collect._robots_allows(url)`가 False면 `None`. 상태 200이면 `trafilatura.extract`를 쓰고, 결과가 `MIN_TEXT_CHARS` 미만이면 `None`(영구). 401/402/403/404/410이면 `None`(영구). 429·5xx, `requests.RequestException`이면 `TemporaryFailure`.
- 기존 `collect.fill_text`는 지우지 않는다(테스트가 쓰고 있음). 다만 Task 4에서 run_daily가 더는 부르지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성** — 네트워크 없이 가짜 `decoder`/`get`을 주입한다. `collect._robots_allows`는 `monkeypatch`로 True/False를 돌려주게 한다.

```python
def test_non_google_url_unchanged():
    assert resolve_url("https://www.msn.com/a", decoder=boom) == "https://www.msn.com/a"
def test_google_url_decoded():
    assert resolve_url(G, decoder=lambda u: {"status": True, "decoded_url": "https://real.com/a"}) == "https://real.com/a"
def test_google_url_not_found_is_permanent():
    assert resolve_url(G, decoder=lambda u: {"status": False, "message": "x"}) is None
def test_decoder_exception_is_temporary():
    with pytest.raises(TemporaryFailure): resolve_url(G, decoder=boom)
def test_paywall_403_is_permanent(): ...      # get -> status 403 → None
def test_short_text_is_permanent(): ...       # 200 + 본문 50자 → None
def test_429_and_timeout_are_temporary(): ... # 429 응답 / requests.Timeout → TemporaryFailure
def test_robots_disallow_is_permanent(): ...  # _robots_allows False → None, get 호출 안 함
def test_body_returned(): ...                 # 200 + 400자 이상 HTML → 추출 텍스트
```

- [ ] **Step 2: 실패 확인** — `python -m pytest -q tests/test_fetch.py` → FAIL(모듈 없음).
- [ ] **Step 3: 구현** — `pip install googlenewsdecoder==0.2.2` 후 위 인터페이스대로 구현한다. User-Agent는 `config.USER_AGENT`, timeout은 `config.ENRICH_TIMEOUT`.
- [ ] **Step 4: 통과 확인** — `python -m pytest -q` → PASS.
- [ ] **Step 5: 실제 확인 (1회, 수동)** — 10-21 의견 파일의 Google 링크 하나로 `python -c "from market_view.fetch import resolve_url, fetch_body; u=resolve_url('<링크>'); print(u); print((fetch_body(u) or '')[:300])"`를 실행한다. 원래 주소와 본문 앞부분이 나오면 통과다. 디코더가 동작하지 않으면 멈추고 보고한다(스펙 4.1: Google이 자주 바뀜).
- [ ] **Step 6: 커밋** — `git commit -m "feat(market-view): Google News 원래 주소 해독과 본문 가져오기"`

---

### Task 3: 근거 보강 (`enrich.py`) + 1단계 요약 말투

**Files:**
- Create: `enrich.py`
- Modify: `judge.py` (`SYSTEM_PROMPT`의 summary 지시를 음슴체로 바꾸고, `_extract_json`·`_norm`은 import해서 재사용)
- Test: `tests/test_enrich.py`, `tests/test_judge.py`(프롬프트 문구 1개)

**Interfaces:**
- Consumes: `fetch.resolve_url`, `fetch.fetch_body`, `fetch.TemporaryFailure`; `llm.complete_json`; `judge._extract_json`, `judge._norm`, `judge.MAX_BODY_CHARS`; `models.opinion_key`.
- Produces:
  - `ENRICH_PROMPT: str`
  - `enrich(opinions: list[Opinion], resolve=resolve_url, fetch=fetch_body, llm=complete_json, limit=config.ENRICH_MAX_PER_RUN) -> list[Opinion]`: `enriched`가 False인 의견만, 앞에서부터 최대 `limit`건 처리한다. 처리한 의견만 새 객체로 돌려준다(`dataclasses.replace`). 받은 객체는 바꾸지 않는다.

**규칙** (스펙 4장, 4.3)
- URL별로 묶어 `resolve` → `fetch`를 한 번씩만 부른다. 결과를 `source_url`에 넣는다(풀기에 실패하면 "").
- 영구 실패(`resolve`나 `fetch`가 None): `enriched=True`, 나머지 그대로.
- 일시 실패(`TemporaryFailure`, AI 예외, JSON 해석 실패, evidence 검증 실패, 필드 누락): `enrich_tries += 1`. `enrich_tries >= ENRICH_MAX_TRIES`면 `enriched=True`.
- 성공: 의견마다 AI를 한 번 부른다. 사용자 메시지에는 하우스, 시장, horizon, 1단계 stance, 본문(`MAX_BODY_CHARS` 자름)을 넣는다. 응답 JSON 객체 `{"comment": str, "reason": str, "evidence": str, "body_stance": "bull"|"bear"|"neutral"|"unclear"}`를 검증한다. `_norm(evidence)`가 `_norm(body)` 안에 있어야 한다. 통과하면 `summary=comment`, `reason=reason`, `body_stance=body_stance`, `enriched=True`.
- `ENRICH_PROMPT`에 반드시 넣을 것:
  - 음슴체로 자연스럽게, 번역투 금지, 주식 용어는 그대로 쓸 것.
  - 코멘트 1줄, 근거 1~2줄.
  - 본문에 없는 내용은 쓰지 말 것.
  - evidence는 본문 원문을 번역하지 않고 그대로 옮길 것.
  - body_stance는 이 하우스의 해당 시장 전망 방향을 본문만 보고 판단할 것.
  - 말투 예시: 코멘트 "증시를 누르던 가장 큰 부담이 줄어드는 중이라고 봄." / 근거 "국채 금리 상승세가 꺾이며 밸류에이션 부담이 덜해졌고, 3분기 실적도 예상보다 좋았음."

- [ ] **Step 1: 실패하는 테스트 작성** — 가짜 `resolve`/`fetch`/`llm`을 쓴다. `BODY`는 400자 이상, `EVID`는 BODY의 일부.

```python
def test_success_sets_comment_reason_body_stance(): ...
    # llm -> {"comment":"…봄.","reason":"…했음.","evidence":EVID,"body_stance":"bull"}
    # → summary=="…봄.", reason=="…했음.", body_stance=="bull", enriched, source_url=="https://real.com/a"
def test_evidence_not_in_body_drops_reason_and_counts_try():
    # evidence="made up" → reason=="", summary 원래 값, enriched False, enrich_tries==1
def test_third_temporary_failure_finishes(): # enrich_tries=2 + TemporaryFailure → enriched True, tries 3
def test_permanent_failure_finishes_without_reason(): # fetch→None → enriched True, reason ""
def test_same_url_fetched_once_each_gets_own_comment():
    # 같은 url 의견 2개(house 다름) → fetch 호출 1번, llm 호출 2번, summary 서로 다름
def test_already_enriched_skipped_and_limit_respected():
    # enriched=True 1개 + 미처리 25개, limit=20 → 반환 20개, enriched 의견은 포함 안 됨
def test_llm_exception_is_temporary(): # llm raises AllProvidersFailed → tries 1, 예외 안 던짐
def test_input_not_mutated(): ...
```

`tests/test_judge.py`: `assert "음슴체" in SYSTEM_PROMPT`.

- [ ] **Step 2: 실패 확인** — `python -m pytest -q tests/test_enrich.py tests/test_judge.py` → FAIL.
- [ ] **Step 3: 구현** — 위 규칙대로 구현한다. `judge.SYSTEM_PROMPT`의 summary 줄은 "한국어 한 줄 요약. 음슴체(~봄, ~했음)로 자연스럽게, 번역투 금지. 주식 용어는 그대로 쓴다."로 바꾼다. 출력 예의 summary도 "코스피 12개월 목표치를 올렸음"으로 바꾼다.
- [ ] **Step 4: 통과 확인** — `python -m pytest -q` → PASS.
- [ ] **Step 5: 커밋** — `git commit -m "feat(market-view): 본문 기반 음슴체 코멘트·근거 보강"`

---

### Task 4: 저장소 갱신 + run_daily 연결

**Files:**
- Modify: `store.py` (`update_opinions` 추가), `run_daily.py`
- Test: `tests/test_store.py`, `tests/test_run_daily.py`

**Interfaces:**
- Consumes: `enrich.enrich`, `models.opinion_key`.
- Produces: `update_opinions(updated: list[Opinion], as_of: date, days: int, root: Path) -> None`. 최근 `days`일 파일을 열어 `opinion_key`가 같은 항목을 `updated`의 것으로 바꿔 쓴다. 바뀐 게 없는 파일은 다시 쓰지 않는다.
- `run_daily.main` 시그니처 변경: `fill_fn` 기본값을 `lambda a: a`로 바꾼다(Google 링크 일괄 본문 시도 제거). `reasons_fn` 매개변수는 지운다. `enrich_fn=enrich`를 추가한다.

**새 흐름** (판정·저장 뒤)
1. `raw = load_recent_opinions(...)`
2. `first = summarize_combined(apply_corrections(raw, corr), as_of, [])`
3. `targets = {opinion_key(o) for o in first.votes + first.needs_review}`
4. `try: done = enrich_fn([o for o in raw if opinion_key(o) in targets])`, `except Exception: done = []`. 원본(수정 전) 의견을 보강해야 파일에 수정 내용이 섞이지 않는다.
5. `if done: update_opinions(done, as_of, VALID_DAYS, data)`
6. 다시 load → apply_corrections → `summarize_combined(..., [])` → history와 render.
- `stale`이면 2~5단계를 건너뛴다.

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# test_store.py
def test_update_opinions_rewrites_matching_entry_in_its_own_file(): ...
    # 10-19 파일과 10-21 파일에 의견 하나씩 → 10-19 의견만 reason 바꿔 update → 10-19 파일만 바뀜, 10-21 파일 mtime·내용 그대로
# test_run_daily.py (기존 run 헬퍼에서 reasons_fn 제거, enrich_fn 추가)
def test_enriched_reason_saved_and_rendered():
    # enrich_fn = lambda ops: [replace(o, reason="금리 하락 영향", enriched=True) for o in ops]
    # → 페이지에 "금리 하락 영향", 저장 파일 reason 반영
def test_body_mismatch_moves_vote_to_review():
    # enrich_fn이 body_stance="bear"를 붙임(stance bull) → history ALL bull 0, 페이지 "확인 필요 (1)"
def test_enrich_crash_does_not_fail_run():
    # enrich_fn raises RuntimeError → 반환 0, 페이지 생성, 1단계 표 그대로
```

기존 테스트 중 `"강세 100%"`처럼 예전 화면 문구를 확인하는 assert는 Task 5에서 고친다. 이 Task에서는 이유 3줄 관련 assert(`"근거" in html`)만 새 흐름에 맞게 지운다.

- [ ] **Step 2: 실패 확인** — `python -m pytest -q tests/test_store.py tests/test_run_daily.py` → FAIL.
- [ ] **Step 3: 구현** — 위 흐름대로 구현한다. `summarize_reasons` import와 호출을 run_daily에서 지운다(함수 자체는 judge.py에 남겨도 됨).
- [ ] **Step 4: 통과 확인** — `python -m pytest -q` → PASS.
- [ ] **Step 5: 커밋** — `git commit -m "feat(market-view): 집계 후 근거 보강을 일일 실행에 연결"`

---

### Task 5: 화면 — 오늘의 뷰

**Files:**
- Modify: `render.py`
- Test: `tests/test_render.py` (예전 화면 문구 assert 교체)

**Interfaces:**
- Consumes: `Opinion.reason`, `Opinion.body_stance`, `Opinion.source_url`.
- Produces: `signal(ratio: float | None) -> tuple[str, str]` = ("green","좋음") / ("yellow","중립") / ("red","나쁨") / ("off","오늘은 의견 없음"). `render_page(day, history, status)` 시그니처는 그대로 둔다.

**화면 구성** (스펙 3장, 목업 `.superpowers/brainstorm/474-1792567815/content/page-v4.html`)
- `<title>오늘의 뷰</title>`, h1 `오늘의 뷰 · {날짜}`.
- 신호등 카드: 어두운 둥근 틀 안에 3칸(초록·노랑·빨강 순)을 두고 해당 칸만 켠다. 그 아래 큰 라벨, 그 아래 `강세 {bull} · 약세 {bear} ({pct}%){어제 대비}`, 배지. 이유 목록과 `_breakdown` 줄은 지운다(`_breakdown` 함수도 삭제).
- 전문가별 의견 `(N)` 카드 → 그 아래 확인 필요 `<details>` → 맨 아래 추이 카드 → 푸터.
- 의견 행:
  - 작은 신호등: bull 초록, bear 빨강, neutral 노랑, unclear는 모두 꺼짐.
  - **하우스** · 작은 글씨 `{시장} · {MM-DD}` · 🔗 링크(`source_url or url`).
  - 코멘트(`summary`), 근거(`reason`, 비어 있으면 줄 생략), 원문 인용(`quote`, 작은 회색 이탤릭).
- 확인 필요 행에서 `body_stance`가 있고 stance와 다르면 `제목 판단 강세 · 본문 판단 약세`처럼 한 줄 더 보여준다.
- 차트: y축 0~100 유지. 60·40 위치에 옅은 수평 기준선을 그린다. Chart.js 플러그인 없이 `afterDraw` 인라인 플러그인으로 그린다.
- 색은 `:root` 변수로 두고, 다크 모드 블록에서 신호등 꺼짐 색과 켜짐 색을 다시 정한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```python
def test_title_is_todays_view(): assert "<title>오늘의 뷰</title>" in page()
@pytest.mark.parametrize("ratio,cls,label", [(0.86,"green","좋음"),(0.61,"green","좋음"),(0.6,"yellow","중립"),
                          (0.5,"yellow","중립"),(0.4,"yellow","중립"),(0.39,"red","나쁨"),(None,"off","오늘은 의견 없음")])
def test_signal_thresholds(ratio, cls, label): assert signal(ratio) == (cls, label)
def test_breakdown_and_reasons_removed():
    html = page(); assert "표 없음" not in html and "금리 인하 기대" not in html and "미국 강세" not in html
def test_order_light_then_experts_then_chart():
    html = page(day(votes=[op()])); assert html.index("lamp") < html.index("전문가별 의견") < html.index('id="chart"')
def test_row_shows_reason_and_source_link():
    html = page(day(votes=[op(reason="금리 하락 영향", source_url="https://real.com/a")]))
    assert "금리 하락 영향" in html and 'href="https://real.com/a"' in html
def test_empty_reason_line_omitted(): ...  # reason "" → 근거 줄용 클래스(예: class="rs")가 없어야 함
def test_neutral_row_yellow_unclear_off(): ...
def test_review_row_shows_title_vs_body_judgment():
    html = page(day(review=[op(stance="bull", body_stance="bear")])); assert "본문 판단 약세" in html
def test_reason_is_escaped():
    html = page(day(votes=[op(reason="<script>x</script> & y")])); assert "<script>x" not in html and "&amp; y" in html
```

기존 `test_verdict_percentages` 등 예전 문구 테스트는 새 문구(`강세 62 · 약세 38 (62%)`)로 바꾸거나, 의미가 사라졌으면 지운다.

- [ ] **Step 2: 실패 확인** — `python -m pytest -q tests/test_render.py` → FAIL.
- [ ] **Step 3: 구현** — 위 구성대로 구현한다.
- [ ] **Step 4: 통과 확인** — `python -m pytest -q` → 전부 PASS.
- [ ] **Step 5: 눈으로 확인** — 10-21 실제 데이터로 페이지를 만든다. 보강은 끈다. `python -c "from market_view import run_daily; ..."` 대신, 임시 스크립트에서 `load_recent_opinions` → `apply_corrections` → `summarize_combined` → `render_page`를 거쳐 스크래치 폴더에 쓴다. 그 파일을 브라우저에서 폰 폭(390px)과 다크 모드로 열어 신호등, 순서, 기준선을 확인한다. `public/market-view/index.html`은 이 Task에서 덮어쓰지 않는다.
- [ ] **Step 6: 커밋** — `git commit -m "feat(market-view): 오늘의 뷰 신호등 화면"`

---

### Task 6: 마무리

- [ ] `README.md`(scripts/market_view)에 2단계 보강, 새 필드, `googlenewsdecoder` 의존성, corrections가 원래 주소로도 매칭된다는 점을 짧게 적는다.
- [ ] `python -m pytest -q` 전부 통과 확인.
- [ ] 커밋 후 사용자에게 보고한다. PR 생성·merge·워크플로 수동 실행은 사용자 확인 후에 한다(APP CLAUDE.md).
