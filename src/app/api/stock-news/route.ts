import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { fetchGoogleNews } from '@/lib/googleNews';

export const dynamic = 'force-dynamic';

// scripts/stock_news/fetch_stock_news.py와 반드시 동기화 — 이 종목들만 매일
// 자동수집된 배치 뉴스(news/종목뉴스_*.xlsx)를 쓰고, 나머지는 라이브 조회로 폴백한다.
const FEATURED_CODES = new Set(['005930', '000660', '005380', '373220', '207940']);

export type StockNewsItem = {
  title: string;
  media: string | null;
  date: string | null;
  url: string | null;
  summary: string | null;
};

function readBatchNews(code: string): StockNewsItem[] {
  const newsDir = path.join(process.cwd(), 'news');
  if (!fs.existsSync(newsDir)) return [];

  const files = fs.readdirSync(newsDir).filter(f => f.endsWith('.xlsx') && f.startsWith('종목뉴스'));
  const rows: (StockNewsItem & { date: string })[] = [];

  for (const file of files) {
    const buf = fs.readFileSync(path.join(newsDir, file));
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    for (const row of parsed) {
      if (String(row['티커'] ?? '').trim() !== code) continue;
      const title = String(row['제목(한글)'] ?? row['제목 (한글)'] ?? '').trim();
      if (!title) continue;
      rows.push({
        title,
        media: String(row['매체'] ?? '').trim() || null,
        date: String(row['발행일'] ?? '').trim(),
        url: String(row['URL'] ?? row['url'] ?? '').trim() || null,
        summary: String(row['내용요약(한글)'] ?? row['내용 요약(한글)'] ?? '').trim() || null,
      });
    }
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}

const getLiveNews = unstable_cache(
  async (name: string): Promise<StockNewsItem[]> => {
    const headlines = await fetchGoogleNews(`${name} 주가`, { hl: 'ko', gl: 'KR', ceid: 'KR:ko' });
    return headlines.map(title => ({ title, media: null, date: null, url: null, summary: null }));
  },
  ['stock-news-v1'],
  { revalidate: 1800 }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  const code = searchParams.get('code');
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  if (code && FEATURED_CODES.has(code)) {
    const items = readBatchNews(code);
    if (items.length > 0) {
      return NextResponse.json({ name, headlines: items, source: 'batch' });
    }
    // 배치 파일이 아직 없으면(워크플로 실행 전 등) 라이브 조회로 폴백.
  }

  const headlines = await getLiveNews(name);
  return NextResponse.json({ name, headlines, source: 'live' });
}
