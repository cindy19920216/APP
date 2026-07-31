import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getScreenerStockList, HERENCIA_TA_API_BASE } from '@/lib/herenciaTa';
import { fetchYahooBars } from '@/lib/yahooChart';
import { buildLiveBars, computeApproxSignal, type ApproxSignal } from '@/lib/stockAnalysis';

export const dynamic = 'force-dynamic';

const CONCURRENCY = 10;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// KOSPI200 200종목 전체에 대해 herencia-ta 일봉 히스토리 + Yahoo 시간봉을 합성해
// "실시간 근사 진입의견"(매수/매도/관망)을 계산한다. 종목당 외부 호출이 2번(herencia-ta
// 히스토리 + Yahoo 시간봉)씩이라 총 400회 — 페이지 로드마다 하면 두 무료 API 모두
// 과호출 위험이 있어 15분 캐시로 묶어 모든 사용자가 하나의 계산 결과를 공유한다.
// 개별 종목이 실패(타임아웃/데이터 이상)해도 그 종목만 결과에서 빠지고 나머지는 계속 진행.
const getLiveSignals = unstable_cache(
  async (): Promise<{ signals: Record<string, ApproxSignal>; generatedAt: string }> => {
    const stocks = await getScreenerStockList();
    const signals: Record<string, ApproxSignal> = {};

    for (const batch of chunk(stocks, CONCURRENCY)) {
      await Promise.all(batch.map(async (s) => {
        try {
          const [historyRes, yahooBars] = await Promise.all([
            fetch(`${HERENCIA_TA_API_BASE}/api/stocks/${s.code}/history`, { signal: AbortSignal.timeout(15_000) })
              .then(r => r.ok ? r.json() : []),
            fetchYahooBars(s.code, { range: '1mo', interval: '60m' }).catch(() => null),
          ]);
          const dailyHistory = Array.isArray(historyRes) ? historyRes : [];
          if (!dailyHistory.length) return;
          // interval=60m 조회라 date는 항상 숫자(UNIX 초)여야 정상 — 방어적으로 필터링.
          const hourlyPoints = (yahooBars?.points ?? []).filter(
            (p): p is typeof p & { date: number } => typeof p.date === 'number'
          );
          const liveBars = buildLiveBars(dailyHistory, hourlyPoints);
          const latest = liveBars.at(-1);
          if (latest) signals[s.code] = computeApproxSignal(latest);
        } catch {
          // 이 종목만 건너뜀 — 전체 배치를 막지 않음
        }
      }));
    }

    return { signals, generatedAt: new Date().toISOString() };
  },
  ['screener-live-v3'], // v3: ±3표 실효성 없어 ±2로 되돌림(computeApproxSignal 참고)
  { revalidate: 900 }
);

export async function GET() {
  try {
    const data = await getLiveSignals();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
