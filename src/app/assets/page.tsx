"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { ASSET_TYPE_LABEL, AssetType } from "@/lib/types";

interface Member { id: number; name: string; color: string; }
interface Asset {
  id: number;
  memberId: number;
  member: Member;
  type: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currency: string;
}

const ASSET_TYPES: AssetType[] = ["STOCK_KR", "STOCK_US", "CRYPTO", "ETF", "FUND"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [filterMember, setFilterMember] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    type: "STOCK_KR" as AssetType,
    ticker: "",
    name: "",
    quantity: "",
    avgPrice: "",
    currency: "KRW",
  });

  async function load() {
    const [a, m, p] = await Promise.all([
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/prices").then((r) => r.json()),
    ]);
    setAssets(a);
    setMembers(m);
    setPrices(p);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.memberId || !form.ticker || !form.name) return;
    await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        memberId: parseInt(form.memberId),
        quantity: parseFloat(form.quantity) || 0,
        avgPrice: parseFloat(form.avgPrice) || 0,
      }),
    });
    setShowForm(false);
    setForm({ memberId: "", type: "STOCK_KR", ticker: "", name: "", quantity: "", avgPrice: "", currency: "KRW" });
    load();
  }

  async function remove(id: number) {
    if (!confirm("자산을 삭제하면 관련 거래 내역도 모두 삭제됩니다. 계속할까요?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = assets.filter((a) => {
    if (filterMember !== "all" && a.memberId !== parseInt(filterMember)) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  function calcProfit(a: Asset) {
    // API가 0을 반환하면 평균 매입가로 대체
    const cur = prices[a.ticker] > 0 ? prices[a.ticker] : a.avgPrice;
    const val = cur * a.quantity;
    const cost = a.avgPrice * a.quantity;
    const pnl = val - cost;
    const pct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { cur, val, cost, pnl, pct };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">자산 관리</h1>
          <p className="text-sm text-gray-500 mt-1">보유 종목을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> 자산 추가
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">전체 구성원</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">전체 유형</option>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">자산 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">구성원 *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                >
                  <option value="">선택하세요</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자산 유형 *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.type}
                  onChange={(e) => {
                    const t = e.target.value as AssetType;
                    setForm({ ...form, type: t, currency: t === "STOCK_US" || t === "ETF" || t === "CRYPTO" ? "USD" : "KRW" });
                  }}
                >
                  {ASSET_TYPES.map((t) => <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">티커/코드 *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.ticker}
                    onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                    placeholder="005930, AAPL, BTC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">통화</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종목명 *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="삼성전자, Apple Inc, 비트코인"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">보유 수량</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">평균 매입가</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.avgPrice}
                    onChange={(e) => setForm({ ...form, avgPrice: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">저장</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">종목</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">유형</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">구성원</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">수량</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">평균 매입가</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">현재가</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">평가액</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">수익률</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((a) => {
              const { cur, val, pnl, pct } = calcProfit(a);
              const isProfit = pnl >= 0;
              return (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.ticker}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {ASSET_TYPE_LABEL[a.type as AssetType]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.member.color }} />
                      <span className="text-gray-600">{a.member.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-700">{a.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right text-gray-700">
                    {a.avgPrice > 0 ? a.avgPrice.toLocaleString() : "-"} {a.currency}
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-700">
                    {cur > 0 ? cur.toLocaleString() : "-"} {a.currency}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-gray-900">
                    {val > 0 ? val.toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className={`flex items-center justify-end gap-1 ${isProfit ? "text-green-600" : "text-red-500"}`}>
                      {isProfit ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {pct.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={() => remove(a.id)} className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  자산이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}
