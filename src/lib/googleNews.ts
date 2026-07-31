// Google News RSS (무료, 키 불필요)
export async function fetchGoogleNews(
  query: string,
  locale: { hl: string; gl: string; ceid: string } = { hl: 'en-US', gl: 'US', ceid: 'US:en' }
): Promise<string[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const xml = await res.text();
    const titles: string[] = [];
    const re = /<title>([^<]*)<\/title>/g;
    let m: RegExpExecArray | null;
    let isFirst = true; // 첫 <title>은 RSS <channel> 제목("{검색어} - Google 뉴스")이라 헤드라인이 아니다
    while ((m = re.exec(xml)) !== null && titles.length < 7) {
      const t = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
      if (!isFirst && t.length > 15) titles.push(t);
      isFirst = false;
    }
    return titles.slice(0, 5);
  } catch { return []; }
}
