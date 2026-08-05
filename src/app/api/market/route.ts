import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { fetchGoogleNews } from '@/lib/googleNews';

export const dynamic = 'force-dynamic';

// ── Yahoo Finance v8/chart 단건 ───────────────────────────
// 전일 종가를 구하는 방법을 두 번 갈아엎었다: 처음엔 일봉(interval=1d) 배열에서 null만
// 걸러내고 마지막 두 값을 비교했는데, KOSPI 같은 일부 심볼은 특정 날짜(예: 2026-08-03)의
// 일봉 close가 통째로 null로 와서 그 날을 건너뛰고 더 이전 거래일과 비교하는 바람에
// 등락률이 크게 틀어졌다(실측: 실제로는 +1.6%인데 -3.6%로 계산됨). 그래서 meta의
// chartPreviousClose로 바꿔봤는데, 이 필드는 range 파라미터에 따라 완전히 다른(그리고
// 실제 어느 날짜의 종가와도 안 맞는) 값을 줘서 더 못 믿을 물건이었다(range=5d일 때
// 6023.66, range=1mo일 때 8088.34 — 둘 다 최근 실제 가격대와 안 맞음). 반면 시간봉
// (interval=60m)은 같은 날짜에 결측이 없어서, 시간봉을 KST 날짜별로 묶어 "가장 최근
// 완결된 거래일의 마지막 시간봉 종가"를 직접 재구성해 전일 종가로 쓴다 — 이 방식으로
// KOSPI를 다시 계산해보니 시간봉상 08-03 마지막 종가 6251.59 → 08-04 6358.95로 약
// +1.7%, 사용자가 실제로 확인한 +1.62%와 거의 일치했다.
async function fetchChart(symbol: string): Promise<{ price: number; changePct: number; change: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=60m&range=5d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const price = result.meta?.regularMarketPrice;
    if (typeof price !== 'number') return null;

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const lastCloseByDate = new Map<string, number>();
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c == null) continue;
      const kstDate = new Date((timestamps[i] + 9 * 3600) * 1000).toISOString().slice(0, 10);
      lastCloseByDate.set(kstDate, c); // 같은 날짜를 시간 순서대로 덮어써서 그 날의 마지막 값만 남김
    }
    const todayKst = new Date((Math.floor(Date.now() / 1000) + 9 * 3600) * 1000).toISOString().slice(0, 10);
    const priorDates = [...lastCloseByDate.keys()].filter(d => d < todayKst).sort();
    const prevClose = priorDates.length ? lastCloseByDate.get(priorDates.at(-1)!)! : null;

    if (prevClose != null && prevClose !== 0) {
      return { price, change: price - prevClose, changePct: ((price - prevClose) / prevClose) * 100 };
    }

    // 시간봉 5일치로도 전일 종가를 못 구한 예외적인 경우(신규 상장 등)에만 meta로 폴백.
    const metaPrev = result.meta?.chartPreviousClose;
    if (typeof metaPrev === 'number' && metaPrev !== 0) {
      return { price, change: price - metaPrev, changePct: ((price - metaPrev) / metaPrev) * 100 };
    }
    return null;
  } catch { return null; }
}

// ── 헤드라인 키워드 → 한국어 (d: 'up'=상승만, 'dn'=하락만, 'any'=무관) ──
type KWEntry = [RegExp, string, 'up' | 'dn' | 'any'];

