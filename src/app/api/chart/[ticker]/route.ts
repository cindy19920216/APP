import { NextResponse } from "next/server";

const INTERVAL: Record<string, string> = {
  "1mo":  "1d",
  "3mo":  "1d",
  "6mo":  "1d",
  "1y":   "1d",
  "3y":   "1wk",
  "5y":   "1wk",
  "max":  "1mo",
};

async function fetchChart(symbol: string, range: string) {
  const interval = INTERVAL[range] ?? "1mo";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.chart?.result?.[0] ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "max";

  // 한국 6자리 코드 → KOSPI 시도 후 KOSDAQ 폴백
  const isKr = /^\d{6}$/.test(ticker);
  const symbols = isKr
    ? [`${ticker}.KS`, `${ticker}.KQ`]
    : [`${ticker}-USD`, ticker].filter((s, i, a) => a.indexOf(s) === i); // crypto or US

  // 암호화폐 / 미국 주식 심볼 결정
  const cryptoList = ["BTC","ETH","XRP","SOL","BNB","DOGE","ADA","MATIC","AVAX","DOT"];
  const finalSymbols = isKr
    ? symbols
    : cryptoList.includes(ticker.toUpperCase())
    ? [`${ticker.toUpperCase()}-USD`]
    : [ticker.toUpperCase()];

  let result = null;
  let usedSymbol = "";
  for (const sym of finalSymbols) {
    result = await fetchChart(sym, range);
    if (result) { usedSymbol = sym; break; }
  }

  if (!result) {
    return NextResponse.json({ error: "No data" }, { status: 404 });
  }

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  const points = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), price: closes[i] }))
    .filter((p): p is { date: string; price: number } => p.price != null);

  return NextResponse.json({
    ticker,
    symbol: usedSymbol,
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
