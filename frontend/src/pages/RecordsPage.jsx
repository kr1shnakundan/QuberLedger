import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchRecords, createRecord, updateRecord, deleteRecord } from "../store/recordsSlice.js";
import { useTheme } from "../hooks/useTheme.js";

const CATEGORIES = [
  "salary","freelance","investment","business",
  "food","transport","housing","utilities",
  "healthcare","entertainment","shopping","education","travel","insurance","savings","other",
];
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const EMPTY_FORM = { amount: "", type: "income", category: "salary", date: "", description: "" };
const today = new Date().toISOString().slice(0, 10);

function Modal({ record, onClose, onSave, loading }) {
  const { isDark } = useTheme();
  const [form, setForm] = useState(
    record
      ? { ...record, date: record.date?.slice(0, 10), amount: String(record.amount) }
      : { ...EMPTY_FORM, date: today }
  );
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return setError("Amount must be a positive number.");
    const result = await onSave({ ...form, amount: +form.amount });
    if (result?.error) setError(result.payload || "Something went wrong.");
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-xl border ${isDark ? "bg-[#16161e] border-[#22222e]" : "bg-white border-[#ddd9cf]"}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-[#1e1e28]" : "border-[#e8e4db]"}`}>
          <p className="font-pixel text-[9px] text-[#c8614a]">{record ? "EDIT_RECORD" : "NEW_RECORD"}</p>
          <button onClick={onClose} className={`text-xl ${isDark ? "text-slate-600 hover:text-slate-200" : "text-slate-400 hover:text-slate-700"}`}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg border text-xs font-mono bg-crimson/8 border-crimson/25 text-crimson">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block font-mono text-[10px] uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="input">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className={`block font-mono text-[10px] uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Amount (₹)</label>
              <input type="number" name="amount" value={form.amount} onChange={handleChange}
                className="input" placeholder="0.00" step="0.01" min="0.01" required />
            </div>
          </div>
          <div>
            <label className={`block font-mono text-[10px] uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Category</label>
            <select name="category" value={form.category} onChange={handleChange} className="input">
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={`block font-mono text-[10px] uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} max={today} className="input" required />
          </div>
          <div>
            <label className={`block font-mono text-[10px] uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className="input resize-none" rows={2} placeholder="Optional note…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Saving…" : record ? "▶ Update" : "▶ Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RecordsPage() {
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((s) => s.records);
  const { user } = useSelector((s) => s.auth);
  const { isDark } = useTheme();
  const isAdmin = user?.role === "admin";

  const [filters, setFilters] = useState({ type: "", category: "", search: "", page: 1, limit: 10 });
  const [modal,   setModal]   = useState(null);
  const [deleteId,setDeleteId]= useState(null);

  const load = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    dispatch(fetchRecords(params));
  }, [filters]);
  useEffect(() => { load(); }, [filters]);

  const handleFilter = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value, page: 1 }));
  const handleSave = async (fd) => {
    const result = modal?._id ? await dispatch(updateRecord({ id: modal._id, ...fd })) : await dispatch(createRecord(fd));
    if (!result?.error) { setModal(null); load(); }
    return result;
  };
  const handleDelete = async () => { await dispatch(deleteRecord(deleteId)); setDeleteId(null); load(); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="pixel-heading text-base sm:text-lg">RECORDS</h1>
          <p className={`font-mono text-[10px] mt-1.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            {pagination.total} entries found
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal("create")} className="btn-primary">
            + New Record
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input name="search" value={filters.search} onChange={handleFilter}
            className="input" placeholder="Search description…" />
          <select name="type" value={filters.type} onChange={handleFilter} className="input">
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select name="category" value={filters.category} onChange={handleFilter} className="input">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? "border-[#22222e]" : "border-[#ddd9cf]"}`}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Category</th>
                <th>Amount</th><th>Description</th><th>By</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className={`text-center py-12 font-pixel text-[8px] ${isDark ? "text-slate-700" : "text-slate-400"}`}>LOADING...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className={`text-center py-12 font-mono text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>No records found.</td></tr>
              ) : items.map((r) => (
                <tr key={r._id}>
                  <td className={`font-mono text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                  </td>
                  <td><span className={r.type === "income" ? "badge-income" : "badge-expense"}>{r.type}</span></td>
                  <td className={`text-xs capitalize ${isDark ? "text-slate-300" : "text-slate-700"}`}>{r.category}</td>
                  <td className={`font-pixel text-[9px] ${r.type === "income" ? "text-teal" : "text-crimson"}`}>
                    {r.type === "income" ? "+" : "-"}{fmt(r.amount)}
                  </td>
                  <td className={`font-mono text-[11px] max-w-[160px] truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.description || "—"}</td>
                  <td className={`font-mono text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{r.createdBy?.name || "—"}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setModal(r)}
                          className={`text-[10px] px-2 py-1 rounded font-mono transition-colors
                            ${isDark ? "bg-[#1e1e28] hover:bg-[#26263a] text-slate-400" : "bg-[#ede9e0] hover:bg-[#e0dcd3] text-slate-500"}`}>
                          edit
                        </button>
                        <button onClick={() => setDeleteId(r._id)}
                          className="text-[10px] px-2 py-1 rounded font-mono bg-crimson/10 hover:bg-crimson/20 text-crimson transition-colors">
                          del
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t
            ${isDark ? "border-[#1e1e28]" : "border-[#e8e4db]"}`}>
            <span className={`font-mono text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              Page {pagination.page}/{pagination.pages} · {pagination.total} records
            </span>
            <div className="flex gap-1">
              <button disabled={pagination.page <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                className="btn-secondary text-[10px] py-1.5 px-3 disabled:opacity-30">← Prev</button>
              <button disabled={pagination.page >= pagination.pages}
                onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                className="btn-secondary text-[10px] py-1.5 px-3 disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </div>

      {modal && <Modal record={modal === "create" ? null : modal} onClose={() => setModal(null)} onSave={handleSave} loading={loading} />}

      {deleteId && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-xl border p-6 text-center ${isDark ? "bg-[#16161e] border-[#22222e]" : "bg-white border-[#ddd9cf]"}`}>
            <p className="font-pixel text-[9px] text-crimson mb-3">DELETE?</p>
            <p className={`font-mono text-xs mb-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              This record will be soft-deleted and hidden from all views.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1">▶ Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
