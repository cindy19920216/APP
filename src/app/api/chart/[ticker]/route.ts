import { NextResponse } from "next/server";
import { fetchYahooBars } from "@/lib/yahooChart";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "1y";
  // start/end(YYYY-MM-DD)가 있으면 "오늘 기준 N개월/년" 대신 고정 캘린더 구간을 일봉으로 조회한다.
  // 콘텐츠(퀴즈 예시 차트 등)에서 특정 과거 날짜를 시간이 지나도 그대로 재현하려면 range로는 불가능 —
  // range는 항상 "오늘" 기준 상대 구간이라 시간이 지나면 그 날짜가 창 밖으로 밀려난다.
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  // 분봉(intraday) 조회 시 클라이언트가 interval을 직접 지정 — 안 넘기면 fetchYahooBars가
  // 기존 range→interval 테이블로 알아서 폴백한다(하위 호환).
  const intervalParam = searchParams.get("interval");
  const period1 = startParam ? Math.floor(new Date(`${startParam}T00:00:00Z`).getTime() / 1000) : undefined;
  const period2 = endParam
    ? Math.floor(new Date(`${endParam}T23:59:59Z`).getTime() / 1000)
    : undefined;

  const data = await fetchYahooBars(ticker, {
    range,
    interval: intervalParam ?? undefined,
    period1,
    period2,
  });

  if (!data) {
    return NextResponse.json({ error: "No data" }, { status: 404 });
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
