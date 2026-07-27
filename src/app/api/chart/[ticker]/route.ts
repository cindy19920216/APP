import { NextResponse } from "next/server";

const INTERVAL: Record<string, string> = {
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1d",
  "1y":  "1d",
  "3y":  "1wk",
  "5y":  "1wk",
  "max": "1mo",
};

type Bar = { date: string; open: number; high: number; low: number; close: number; volume: number };

async function fetchChart(
  symbol: string,
  interval: string,
  rangeOrPeriod: { range: string } | { period1: number; period2: number }
) {
  const query =
    "range" in rangeOrPeriod
      ? `range=${rangeOrPeriod.range}`
      : `period1=${rangeOrPeriod.period1}&period2=${rangeOrPeriod.period2}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&${query}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.chart?.result?.[0] ?? null;
}

// ── 지표 계산 (StockChart.jsx가 기대하는 필드와 동일한 이름으로 산출) ──────

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(values: (number | null)[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = new Array(values.length).fill(null);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) { out[i] = null; continue; }
    prev = prev == null ? v : v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const mean = mid[i]!;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mean) ** 2;
    variance /= period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { upper, lower };
}

function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  let avgGain = gain / period, avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function macdHistogram(values: number[], fast = 12, slow = 26, signal = 9): (number | null)[] {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) => (emaFast[i] != null && emaSlow[i] != null) ? emaFast[i]! - emaSlow[i]! : null);
  const signalLine = ema(macdLine, signal);
  return macdLine.map((v, i) => (v != null && signalLine[i] != null) ? v - signalLine[i]! : null);
}

// 일봉 데이터라 "당일 VWAP"이 아니라 최근 N봉 rolling VWAP (herencia-ta의 방식과 동일)
function rollingVwap(bars: Bar[], period = 20): (number | null)[] {
  const typical = bars.map(b => (b.high + b.low + b.close) / 3);
  const out: (number | null)[] = new Array(bars.length).fill(null);
  for (let i = period - 1; i < bars.length; i++) {
    let sumPV = 0, sumV = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumPV += typical[j] * bars[j].volume;
      sumV += bars[j].volume;
    }
    out[i] = sumV > 0 ? sumPV / sumV : null;
  }
  return out;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "1y";
  // start/end(YYYY-MM-DD)가 있으면 "오늘 기준 N개월/년" 대신 고정 캘린더 구간을 일봉으로 조회한다.
  // 콘텐츠(퀴즈 예시 차트 등)에서 특정 과거 날짜를 시간이 지나도 그대로 재현하려면 range로는 불가능 —
  // range는 항상 "오늘" 기준 상대 구간이라 시간이 지나면 그 날짜가 창 밖으로 밀려난다.
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const usePeriod = !!startParam;
  const interval = usePeriod ? "1d" : (INTERVAL[range] ?? "1d");
  const period1 = startParam ? Math.floor(new Date(`${startParam}T00:00:00Z`).getTime() / 1000) : undefined;
  const period2 = endParam
    ? Math.floor(new Date(`${endParam}T23:59:59Z`).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  // 한국 6자리 코드 → KOSPI 시도 후 KOSDAQ 폴백
  const isKr = /^\d{6}$/.test(ticker);
  const symbols = isKr
    ? [`${ticker}.KS`, `${ticker}.KQ`]
    : [`${ticker}-USD`, ticker].filter((s, i, a) => a.indexOf(s) === i); // crypto or US

  const cryptoList = ["BTC","ETH","XRP","SOL","BNB","DOGE","ADA","MATIC","AVAX","DOT"];
  const finalSymbols = isKr
    ? symbols
    : cryptoList.includes(ticker.toUpperCase())
    ? [`${ticker.toUpperCase()}-USD`]
    : [ticker.toUpperCase()];

  let result = null;
  let usedSymbol = "";
  for (const sym of finalSymbols) {
    result = usePeriod
      ? await fetchChart(sym, interval, { period1: period1!, period2 })
      : await fetchChart(sym, interval, { range });
    if (result) { usedSymbol = sym; break; }
  }

  if (!result) {
    return NextResponse.json({ error: "No data" }, { status: 404 });
  }

  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens: (number | null)[]   = q.open   ?? [];
  const highs: (number | null)[]   = q.high   ?? [];
  const lows: (number | null)[]    = q.low    ?? [];
  const closes: (number | null)[]  = q.close  ?? [];
  const vols: (number | null)[]    = q.volume ?? [];

  const bars: Bar[] = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open: opens[i]!, high: highs[i]!, low: lows[i]!, close: closes[i]!,
      volume: vols[i] ?? 0,
    }))
    .filter((b): b is Bar => b.open != null && b.high != null && b.low != null && b.close != null);

  const closeArr = bars.map(b => b.close);
  const ma5Arr  = sma(closeArr, 5);
  const ma20Arr = sma(closeArr, 20);
  const { upper: bbUpper, lower: bbLower } = bollinger(closeArr, 20, 2);
  const rsiArr  = rsi(closeArr, 14);
  const macdArr = macdHistogram(closeArr, 12, 26, 9);
  const hasVolume = bars.some(b => b.volume > 0);
  const vwapArr = hasVolume ? rollingVwap(bars, 20) : bars.map(() => null);

  const points = bars.map((b, i) => ({
    date: b.date,
    open: b.open, high: b.high, low: b.low, close: b.close,
    price: b.close, // 하위 호환 (기존 소비자가 price 필드를 쓰는 경우 대비)
    volume: hasVolume ? b.volume : null,
    ma5: ma5Arr[i], ma20: ma20Arr[i],
    bb_upper: bbUpper[i], bb_lower: bbLower[i],
    vwap: vwapArr[i],
    rsi: rsiArr[i],
    macd_hist: macdArr[i],
  }));

  return NextResponse.json({
    ticker,
    symbol: usedSymbol,
    hasVolume,
    meta: {
      regularMarketPrice: result.meta?.regularMarketPrice,
      previousClose: result.meta?.chartPreviousClose,
      currency: result.meta?.currency,
      exchangeName: result.meta?.exchangeName,
      longName: result.meta?.longName ?? result.meta?.shortName ?? ticker,
    },
    points,
  }, { headers: { "Cache-Control": "no-store" } });
}
