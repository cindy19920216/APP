import { NextResponse } from 'next/server';
import { getScreenerStockList, HERENCIA_TA_API_BASE } from '@/lib/herenciaTa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stocks = await getScreenerStockList();
    return NextResponse.json({ stocks, apiBase: HERENCIA_TA_API_BASE });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
