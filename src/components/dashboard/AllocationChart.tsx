"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ASSET_TYPE_COLOR, ASSET_TYPE_LABEL, AssetType } from "@/lib/types";

interface AssetItem {
  type: string;
  currentValue: number;
}

interface Props {
  assets: AssetItem[];
}

export default function AllocationChart({ assets }: Props) {
  const grouped = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + a.currentValue;
    return acc;
  }, {});

  const data = Object.entries(grouped)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: ASSET_TYPE_LABEL[type as AssetType] ?? type,
      value: Math.round(value),
      color: ASSET_TYPE_COLOR[type as AssetType] ?? "#6366f1",
    }));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm h-72 flex items-center justify-center text-gray-400 text-sm">
        자산을 추가하면 차트가 표시됩니다
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-800 mb-4">자산 유형별 배분</h2>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) =>
              `${Number(v).toLocaleString("ko-KR")}원`
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
