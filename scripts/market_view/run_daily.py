"""매일 실행: 수집 → 본문 → 판정 → 저장 → 수정 적용 → 집계 → 페이지.
사용: (scripts 폴더에서) python -m market_view.run_daily
반환값 0 = 정상, 1 = 수집 0건 또는 AI 판정 전부 실패(남아 있는 유효 의견으로 페이지를 만들고 '갱신 실패' 표시)."""
import json
import sys
import time
from datetime import date, datetime
from pathlib import Path

from . import config
from .aggregate import select_votes, summarize_day
from .collect import KST, collect, fill_text
from .corrections import apply_corrections, load_corrections
from .judge import judge_batch, summarize_reasons
from .models import Opinion
from .render import render_page
from .store import (load_history, load_judged, load_recent_opinions, save_judged, save_opinions,
                    upsert_history)


def _merge_today(new: list[Opinion], data: Path, as_of: date) -> list[Opinion]:
    p = data / "opinions" / f"{as_of.isoformat()}.json"
    old = [Opinion.from_dict(d) for d in json.loads(p.read_text(encoding="utf-8"))] if p.exists() else []
    seen, out = set(), []
    for o in old + new:
        key = (o.url, o.house, o.market, o.horizon, o.scope)
        if key not in seen:
            seen.add(key)
            out.append(o)
    return out


def main(as_of: date | None = None, data_dir: Path = config.DATA_DIR, site_dir: Path = config.SITE_DIR,
         collect_fn=collect, judge_fn=judge_batch, fill_fn=fill_text, reasons_fn=summarize_reasons,
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

    opinions = apply_corrections(load_recent_opinions(as_of, config.VALID_DAYS, data),
                                 load_corrections(data / "corrections.csv"))
    today = {}
    for m in ("KR", "US"):
        votes, _ = select_votes(opinions, m, as_of)
        try:
            reasons = [] if stale else reasons_fn(votes, m)
        except Exception:
            reasons = []
        today[m] = summarize_day(opinions, m, as_of, reasons)
        if not stale:
            upsert_history(today[m], data)

    status = {"collected": len(articles), "failed": failed, "stale": stale,
              "updated_at": datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")}
    site.mkdir(parents=True, exist_ok=True)
    (site / "index.html").write_text(render_page(today, load_history(data), status), encoding="utf-8")
    print(f"[market_view] {as_of} collected={len(articles)} ok={ok} failed={failed} stale={stale}")
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main())
