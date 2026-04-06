import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboard } from "../store/dashboardSlice.js";
import { useTheme } from "../hooks/useTheme.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIE_COLORS  = ["#00e5a0","#c8614a","#f5a623","#e05252","#6ee7b7","#fcd34d","#60a5fa","#f472b6"];

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function StatCard({ label, value, sub, positive, neutral }) {
  const { isDark } = useTheme();
  const color = neutral ? (isDark ? "text-slate-200" : "text-slate-700")
    : positive ? "text-teal"
    : "text-crimson";
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <p className={`font-pixel text-[7px] tracking-widest ${isDark ? "text-slate-600" : "text-slate-400"}`}>{label}</p>
        <div className={positive ? "led-green" : neutral ? (isDark ? "led-grey" : "led-grey") : "led-red"} />
      </div>
      <p className={`font-pixel text-sm leading-relaxed ${color}`}>{value}</p>
      {sub && <p className={`font-mono text-[10px] mt-1.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

function RecentRow({ record }) {
  const { isDark } = useTheme();
  const date = new Date(record.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const isIncome = record.type === "income";
  return (
    <div className={`flex items-center gap-3 py-3 border-b last:border-0 transition-colors
      ${isDark ? "border-[#1e1e28]" : "border-[#e8e4db]"}`}>
      <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold
        ${isIncome ? "bg-teal/10 text-teal" : "bg-crimson/10 text-crimson"}`}>
        {isIncome ? "↑" : "↓"}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold capitalize truncate
          ${isDark ? "text-slate-300" : "text-slate-700"}`}>{record.category}</p>
        <p className={`text-[10px] font-mono truncate ${isDark ? "text-slate-600" : "text-slate-400"}`}>
          {record.description || "—"}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-pixel ${isIncome ? "text-teal" : "text-crimson"}`} style={{ fontSize: "9px" }}>
          {isIncome ? "+" : "-"}{fmt(record.amount)}
        </p>
        <p className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>{date}</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-lg border text-xs font-mono shadow-xl
      ${isDark ? "bg-[#1a1a24] border-[#2a2a38] text-slate-200" : "bg-white border-[#ddd9cf] text-slate-800"}`}>
      <p className={`mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex gap-3 justify-between">
          <span className="capitalize" style={{ color: p.color }}>{p.dataKey}</span>
          <span className="font-semibold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { summary, categoryBreakdown, trends, recentTransactions, loading } = useSelector((s) => s.dashboard);
  const { user } = useSelector((s) => s.auth);
  const { isDark } = useTheme();

  useEffect(() => { dispatch(fetchDashboard()); }, []);

  const chartData = trends.map((t) => ({
    name:    MONTH_NAMES[t.month - 1],
    income:  +(t.income  || 0).toFixed(0),
    expense: +(t.expense || 0).toFixed(0),
  }));

  const pieData = Object.values(
    categoryBreakdown.reduce((acc, { category, total }) => {
      if (!acc[category]) acc[category] = { name: category, value: 0 };
      acc[category].value += total;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value).slice(0, 8);

  const isAnalystOrAdmin = ["analyst", "admin"].includes(user?.role);
  const axisColor = isDark ? "#3a3a4e" : "#c8c4bc";
  const gridColor = isDark ? "#1e1e28" : "#e8e4db";

  if (loading && !summary.totalIncome) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className={`w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-3`} />
          <p className={`font-pixel text-[8px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="pixel-heading text-lg sm:text-xl">DASHBOARD</h1>
        <p className={`font-mono text-xs mt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
          ▸ Welcome, {user?.name} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="TOTAL INCOME"   value={fmt(summary.totalIncome)}   positive sub="Cumulative" />
        <StatCard label="TOTAL EXPENSES" value={fmt(summary.totalExpenses)} sub="Cumulative" />
        <StatCard label="NET BALANCE"
          value={fmt(summary.netBalance)}
          positive={summary.netBalance >= 0}
          neutral={false}
          sub={summary.netBalance >= 0 ? "Surplus" : "Deficit"} />
      </div>

      {isAnalystOrAdmin && chartData.length > 0 && (
        <div className="card">
          <p className="section-label">MONTHLY TREND</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e05252" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#e05252" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10, fontFamily: "IBM Plex Mono" }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 10, fontFamily: "IBM Plex Mono" }}
                axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Area type="monotone" dataKey="income"  stroke="#00e5a0" fill="url(#gI)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expense" stroke="#e05252" fill="url(#gE)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className={`grid gap-4 ${isAnalystOrAdmin && pieData.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Category pie */}
        {isAnalystOrAdmin && pieData.length > 0 && (
          <div className="card">
            <p className="section-label">BY CATEGORY</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: isDark ? "#1a1a24" : "#fff", border: `1px solid ${isDark ? "#2a2a38" : "#ddd9cf"}`, borderRadius: "8px", fontFamily: "IBM Plex Mono", fontSize: 11 }}
                  formatter={(v, n) => [fmt(v), n]}
                />
                <Legend formatter={(v) => <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: isDark ? "#64748b" : "#9e9a94", textTransform: "capitalize" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent transactions */}
        <div className="card">
          <p className="section-label">RECENT TRANSACTIONS</p>
          {recentTransactions.length === 0
            ? <p className={`font-mono text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>No transactions yet.</p>
            : recentTransactions.map((r) => <RecentRow key={r._id} record={r} />)
          }
        </div>
      </div>
    </div>
  );
}
