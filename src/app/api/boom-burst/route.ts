import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ── 시리즈 정의 ──────────────────────────────────────────
const SERIES: Record<string, string> = {
  '미국 주식 불확실성 지수':     'WLEMUINDXD',
  '미국 고위험채권 유효이자율':  'BAMLH0A0HYM2EY',
  '미국 기업여신 증가율':        'BUSLOANS',
  '미국 금융시장 경색 지수':     'NFCI',
  '미국 장단기 금리차':          'T10Y2Y',
  'CAD/USD':                     'DEXCAUS',
  'JPY/USD':                     'DEXJPUS',
  '미국 주간 실물경기 지수':     'WEI',
  '미국 실물경기 경기침체 확률': 'RECPROUSM156N',
  '샴 규칙 경기침체 지표':       'SAHMREALTIME',
  '미국 국가활동 지수':          'CFNAI',
  '미국 트럭판매 현황':          'TRUCKD11',
  '미국 화물운송 현황':          'RAILFRTCARLOADSD11',
  '금 가격':                     'GOLDAMGBD228NLBM',
  '원유 가격 WTI':               'DCOILWTICO',
  '미국 통화유동속도':           'M2V',
  '미국 실업률':                 'UNRATE',
  '미국 자연실업률':             'NROU',
  '미국 기대 인플레이션':        'T10YIE',
};

const PANIC_UP: Record<string, boolean> = {
  '미국 주식 불확실성 지수':     true,
  '미국 고위험채권 유효이자율':  true,
  '미국 기업여신 증가율':        false,
  '미국 금융시장 경색 지수':     true,
  '미국 장단기 금리차':          false,
  '캐나다 달러/일본 엔화':       false,
  '미국 주간 실물경기 지수':     false,
  '미국 실물경기 경기침체 확률': true,
  '샴 규칙 경기침체 지표':       true,
  '미국 국가활동 지수':          false,
  '미국 트럭판매 현황':          false,
  '미국 화물운송 현황':          false,
  '금/석유 가격 비율':           true,
  '미국 통화유동속도':           false,
  '미국 실업률/자연실업률 차이': true,
  '미국 기대 인플레이션':        true,
};

const NOTES: Record<string, string> = {
  '미국 주식 불확실성 지수':     '높을수록 시장 불안↑',
  '미국 고위험채권 유효이자율':  '높을수록 신용위험↑',
  '미국 기업여신 증가율':        '낮을수록 신용위축',
  '미국 금융시장 경색 지수':     '높을수록 금융경색↑',
  '미국 장단기 금리차':          '음수 = 경기침체 신호',
  '캐나다 달러/일본 엔화':       '낮을수록 위험회피↑',
  '미국 주간 실물경기 지수':     '낮을수록 경기 둔화',
  '미국 실물경기 경기침체 확률': '높을수록 침체 확률↑',
  '샴 규칙 경기침체 지표':       '0.5 초과 = 경기침체',
  '미국 국가활동 지수':          '낮을수록 경기 침체',
  '미국 트럭판매 현황':          '낮을수록 수요 감소',
  '미국 화물운송 현황':          '낮을수록 물류경기↓',
  '금/석유 가격 비율':           '높을수록 안전자산 선호',
  '미국 통화유동속도':           '낮을수록 경기침체 신호',
  '미국 실업률/자연실업률 차이': '양수 = 고용 악화',
  '미국 기대 인플레이션':        '높을수록 인플레 우려',
};

const CATEGORIES: Record<string, { icon: string; items: string[] }> = {
  '금융 지표': {
    icon: 'ti-chart-line',
    items: ['미국 주식 불확실성 지수', '미국 고위험채권 유효이자율', '미국 기업여신 증가율',
            '미국 금융시장 경색 지수', '미국 장단기 금리차', '캐나다 달러/일본 엔화'],
  },
  '경기 지표': {
    icon: 'ti-building-factory',
    items: ['미국 주간 실물경기 지수', '미국 실물경기 경기침체 확률', '샴 규칙 경기침체 지표',
            '미국 국가활동 지수', '미국 트럭판매 현황', '미국 화물운송 현황'],
  },
  '특별 사이클': {
    icon: 'ti-refresh',
    items: ['금/석유 가격 비율', '미국 통화유동속도', '미국 실업률/자연실업률 차이', '미국 기대 인플레이션'],
  },
};

// ── 유틸 ─────────────────────────────────────────────────
function readCsv(sid: string): { date: string; value: number }[] {
  try {
    const p = path.join(process.cwd(), 'data', `${sid}.csv`);
    if (!fs.existsSync(p)) return [];
    const lines = fs.readFileSync(p, 'utf-8').trim().split('\n');
    return lines.slice(1).map(l => {
      const [date, val] = l.split(',');
      return { date: date.trim(), value: parseFloat(val.trim()) };
    }).filter(r => !isNaN(r.value));
  } catch { return []; }
}

