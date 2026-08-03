// 개별 종목 상세화면(기술적 지표 탭)에서 herencia-ta가 주지 않는 지표들을
// 이미 받아온 일봉 히스토리만으로 클라이언트/서버 양쪽에서 재사용할 수 있게 계산한다.
// herencia-ta가 이미 주는 rsi/ma5/ma20/ma60/macd_hist/bb_upper/bb_lower/atr/vwap/
// donchian_upper/donchian_lower/poc 등은 여기서 다시 계산하지 않고 그대로 사용한다.
// 단, elder_impulse·swing_high/low·equilibrium은 예외 — herencia-ta 값은 전일 종가
// 기준이라, 오늘 장중 데이터(buildLiveBars의 합성봉)에도 그대로 적용하려면 여기서
// 다시 계산해야 한다(attachAuxIndicators 참고). computeApproxSignal의 투표에도 이
// 재계산된 값을 쓴다.

import { sma, bollinger, rsi as calcRsi, macdHistogram, ema } from './taIndicators';

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
  ma60?: number | null;
  bb_upper?: number | null;
  bb_lower?: number | null;
  macd_hist?: number | null;
  elder_impulse?: ElderImpulse | null;
  swing_high?: number | null;
  swing_low?: number | null;
  equilibrium?: number | null;
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

// ── 근사 매매신호 (RSI·MA5/MA20·MACD·BB·엘더 임펄스·MA60 이격도 6신호 스코어링) ──
// herencia-ta의 실제 entry_opinion(SMC 지지/저항 기반)은 과거 일자별로 재계산할 수
// 없어서(history 응답에 없음), 시장지표 탭(InstrumentChartScreen.jsx)의 computeOpinion과
// 동일한 단순 룰을 과거 전체 일자에 돌려 만든 근사치다.
// 원래는 RSI·MA5/MA20·MACD·BB 4개였는데, 엘더 임펄스(추세+모멘텀 정렬)가 화면에 별도로만
// 표시되다 보니 상단 배지랑 다른 방향이면 "왜 따로 노냐"는 혼란이 있어 투표에 포함시켰다.
// Discount/Premium(60거래일 가격 범위 내 위치)도 같이 넣어봤지만, 이건 추세추종이 아니라
// 평균회귀형 지표라(떨어질 만큼 떨어졌으면 "싸다"=매수로 투표) 나머지 추세추종 지표들과
// 정반대로 투표하는 게 정상 동작 — 매 봉 무조건 투표하는 지표라 추세 쪽 표를 계속
// 상쇄시켜서 관망 비율이 크게 늘어나는 부작용이 있었다(200종목 실측: 관망 80→126~179).
// 그래서 Discount/Premium은 점수에서 빼고 화면에는 참고 정보로만 남겼다(buildStockSummary
// 참고). 대신 MA5/MA20보다 더 긴 호흡의 추세 확인용으로 MA60 이격도(종가 vs 60일
// 이동평균)를 6번째 신호로 추가했다 — herencia-ta가 이미 ma60을 주므로 새 계산 없이 재사용.
export type ApproxSignal = 'buy' | 'sell' | 'neutral';
export type ApproxVote = { key: 'rsi' | 'ma' | 'macd' | 'bb' | 'elder' | 'ma60'; vote: ApproxSignal };
export type ApproxSignalDetail = { signal: ApproxSignal; buy: number; sell: number; votes: ApproxVote[] };

// 화면(종목 상세·시장지표 탭)에서 "왜 이 판정이 나왔는지" 6개 지표별로 나눠 보여줄 수
// 있게 투표 breakdown까지 반환한다. computeApproxSignal()은 이 함수의 최종 결과만
// 꺼내 쓰는 얇은 wrapper — 두 곳에서 같은 로직이 따로 구현되며 갈라지는 일을 막는다.
export function computeApproxSignalDetail(bar: Bar): ApproxSignalDetail {
  const votes: ApproxVote[] = [];
  const vote = (key: ApproxVote['key'], v: ApproxSignal) => votes.push({ key, vote: v });

  if (bar.rsi != null) vote('rsi', bar.rsi <= 30 ? 'buy' : bar.rsi >= 70 ? 'sell' : 'neutral');
  if (bar.ma5 != null && bar.ma20 != null) vote('ma', bar.ma5 >= bar.ma20 ? 'buy' : 'sell');
  if (bar.macd_hist != null) vote('macd', bar.macd_hist >= 0 ? 'buy' : 'sell');
  if (bar.close != null && bar.bb_upper != null && bar.bb_lower != null) {
    vote('bb', bar.close <= bar.bb_lower ? 'buy' : bar.close >= bar.bb_upper ? 'sell' : 'neutral');
  }
  if (bar.elder_impulse != null) vote('elder', bar.elder_impulse === 'green' ? 'buy' : bar.elder_impulse === 'red' ? 'sell' : 'neutral');
  if (bar.close != null && bar.ma60 != null) vote('ma60', bar.close >= bar.ma60 ? 'buy' : 'sell');

  const buy = votes.filter(v => v.vote === 'buy').length;
  const sell = votes.filter(v => v.vote === 'sell').length;
  const score = buy - sell;
  const signal: ApproxSignal = score >= 2 ? 'buy' : score <= -2 ? 'sell' : 'neutral';
  return { signal, buy, sell, votes };
}

