// 개별 종목 상세화면(기술적 지표 탭)에서 herencia-ta가 주지 않는 지표들을
// 이미 받아온 일봉 히스토리만으로 클라이언트/서버 양쪽에서 재사용할 수 있게 계산한다.
// herencia-ta가 이미 주는 rsi/ma5/ma20/ma60/macd_hist/bb_upper/bb_lower/atr/vwap/
// donchian_upper/donchian_lower/poc/swing_high/swing_low/equilibrium 등은 여기서
// 다시 계산하지 않고 그대로 사용한다.

import { sma, bollinger, rsi as calcRsi, macdHistogram } from './taIndicators';

export type Bar = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
  rsi?: number | null;
  ma5?: number | null;
  ma20?: number | null;
  bb_upper?: number | null;
  bb_lower?: number | null;
  macd_hist?: number | null;
};

// ── ADX / +DI / -DI (Wilder, 14일) ───────────────────────
export function computeADX(bars: Bar[], period = 14): { adx: number | null; plusDI: number | null; minusDI: number | null } {
  const valid = bars.filter(b => b.high != null && b.low != null && b.close != null);
  if (valid.length < period * 2) return { adx: null, plusDI: null, minusDI: null };

  const trs: number[] = [], plusDMs: number[] = [], minusDMs: number[] = [];
  for (let i = 1; i < valid.length; i++) {
    const cur = valid[i], prev = valid[i - 1];
    const upMove = cur.high! - prev.high!;
    const downMove = prev.low! - cur.low!;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(Math.max(cur.high! - cur.low!, Math.abs(cur.high! - prev.close!), Math.abs(cur.low! - prev.close!)));
  }

  let trSum = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let plusDMSum = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let minusDMSum = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: { dx: number; plusDI: number; minusDI: number }[] = [];
  for (let i = period; i < trs.length; i++) {
    trSum = trSum - trSum / period + trs[i];
    plusDMSum = plusDMSum - plusDMSum / period + plusDMs[i];
    minusDMSum = minusDMSum - minusDMSum / period + minusDMs[i];
    const plusDI = trSum === 0 ? 0 : 100 * (plusDMSum / trSum);
    const minusDI = trSum === 0 ? 0 : 100 * (minusDMSum / trSum);
    const sum = plusDI + minusDI;
    const dx = sum === 0 ? 0 : 100 * Math.abs(plusDI - minusDI) / sum;
    dxList.push({ dx, plusDI, minusDI });
  }
  if (dxList.length < period) return { adx: null, plusDI: dxList.at(-1)?.plusDI ?? null, minusDI: dxList.at(-1)?.minusDI ?? null };

  let adx = dxList.slice(0, period).reduce((a, b) => a + b.dx, 0) / period;
  for (let i = period; i < dxList.length; i++) {
    adx = (adx * (period - 1) + dxList[i].dx) / period;
  }
  const last = dxList.at(-1)!;
  return { adx, plusDI: last.plusDI, minusDI: last.minusDI };
}

// ── 캔들 패턴 (장악형만 우선 구현) ─────────────────────────
export type CandlePattern = { index: number; date: string; type: 'bullish_engulfing' | 'bearish_engulfing' };

export function detectCandlePatterns(bars: Bar[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1], cur = bars[i];
    if (prev.open == null || prev.close == null || cur.open == null || cur.close == null) continue;
    const prevBullish = prev.close > prev.open;
    const prevBearish = prev.close < prev.open;
    const curBullish = cur.close > cur.open;
    const curBearish = cur.close < cur.open;
    if (prevBearish && curBullish && cur.open <= prev.close && cur.close >= prev.open) {
      patterns.push({ index: i, date: cur.date, type: 'bullish_engulfing' });
    } else if (prevBullish && curBearish && cur.open >= prev.close && cur.close <= prev.open) {
      patterns.push({ index: i, date: cur.date, type: 'bearish_engulfing' });
    }
  }
  return patterns;
}

// ── 근사 매매신호 (RSI·MA5/MA20·MACD·BB 4신호 스코어링) ──────
// herencia-ta의 실제 entry_opinion(SMC 지지/저항 기반)은 과거 일자별로 재계산할 수
// 없어서(history 응답에 없음), 시장지표 탭(InstrumentChartScreen.jsx)의 computeOpinion과
// 동일한 단순 룰을 과거 전체 일자에 돌려 만든 근사치다.
export type ApproxSignal = 'buy' | 'sell' | 'neutral';