const KW: KWEntry[] = [
  // 방향 특정 키워드
  [/foreign sell|sell.off|net sell/i,                         '외국인 매도세',   'dn'],
  [/foreign buy|net buy|institutional buy/i,                  '외국인 순매수',   'up'],
  [/bear|bearish|short sell/i,                                '약세 심리',       'dn'],
  [/rally|bullish|surge|soar|jump|climb/i,                    '강한 매수세',     'up'],
  [/fall|drop|sink|plunge|tumble/i,                           '강한 매도세',     'dn'],
  [/rate cut|rate reduction|pivot|dovish/i,                   '금리 인하 기대',  'up'],
  [/rate hike|rate increase|hawkish|tighten/i,                '금리 인상 우려',  'dn'],
  [/earnings beat|profit beat|revenue beat/i,                 '호실적',          'up'],
  [/earnings miss|profit fall|revenue miss/i,                 '실적 부진',       'dn'],
  [/etf.*approv|approv.*etf|etf.*launch/i,                   'ETF 승인 기대',   'up'],
  [/halv/i,                                                   '반감기 기대감',   'up'],
  [/record high|all.time high|new high/i,                     '신고점 경신',     'up'],
  [/six.week low|month low|year low|new low/i,                '저점 하락',       'dn'],

  // 방향 중립 (뉴스 내용으로 판단)
  [/bond yield|treasury yield|10.year/i,                      '국채금리 변동',  'any'],
  [/fed |federal reserve|fomc|powell/i,                       '연준 발언',      'any'],
  [/inflation|cpi|pce|consumer price/i,                       '인플레이션 우려','dn'],
  [/recession|downturn|slowdown/i,                            '경기침체 우려',  'dn'],
  [/middle east|iran|israel|gaza|ukraine|geopolit/i,          '지정학 리스크',  'any'],
  [/ceasefire|peace deal/i,                                   '휴전 기대감',    'up'],
  [/tariff|trade war|sanction/i,                              '무역 분쟁',      'dn'],
  [/jobs|employment|nonfarm|payroll/i,                        '고용지표',       'any'],
  [/gdp|economic data|economic growth/i,                      '경제지표',       'any'],
  [/tech|semiconductor|chip|nvidia|apple|microsoft/i,         '기술주',         'any'],
  [/china|beijing|pbc|pboc/i,                                 '중국 이슈',      'any'],
  [/opec|oil supply|energy minister/i,                        'OPEC 결정',      'any'],
  [/safe.haven|gold.*demand|demand.*gold/i,                   '안전자산 수요',  'up'],
  [/dollar|dxy|usd index/i,                                   '달러 변동',      'any'],
  [/crypto.*regul|sec.*crypto/i,                              '규제 이슈',      'dn'],
  [/ai |artificial intelligence|chatgpt/i,                    'AI 기대감',      'up'],
  [/goldman|jpmorgan|upgrade/i,                               '기관 전망 상향', 'up'],
  [/downgrade|sell rating/i,                                  '기관 전망 하향', 'dn'],
];

// 한국어 조사: 받침 없으면 "로", 있으면 "에"
function josa(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return '에';
  return (code - 0xAC00) % 28 === 0 ? '로' : '에';
}

function extractKW(headlines: string[], up: boolean): string[] {
  const found: string[] = [];
  const text = headlines.join(' ');
  for (const [pat, kor, dir] of KW) {
    if (dir !== 'any' && dir !== (up ? 'up' : 'dn')) continue;
    if (pat.test(text) && !found.includes(kor)) {
      found.push(kor);
      if (found.length >= 2) return found;
    }
  }
  // 방향 중립 키워드로 fallback
  if (found.length === 0) {
    for (const [pat, kor, dir] of KW) {
      if (dir !== 'any') continue;
      if (pat.test(text) && !found.includes(kor)) {
        found.push(kor);
        if (found.length >= 2) return found;
      }
    }
  }
  return found;
}

function buildSentence(kws: string[], up: boolean, strong: boolean): string {
  const dir = up ? (strong ? '급등' : '상승') : (strong ? '급락' : '하락');
  if (kws.length === 0) return up ? `전반적 매수세로 ${dir}` : `전반적 매도세로 ${dir}`;
  const last = kws.at(-1)!;
  const others = kws.slice(0, -1);
  const j = josa(last);
  const cause = others.length ? `${others.join('·')}·${last}` : last;
  return `${cause}${j} ${dir}`;
}

