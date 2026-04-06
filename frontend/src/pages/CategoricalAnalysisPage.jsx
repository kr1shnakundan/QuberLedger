import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategoricalAnalysis } from "../store/categoricalSlice.js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine, Cell,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BUCKET_STYLE = {
  needs:   { label: "Needs",   color: "#3b82f6", bg: "bg-blue-500/15",   border: "border-blue-500/30",   text: "text-blue-400",   icon: "🏠", target: 50 },
  wants:   { label: "Wants",   color: "#f59e0b", bg: "bg-amber-500/15",  border: "border-amber-500/30",  text: "text-amber-400",  icon: "🛍️", target: 30 },
  savings: { label: "Savings", color: "#10b981", bg: "bg-emerald-500/15",border: "border-emerald-500/30",text: "text-emerald-400",icon: "💰", target: 20 },
};

const SEVERITY_STYLE = {
  critical: { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    icon: "🚨", label: "Critical" },
  warning:  { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400",  icon: "⚠️", label: "Warning"  },
  info:     { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   icon: "ℹ️", label: "Info"     },
};

const TREND_STYLE = {
  spike:   { icon: "🔴", label: "Spike",   text: "text-red-400",    badge: "bg-red-500/15 text-red-400" },
  rising:  { icon: "🟠", label: "Rising",  text: "text-amber-400",  badge: "bg-amber-500/15 text-amber-400" },
  stable:  { icon: "🟢", label: "Stable",  text: "text-emerald-400",badge: "bg-emerald-500/15 text-emerald-400" },
  falling: { icon: "🔵", label: "Falling", text: "text-blue-400",   badge: "bg-blue-500/15 text-blue-400" },
};

const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const fmtK = (n) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${(n || 0).toFixed(0)}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-slate-100 tracking-tight">{children}</h2>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function RuleGauge({ bucket, actual, vsIncome }) {
  const s       = BUCKET_STYLE[bucket];
  const target  = s.target;
  const over    = actual > target;
  const under   = bucket === "savings" && actual < target;
  const barPct  = Math.min(actual, 100);
  const tgtLeft = Math.min(target, 100);

  return (
    <div className={`card border ${s.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{s.icon}</span>
          <div>
            <p className={`text-sm font-bold ${s.text}`}>{s.label}</p>
            <p className="text-xs text-slate-500">Target: {target}% of expenses</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${over && bucket !== "savings" ? "text-red-400" : under ? "text-amber-400" : s.text}`}>
            {actual}%
          </p>
          <p className="text-xs text-slate-500">vs income: {vsIncome}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${barPct}%`,
            background: over && bucket !== "savings"
              ? "linear-gradient(90deg,#f59e0b,#ef4444)"
              : under
              ? "#f59e0b"
              : s.color,
          }}
        />
        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/40"
          style={{ left: `${tgtLeft}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-slate-600">0%</span>
        <span className="text-xs text-slate-500">Target {target}%</span>
        <span className="text-xs text-slate-600">100%</span>
      </div>

      {/* Status tag */}
      <div className="mt-3">
        {bucket !== "savings" ? (
          over
            ? <span className="inline-flex items-center gap-1 text-xs bg-red-500/15 text-red-400 px-2 py-1 rounded-full font-medium">⬆ {(actual - target).toFixed(1)}% over target</span>
            : <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full font-medium">✓ Within target</span>
        ) : (
          under
            ? <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 px-2 py-1 rounded-full font-medium">⬇ {(target - actual).toFixed(1)}% below target</span>
            : <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full font-medium">✓ On track</span>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert }) {
  const s = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${s.bg} ${s.border}`}>
      <span className="text-lg shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
          {alert.category && (
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full capitalize">{alert.category}</span>
          )}
          {alert.period && (
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{alert.period}</span>
          )}
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{alert.message}</p>
      </div>
    </div>
  );
}

function CategoryTrendRow({ cat, rank }) {
  const bucket = BUCKET_STYLE[cat.bucket] || BUCKET_STYLE.wants;
  const trend  = TREND_STYLE[cat.trend]   || TREND_STYLE.stable;

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/25 transition-colors group">
      <td className="px-4 py-3 text-slate-600 text-xs font-mono w-8">{rank}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full`} style={{ background: bucket.color }} />
          <span className="text-sm font-medium text-slate-200 capitalize">{cat.category}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bucket.bg} ${bucket.text}`}>
          {bucket.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-200">{fmt(cat.latestAmount)}</td>
      <td className="px-4 py-3 text-xs text-slate-500">{fmt(cat.avgSpend)}/mo avg</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${
            cat.latestGrowth > 0 ? "text-red-400" : cat.latestGrowth < 0 ? "text-emerald-400" : "text-slate-500"
          }`}>
            {cat.latestGrowth > 0 ? "+" : ""}{cat.latestGrowth}%
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trend.badge}`}>
            {trend.icon} {trend.label}
          </span>
        </div>
      </td>
    </tr>
  );
}

// Custom tooltip for stacked bar
function BucketTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs shadow-xl min-w-[160px]">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
          <span className="text-slate-400 capitalize">{p.dataKey}</span>
          <span className="font-semibold" style={{ color: p.fill }}>{fmtK(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between">
        <span className="text-slate-500">Total</span>
        <span className="text-slate-200 font-bold">{fmtK(total)}</span>
      </div>
    </div>
  );
}

function WantsIncomeLine({ data }) {
  const chartData = data
    .filter((m) => m.income > 0)
    .map((m) => ({
      name:       `${MONTH_NAMES[m.month - 1]}`,
      wants:      m.wantsVsIncome,
      needs:      m.needsVsIncome,
      savings:    m.savingsVsIncome,
    }));

  if (!chartData.length) return <p className="text-slate-600 text-sm text-center py-8">No income data available for ratio chart.</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
          formatter={(v, name) => [`${v}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        <Legend formatter={(v) => <span className="text-xs text-slate-400 capitalize">{v}</span>} />
        {/* 50/30/20 reference lines */}
        <ReferenceLine y={50} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: "50%", fill: "#3b82f6", fontSize: 10, position: "right" }} />
        <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: "30%", fill: "#f59e0b", fontSize: 10, position: "right" }} />
        <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: "20%", fill: "#10b981", fontSize: 10, position: "right" }} />
        <Line type="monotone" dataKey="needs"   stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} />
        <Line type="monotone" dataKey="wants"   stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} />
        <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CategoricalAnalysisPage() {
  const dispatch = useDispatch();
  const { overallSummary, monthlyBreakdown, categoryTrends, alerts, loading, error } =
    useSelector((s) => s.categorical);

  const [months,       setMonths]       = useState(6);
  const [bucketFilter, setBucketFilter] = useState("all");
  const [alertsOpen,   setAlertsOpen]   = useState(true);

  useEffect(() => { dispatch(fetchCategoricalAnalysis(months)); }, [months]);

  // Stacked bar chart data
  const stackedData = monthlyBreakdown.map((m) => ({
    name:    `${MONTH_NAMES[m.month - 1]} ${String(m.year).slice(2)}`,
    needs:   +m.needs.toFixed(0),
    wants:   +m.wants.toFixed(0),
    savings: +m.savings.toFixed(0),
  }));

  const filteredTrends = bucketFilter === "all"
    ? categoryTrends
    : categoryTrends.filter((c) => c.bucket === bucketFilter);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount  = alerts.filter((a) => a.severity === "warning").length;

  if (loading && !overallSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Analysing spending patterns…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button onClick={() => dispatch(fetchCategoricalAnalysis(months))} className="btn-secondary mt-4 text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Categorical Analysis</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            50/30/20 rule · Needs vs Wants vs Savings · Spending trends & alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Period:</span>
          {[3, 6, 12].map((m) => (
            <button key={m}
              onClick={() => setMonths(m)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                months === m
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}>
              {m}M
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {alerts.length > 0 && (
        <div className="card border border-slate-700 p-0 overflow-hidden">
          <button
            onClick={() => setAlertsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🔔</span>
              <span className="font-semibold text-slate-100 text-sm">Smart Alerts</span>
              <div className="flex gap-1.5">
                {criticalCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {criticalCount} critical
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {warningCount} warning
                  </span>
                )}
              </div>
            </div>
            <span className="text-slate-500 text-sm">{alertsOpen ? "▲ Hide" : "▼ Show"}</span>
          </button>

          {alertsOpen && (
            <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4">
              {alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)}
            </div>
          )}
        </div>
      )}

      {/* ── 50/30/20 Gauges ── */}
      {overallSummary && (
        <div>
          <SectionTitle sub={`Based on ${months}-month aggregate · All percentages vs total expenses`}>
            50 / 30 / 20 Rule Breakdown
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RuleGauge bucket="needs"   actual={overallSummary.needsPct}   vsIncome={overallSummary.needsVsIncome}   />
            <RuleGauge bucket="wants"   actual={overallSummary.wantsPct}   vsIncome={overallSummary.wantsVsIncome}   />
            <RuleGauge bucket="savings" actual={overallSummary.savingsPct} vsIncome={overallSummary.savingsVsIncome} />
          </div>

          {/* Total quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Total Income",   val: fmt(overallSummary.totalIncome),   color: "text-emerald-400" },
              { label: "Total Expenses", val: fmt(overallSummary.totalExpense),  color: "text-red-400"     },
              { label: "Total Needs",    val: fmt(overallSummary.totalNeeds),    color: "text-blue-400"    },
              { label: "Total Wants",    val: fmt(overallSummary.totalWants),    color: "text-amber-400"   },
            ].map(({ label, val, color }) => (
              <div key={label} className="card py-3 px-4">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stacked Bar Chart ── */}
      {stackedData.length > 0 && (
        <div className="card">
          <SectionTitle sub="Monthly expense split into Needs · Wants · Savings buckets">
            Monthly Spending Buckets
          </SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stackedData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={fmtK} />
              <Tooltip content={<BucketTooltip />} cursor={{ fill: "#ffffff08" }} />
              <Legend formatter={(v) => <span className="text-xs text-slate-400 capitalize">{v}</span>} />
              <Bar dataKey="needs"   stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="wants"   stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="savings" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Wants/Needs/Savings vs Income line chart ── */}
      {monthlyBreakdown.length > 0 && (
        <div className="card">
          <SectionTitle sub="Each bucket as % of monthly income — dashed lines show 50/30/20 targets">
            Budget Rule Compliance Over Time
          </SectionTitle>
          <WantsIncomeLine data={monthlyBreakdown} />
        </div>
      )}

      {/* ── Category Trends Table ── */}
      {categoryTrends.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">Category Growth Tracker</h2>
              <p className="text-xs text-slate-500 mt-0.5">Month-over-month change in each spending category</p>
            </div>
            <div className="flex gap-1.5">
              {["all", "needs", "wants", "savings"].map((b) => (
                <button key={b}
                  onClick={() => setBucketFilter(b)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                    bucketFilter === b
                      ? b === "all"
                        ? "bg-slate-600 text-white"
                        : b === "needs"
                        ? "bg-blue-600 text-white"
                        : b === "wants"
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="w-8 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Bucket</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Average</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">MoM Change</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrends.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-600">No data for this filter.</td></tr>
                  ) : (
                    filteredTrends.map((cat, i) => (
                      <CategoryTrendRow key={cat.category} cat={cat} rank={i + 1} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-category sparkline mini section ── */}
      {categoryTrends.filter((c) => c.trend === "spike" || c.trend === "rising").length > 0 && (
        <div>
          <SectionTitle sub="Categories with significant upward spending movement this period">
            Growing Categories — Detailed View
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTrends
              .filter((c) => c.trend === "spike" || c.trend === "rising")
              .slice(0, 6)
              .map((cat) => {
                const bucket = BUCKET_STYLE[cat.bucket] || BUCKET_STYLE.wants;
                const trend  = TREND_STYLE[cat.trend];
                const sparkData = cat.monthlyAmounts.map((m, i) => ({
                  name:   MONTH_NAMES[i],
                  amount: m.amount,
                }));
                return (
                  <div key={cat.category} className={`card border ${bucket.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-100 capitalize">{cat.category}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bucket.bg} ${bucket.text}`}>
                          {bucket.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">+{cat.latestGrowth}%</p>
                        <p className="text-xs text-slate-500">{trend.icon} {trend.label}</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={sparkData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <YAxis hide domain={[0, "auto"]} />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: 11 }}
                          formatter={(v) => [fmtK(v), "Spent"]}
                        />
                        <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                          {sparkData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={i === sparkData.length - 1 ? "#ef4444" : bucket.color}
                              fillOpacity={i === sparkData.length - 1 ? 1 : 0.4}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>{fmt(cat.prevAmount)} last mo.</span>
                      <span className="text-red-400 font-medium">{fmt(cat.latestAmount)} this mo.</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && monthlyBreakdown.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-slate-300 font-semibold mb-1">No expense data found</p>
          <p className="text-slate-500 text-sm">Add some expense records to see the 50/30/20 breakdown.</p>
        </div>
      )}
    </div>
  );
}
