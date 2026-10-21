"""근거 보강(2단계): 화면에 나갈 의견만 원래 기사 본문을 읽고, 음슴체 코멘트·근거 1~2줄·본문 판단을 붙인다.
근거는 AI가 옮긴 본문 문장(evidence)이 실제 본문에 있을 때만 쓴다. 판정(stance)은 바꾸지 않는다."""
import time
from dataclasses import replace

from . import config
from .fetch import fetch_body, resolve_url
from .judge import MAX_BODY_CHARS, _extract_json, _norm
from .llm import complete_json
from .models import STANCES, Opinion

ENRICH_PROMPT = """너는 외국계 전문가의 증시 전망 기사를 한국 개인 투자자에게 전하는 편집자다.
기사 본문과 전문가(하우스) 정보가 주어진다. 이 하우스가 해당 시장을 어떻게 보는지 아래 JSON 객체 하나로만 출력한다.

- comment: 이 하우스의 시장 전망을 한 줄로. 음슴체(~봄, ~했음, ~임)로 쓰되 한국어로 자연스럽게. 영어 제목을 옮긴 번역투 금지.
- reason: 그렇게 보는 근거 1~2줄. 금리·실적·밸류에이션·수급처럼 구체적인 이유를 음슴체로.
- evidence: reason의 바탕이 된 본문 문장을 번역하지 말고 그대로 옮긴 것.
- body_stance: 이 하우스의 해당 시장 전망 방향을 본문만 보고 판단. "bull"(상승·비중확대), "bear"(하락·비중축소),
  "neutral"(중립), "unclear"(알 수 없음) 중 하나.

규칙
- 본문에 없는 내용은 절대 쓰지 않는다. 숫자·이유를 지어내지 않는다.
- 밸류에이션, EPS, 비중확대, 컨센서스 같은 주식 용어는 풀어 쓰지 않고 그대로 쓴다.

말투 예시
- comment: "증시를 누르던 가장 큰 부담이 줄어드는 중이라고 봄."
- reason: "국채 금리 상승세가 꺾이며 밸류에이션 부담이 덜해졌고, 3분기 실적도 예상보다 좋았음."

출력 예: {"comment": "...", "reason": "...", "evidence": "...", "body_stance": "bull"}"""

MIN_EVIDENCE_CHARS = 30   # 이보다 짧은 인용("the Fed" 등)은 근거를 확인한 것으로 보지 않는다

_MARKET_NAMES = {"US": "미국 증시", "KR": "한국 증시"}
_HORIZON_NAMES = {"short": "단기", "12m": "12개월", "unknown": "기간 모름"}


def _fail(op: Opinion, **kw) -> Opinion:
    tries = op.enrich_tries + 1
    return replace(op, enrich_tries=tries, enriched=tries >= config.ENRICH_MAX_TRIES, **kw)


def _ask(op: Opinion, body: str, llm) -> dict | None:
    user = (f"하우스: {op.house}\n시장: {_MARKET_NAMES.get(op.market, op.market)}\n"
            f"기간: {_HORIZON_NAMES.get(op.horizon, op.horizon)}\n\n본문:\n{body[:MAX_BODY_CHARS]}")
    # 제목 판단은 일부러 알려주지 않는다: 본문 판단이 그쪽으로 끌려가지 않게
    try:
        raw, _ = llm(ENRICH_PROMPT, user)
        d = _extract_json(raw)
    except Exception:
        return None
    if not isinstance(d, dict) or d.get("body_stance") not in STANCES:
        return None
    if not all(isinstance(d.get(k), str) and d[k].strip() for k in ("comment", "reason", "evidence")):
        return None
    ev = _norm(d["evidence"])
    if len(ev) < MIN_EVIDENCE_CHARS or ev not in _norm(body[:MAX_BODY_CHARS]):
        return None   # 너무 짧거나 본문에 없는 근거 -> 버린다
    return d


def enrich(opinions: list[Opinion], resolve=resolve_url, fetch=fetch_body, llm=complete_json,
           limit: int = config.ENRICH_MAX_PER_RUN, pause: float = config.LLM_PAUSE) -> list[Opinion]:
    """보강이 끝나지 않은 의견을 앞에서부터 limit건 처리해, 처리한 의견만 새 객체로 돌려준다."""
    todo = [o for o in opinions if not o.enriched][:limit]
    by_url: dict[str, list[Opinion]] = {}
    for o in todo:
        by_url.setdefault(o.url, []).append(o)

    out, asked = [], 0
    for url, ops in by_url.items():
        try:
            source = resolve(url)
            body = fetch(source) if source else None
        except Exception:   # TemporaryFailure와 예상 못 한 오류 모두: 이 기사만 실패로 세고 나머지는 계속
            out += [_fail(o) for o in ops]
            continue
        src = source or ""
        if body is None:   # 기사 없음·유료·차단: 다시 시도하지 않는다
            out += [replace(o, source_url=src, enriched=True) for o in ops]
            continue
        for o in ops:
            if asked and pause:
                time.sleep(pause)   # 무료 등급 분당 요청 한도 대비
            asked += 1
            d = _ask(o, body, llm)
            if d is None:
                out.append(_fail(o, source_url=src))
            else:
                out.append(replace(o, title_summary=o.title_summary or o.summary,
                                   summary=d["comment"].strip(), reason=d["reason"].strip(),
                                   body_stance=d["body_stance"], source_url=src, enriched=True))
    return out
