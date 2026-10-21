"""휴대폰용 한 페이지 생성. 판정 카드(한국·미국 합산 + 시장별 내역) → 추이 차트 → 전문가 표."""
import json
from html import escape

from .aggregate import _target_market, to_vote_stance
from .models import MarketDay, Opinion

MARKET_NAMES = {"US": "미국", "KR": "한국"}
CHART_JS = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
DISCLAIMER = "참고 자료이며 매매 신호가 아닙니다."

CSS = """
:root{--bg:#fafaf8;--fg:#1d1d1b;--muted:#6b6b66;--card:#fff;--line:#e4e4df;--bull:#1f7a3a;--bear:#b3261e;--warn:#8a5a00;--warnbg:#fff3d6}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ececea;--muted:#9a9a94;--card:#1e1e1c;--line:#33332f;--bull:#5cc27a;--bear:#ff7b72;--warn:#ffcf70;--warnbg:#3a2e12}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}
main{max-width:640px;margin:0 auto;padding:12px 16px 40px}
h1{font-size:18px;margin:4px 0 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px}
.verdict{font-size:22px;font-weight:700}.bull{color:var(--bull)}.bear{color:var(--bear)}.muted{color:var(--muted);font-size:13px}
.mk{display:inline-block;border:1px solid var(--line);border-radius:5px;padding:0 5px;font-size:11px;color:var(--muted)}
.badge{display:inline-block;background:var(--warnbg);color:var(--warn);border-radius:6px;padding:1px 8px;font-size:12px;margin:4px 4px 0 0}
ol{margin:8px 0 0;padding-left:20px}.periods{display:flex;gap:6px;margin-bottom:6px}
.periods button{padding:4px 10px;border:1px solid var(--line);background:none;color:var(--fg);border-radius:8px}
.periods button[aria-pressed=true]{border-color:var(--fg);font-weight:700}
.op{border-top:1px solid var(--line);padding:8px 0}.op:first-child{border-top:0}
.op q{display:block;font-style:italic;color:var(--muted);font-size:13px;overflow-wrap:anywhere}
details summary{cursor:pointer;font-weight:600}footer{color:var(--muted);font-size:12px;text-align:center;margin-top:16px}
a{color:inherit}
"""

JS = """
const H = __HISTORY__.filter(r=>r.market==='ALL');
function bucket(rows,p){if(p==='day')return rows.slice(-30).map(r=>[r.date,r.ratio]);
 const g={};rows.forEach(r=>{if(r.ratio==null)return;const d=new Date(r.date);let k;
  if(p==='month')k=r.date.slice(0,7);else{const t=new Date(d);t.setDate(d.getDate()-((d.getDay()+6)%7));k=t.toISOString().slice(0,10);}
  (g[k]=g[k]||[]).push(r.ratio);});
 return Object.keys(g).sort().slice(-26).map(k=>[k,g[k].reduce((a,b)=>a+b,0)/g[k].length]);}
let chart;
function draw(p){const pts=bucket(H,p);const el=document.getElementById('chart');
 if(chart)chart.destroy();if(typeof Chart==='undefined')return;
 chart=new Chart(el,{type:'line',data:{labels:pts.map(x=>x[0]),datasets:[{data:pts.map(x=>x[1]==null?null:Math.round(x[1]*100)),spanGaps:true,tension:.25,borderWidth:2,pointRadius:2}]},
  options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}}}});
 document.querySelectorAll('.periods button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===p));}
document.querySelectorAll('.periods button').forEach(b=>b.onclick=()=>draw(b.dataset.p));
draw('day');
"""

def _stance_label(op: Opinion) -> tuple[str, str]:
    if op.stance == "neutral":
        return "약세(중립)", "bear"
    v = to_vote_stance(op)
    if v == "bull":
        return "강세", "bull"
    if v == "bear":
        return "약세", "bear"
    return "판단 불가", ""


def _op_row(op: Opinion) -> str:
    label, cls = _stance_label(op)
    eff = (op.report_date or op.article_date).isoformat()
    mk = MARKET_NAMES.get(_target_market(op) or "", "")
    return (f'<div class="op"><span class="mk">{mk}</span> <b>{escape(op.house)}</b> · <span class="{cls}">{label}</span> · '
            f'<span class="muted">{eff}</span> <a href="{escape(op.url, quote=True)}" target="_blank" rel="noopener">🔗</a>'
            f'<div>{escape(op.summary)}</div><q>{escape(op.quote)}</q></div>')


def _change(day: MarketDay, history: list[dict]) -> str:
    prev = [r for r in history if r["market"] == day.market and r["date"] < day.date.isoformat() and r["ratio"] is not None]
    if day.ratio is None or not prev:
        return ""
    diff = round(day.ratio * 100) - round(max(prev, key=lambda r: r["date"])["ratio"] * 100)
    arrow = "▲" if diff > 0 else "▼" if diff < 0 else "-"
    return f" · 어제 대비 {arrow}{abs(diff)}" if diff else " · 어제와 같음"


def _breakdown(day: MarketDay) -> str:
    parts = []
    for m, name in MARKET_NAMES.items():
        bull, bear = day.breakdown.get(m, (0, 0))
        parts.append(f"{name} 강세 {bull} · 약세 {bear}" if bull + bear else f"{name} 표 없음")
    return f'<div class="muted">{" / ".join(parts)}</div>'


def render_page(day: MarketDay, history: list[dict], status: dict) -> str:
    badges = list(day.badges) + (["갱신 실패"] if status.get("stale") else [])
    if day.ratio is None:
        verdict = '<div class="verdict">의견 없음</div>'
    else:
        b = round(day.ratio * 100)
        verdict = (f'<div class="verdict"><span class="bull">강세 {b}%</span> / <span class="bear">약세 {100 - b}%</span></div>'
                   f'<div class="muted">유효 {day.bull + day.bear}표 (강세 {day.bull} · 약세 {day.bear}){_change(day, history)}</div>')
    reasons = "".join(f"<li>{escape(r)}</li>" for r in day.reasons)
    rows = "".join(_op_row(o) for o in day.votes) or '<div class="muted">유효한 의견이 없습니다.</div>'
    review = ""
    if day.needs_review:
        review = (f'<details class="card"><summary>확인 필요 ({len(day.needs_review)})</summary>'
                  + "".join(_op_row(o) for o in day.needs_review) + "</details>")
    periods = "".join(f'<button data-p="{p}">{n}</button>' for p, n in (("day", "일"), ("week", "주"), ("month", "월")))
    hist_json = json.dumps(history, ensure_ascii=False).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>외국계 시각</title><style>{CSS}</style></head>
<body><main>
<h1>외국계 시각 · 주식시장 · {escape(str(day.date))}</h1>
<div class="card">{verdict}{_breakdown(day)}{"".join(f"<span class=badge>{escape(x)}</span>" for x in badges)}
{f"<ol>{reasons}</ol>" if reasons else ""}</div>
<div class="card"><div class="periods">{periods}</div><canvas id="chart" height="180"></canvas></div>
<div class="card"><b>전문가별 의견</b>{rows}</div>{review}
<footer>오늘 수집 {status.get("collected", 0)}건 / 실패 {status.get("failed", 0)}건 · 갱신 {escape(str(status.get("updated_at", "")))}<br>{DISCLAIMER}</footer>
</main>
<script src="{CHART_JS}"></script>
<script>{JS.replace("__HISTORY__", hist_json)}</script>
</body></html>"""
