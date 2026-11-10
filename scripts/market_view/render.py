"""휴대폰용 한 페이지 생성 — 오늘의 뷰. 신호등(좋음/중립/나쁨) → 전문가별 의견(신호등·코멘트·근거) → 확인 필요 → 추이 차트."""
import json
from html import escape

from .aggregate import _target_market
from .models import MarketDay, Opinion

MARKET_NAMES = {"US": "미국", "KR": "한국"}
STANCE_NAMES = {"bull": "강세", "bear": "약세", "neutral": "중립", "unclear": "판단 불가"}
STANCE_LAMP = {"bull": "green", "bear": "red", "neutral": "yellow"}
CHART_JS = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
DISCLAIMER = "참고 자료이며 매매 신호가 아닙니다."
GREEN_ABOVE, RED_BELOW = 0.6, 0.4   # 강세 비율이 0.6 초과면 좋음, 0.4 미만이면 나쁨, 그 사이(경계 포함)는 중립

CSS = """
:root{--bg:#fafaf8;--fg:#1d1d1b;--muted:#6b6b66;--card:#fff;--line:#e4e4df;--warn:#8a5a00;--warnbg:#fff3d6;
 --g:#1f9d4a;--y:#e8b100;--r:#d1342b;--off:#4a4a45;--housing:#2b2b28}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ececea;--muted:#9a9a94;--card:#1e1e1c;--line:#33332f;--warn:#ffcf70;--warnbg:#3a2e12;
 --g:#3ccf6e;--y:#ffcc33;--r:#ff5a4f;--off:#3a3a36;--housing:#0b0b0a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}
main{max-width:640px;margin:0 auto;padding:12px 16px 40px}
h1{font-size:18px;margin:4px 0 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px}
.muted{color:var(--muted);font-size:13px}
.badge{display:inline-block;background:var(--warnbg);color:var(--warn);border-radius:6px;padding:1px 8px;font-size:12px;margin:4px 4px 0 0}
.lamp{display:inline-flex;gap:3px;background:var(--housing);padding:3px 5px;border-radius:10px;vertical-align:middle;flex:none}
.lamp i{width:9px;height:9px;border-radius:50%;background:var(--off)}
.lamp.green i:nth-child(1){background:var(--g)}.lamp.yellow i:nth-child(2){background:var(--y)}.lamp.red i:nth-child(3){background:var(--r)}
.lamp.big{gap:10px;padding:10px 14px;border-radius:40px}.lamp.big i{width:38px;height:38px}
.lamp.big.green i:nth-child(1){box-shadow:0 0 16px var(--g)}.lamp.big.yellow i:nth-child(2){box-shadow:0 0 16px var(--y)}
.lamp.big.red i:nth-child(3){box-shadow:0 0 16px var(--r)}
.signal{text-align:center}.verdict{font-size:26px;font-weight:800;margin-top:8px}
.verdict.green{color:var(--g)}.verdict.yellow{color:var(--y)}.verdict.red{color:var(--r)}.verdict.off{color:var(--muted);font-size:20px}
.periods{display:flex;gap:6px;margin:6px 0}
.periods button{padding:4px 10px;border:1px solid var(--line);background:none;color:var(--fg);border-radius:8px}
.periods button[aria-pressed=true]{border-color:var(--fg);font-weight:700}
.op{border-top:1px solid var(--line);padding:10px 0}.op:first-of-type{border-top:0}
.who{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.who a{margin-left:auto;text-decoration:none}
.cm{margin-top:4px}.rs{margin-top:2px;font-size:14px;opacity:.85}.jd{margin-top:2px;font-size:13px;color:var(--warn)}
.op q{display:block;font-style:italic;color:var(--muted);font-size:12px;margin-top:3px;overflow-wrap:anywhere}
details summary{cursor:pointer;font-weight:600}footer{color:var(--muted);font-size:12px;text-align:center;margin-top:16px}
a{color:inherit}
"""