// ── 포맷 헬퍼 ────────────────────────────────────────────
function fmtNum(v: number): string {
  if (v >= 10000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  if (v >= 100)   return v.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  if (v >= 1)     return v.toFixed(2);
  return v.toFixed(4);
}
function fmtPct(v: number): string { return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }
function fmtChg(v: number, d = 2): string { return (v >= 0 ? '+' : '') + v.toFixed(d); }

// ── 뉴스 쿼리 (Google News 최적화) ───────────────────────
const NEWS_Q: Record<string, string> = {
  'S&P500':       'S&P 500 stock market',
  'NASDAQ':       'Nasdaq stock market',
  '다우':          'Dow Jones stock market',
  'KOSPI':        'KOSPI Korea stock market',
  'KOSDAQ':       'KOSDAQ Korea stock',
  '니케이225':    'Nikkei 225 Japan stock',
  'DAX':          'DAX Germany stock market',
  '유로스톡스50': 'Euro Stoxx 50 stock market',
  '항셍':         'Hang Seng Hong Kong stock',
  '상해종합':     'Shanghai Composite China stock',
  '금':           'gold price XAU market',
  '원유(WTI)':    'crude oil WTI price market',
  '은':           'silver price market',
  'BTC':          'Bitcoin BTC cryptocurrency price',
};

// ── 가격 캐시 (1분) ───────────────────────────────────────
const getMarketData = unstable_cache(
  async () => {
    const SYMBOLS = [
      '^GSPC', '^IXIC', '^DJI', '^KS11', '^KQ11', '^N225', '^GDAXI', '^STOXX50E', '^HSI', '000001.SS',
      'USDKRW=X', 'EURKRW=X', 'JPYKRW=X', 'GBPKRW=X', 'CNYKRW=X',
      'AUDKRW=X', 'CADKRW=X', 'CHFKRW=X', 'HKDKRW=X', 'SGDKRW=X',
      'GC=F', 'CL=F', 'SI=F', 'BTC-USD',
    ];
    const results = await Promise.all(SYMBOLS.map(fetchChart));
    return Object.fromEntries(SYMBOLS.map((s, i) => [s, results[i]]));
  },
  ['market-v8'], // v8: chartPreviousClose가 range별로 다른 값을 주는 걸 확인해 폐기 — 시간봉을 날짜별로 묶어 전일 종가를 직접 재구성
  { revalidate: 60 }
);

// ── 뉴스 요약 캐시 (1시간) ───────────────────────────────
const getNewsSummaries = unstable_cache(
  async (pcts: Record<string, number>) => {
    const out: Record<string, string> = {};
    await Promise.all(
      Object.entries(NEWS_Q).map(async ([name, query]) => {
        const headlines = await fetchGoogleNews(query);
        const pct = pcts[name] ?? 0;
        const up  = pct >= 0;
        const kws = extractKW(headlines, up);
        out[name] = buildSentence(kws, up, Math.abs(pct) > 1.5);
      })
    );
    return out;
  },
  ['market-news-v2'],
  { revalidate: 3600 }
);

// ── GET ──────────────────────────────────────────────────
export async function GET() {
  try {
    const q = await getMarketData();

    const pcts: Record<string, number> = {
      'S&P500':       q['^GSPC']?.changePct      ?? 0,
      'NASDAQ':       q['^IXIC']?.changePct      ?? 0,
      '다우':          q['^DJI']?.changePct       ?? 0,
      'KOSPI':        q['^KS11']?.changePct      ?? 0,
      'KOSDAQ':       q['^KQ11']?.changePct      ?? 0,
      '니케이225':    q['^N225']?.changePct      ?? 0,
      'DAX':          q['^GDAXI']?.changePct     ?? 0,
      '유로스톡스50': q['^STOXX50E']?.changePct  ?? 0,
      '항셍':         q['^HSI']?.changePct       ?? 0,
      '상해종합':     q['000001.SS']?.changePct  ?? 0,
      '금':           q['GC=F']?.changePct       ?? 0,
      '원유(WTI)':    q['CL=F']?.changePct       ?? 0,
      '은':           q['SI=F']?.changePct       ?? 0,
      'BTC':          q['BTC-USD']?.changePct    ?? 0,
    };

    const summaries = await getNewsSummaries(pcts);

    const indices = [
      { name: 'S&P500',      symbol: '^GSPC'      },
      { name: 'NASDAQ',      symbol: '^IXIC'      },
      { name: '다우',         symbol: '^DJI'       },
      { name: 'KOSPI',       symbol: '^KS11'      },
      { name: 'KOSDAQ',      symbol: '^KQ11'      },
      { name: '니케이225',   symbol: '^N225'      },
      { name: 'DAX',         symbol: '^GDAXI'     },
      { name: '유로스톡스50', symbol: '^STOXX50E' },
      { name: '항셍',        symbol: '^HSI'       },
      { name: '상해종합',    symbol: '000001.SS'  },
    ].map(({ name, symbol }) => {
      const d = q[symbol]; if (!d) return null;
      return { name, value: fmtNum(d.price), change: fmtPct(d.changePct),
               up: d.changePct >= 0, summary: summaries[name] ?? '' };
    }).filter(Boolean);

    const fx = [
      { pair: 'USD / KRW', symbol: 'USDKRW=X', flag: '🇺🇸', country: '미국' },
      { pair: 'EUR / KRW', symbol: 'EURKRW=X', flag: '🇪🇺', country: '유럽연합' },
      { pair: 'JPY / KRW', symbol: 'JPYKRW=X', flag: '🇯🇵', country: '일본' },
      { pair: 'GBP / KRW', symbol: 'GBPKRW=X', flag: '🇬🇧', country: '영국' },
      { pair: 'CNY / KRW', symbol: 'CNYKRW=X', flag: '🇨🇳', country: '중국' },
      { pair: 'AUD / KRW', symbol: 'AUDKRW=X', flag: '🇦🇺', country: '호주' },
      { pair: 'CAD / KRW', symbol: 'CADKRW=X', flag: '🇨🇦', country: '캐나다' },
      { pair: 'CHF / KRW', symbol: 'CHFKRW=X', flag: '🇨🇭', country: '스위스' },
      { pair: 'HKD / KRW', symbol: 'HKDKRW=X', flag: '🇭🇰', country: '홍콩' },
      { pair: 'SGD / KRW', symbol: 'SGDKRW=X', flag: '🇸🇬', country: '싱가포르' },
    ].map(({ pair, symbol, flag, country }) => {
      const d = q[symbol]; if (!d) return null;
      return { pair, flag, country, value: fmtNum(d.price), change: fmtChg(d.change, 2), up: d.change >= 0 };
    }).filter(Boolean);

    const commodities = [
      { name: '금',        symbol: 'GC=F',    icon: 'ti-coin',             bg: '#2a2010', ic: '#EF9F27', prefix: '$' },
      { name: '원유(WTI)', symbol: 'CL=F',    icon: 'ti-droplet-filled',   bg: '#241a10', ic: '#B87333', prefix: '$' },
      { name: '은',        symbol: 'SI=F',    icon: 'ti-coin',             bg: '#202024', ic: '#C0C0C0', prefix: '$' },
      { name: 'BTC',       symbol: 'BTC-USD', icon: 'ti-currency-bitcoin', bg: '#2b1c0a', ic: '#F7931A', prefix: '$' },
    ].map(({ name, symbol, icon, bg, ic, prefix }) => {
      const d = q[symbol]; if (!d) return null;
      return { name, icon, bg, ic, value: prefix + fmtNum(d.price), change: fmtPct(d.changePct),
               up: d.changePct >= 0, summary: summaries[name] ?? '' };
    }).filter(Boolean);

    return NextResponse.json({ indices, fx, commodities, updatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
