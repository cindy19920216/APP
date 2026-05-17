import SummaryCards from "@/components/dashboard/SummaryCards";
import AllocationChart from "@/components/dashboard/AllocationChart";
import MemberChart from "@/components/dashboard/MemberChart";
import { PortfolioSummary } from "@/lib/types";

async function getDashboardData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/dashboard`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("대시보드 데이터 로드 실패");
  return res.json();
}

export default async function DashboardPage() {
  let data: {
    summary: PortfolioSummary;
    members: {
      id: number;
      name: string;
      color: string;
      totalValue: number;
      profitLossPct: number;
      assets: { type: string; currentValue: number }[];
    }[];
  } | null = null;

  try {
    data = await getDashboardData();
  } catch {
    // DB가 비어있을 때 기본값
  }

  const summary: PortfolioSummary = data?.summary ?? {
    totalValue: 0,
    totalCost: 0,
    profitLoss: 0,
    profitLossPct: 0,
    memberCount: 0,
    assetCount: 0,
  };

  const allAssets = data?.members.flatMap((m) => m.assets) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">가족 투자 자산 현황</p>
      </div>

      <SummaryCards summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationChart assets={allAssets} />
        <MemberChart members={data?.members ?? []} />
      </div>

      {data && data.members.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">구성원별 자산 현황</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.members.map((m) => {
              const isProfit = m.profitLossPct >= 0;
              return (
                <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="font-medium text-gray-800">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {m.totalValue.toLocaleString("ko-KR")}원
                    </p>
                    <p className={`text-sm ${isProfit ? "text-green-600" : "text-red-500"}`}>
                      {isProfit ? "+" : ""}{m.profitLossPct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(!data || data.members.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 shadow-sm text-center">
          <p className="text-gray-400 text-sm mb-2">아직 데이터가 없습니다</p>
          <p className="text-gray-300 text-xs">가족 구성원과 자산을 추가해보세요</p>
        </div>
      )}
    </div>
  );
}
