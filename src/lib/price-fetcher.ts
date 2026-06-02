import { AssetType } from "./types";

// 야후 파이낸스 API를 통한 시세 조회 (서버사이드 전용)
async function yahooPrice(symbol: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0;
}

export async function fetchCurrentPrice(
  ticker: string,
  type: AssetType
): Promise<number> {
  try {
    const symbol = buildSymbol(ticker, type);
    const price = await yahooPrice(symbol);
    // 한국 주식은 KOSPI(.KS) 실패 시 KOSDAQ(.KQ)으로 재시도
    if (price === 0 && type === "STOCK_KR") {
      return await yahooPrice(`${ticker}.KQ`);
    }
    return price;
  } catch {
    return 0;
  }
}

function buildSymbol(ticker: string, type: AssetType): string {
  switch (type) {
    case "STOCK_KR":
      // 한국 주식: 6자리 코드 + .KS (코스피) 또는 .KQ (코스닥)
      return `${ticker}.KS`;
    case "STOCK_US":
    case "ETF":
      return ticker;
    case "CRYPTO":
      // BTC -> BTC-USD
      return ticker.includes("-") ? ticker : `${ticker}-USD`;
    case "FUND":
      return ticker;
    default:
      return ticker;
  }
}

export async function fetchPrices(
  assets: { ticker: string; type: string }[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  await Promise.all(
    assets.map(async (a) => {
      const price = await fetchCurrentPrice(a.ticker, a.type as AssetType);
      results[a.ticker] = price;
    })
  );
  return results;
}
