import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface NewsItem {
  company: string;
  title: string;
  media: string;
  date: string;
  url: string;
  summary: string;
}

function parseRow(row: Record<string, unknown>): NewsItem | null {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const val = row[k];
      if (val != null && String(val).trim() !== '') return String(val).trim();
    }
    return '';
  };
  const company = get('기업');
  const title   = get('제목 (한글)', '제목(한글)');
  if (!company || !title) return null;
  return {
    company,
    title,
    media:   get('매체'),
    date:    get('발행일'),
    url:     get('URL', 'url'),
    summary: get('내용 요약 (한글)', '내용 요약(한글)', '내용요약'),
  };
}

export async function GET() {
  try {
    const newsDir = path.join(process.cwd(), 'news');
    if (!fs.existsSync(newsDir)) return NextResponse.json([]);

    const files = fs.readdirSync(newsDir)
      .filter(f => f.endsWith('.xlsx') && f.startsWith('빅테크뉴스'))
      .sort()
      .reverse();

    if (files.length === 0) return NextResponse.json([]);

    const all: NewsItem[] = [];
    for (const file of files) {
      const buf  = fs.readFileSync(path.join(newsDir, file));
      const wb   = XLSX.read(buf, { type: 'buffer', cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      for (const row of rows) {
        const item = parseRow(row);
        if (item) all.push(item);
      }
    }

    all.sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json(all);
  } catch {
    return NextResponse.json([]);
  }
}
