"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface MemberStat {
  name: string;
  color: string;
  totalValue: number;
  profitLossPct: number;
}

interface Props {
  members: MemberStat[];
}

export default function MemberChart({ members }: Props) {
  const data = members.map((m) => ({
    name: m.name,
    평가액: Math.round(m.totalValue),
    수익률: parseFloat(m.profitLossPct.toFixed(2)),
    color: m.color,
  }));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm h-72 flex items-center justify-center text-gray-400 text-sm">
        구성원을 추가하면 차트가 표시됩니다
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-800 mb-4">구성원별 평가액</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) =>
              v >= 1e8 ? `${(v / 1e8).toFixed(0)}억` : v >= 1e4 ? `${(v / 1e4).toFixed(0)}만` : String(v)
            }
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(v) => `${Number(v).toLocaleString("ko-KR")}원`}
          />
          <Bar dataKey="평가액" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
