"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

const COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
];

interface Member {
  id: number;
  name: string;
  role: string | null;
  color: string;
  assets: { id: number }[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ name: "", role: "", color: COLORS[0] });

  async function load() {
    const res = await fetch("/api/members");
    setMembers(await res.json());
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", role: "", color: COLORS[0] });
    setShowForm(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({ name: m.name, role: m.role ?? "", color: m.color });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing) {
      await fetch(`/api/members/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("구성원을 삭제하면 관련 자산과 거래 내역도 모두 삭제됩니다. 계속할까요?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">가족 구성원</h1>
          <p className="text-sm text-gray-500 mt-1">구성원별로 자산을 분리 관리합니다</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> 구성원 추가
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "구성원 수정" : "구성원 추가"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="아버지, 어머니, 자녀1 ..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">대표 색상</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        form.color === c ? "border-gray-900 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: m.color }}
                >
                  {m.name[0]}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  {m.role && <p className="text-xs text-gray-400">{m.role}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(m)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(m.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-sm text-gray-500">
                보유 종목 <span className="font-semibold text-gray-800">{m.assets.length}개</span>
              </p>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 p-12 shadow-sm text-center">
            <p className="text-gray-400 text-sm">아직 등록된 구성원이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
