"use client";

import { TrendingUp, TrendingDown, Wallet, Users, Briefcase } from "lucide-react";
import { PortfolioSummary } from "@/lib/types";

function formatKRW(value: number) {
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}억`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(0)}만`;
  return value.toLocaleString("ko-KR");
}

interface Props {
  summary: PortfolioSummary;
}

export default function SummaryCards({ summary }: Props) {
  const isProfit = summary.profitLoss >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        icon={<Wallet size={20} className="text-indigo-500" />}
        label="총 평가 자산"
        value={`${formatKRW(summary.totalValue)}원`}
        sub={`투자원금 ${formatKRW(summary.totalCost)}원`}
        bgColor="bg-indigo-50"
      />
      <Card
        icon={
          isProfit ? (
            <TrendingUp size={20} className="text-green-500" />
          ) : (
            <TrendingDown size={20} className="text-red-500" />
          )
        }
        label="총 수익/손실"
        value={`${isProfit ? "+" : ""}${formatKRW(summary.profitLoss)}원`}
        sub={`${isProfit ? "+" : ""}${summary.profitLossPct.toFixed(2)}%`}
        bgColor={isProfit ? "bg-green-50" : "bg-red-50"}
        valueColor={isProfit ? "text-green-600" : "text-red-600"}
      />
      <Card
        icon={<Users size={20} className="text-blue-500" />}
        label="가족 구성원"
        value={`${summary.memberCount}명`}
        sub="관리 중인 구성원"
        bgColor="bg-blue-50"
      />
      <Card
        icon={<Briefcase size={20} className="text-amber-500" />}
        label="보유 종목"
        value={`${summary.assetCount}개`}
        sub="등록된 자산 종목"
        bgColor="bg-amber-50"
      />
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
  bgColor,
  valueColor = "text-gray-900",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  bgColor: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className={`inline-flex p-2 rounded-lg ${bgColor} mb-3`}>{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
