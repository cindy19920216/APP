"""매일 실행: 수집 → 판정(제목) → 저장 → 수정 적용 → 집계 → 근거 보강(화면에 나갈 의견만 본문) → 다시 집계 → 페이지.
사용: (scripts 폴더에서) python -m market_view.run_daily
반환값 0 = 정상, 1 = 수집 0건 또는 AI 판정 전부 실패(남아 있는 유효 의견으로 페이지를 만들고 '갱신 실패' 표시)."""
import json
import sys
import time
from datetime import date, datetime
from pathlib import Path

from . import config
from .aggregate import summarize_combined
from .collect import KST, collect
from .corrections import apply_corrections, load_corrections
from .enrich import enrich
from .judge import judge_batch
from .models import Opinion, opinion_key
from .render import render_page
from .store import (load_history, load_judged, load_recent_opinions, save_judged, save_opinions,
                    update_opinions, upsert_history)


def _merge_today(new: list[Opinion], data: Path, as_of: date) -> list[Opinion]:
    p = data / "opinions" / f"{as_of.isoformat()}.json"
    old = [Opinion.from_dict(d) for d in json.loads(p.read_text(encoding="utf-8"))] if p.exists() else []
    seen, out = set(), []
    for o in old + new:
        key = opinion_key(o)
        if key not in seen:
            seen.add(key)
            out.append(o)
    return out


def main(as_of: date | None = None, data_dir: Path = config.DATA_DIR, site_dir: Path = config.SITE_DIR,
         collect_fn=collect, judge_fn=judge_batch, fill_fn=lambda a: a, enrich_fn=enrich,
         pause: float = config.LLM_PAUSE, batch_size: int = config.BATCH_SIZE) -> int:
    as_of = as_of or datetime.now(KST).date()
    data, site = data_dir, site_dir

    articles = collect_fn(as_of)
    judged = load_judged(data)
    todo = [a for a in articles if a.url not in judged]
    found, ok, failed = [], 0, 0
    for start in range(0, len(todo), batch_size):
        batch = todo[start:start + batch_size]
        if start and pause:
            time.sleep(pause)
        try:
            found += judge_fn([fill_fn(a) for a in batch])
            for a in batch:
                judged[a.url] = as_of.isoformat()
            ok += len(batch)
        except Exception:   # AllProvidersFailed, UnparsableResponse, 그 밖의 오류: 묶음의 기사 모두 실패로 센다
            failed += len(batch)
    save_judged(judged, as_of, config.VALID_DAYS, data)
    # 수집이 0건이거나(차단·네트워크 장애) 판정이 전부 실패하면 '갱신 실패'
    stale = not articles or (ok == 0 and failed > 0)

    if found or not (data / "opinions" / f"{as_of.isoformat()}.json").exists():
        save_opinions(as_of, _merge_today(found, data, as_of), data)

    corrections = load_corrections(data / "corrections.csv")
    if not stale:
        # 화면에 나갈 의견(표 + 확인 필요)만 본문을 읽어 근거를 붙인다. 수정 전 원본을 보강해야 파일에 수정이 섞이지 않는다.
        raw = load_recent_opinions(as_of, config.VALID_DAYS, data)
        first = summarize_combined(apply_corrections(raw, corrections), as_of, [])
        targets = {opinion_key(o) for o in first.votes + first.needs_review}
        try:
            done = enrich_fn([o for o in raw if opinion_key(o) in targets])
        except Exception as e:   # 보강 실패는 갱신 실패가 아니다: 1단계 결과로 페이지를 만든다
            print(f"[market_view] 근거 보강 실패: {e}")
            done = []
        if done:
            update_opinions(done, as_of, config.VALID_DAYS, data)

    opinions = apply_corrections(load_recent_opinions(as_of, config.VALID_DAYS, data), corrections)
    today = summarize_combined(opinions, as_of, [])
    if not stale:
        upsert_history(today, data)

    status = {"collected": len(articles), "failed": failed, "stale": stale,
              "updated_at": datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")}
    site.mkdir(parents=True, exist_ok=True)
    (site / "index.html").write_text(render_page(today, load_history(data), status), encoding="utf-8")
    print(f"[market_view] {as_of} collected={len(articles)} ok={ok} failed={failed} stale={stale}")
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