export function computeApproxSignal(bar: Bar): ApproxSignal {
  let buy = 0, sell = 0;
  if (bar.rsi != null) { if (bar.rsi <= 30) buy++; else if (bar.rsi >= 70) sell++; }
  if (bar.ma5 != null && bar.ma20 != null) { if (bar.ma5 >= bar.ma20) buy++; else sell++; }
  if (bar.macd_hist != null) { if (bar.macd_hist >= 0) buy++; else sell++; }
  if (bar.close != null && bar.bb_upper != null && bar.bb_lower != null) {
    if (bar.close <= bar.bb_lower) buy++; else if (bar.close >= bar.bb_upper) sell++;
  }
  // ±3(4개 중 3개 이상 일치)을 시도해봤으나 RSI/BB는 극단치일 때만 투표하는 지표라
  // 거의 항상 관망만 나와버려(200종목 실측 확인) 실효성이 없었다 — ±2로 되돌림.
  const score = buy - sell;
  if (score >= 2) return 'buy';
  if (score <= -2) return 'sell';
  return 'neutral';
}

export function detectSignalFlips(bars: Bar[]): { date: string; signal: 'buy' | 'sell' }[] {
  const flips: { date: string; signal: 'buy' | 'sell' }[] = [];
  if (!bars.length) return flips;
  let prevSignal = computeApproxSignal(bars[0]);
  for (let i = 1; i < bars.length; i++) {
    const signal = computeApproxSignal(bars[i]);
    if (signal !== prevSignal && signal !== 'neutral') {
      flips.push({ date: bars[i].date, signal });
    }
    prevSignal = signal;
  }
  return flips;
}

// ── 주봉 리샘플 + 상위 시간대 추세 ───────────────────────────
function resampleWeekly(bars: Bar[]) {
  const weeks = new Map<string, { date: string; high: number; low: number; close: number }>();
  for (const b of bars) {
    if (b.high == null || b.low == null || b.close == null) continue;
    const d = new Date(`${b.date}T00:00:00Z`);
    const day = d.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - diffToMonday);
    const key = monday.toISOString().slice(0, 10);
    const w = weeks.get(key);
    if (!w) weeks.set(key, { date: key, high: b.high, low: b.low, close: b.close });
    else { w.high = Math.max(w.high, b.high); w.low = Math.min(w.low, b.low); w.close = b.close; }
  }
  return Array.from(weeks.values());
}

export function computeWeeklyTrend(bars: Bar[]): { label: '강세' | '약세' | '중립'; insufficient: boolean } {
  const weekly = resampleWeekly(bars);
  if (weekly.length < 8) return { label: '중립', insufficient: true };
  const closes = weekly.map(w => w.close);
  const ma4 = closes.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const prevMa4 = closes.slice(-8, -4).reduce((a, b) => a + b, 0) / 4;
  const lastClose = closes.at(-1)!;
  let label: '강세' | '약세' | '중립' = '중립';
  if (lastClose > ma4 && ma4 > prevMa4) label = '강세';
  else if (lastClose < ma4 && ma4 < prevMa4) label = '약세';
  return { label, insufficient: false };
}

// ── 종목별 공포·탐욕 점수 (0~100) ────────────────────────────
// BOOM-BURST(시장 전체 종합지수)와 개념은 같지만 방법론은 다른, 개별 종목 전용 근사치.
// RSI·볼린저밴드 위치(%B)·MA20 이격도·52주 레인지 내 위치·MACD 부호를 가중 합산한다.
export type SentimentLevel = '극단공포' | '공포' | '중립' | '탐욕' | '극단탐욕';

