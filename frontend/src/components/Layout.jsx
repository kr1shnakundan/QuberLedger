import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice.js";
import { useTheme } from "../hooks/useTheme.js";
import logo from "../assets/logo-alt.png";


function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `nav-item ${isActive ? "active" : ""}`
      }
    >
      <span className="w-4 text-center">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function UserAvatar({ user, size = "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const src = user?.profileImage?.url;
  if (src) {
    return (
      <img src={src} alt={user?.name}
        className={`${sz} rounded-full object-cover ring-1 ${
          user?.isSuperAdmin ? "ring-amber-500/50" : "ring-teal/30"
        }`} />
    );
  }
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold
      ${user?.isSuperAdmin
        ? "bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-400"
        : "bg-teal/10 ring-1 ring-teal/20 text-teal"}`}>
      {user?.isSuperAdmin ? "👑" : user?.name?.[0]?.toUpperCase()}
    </div>
  );
}

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} className="theme-toggle" title="Toggle theme">
      <div className="theme-toggle-knob">
        {isDark ? "🌙" : "☀️"}
      </div>
    </button>
  );
}

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { isDark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { dispatch(logout()); navigate("/login"); };
  const isAnalystOrAdmin = ["analyst", "admin"].includes(user?.role);

  const roleBadge = {
    admin:   "badge-admin",
    analyst: "badge-analyst",
    viewer:  "badge-viewer",
  }[user?.role] || "badge-viewer";

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-60
        border-r transition-all duration-300 lg:translate-x-0
        ${isDark ? "bg-[#0e0e14] border-[#1e1e28]" : "bg-[#f0ede6] border-[#ddd9cf]"}
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className={`px-5 py-4 border-b ${isDark ? "border-[#1e1e28]" : "border-[#ddd9cf]"}`}>
          <div className="flex items-center gap-3">
            <img src={logo} alt="QuberLedger" className="w-10 h-10 object-contain" />
            <div>
              <p className="font-pixel text-[8px] text-[#c8614a] leading-none">QuberLedger</p>
              <p className="font-pixel text-[6px] text-slate-500 mt-1"> v1.0</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className={`px-3 mb-2 font-pixel text-[7px] tracking-widest
            ${isDark ? "text-slate-700" : "text-slate-400"}`}>MAIN</p>
          <NavItem to="/"        icon="◈" label="Dashboard"  end />
          <NavItem to="/records" icon="⊟" label="Records"        />

          {isAnalystOrAdmin && (
            <>
              <p className={`px-3 mt-4 mb-2 font-pixel text-[7px] tracking-widest
                ${isDark ? "text-slate-700" : "text-slate-400"}`}>ANALYTICS</p>
              <NavItem to="/categorical" icon="◉" label="Categorical Analysis" />
            </>
          )}

          {user?.role === "admin" && (
            <>
              <p className={`px-3 mt-2 mb-2 font-pixel text-[7px] tracking-widest
                ${isDark ? "text-slate-700" : "text-slate-400"}`}>ADMIN</p>
              <NavItem to="/users" icon="⊞" label="Users" />
            </>
          )}

          <p className={`px-3 mt-4 mb-2 font-pixel text-[7px] tracking-widest
            ${isDark ? "text-slate-700" : "text-slate-400"}`}>ACCOUNT</p>
          <NavItem to="/profile" icon="◎" label="Profile" />
        </nav>

        {/* Theme toggle + user strip */}
        <div className={`px-4 py-3 border-t ${isDark ? "border-[#1e1e28]" : "border-[#ddd9cf]"}`}>
          {/* Theme row */}
          <div className="flex items-center justify-between mb-3">
            <span className={`font-pixel text-[7px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              {isDark ? "DARK MODE" : "LIGHT MODE"}
            </span>
            <ThemeToggle isDark={isDark} onToggle={toggle} />
          </div>

          {/* User */}
          <div className="flex items-center gap-2.5">
            <NavLink to="/profile">
              <UserAvatar user={user} />
            </NavLink>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate
                ${isDark ? "text-slate-200" : "text-slate-800"}`}>{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={roleBadge}>{user?.role}</span>
                {user?.isSuperAdmin && <span className="text-[10px]">👑</span>}
              </div>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className={`text-lg transition-colors p-1 rounded
                ${isDark ? "text-slate-600 hover:text-crimson" : "text-slate-400 hover:text-crimson"}`}>
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className={`lg:hidden flex items-center justify-between px-4 py-3 border-b
          ${isDark ? "bg-[#0e0e14] border-[#1e1e28]" : "bg-[#f0ede6] border-[#ddd9cf]"}`}>
          <button onClick={() => setSidebarOpen(true)}
            className={`text-xl ${isDark ? "text-slate-400" : "text-slate-600"}`}>☰</button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Q" className="w-6 h-6 object-contain" />
            <span className="font-pixel text-[10px] text-[#c8614a]">QuberLedger</span>
          </div>

          <NavLink to="/profile"><UserAvatar user={user} size="sm" /></NavLink>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
