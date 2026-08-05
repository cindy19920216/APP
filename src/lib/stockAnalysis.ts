// 개별 종목 상세화면(기술적 지표 탭)에서 herencia-ta가 주지 않는 지표들을
// 이미 받아온 일봉 히스토리만으로 클라이언트/서버 양쪽에서 재사용할 수 있게 계산한다.
// herencia-ta가 이미 주는 rsi/ma5/ma20/ma60/macd_hist/bb_upper/bb_lower/atr/vwap/
// donchian_upper/donchian_lower/poc 등은 여기서 다시 계산하지 않고 그대로 사용한다.
// 단, elder_impulse·swing_high/low·equilibrium은 예외 — herencia-ta 값은 전일 종가
// 기준이라, 오늘 장중 데이터(buildLiveBars의 합성봉)에도 그대로 적용하려면 여기서
// 다시 계산해야 한다(attachAuxIndicators 참고). computeApproxSignal의 투표에도 이
// 재계산된 값을 쓴다.

import { sma, bollinger, rsi as calcRsi, macdHistogram, ema } from './taIndicators';
import { normalizeIndicator, type NormalizedStat } from './statisticalNormalization';

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

// ── 앙상블 가중치 모델 ────────────────────────────────────
// 기존 방식은 6개 지표를 각각 -1/0/+1로 이산화해서 단순 합산(±2 임계값)했다 — RSI 31과
// RSI 69.9가 똑같이 "1표"였고, 후행 지표(MA5/MA20)와 선행 지표(RSI/MACD)가 똑같은
// 무게를 받았다. 여기서는 (1) 각 지표를 이산 투표 대신 -1~+1 연속 점수로 바꿔 크기
// 정보를 보존하고, (2) 추세(후행)·모멘텀(선행)·평균회귀(볼린저)·엘더 임펄스(추세+모멘텀
// 결합) 4개 그룹으로 묶어 그룹별 가중치를 다르게 주고, (3) 볼린저 밴드폭을 변동성
// 근사로 써서 저변동성 국면엔 추세 가중치를, 고변동성 국면엔 모멘텀·평균회귀 가중치를
// 자동으로 높인다(레짐 의존 가중치).
// votes(아래, 개별 지표 배지 표시용)는 기존 이산 판정 그대로 유지한다 — 화면의 "판단
// 근거" 지표별 카드는 그대로고, 그 6개를 합쳐 최종 매수/매도/관망을 내는 방식만 바뀐다.
// AI 리포트 라우트(stock-ai-report)는 프런트에서 스냅샷 하나만 전달받아 과거 시계열이
// 없으므로, 이 함수는 의도적으로 bar 하나의 필드만으로 전부 계산한다(과거 시계열이
// 필요한 z-score/percentile 방식은 axis 1의 computeRsiContext처럼 별도 함수로 분리).
export type EnsembleComponents = { trend: number; momentum: number; bb: number; elder: number };
export type EnsembleWeights = { trend: number; momentum: number; bb: number; elder: number };

