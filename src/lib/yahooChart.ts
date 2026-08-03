// Yahoo Finance 차트 조회 + 지표 계산 — src/app/api/chart/[ticker]/route.ts(시장지표/
// 종목 상세 차트)와 src/app/api/screener-live/route.ts(200종목 배치 실시간 근사)가
// 공유한다. 배치 라우트는 자기 자신에게 HTTP 요청을 보내는 대신 이 함수를 직접 호출한다.
import { sma, bollinger, rsi, macdHistogram } from "./taIndicators";

const INTERVAL: Record<string, string> = {
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1d",
  "1y":  "1d",
  "3y":  "1wk",
  "5y":  "1wk",
  "max": "1mo",
};

type Bar = { date: string | number; open: number; high: number; low: number; close: number; volume: number };

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

export type YahooBarsOptions = {
  range?: string;
  interval?: string;
  period1?: number;
  period2?: number;
};

export async function fetchYahooBars(ticker: string, opts: YahooBarsOptions = {}) {
  const range = opts.range ?? "1y";
  const usePeriod = opts.period1 != null;
  const interval = usePeriod ? "1d" : (opts.interval ?? INTERVAL[range] ?? "1d");
  const period1 = opts.period1;
  const period2 = opts.period2 ?? Math.floor(Date.now() / 1000);

  // 한국 6자리 코드 → KOSPI 시도 후 KOSDAQ 폴백
  const isKr = /^\d{6}$/.test(ticker);
  const symbols = isKr
    ? [`${ticker}.KS`, `${ticker}.KQ`]
    : [`${ticker}-USD`, ticker].filter((s, i, a) => a.indexOf(s) === i); // crypto or US

  const cryptoList = ["BTC", "ETH", "XRP", "SOL", "BNB", "DOGE", "ADA", "MATIC", "AVAX", "DOT"];
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

  if (!result) return null;

  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens: (number | null)[]   = q.open   ?? [];
  const highs: (number | null)[]   = q.high   ?? [];
  const lows: (number | null)[]    = q.low    ?? [];
  const closes: (number | null)[]  = q.close  ?? [];
  const vols: (number | null)[]    = q.volume ?? [];

  // 분봉(장중 조회)은 lightweight-charts에 하루 단위 문자열이 아니라 초 단위 UNIX
  // 타임스탬프를 줘야 같은 날짜 안 여러 봉이 서로 구분된다. 일봉/주봉/월봉은 기존처럼
  // "YYYY-MM-DD" 문자열 그대로 둬서 이 데이터를 쓰는 다른 화면(시장지표 등)과 호환을 유지한다.
  const isIntraday = !["1d", "1wk", "1mo"].includes(interval);
  const bars: Bar[] = timestamps
    .map((ts, i) => ({
      date: isIntraday ? ts : new Date(ts * 1000).toISOString().slice(0, 10),
      open: opens[i]!, high: highs[i]!, low: lows[i]!, close: closes[i]!,
      volume: vols[i] ?? 0,
    }))
    .filter((b): b is Bar => b.open != null && b.high != null && b.low != null && b.close != null);

  const closeArr = bars.map(b => b.close);
  const ma5Arr  = sma(closeArr, 5);
  const ma20Arr = sma(closeArr, 20);
  const ma60Arr = sma(closeArr, 60);
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
    ma5: ma5Arr[i], ma20: ma20Arr[i], ma60: ma60Arr[i],
    bb_upper: bbUpper[i], bb_lower: bbLower[i],
    vwap: vwapArr[i],
    rsi: rsiArr[i],
    macd_hist: macdArr[i],
  }));

  return {
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
  };
}
