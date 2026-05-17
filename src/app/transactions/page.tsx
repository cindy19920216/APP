"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface Member { id: number; name: string; color: string; }
interface Asset { id: number; name: string; ticker: string; memberId: number; }
interface Transaction {
  id: number;
  type: string;
  quantity: number;
  price: number;
  fee: number;
  date: string;
  memo: string | null;
  member: Member;
  asset: Asset;
}

const TYPE_LABEL: Record<string, string> = { BUY: "매수", SELL: "매도", DIVIDEND: "배당" };
const TYPE_COLOR: Record<string, string> = {
  BUY: "bg-blue-100 text-blue-700",
  SELL: "bg-red-100 text-red-700",
  DIVIDEND: "bg-green-100 text-green-700",
};

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    assetId: "",
    type: "BUY",
    quantity: "",
    price: "",
    fee: "",
    date: new Date().toISOString().slice(0, 10),
    memo: "",
  });

  async function load() {
    const [t, m, a] = await Promise.all([
      fetch("/api/transactions").then((r) => r.json()),
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/assets").then((r) => r.json()),
    ]);
    setTxs(t);
    setMembers(m);
    setAssets(a);
  }

  useEffect(() => { load(); }, []);

  const memberAssets = assets.filter(
    (a) => !form.memberId || a.memberId === parseInt(form.memberId)
  );

  async function save() {
    if (!form.memberId || !form.assetId || !form.quantity || !form.price) return;
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        memberId: parseInt(form.memberId),
        assetId: parseInt(form.assetId),
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.price),
        fee: parseFloat(form.fee) || 0,
      }),
    });
    setShowForm(false);
    setForm({ memberId: "", assetId: "", type: "BUY", quantity: "", price: "", fee: "", date: new Date().toISOString().slice(0, 10), memo: "" });
    load();
  }

  async function remove(id: number) {
    if (!confirm("거래 내역을 삭제할까요?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">거래 내역</h1>
          <p className="text-sm text-gray-500 mt-1">매수, 매도, 배당 내역을 기록합니다</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> 거래 추가
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">거래 추가</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">구성원 *</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.memberId}
                    onChange={(e) => setForm({ ...form, memberId: e.target.value, assetId: "" })}
                  >
                    <option value="">선택</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종목 *</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.assetId}
                    onChange={(e) => setForm({ ...form, assetId: e.target.value })}
                  >
                    <option value="">선택</option>
                    {memberAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">거래 유형</label>
                <div className="flex gap-2">
                  {["BUY", "SELL", "DIVIDEND"].map((t) => (
                    <button
                      key={t}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.type === t
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                      onClick={() => setForm({ ...form, type: t })}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수량 *</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">단가 *</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수수료</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="선택 사항" />
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
              <th className="text-left px-5 py-3 font-medium text-gray-500">날짜</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">구성원</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">종목</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">유형</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">수량</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">단가</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">금액</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">메모</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {txs.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 text-gray-600">{new Date(t.date).toLocaleDateString("ko-KR")}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.member.color }} />
                    {t.member.name}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-medium text-gray-900">{t.asset.name}</p>
                  <p className="text-xs text-gray-400">{t.asset.ticker}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[t.type]}`}>
                    {TYPE_LABEL[t.type]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-gray-700">{t.quantity.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right text-gray-700">{t.price.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right font-medium text-gray-900">
                  {(t.quantity * t.price).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">{t.memo ?? "-"}</td>
                <td className="px-4 py-3.5 text-right">
                  <button onClick={() => remove(t.id)} className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">거래 내역이 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
