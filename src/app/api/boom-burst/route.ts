import { NextResponse } from 'next/server';
import * as fs   from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

// ── 경로 설정 ─────────────────────────────────────────────
const DATA_DIR = process.env.INDEX_PYTHON_DATA_DIR
  ?? path.join(process.cwd(), 'index-data');
const WEIGHTS_FILE = process.env.INDEX_PYTHON_WEIGHTS_FILE
  ?? path.join(process.cwd(), 'index-data', 'regression_weights.json');

// ── 지표 설정 ─────────────────────────────────────────────
const SERIES_CONFIG: Record<string, {
  name: string; panicUp: boolean; yoy: boolean;
  category: string; note: string; unit: string;
}> = {
  UMCSENT:  { name: '소비자신뢰지수',        panicUp: false, yoy: false, category: '실물 지표',   note: '낮을수록 위기',         unit: 'pt'  },
  NEWORDER: { name: '기업 설비투자',          panicUp: false, yoy: true,  category: '실물 지표',   note: 'YoY% · 낮을수록 위기', unit: '%'   },
  ICSA:     { name: '주간 실업수당 청구',     panicUp: true,  yoy: false, category: '실물 지표',   note: '높을수록 위기',         unit: '천건' },
  T10Y2Y:   { name: '10Y-2Y 국채 스프레드',  panicUp: false, yoy: false, category: '금융 지표',   note: '음수 = 경기침체 신호', unit: '%p'  },
  VIXCLS:   { name: 'VIX',                   panicUp: true,  yoy: false, category: '금융 지표',   note: '높을수록 불안↑',       unit: 'pt'  },
  M2SL:     { name: 'M2 통화량',             panicUp: false, yoy: true,  category: '유동성·물가', note: 'YoY% · 낮을수록 위기', unit: '%'   },
  MICH:     { name: '1년 기대 인플레이션',   panicUp: false, yoy: false, category: '유동성·물가', note: '낮을수록 위기',         unit: '%'   },
};

const CATEGORIES: Record<string, { icon: string; keys: string[] }> = {
  '실물 지표':   { icon: 'ti-building-factory', keys: ['UMCSENT', 'NEWORDER', 'ICSA'] },
  '금융 지표':   { icon: 'ti-chart-line',        keys: ['T10Y2Y', 'VIXCLS'] },
  '유동성·물가': { icon: 'ti-coins',             keys: ['M2SL', 'MICH'] },
};

const COMPOSITE_BOUNDS = [31, 47, 59, 68];
const ROLLING_MONTHS   = 20 * 12; // 240개월
const MIN_PERIODS      = 12;
const BASE_YEAR        = '1996-01-01';

// ── 유틸 ─────────────────────────────────────────────────
function readCsv(filepath: string): { date: string; value: number }[] {
  if (!fs.existsSync(filepath)) return [];
  const lines  = fs.readFileSync(filepath, 'utf-8').replace(/^﻿/, '').trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h => h.trim());
  const dIdx   = header.indexOf('date');
  const vIdx   = header.indexOf('value');
  if (dIdx < 0 || vIdx < 0) return [];
  return lines.slice(1).flatMap(line => {
    const cols = line.split(',');
    const val  = parseFloat(cols[vIdx]);
    if (!cols[dIdx] || isNaN(val)) return [];
    return [{ date: cols[dIdx].trim(), value: val }];
  });
}

function readCompositeCsv(filepath: string): { date: string; value: number }[] {
  if (!fs.existsSync(filepath)) return [];
  const lines  = fs.readFileSync(filepath, 'utf-8').replace(/^﻿/, '').trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h => h.trim());
  const dIdx   = header.indexOf('date');
  const cIdx   = header.indexOf('composite');
  if (dIdx < 0 || cIdx < 0) return [];
  return lines.slice(1).flatMap(line => {
    const cols = line.split(',');
    const val  = parseFloat(cols[cIdx]);
    if (!cols[dIdx] || isNaN(val)) return [];
    return [{ date: cols[dIdx].trim(), value: val }];
  });
}

function applyYoy(data: { date: string; value: number }[]): { date: string; value: number }[] {
  const byYM: Record<string, number> = {};
  for (const r of data) byYM[r.date.slice(0, 7)] = r.value;
  return data.flatMap(r => {
    const [y, m] = r.date.slice(0, 7).split('-').map(Number);
    const prevYM = `${y - 1}-${String(m).padStart(2, '0')}`;
    const prev   = byYM[prevYM];
    if (prev == null || prev === 0) return [];
    return [{ date: r.date, value: ((r.value - prev) / Math.abs(prev)) * 100 }];
  });
}