export function computeStockSentiment(bars: Bar[]): {
  score: number;
  label: SentimentLevel;
  color: string;
  breakdown: { label: string; score: number }[];
} {
  const valid = bars.filter(b => b.close != null);
  const latest = valid.at(-1);
  const closesForRange = valid.slice(-252);
  const highs = closesForRange.map(b => b.high).filter((v): v is number => v != null);
  const lows = closesForRange.map(b => b.low).filter((v): v is number => v != null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const rsiScore = latest?.rsi != null ? clamp(latest.rsi, 0, 100) : 50;

  let bbScore = 50;
  if (latest?.close != null && latest.bb_upper != null && latest.bb_lower != null && latest.bb_upper !== latest.bb_lower) {
    const pctB = (latest.close - latest.bb_lower) / (latest.bb_upper - latest.bb_lower);
    bbScore = clamp(pctB * 100, 0, 100);
  }

  let ma20Score = 50;
  if (latest?.close != null && latest.ma20 != null && latest.ma20 !== 0) {
    const devPct = (latest.close - latest.ma20) / latest.ma20 * 100;
    ma20Score = clamp(50 + devPct * 5, 0, 100);
  }

  let rangeScore = 50;
  if (latest?.close != null && highs.length && lows.length) {
    const hi = Math.max(...highs), lo = Math.min(...lows);
    rangeScore = hi === lo ? 50 : clamp((latest.close - lo) / (hi - lo) * 100, 0, 100);
  }

  const macdScore = latest?.macd_hist != null ? (latest.macd_hist >= 0 ? 60 : 40) : 50;

  const breakdown = [
    { label: 'RSI', score: rsiScore },
    { label: '볼린저 위치(%B)', score: bbScore },
    { label: 'MA20 이격도', score: ma20Score },
    { label: '52주 레인지 위치', score: rangeScore },
    { label: 'MACD 모멘텀', score: macdScore },
  ];

  const score = Math.round(rsiScore * 0.25 + bbScore * 0.2 + ma20Score * 0.2 + rangeScore * 0.25 + macdScore * 0.1);

  let label: SentimentLevel, color: string;
  if (score < 20) { label = '극단공포'; color = '#ef4444'; }
  else if (score < 40) { label = '공포'; color = '#f97316'; }
  else if (score < 60) { label = '중립'; color = '#eab308'; }
  else if (score < 80) { label = '탐욕'; color = '#84cc16'; }
  else { label = '극단탐욕'; color = '#22c55e'; }

  return { score, label, color, breakdown };
}

// ── 당일 실시간 합성봉 ────────────────────────────────────
// herencia-ta의 일봉은 하루 한 번만 갱신돼 장중 급등락이 ADX/캔들패턴/매매신호/
// 공포탐욕지수 같은 "근사치" 계산에 전혀 반영되지 않는 문제를 보완한다. 오늘자
// 시간봉(1시간 간격 — StockChart.jsx의 "1시간" 옵션과 동일 데이터)을 하나로 합쳐
// 일봉 히스토리 뒤에 이어붙이고, 전체 종가 시리즈로 ma5/ma20/bb/rsi/macd_hist를
// 다시 계산한다. herencia-ta 원본과 과거 구간 수치가 미세하게 달라질 수 있지만,
// 이 값들을 쓰는 계산들은 이미 전부 "근사치"로 문서화돼 있어 일관된 방식이다.
export type HourlyPoint = {
  date: number; // UNIX 초(UTC) — src/app/api/chart/[ticker]/route.ts가 분봉일 때 이 형식으로 준다
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
};

function kstDateStr(unixSeconds: number): string {
  return new Date((unixSeconds + 9 * 3600) * 1000).toISOString().slice(0, 10);
}

export function buildLiveBars(dailyHistory: Bar[], hourlyPoints: HourlyPoint[] | null | undefined): Bar[] {
  if (!dailyHistory?.length) return dailyHistory ?? [];

  const todayStr = kstDateStr(Math.floor(Date.now() / 1000));
  if (dailyHistory.at(-1)?.date === todayStr) return dailyHistory; // herencia-ta가 이미 오늘자 반영

  const todays = (hourlyPoints ?? []).filter(
    (p): p is HourlyPoint & { open: number; high: number; low: number; close: number } =>
      typeof p.date === 'number' && kstDateStr(p.date) === todayStr &&
      p.open != null && p.high != null && p.low != null && p.close != null
  );
  if (!todays.length) return dailyHistory;

  const syntheticToday: Bar = {
    date: todayStr,
    open: todays[0].open,
    high: Math.max(...todays.map(p => p.high)),
    low: Math.min(...todays.map(p => p.low)),
    close: todays.at(-1)!.close,
    volume: todays.reduce((s, p) => s + (p.volume ?? 0), 0),
  };

  const merged = [...dailyHistory, syntheticToday];
  const closes = merged.map(b => b.close ?? 0);
  const ma5Arr = sma(closes, 5);
  const ma20Arr = sma(closes, 20);
  const { upper: bbUpper, lower: bbLower } = bollinger(closes, 20, 2);
  const rsiArr = calcRsi(closes, 14);
  const macdArr = macdHistogram(closes, 12, 26, 9);

  return merged.map((b, i) => ({
    ...b,
    ma5: ma5Arr[i], ma20: ma20Arr[i], bb_upper: bbUpper[i], bb_lower: bbLower[i],
    rsi: rsiArr[i], macd_hist: macdArr[i],
  }));
}