function percentileOf(val: number, arr: number[], panicUp: boolean): number {
  if (arr.length === 0) return 50;
  if (panicUp) return (arr.filter(v => v < val).length / arr.length) * 100;
  return (arr.filter(v => v > val).length / arr.length) * 100;
}

function getStatus(pct: number): string {
  if (pct >= 90) return 'PANIC';
  if (pct >= 70) return 'COLD';
  if (pct >= 30) return 'MILD';
  if (pct >= 10) return 'WARM';
  return 'BOOM';
}

function statusToLevel(status: string): string {
  if (status === 'PANIC' || status === 'COLD') return 'fear';
  if (status === 'MILD') return 'neutral';
  return 'greed';
}

function fmtVal(v: number): string {
  if (Math.abs(v) >= 1000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  if (Math.abs(v) >= 10)   return v.toFixed(1);
  return v.toFixed(2);
}

// ── 메인 ─────────────────────────────────────────────────
export async function GET() {
  // 1. CSV 로드
  const raw: Record<string, { date: string; value: number }[]> = {};
  for (const [name, sid] of Object.entries(SERIES)) {
    const data = readCsv(sid);
    if (data.length > 0) raw[name] = data;
  }

  // 2. 파생 지표
  if (raw['CAD/USD'] && raw['JPY/USD']) {
    const cadMap = Object.fromEntries(raw['CAD/USD'].map(r => [r.date, r.value]));
    const jpyMap = Object.fromEntries(raw['JPY/USD'].map(r => [r.date, r.value]));
    const dates = raw['CAD/USD'].map(r => r.date).filter(d => jpyMap[d]);
    raw['캐나다 달러/일본 엔화'] = dates.map(d => ({
      date: d,
      value: (1 / cadMap[d]) / (1 / jpyMap[d]),
    }));
  }

  if (raw['금 가격'] && raw['원유 가격 WTI']) {
    const goldMap = Object.fromEntries(raw['금 가격'].map(r => [r.date, r.value]));
    const oilMap  = Object.fromEntries(raw['원유 가격 WTI'].map(r => [r.date, r.value]));
    const dates = raw['금 가격'].map(r => r.date).filter(d => oilMap[d] && oilMap[d] !== 0);
    raw['금/석유 가격 비율'] = dates.map(d => ({ date: d, value: goldMap[d] / oilMap[d] }));
  }

  if (raw['미국 실업률'] && raw['미국 자연실업률']) {
    const uMap  = Object.fromEntries(raw['미국 실업률'].map(r => [r.date, r.value]));
    const nuMap = Object.fromEntries(raw['미국 자연실업률'].map(r => [r.date, r.value]));
    const dates = raw['미국 실업률'].map(r => r.date).filter(d => nuMap[d] !== undefined);
    raw['미국 실업률/자연실업률 차이'] = dates.map(d => ({ date: d, value: uMap[d] - nuMap[d] }));
  }

  // 3. 각 지표 상태 계산
  const indicators: {
    category: string; icon: string;
    items: { name: string; value: string; note: string; level: string; status: string; percentile: number }[];
  }[] = [];

  const allPercentiles: number[] = [];

  for (const [cat, { icon, items }] of Object.entries(CATEGORIES)) {
    const catItems = [];
    for (const name of items) {
      if (!raw[name]) continue;
      const series = raw[name];
      const vals = series.map(r => r.value);
      const latest = vals[vals.length - 1];
      const pu = PANIC_UP[name] ?? true;
      const pct = percentileOf(latest, vals, pu);
      const status = getStatus(pct);
      allPercentiles.push(pct);
      catItems.push({
        name,
        value: fmtVal(latest),
        note: NOTES[name] ?? '',
        level: statusToLevel(status),
        status,
        percentile: Math.round(pct * 10) / 10,
      });
    }
    if (catItems.length > 0) indicators.push({ category: cat, icon, items: catItems });
  }

  // 4. 종합 점수 (100 - avg_percentile → 높을수록 탐욕)
  const avgPct = allPercentiles.length > 0
    ? allPercentiles.reduce((a, b) => a + b, 0) / allPercentiles.length
    : 50;
  const compositeScore = Math.round(100 - avgPct);

  // 5. 히스토리컬 차트 (NFCI 기반, 월별 샘플링)
  const chartData: { label: string; value: number }[] = [];
  if (raw['미국 금융시장 경색 지수']) {
    const nfci = raw['미국 금융시장 경색 지수'];
    const allVals = nfci.map(r => r.value);
    // 월별 마지막 값 추출
    const byMonth: Record<string, number> = {};
    for (const r of nfci) {
      const ym = r.date.slice(0, 7); // YYYY-MM
      byMonth[ym] = r.value;
    }
    const months = Object.keys(byMonth).sort();
    // 최근 5년치
    const recentMonths = months.slice(-60);
    for (const ym of recentMonths) {
      const val = byMonth[ym];
      const pct = percentileOf(val, allVals, true);
      chartData.push({
        label: ym,
        value: Math.round((100 - pct) * 10) / 10,
      });
    }
  }

  return NextResponse.json({
    compositeScore,
    indicators,
    chartData,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
}
