import { AssetType } from "./types";

// 야후 파이낸스 API를 통한 시세 조회 (서버사이드 전용)
export async function fetchCurrentPrice(
  ticker: string,
  type: AssetType
): Promise<number> {
  try {
    const symbol = buildSymbol(ticker, type);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 }, // 5분 캐시
    });

    if (!res.ok) return 0;

    const data = await res.json();
    const price =
      data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0;
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
