// 지표 값을 "과매수/중립/과매도" 같은 이산 라벨로 바로 매핑하면, 종목마다 다른 변동성·
// 역사적 분포를 무시한 절대값 임계값 판정이라 정보 손실이 생긴다(RSI 42.8은 항상 "중립").
// 여기서는 같은 값이라도 해당 종목/지수 자신의 과거 분포에서 지금 값이 어디쯤인지
// (percentile)와 평균에서 얼마나 떨어져 있는지(z-score)를 계산해, 기존 임계값 판정
// (computeApproxSignalDetail 등)에 통계적 맥락을 덧붙이는 용도로 쓴다 — 판정 로직 자체를
// 대체하지는 않는다.

export type NormalizedStat = {
  value: number;
  percentile: number; // 0~1, 과거 분포에서 현재 값보다 작은 관측치의 비율
  zScore: number | null; // 분포의 표준편차가 0이면 계산 불가
  sampleSize: number;
};

export function percentileRank(value: number, series: number[]): number {
  if (!series.length) return 0.5;
  const below = series.filter(v => v < value).length;
  return below / series.length;
}

export function zScore(value: number, series: number[]): number | null {
  if (!series.length) return null;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance = series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length;
  const std = Math.sqrt(variance);
  return std === 0 ? null : (value - mean) / std;
}

// window: 과거 몇 개 관측치까지 볼지(트레일링). 일봉 기준 252 ≈ 최근 1년.
export function normalizeIndicator(value: number, historicalSeries: number[], window = 252): NormalizedStat {
  const tail = historicalSeries.slice(-window);
  return {
    value,
    percentile: percentileRank(value, tail),
    zScore: zScore(value, tail),
    sampleSize: tail.length,
  };
}

// percentile(0~1) → "상위 N%" 문구. percentile이 높을수록(과거보다 큰 값일수록) 분자가
// 작아지도록 뒤집는다 — "상위 10%"가 "역대 최고에 가깝다"는 직관과 맞도록.
export function percentileToText(percentile: number): string {
  const pctFromTop = Math.round((1 - percentile) * 100);
  if (pctFromTop <= 0) return '역대 최고 수준';
  if (pctFromTop >= 100) return '역대 최저 수준';
  return `상위 ${pctFromTop}%`;
}

// ── Wilder ATR — True Range를 지수적으로 평활화한 변동성 지표 ──────────
type OhlcLike = { high: number | null | undefined; low: number | null | undefined; close: number | null | undefined };

export function computeATRSeries(bars: OhlcLike[], period = 14): (number | null)[] {
  const n = bars.length;
  const tr: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const cur = bars[i];
    if (cur.high == null || cur.low == null) continue;
    const prevClose = i > 0 ? bars[i - 1].close : null;
    tr[i] = prevClose == null
      ? cur.high - cur.low
      : Math.max(cur.high - cur.low, Math.abs(cur.high - prevClose), Math.abs(cur.low - prevClose));
  }

  const atr: (number | null)[] = new Array(n).fill(null);
  let sum = 0, count = 0;
  for (let i = 0; i < n; i++) {
    if (tr[i] == null) continue;
    if (count < period) {
      sum += tr[i]!;
      count++;
      if (count === period) atr[i] = sum / period;
    } else {
      const prevAtr = atr[i - 1];
      atr[i] = prevAtr == null ? tr[i] : (prevAtr * (period - 1) + tr[i]!) / period;
    }
  }
  return atr;
}

export type VolatilityContext = {
  todayRange: number;
  atr: number;
  atrMultiple: number; // 오늘 고가-저가 / ATR(14). 1.0이면 평소와 비슷, 2.0이면 평소의 2배.
};

export function computeVolatilityContext(bars: OhlcLike[], period = 14): VolatilityContext | null {
  const atrSeries = computeATRSeries(bars, period);
  const last = bars.at(-1);
  const atr = atrSeries.at(-1);
  if (last?.high == null || last?.low == null || atr == null || atr === 0) return null;
  const todayRange = last.high - last.low;
  return { todayRange, atr, atrMultiple: todayRange / atr };
}

// 가격 변화폭(종가 기준, ATR과 같은 단위)을 "소폭/일반적/평균보다 큰/역사적으로 드문"으로
// 분류 — 기존 buildStockSummary가 쓰던 median-diff 휴리스틱을 ATR(14) 기준으로 교체.
export function describeVolatilityMultiple(multiple: number): string {
  if (multiple < 0.5) return '소폭의';
  if (multiple < 1.5) return '일반적인';
  if (multiple < 3) return '평균보다 큰';
  return '역사적으로 드문';
}
