// herencia-ta(KOSPI200 기술적 지표 외부 API, Python/FastAPI, Render 배포) 공용 접근점.
// src/app/api/screener/route.ts(종목 목록 프록시)와
// src/app/api/screener-live/route.ts(200종목 배치 실시간 근사)가 같은 캐시를 공유한다.
import { unstable_cache } from 'next/cache';

export const HERENCIA_TA_API_BASE = process.env.HERENCIA_TA_API_URL ?? 'https://herencia-ta.onrender.com';

export type ScreenerStock = {
  code: string;
  name: string;
  market: string;
  market_cap_100m?: number;
  trend?: string;
  entry_opinion: string;
  [key: string]: unknown;
};

// herencia-ta는 무료 Render 인스턴스라 비활성 시 슬립되고 콜드스타트가 느릴 수 있어 30분 캐시.
export const getScreenerStockList = unstable_cache(
  async (): Promise<ScreenerStock[]> => {
    const res = await fetch(`${HERENCIA_TA_API_BASE}/api/stocks`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`herencia-ta API ${res.status}`);
    return res.json();
  },
  ['herencia-ta-screener'],
  { revalidate: 1800 }
);