const ENSEMBLE_BASE_WEIGHTS: EnsembleWeights = { trend: 0.30, momentum: 0.35, bb: 0.15, elder: 0.20 };
const REGIME_SHIFT_MAX = 0.15; // 국면에 따라 추세 ↔ (모멘텀+평균회귀) 사이에서 최대 이만큼 가중치 이동
// 볼린저 밴드폭(=(상단-하단)/종가)을 "보통 변동성" 기준점(중앙값)으로 잡고 그 폭을
// 저/고변동성 경계로 삼는다 — KOSPI200 200종목 실측 밴드폭 분포(2026-08-04 기준:
// p25 0.131 · 중앙값 0.206 · p75 0.338)로 보정한 값. 처음엔 0.06/0.06으로 잡았다가
// 실측해보니 대부분 종목이 상한(+1)에 몰려 저/고변동성을 전혀 구분 못 하는 걸 발견
// (변동성 큰 장세라 실제 밴드폭이 훨씬 넓었음) — 실측 분포 기준으로 다시 잡았다.
// 시장 변동성 레벨 자체가 크게 바뀌면(예: 장기 저변동성 국면) 이 상수도 재보정 필요.
const BANDWIDTH_CENTER = 0.20;
const BANDWIDTH_SCALE = 0.20;
// 앙상블 점수(-1~+1)를 매수/매도로 가르는 임계값 — 기존 6표 ±2 임계값과 비슷한 "강한
// 신호만 통과" 취지를 유지하도록 200종목 실측 분포로 보정한 값.
const ENSEMBLE_BUY_THRESHOLD = 0.20;
const ENSEMBLE_SELL_THRESHOLD = -0.20;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function computeEnsemble(bar: Bar): { score: number; components: EnsembleComponents; weights: EnsembleWeights; volRegime: number } {
  // 추세(후행): MA5 vs MA20 단기 교차 + 종가 vs MA60 장기 이격도의 평균. tanh 배율(15, 8)은
  // 전형적인 며칠~몇 주 단위 이격 폭(수 %~십수 %)을 -1~+1 범위에 고르게 펼치기 위한 보정치.
  let trendSum = 0, trendParts = 0;
  if (bar.ma5 != null && bar.ma20 != null && bar.ma20 !== 0) {
    trendSum += Math.tanh(((bar.ma5 - bar.ma20) / bar.ma20) * 15);
    trendParts++;
  }
  if (bar.close != null && bar.ma60 != null && bar.ma60 !== 0) {
    trendSum += Math.tanh(((bar.close - bar.ma60) / bar.ma60) * 8);
    trendParts++;
  }
  const trend = trendParts > 0 ? trendSum / trendParts : 0;

  // 모멘텀(선행): RSI(0~100 → -1~+1로 재조정) + MACD 히스토그램(종가 대비 상대값으로
  // 정규화해 종목 간 가격 스케일 차이를 제거한 뒤 tanh로 압축).
  let momentumSum = 0, momentumParts = 0;
  if (bar.rsi != null) {
    momentumSum += (bar.rsi - 50) / 50;
    momentumParts++;
  }
  if (bar.macd_hist != null && bar.close != null && bar.close !== 0) {
    momentumSum += Math.tanh((bar.macd_hist / bar.close) * 300);
    momentumParts++;
  }
  const momentum = momentumParts > 0 ? momentumSum / momentumParts : 0;

  // 평균회귀: %B(볼린저밴드 내 위치)가 낮을수록(하단 근접) 반등 기대로 +, 높을수록 -.
  let bb = 0;
  if (bar.close != null && bar.bb_upper != null && bar.bb_lower != null && bar.bb_upper !== bar.bb_lower) {
    const pctB = (bar.close - bar.bb_lower) / (bar.bb_upper - bar.bb_lower);
    bb = clamp((0.5 - pctB) * 2, -1, 1);
  }

  // 엘더 임펄스: EMA13 기울기 + MACD 기울기가 이미 결합된 지표라 별도 연속화 없이
  // 이산값(강세/약세/중립)을 그대로 -1/0/+1로 사용.
  const elder = bar.elder_impulse === 'green' ? 1 : bar.elder_impulse === 'red' ? -1 : 0;

  // 변동성 국면: 볼린저 밴드폭이 넓을수록(고변동성) 모멘텀·평균회귀 가중치를 높이고,
  // 좁을수록(저변동성) 추세 가중치를 높인다 — 조용한 장에서는 완만한 추세추종이,
  // 출렁이는 장에서는 빠른 되돌림·과매수매도 반응이 더 유효하다는 통상적 TA 관점.
  let volRegime = 0;
  if (bar.close != null && bar.bb_upper != null && bar.bb_lower != null && bar.close !== 0) {
    const bandwidth = (bar.bb_upper - bar.bb_lower) / bar.close;
    volRegime = clamp((bandwidth - BANDWIDTH_CENTER) / BANDWIDTH_SCALE, -1, 1);
  }
  const shift = volRegime * REGIME_SHIFT_MAX;
  const weights: EnsembleWeights = {
    trend: ENSEMBLE_BASE_WEIGHTS.trend - shift,
    momentum: ENSEMBLE_BASE_WEIGHTS.momentum + shift * 0.7,
    bb: ENSEMBLE_BASE_WEIGHTS.bb + shift * 0.3,
    elder: ENSEMBLE_BASE_WEIGHTS.elder,
  };

  const components: EnsembleComponents = { trend, momentum, bb, elder };
  const score = weights.trend * trend + weights.momentum * momentum + weights.bb * bb + weights.elder * elder;
  return { score, components, weights, volRegime };
}

export type ApproxSignalDetail = {
  signal: ApproxSignal; buy: number; sell: number; votes: ApproxVote[];
  ensembleScore: number; ensembleComponents: EnsembleComponents; ensembleWeights: EnsembleWeights; volRegime: number;
};

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

  const { score: ensembleScore, components: ensembleComponents, weights: ensembleWeights, volRegime } = computeEnsemble(bar);
  const signal: ApproxSignal = ensembleScore >= ENSEMBLE_BUY_THRESHOLD ? 'buy' : ensembleScore <= ENSEMBLE_SELL_THRESHOLD ? 'sell' : 'neutral';

  return { signal, buy, sell, votes, ensembleScore, ensembleComponents, ensembleWeights, volRegime };
}

export function computeApproxSignal(bar: Bar): ApproxSignal {
  return computeApproxSignalDetail(bar).signal;
}

