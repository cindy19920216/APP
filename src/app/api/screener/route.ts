import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.HERENCIA_TA_API_URL ?? 'https://herencia-ta.onrender.com';

// herencia-ta는 무료 Render 인스턴스라 비활성 시 슬립되고 콜드스타트가 느릴 수 있어 30분 캐시.
const getScreenerData = unstable_cache(
  async () => {
    const res = await fetch(`${API_BASE}/api/stocks`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`herencia-ta API ${res.status}`);
    return res.json();
  },
  ['herencia-ta-screener'],
  { revalidate: 1800 }
);

export async function GET() {
  try {
    const stocks = await getScreenerData();
    return NextResponse.json({ stocks, apiBase: API_BASE });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
