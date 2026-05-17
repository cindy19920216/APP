"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { ASSET_TYPE_COLOR, ASSET_TYPE_LABEL, AssetType } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DashboardData {
  summary: {
    totalValue: number;
    totalCost: number;
    profitLoss: number;
    profitLossPct: number;
  };
  members: {
    id: number;
    name: string;
    color: string;
    totalValue: number;
    totalCost: number;
    profitLoss: number;
    profitLossPct: number;
    assets: {
      id: number;
      type: string;
      name: string;
      ticker: string;
      currentValue: number;
      profitLoss: number;
      profitLossPct: number;
    }[];
  }[];
}

export default function AnalysisPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-gray-400 text-sm">불러오는 중...</div>;

  const memberProfitData = data.members.map((m) => ({
    name: m.name,
    수익률: parseFloat(m.profitLossPct.toFixed(2)),
    color: m.color,
  }));

  const allAssets = data.members.flatMap((m) => m.assets);
  const typeGrouped = allAssets.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + a.currentValue;
    return acc;
  }, {});
  const typeData = Object.entries(typeGrouped)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: ASSET_TYPE_LABEL[type as AssetType] ?? type,
      value: Math.round(value),
      color: ASSET_TYPE_COLOR[type as AssetType] ?? "#6366f1",
    }));

  const top5 = [...allAssets]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">수익률 분석</h1>
        <p className="text-sm text-gray-500 mt-1">포트폴리오 분석 및 수익률 현황</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">구성원별 수익률</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={memberProfitData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${Number(v)}%`} />
              <Bar dataKey="수익률" radius={[6, 6, 0, 0]}>
                {memberProfitData.map((entry, i) => (
                  <Cell key={i} fill={entry.수익률 >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">자산 유형별 배분</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${Number(v).toLocaleString("ko-KR")}원`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">구성원별 상세 현황</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {data.members.map((m) => {
            const isProfit = m.profitLoss >= 0;
            return (
              <div key={m.id} className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="font-semibold text-gray-900">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{m.totalValue.toLocaleString("ko-KR")}원</p>
                    <p className={`text-sm flex items-center justify-end gap-1 ${isProfit ? "text-green-600" : "text-red-500"}`}>
                      {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isProfit ? "+" : ""}{m.profitLossPct.toFixed(2)}%
                      ({isProfit ? "+" : ""}{m.profitLoss.toLocaleString("ko-KR")}원)
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {m.assets.map((a) => {
                    const ap = a.profitLoss >= 0;
                    return (
                      <div key={a.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-gray-700">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.ticker}</p>
                        <p className={`text-xs mt-1 font-medium ${ap ? "text-green-600" : "text-red-500"}`}>
                          {ap ? "+" : ""}{a.profitLossPct.toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {top5.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">평가액 상위 5개 종목</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {top5.map((a, i) => {
              const isProfit = a.profitLoss >= 0;
              return (
                <div key={a.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.ticker} · {ASSET_TYPE_LABEL[a.type as AssetType]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{a.currentValue.toLocaleString("ko-KR")}원</p>
                    <p className={`text-sm ${isProfit ? "text-green-600" : "text-red-500"}`}>
                      {isProfit ? "+" : ""}{a.profitLossPct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