// ── RSI의 통계적 맥락 (percentile / z-score) ─────────────────
// computeApproxSignalDetail의 RSI 투표는 30/70 고정 임계값을 쓰는데, 이는 모든 종목에
// 같은 잣대를 대는 것이라 "이 종목이 평소 RSI 35~65 사이만 오가는지 20~80까지 널뛰는지"
// 같은 맥락이 사라진다. 임계값 판정(투표)은 그대로 두고, 화면에 보여줄 설명 문구에만
// "과거 분포에서 지금이 몇 percentile인지"를 덧붙이는 용도로 쓴다.
export function computeRsiContext(bars: Bar[], window = 252): NormalizedStat | null {
  const series = bars.map(b => b.rsi).filter((v): v is number => v != null);
  const latest = bars.at(-1)?.rsi;
  if (latest == null || series.length < 20) return null;
  return normalizeIndicator(latest, series, window);
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

// ── 다중 시간프레임 정합성 ────────────────────────────────
// MA5/MA20(일봉 추세)·주봉 추세(computeWeeklyTrend)·60일 레인지 내 위치, 서로 다른
// 시간축의 지표 3개를 각각 나열만 하면 "그래서 셋이 같은 얘기를 하는 건지"는 사용자가
// 직접 머릿속에서 종합해야 한다. 여기서는 세 축을 상승/하락/중립으로 환산해 방향이
// 맞는지(정합) 자체를 계산하고, 엇갈리면 "혼재 국면"으로 명시 분류해 신뢰도를 낮춘다.
// 60일 레인지 위치는 computeApproxSignalDetail이 참고용으로만 쓰는 평균회귀 관점(쌌으니
// 매수)과 달리, 여기서는 추세 구조 관점(고점권=상승 추세 구조, 저점권=하락 추세 구조)으로
// 해석한다 — 매매 신호가 아니라 "지금 가격이 최근 추세선상 어디쯤 있는지" 구조 확인용.
// "혼재(conflicting)"와 "신호 부족(insufficient)"은 구분한다 — 상승 1개·중립 2개처럼
// 실제로는 충돌하는 축이 하나도 없는데(bearish 0개) 그냥 신호가 약한 경우까지 "혼재
// 국면"이라고 부르면, 정말로 방향이 정반대로 부딪히는 경우와 똑같이 "믿을 수 없다"는
// 인상을 줘서 오해를 준다. 상승/하락 축이 각각 1개 이상씩 실제로 존재할 때만 conflicting,
// 그 외에 aligned 조건을 못 채우면 insufficient로 나눈다.
export type TrendDirection = 'bullish' | 'bearish' | 'neutral';
export type AlignmentStatus = 'aligned_bullish' | 'aligned_bearish' | 'conflicting' | 'insufficient';
export type TimeframeAlignment = {
  daily: TrendDirection;
  weekly: TrendDirection;
  range: TrendDirection;
  weeklyInsufficient: boolean;
  bullishCount: number;
  bearishCount: number;
  status: AlignmentStatus;
  confidence: 'high' | 'medium' | 'low';
};

export function computeTimeframeAlignment(bars: Bar[]): TimeframeAlignment | null {
  const latest = bars.at(-1);
  if (!latest) return null;

  const daily: TrendDirection = latest.ma5 != null && latest.ma20 != null
    ? (latest.ma5 > latest.ma20 ? 'bullish' : latest.ma5 < latest.ma20 ? 'bearish' : 'neutral')
    : 'neutral';

  const weeklyTrend = computeWeeklyTrend(bars);
  const weekly: TrendDirection = weeklyTrend.insufficient
    ? 'neutral'
    : weeklyTrend.label === '강세' ? 'bullish' : weeklyTrend.label === '약세' ? 'bearish' : 'neutral';

  const range: TrendDirection = latest.close != null && latest.equilibrium != null
    ? (latest.close > latest.equilibrium ? 'bullish' : latest.close < latest.equilibrium ? 'bearish' : 'neutral')
    : 'neutral';

  const directions = [daily, weekly, range];
  const bullishCount = directions.filter(d => d === 'bullish').length;
  const bearishCount = directions.filter(d => d === 'bearish').length;

  let status: AlignmentStatus;
  let confidence: 'high' | 'medium' | 'low';
  if (bullishCount >= 2 && bearishCount === 0) {
    status = 'aligned_bullish';
    confidence = bullishCount === 3 ? 'high' : 'medium';
  } else if (bearishCount >= 2 && bullishCount === 0) {
    status = 'aligned_bearish';
    confidence = bearishCount === 3 ? 'high' : 'medium';
  } else if (bullishCount >= 1 && bearishCount >= 1) {
    status = 'conflicting';
    confidence = 'low';
  } else {
    status = 'insufficient';
    confidence = 'low';
  }

  return { daily, weekly, range, weeklyInsufficient: weeklyTrend.insufficient, bullishCount, bearishCount, status, confidence };
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