// pandas rank(pct=True) 근사 — rolling window 내 현재값의 백분위
function rollingPercentile(values: number[]): (number | null)[] {
  return values.map((val, i) => {
    const start = Math.max(0, i - ROLLING_MONTHS + 1);
    const win   = values.slice(start, i + 1);
    if (win.length < MIN_PERIODS) return null;
    const less  = win.filter(v => v < val).length;
    const equal = win.filter(v => v === val).length;
    return ((less + (equal + 1) / 2) / win.length) * 100;
  });
}

function getStatus(pct: number): string {
  if (pct >= 90) return '위기';
  if (pct >= 70) return '둔화';
  if (pct >= 30) return '중립';
  if (pct >= 10) return '호조';
  return '과열';
}

function getCompositeStatus(val: number): string {
  if (val <= COMPOSITE_BOUNDS[0]) return '위기';
  if (val <= COMPOSITE_BOUNDS[1]) return '둔화';
  if (val <= COMPOSITE_BOUNDS[2]) return '중립';
  if (val <= COMPOSITE_BOUNDS[3]) return '호조';
  return '과열';
}

function statusToLevel(status: string): string {
  if (status === '위기' || status === '둔화') return 'fear';
  if (status === '중립') return 'neutral';
  return 'greed';
}

function fmtVal(v: number, sid: string): string {
  if (sid === 'ICSA') return Math.round(v).toLocaleString('ko-KR');
  if (Math.abs(v) >= 1000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  if (Math.abs(v) >= 10)   return v.toFixed(1);
  return v.toFixed(2);
}

// ── 메인 ─────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. 회귀 가중치 로드
    const weights: Record<string, number> = {};
    if (fs.existsSync(WEIGHTS_FILE)) {
      const wj = JSON.parse(fs.readFileSync(WEIGHTS_FILE, 'utf-8'));
      Object.assign(weights, wj.weights ?? {});
    } else {
      // DEFAULT_WEIGHTS fallback
      Object.assign(weights, {
        UMCSENT: 7, NEWORDER: 25.2, ICSA: 28.6,
        T10Y2Y: 6.4, VIXCLS: 5, M2SL: 15.8, MICH: 12,
      });
    }

    // 2. 종합지수 시계열 (composite_index.csv — step3_plot.py 출력)
    const compositeHistory = readCompositeCsv(path.join(DATA_DIR, 'composite_index.csv'));
    const latestComposite  = compositeHistory.length > 0
      ? compositeHistory[compositeHistory.length - 1].value
      : 50;
    const compositeScore   = Math.round(latestComposite * 10) / 10;

    // 히스토리컬 차트용 (label + value)
    const chartData = compositeHistory
      .filter(r => r.date >= BASE_YEAR)
      .map(r => ({ label: r.date.slice(0, 7), value: Math.round(r.value * 10) / 10 }));

    // 3. 개별 지표 로드 & 백분위 계산
    const indicators: {
      category: string; icon: string;
      items: {
        name: string; value: string; note: string; level: string;
        status: string; percentile: number; unit: string;
        history: { date: string; value: number }[];
        panicUp: boolean;
      }[];
    }[] = [];

    for (const [cat, { icon, keys }] of Object.entries(CATEGORIES)) {
      const items = [];
      for (const sid of keys) {
        const cfg  = SERIES_CONFIG[sid];
        let   data = readCsv(path.join(DATA_DIR, `${sid}.csv`));
        if (data.length === 0) continue;

        // BASE_YEAR 필터
        data = data.filter(r => r.date >= BASE_YEAR);

        // YoY 변환
        if (cfg.yoy) data = applyYoy(data);
        if (data.length === 0) continue;

        const values = data.map(r => r.value);
        const pctArr = rollingPercentile(values);

        // 최신 유효 백분위
        let latestPct: number | null = null;
        for (let i = pctArr.length - 1; i >= 0; i--) {
          if (pctArr[i] !== null) { latestPct = pctArr[i]; break; }
        }
        if (latestPct === null) continue;

        // panic 방향 반전
        const panicPct = cfg.panicUp ? latestPct : 100 - latestPct;
        const status   = getStatus(panicPct);
        const latest   = values[values.length - 1];

        items.push({
          name:       cfg.name,
          value:      fmtVal(latest, sid),
          note:       cfg.note,
          level:      statusToLevel(status),
          status,
          percentile: Math.round(panicPct * 10) / 10,
          unit:       cfg.unit,
          history:    data,
          panicUp:    cfg.panicUp,
        });
      }
      if (items.length > 0) indicators.push({ category: cat, icon, items });
    }

    return NextResponse.json({
      compositeScore,
      compositeStatus: getCompositeStatus(compositeScore),
      compositeBounds: COMPOSITE_BOUNDS,
      indicators,
      chartData,
      updatedAt: compositeHistory.length > 0
        ? compositeHistory[compositeHistory.length - 1].date.slice(0, 7)
        : new Date().toISOString().slice(0, 7),
    });

  } catch (err) {
    console.error('[boom-burst]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