export function computeApproxSignal(bar: Bar): ApproxSignal {
  return computeApproxSignalDetail(bar).signal;
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
  if (dailyHistory.at(-1)?.date === todayStr) return attachAuxIndicators(dailyHistory); // herencia-ta가 이미 오늘자 반영

  const todays = (hourlyPoints ?? []).filter(
    (p): p is HourlyPoint & { open: number; high: number; low: number; close: number } =>
      typeof p.date === 'number' && kstDateStr(p.date) === todayStr &&
      p.open != null && p.high != null && p.low != null && p.close != null
  );
  if (!todays.length) return attachAuxIndicators(dailyHistory);

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
  const ma60Arr = sma(closes, 60);
  const { upper: bbUpper, lower: bbLower } = bollinger(closes, 20, 2);
  const rsiArr = calcRsi(closes, 14);
  const macdArr = macdHistogram(closes, 12, 26, 9);

  return attachAuxIndicators(merged.map((b, i) => ({
    ...b,
    ma5: ma5Arr[i], ma20: ma20Arr[i], ma60: ma60Arr[i], bb_upper: bbUpper[i], bb_lower: bbLower[i],
    rsi: rsiArr[i], macd_hist: macdArr[i],
  })));
}

// computeApproxSignal이 엘더 임펄스·Discount/Premium까지 투표에 쓰므로, detectSignalFlips
// 처럼 배열 전체를 훑는 계산도 매 봉마다 이 두 값이 채워져 있어야 한다. buildLiveBars가
// 반환하는 배열엔 항상 이 단계를 거치게 해서, "오늘 합성봉이 있을 때만 계산됨" 같은
// 누락이 없게 한다.
const SWING_PERIOD = 60;

// 시장지표 탭(InstrumentChartScreen.jsx)도 이 함수를 그대로 재사용해서 지수·환율·
// 원자재의 엘더 임펄스를 종목 상세와 같은 정의로 계산한다(중복 구현 방지).
export function attachAuxIndicators(bars: Bar[]): Bar[] {
  const ema13Arr = ema(bars.map(b => b.close), 13);
  const macdHistArr = bars.map(b => b.macd_hist ?? null);

  return bars.map((b, i) => {
    let elder_impulse: ElderImpulse | null = null;
    const lastEma = ema13Arr[i], prevEma = i > 0 ? ema13Arr[i - 1] : null;
    const lastHist = macdHistArr[i], prevHist = i > 0 ? macdHistArr[i - 1] : null;
    if (lastEma != null && prevEma != null && lastHist != null && prevHist != null) {
      const emaRising = lastEma > prevEma;
      const histRising = lastHist > prevHist;
      elder_impulse = emaRising && histRising ? 'green' : (!emaRising && !histRising ? 'red' : 'neutral');
    }

    const windowStart = Math.max(0, i - SWING_PERIOD + 1);
    const window = bars.slice(windowStart, i + 1).filter((x): x is Bar & { high: number; low: number } => x.high != null && x.low != null);
    let swing_high: number | null = null, swing_low: number | null = null, equilibrium: number | null = null;
    if (window.length) {
      swing_high = Math.max(...window.map(x => x.high));
      swing_low = Math.min(...window.map(x => x.low));
      equilibrium = (swing_high + swing_low) / 2;
    }

    return { ...b, elder_impulse, swing_high, swing_low, equilibrium };
  });
}

// ── 엘더 임펄스 / 스윙 구조 (근사치) ─────────────────────────
// herencia-ta의 elder_impulse·swing_high/low·equilibrium은 전일 종가 기준 공식값이라
// 오늘 장중 급등락이 반영되지 않는다. attachAuxIndicators가 buildLiveBars 안에서 이미
// 매 봉마다(오늘 합성봉 포함) 다시 계산해두므로, 여기서는 그 결과의 마지막 봉 값을
// 읽기만 한다 — computeApproxSignal의 투표값과 화면 표시값이 항상 같은 계산에서
// 나오도록 로직을 두 곳에 중복시키지 않는다.
// 엘더 임펄스 정의(알렉산더 엘더 원저): 13일 EMA가 전일 대비 상승 + MACD 히스토그램이
// 전일 대비 상승 → green, 둘 다 하락 → red, 그 외 neutral.
export type ElderImpulse = 'green' | 'red' | 'neutral';

export function computeElderImpulse(bars: Bar[]): ElderImpulse | null {
  return bars.at(-1)?.elder_impulse ?? null;
}

export function computeSwingZone(bars: Bar[]): { swingHigh: number; swingLow: number; equilibrium: number } | null {
  const last = bars.at(-1);
  if (last?.swing_high == null || last?.swing_low == null || last?.equilibrium == null) return null;
  return { swingHigh: last.swing_high, swingLow: last.swing_low, equilibrium: last.equilibrium };
}