JS = """
const H = __HISTORY__.filter(r=>r.market==='ALL');
const GUIDES = [60, 40];
function bucket(rows,p){if(p==='day')return rows.slice(-30).map(r=>[r.date,r.ratio]);
 const g={};rows.forEach(r=>{if(r.ratio==null)return;const d=new Date(r.date);let k;
  if(p==='month')k=r.date.slice(0,7);else{const t=new Date(d);t.setDate(d.getDate()-((d.getDay()+6)%7));k=t.toISOString().slice(0,10);}
  (g[k]=g[k]||[]).push(r.ratio);});
 return Object.keys(g).sort().slice(-26).map(k=>[k,g[k].reduce((a,b)=>a+b,0)/g[k].length]);}
const guideLines={id:'guides',beforeDatasetsDraw(c){const y=c.scales.y,a=c.chartArea,ctx=c.ctx;ctx.save();
 ctx.strokeStyle='rgba(128,128,128,.4)';ctx.setLineDash([4,4]);
 GUIDES.forEach(v=>{const py=y.getPixelForValue(v);ctx.beginPath();ctx.moveTo(a.left,py);ctx.lineTo(a.right,py);ctx.stroke();});ctx.restore();}};
let chart;
function draw(p){const pts=bucket(H,p);const el=document.getElementById('chart');
 if(chart)chart.destroy();if(typeof Chart==='undefined')return;
 chart=new Chart(el,{type:'line',data:{labels:pts.map(x=>x[0]),datasets:[{data:pts.map(x=>x[1]==null?null:Math.round(x[1]*100)),spanGaps:true,tension:.25,borderWidth:2,pointRadius:2}]},
  options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}}},plugins:[guideLines]});
 document.querySelectorAll('.periods button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===p));}
document.querySelectorAll('.periods button').forEach(b=>b.onclick=()=>draw(b.dataset.p));
draw('day');
"""


def signal(ratio: float | None) -> tuple[str, str]:
    """강세 비율 → (신호등 색, 라벨)."""
    if ratio is None:
        return "off", "오늘은 의견 없음"
    if ratio > GREEN_ABOVE:
        return "green", "좋음"
    if ratio < RED_BELOW:
        return "red", "나쁨"
    return "yellow", "중립"


def _lamp(color: str, big: bool = False) -> str:
    return f'<div class="lamp{" big" if big else ""} {color}"><i></i><i></i><i></i></div>'


def _op_row(op: Opinion) -> str:
    eff = op.report_date or op.article_date
    mk = MARKET_NAMES.get(_target_market(op) or "", "")
    link = op.source_url or op.url
    judged = ""
    if op.body_stance and op.body_stance != op.stance:
        judged = (f'<div class="jd">제목 판단 {STANCE_NAMES.get(op.stance, op.stance)} · '
                  f'본문 판단 {STANCE_NAMES.get(op.body_stance, op.body_stance)}</div>')
    return (f'<div class="op"><div class="who">{_lamp(STANCE_LAMP.get(op.stance, "off"))} <b>{escape(op.house)}</b> '
            f'<span class="muted">{mk} · {eff.strftime("%m-%d")}</span> '
            f'<a href="{escape(link, quote=True)}" target="_blank" rel="noopener">🔗</a></div>'
            f'<div class="cm">{escape(op.summary)}</div>'
            + (f'<div class="rs">{escape(op.reason)}</div>' if op.reason else "")
            + judged + f'<q>{escape(op.quote)}</q></div>')


def _change(day: MarketDay, history: list[dict]) -> str:
    prev = [r for r in history if r["market"] == day.market and r["date"] < day.date.isoformat() and r["ratio"] is not None]
    if day.ratio is None or not prev:
        return ""
    diff = round(day.ratio * 100) - round(max(prev, key=lambda r: r["date"])["ratio"] * 100)
    arrow = "▲" if diff > 0 else "▼" if diff < 0 else "-"
    return f" · 어제 대비 {arrow}{abs(diff)}" if diff else " · 어제와 같음"


def render_page(day: MarketDay, history: list[dict], status: dict) -> str:
    badges = [b for b in day.badges if b != "의견 없음"] + (["갱신 실패"] if status.get("stale") else [])
    color, label = signal(day.ratio)
    count = ""
    if day.ratio is not None:
        count = (f'<div class="muted">강세 {day.bull} · 약세 {day.bear} ({round(day.ratio * 100)}%)'
                 f'{_change(day, history)}</div>')
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
<title>오늘의 뷰</title><style>{CSS}</style></head>
<body><main>
<h1>오늘의 뷰 · {escape(str(day.date))}</h1>
<div class="card signal">{_lamp(color, big=True)}<div class="verdict {color}">{label}</div>{count}
{"".join(f"<span class=badge>{escape(x)}</span>" for x in badges)}</div>
<div class="card"><b>전문가별 의견 ({len(day.votes)})</b>{rows}</div>{review}
<div class="card"><b>추이</b> <span class="muted">강세 비율</span><div class="periods">{periods}</div><canvas id="chart" height="180"></canvas></div>
<footer>오늘 수집 {status.get("collected", 0)}건 / 실패 {status.get("failed", 0)}건 · 갱신 {escape(str(status.get("updated_at", "")))}<br>{DISCLAIMER}</footer>
</main>
<script src="{CHART_JS}"></script>
<script>{JS.replace("__HISTORY__", hist_json)}</script>
</body></html>"""
