import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, clearError } from "../store/authSlice.js";
import { useTheme } from "../hooks/useTheme.js";
import logo from "../assets/logo-alt.png";


const DEMO = {
  admin:   { email: "admin@finance.com",   password: "admin123"   },
  analyst: { email: "analyst@finance.com", password: "analyst123" },
  viewer:  { email: "viewer@finance.com",  password: "viewer123"  },
};

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const { isDark, toggle } = useTheme();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => () => dispatch(clearError()), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) navigate("/");
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-10
      transition-colors duration-300 ${isDark ? "bg-[#0b0b0f]" : "bg-[#f4f1eb]"}`}>

      {/* Theme toggle top-right */}
      <button onClick={toggle}
        className={`fixed top-4 right-4 w-9 h-9 rounded-lg border flex items-center justify-center
          text-base transition-all ${isDark
            ? "bg-[#16161e] border-[#2a2a38] text-slate-400 hover:text-slate-200"
            : "bg-white border-[#ddd9cf] text-slate-500 hover:text-slate-800"}`}>
        {isDark ? "🌙" : "☀️"}
      </button>

      <div className="w-full max-w-sm">

        {/* ── Pixel heading ── */}
        <div className="text-center mb-8">
          <div className="mb-4 flex flex-col items-center">
            <img src={logo} alt="QuberLedger" className="w-40 h-40 object-contain mb-1" />
            <div className="pixel-heading text-xl sm:text-2xl inline-block leading-relaxed">
              QuberLedger
            </div>
          </div>

          <p className={`font-mono text-xs tracking-widest uppercase
            ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            ▸ Secure Access Terminal
          </p>
        </div>

        {/* ── Login card ── */}
        <div className={`rounded-xl border p-6 ${isDark
          ? "bg-[#16161e] border-[#22222e]"
          : "bg-white border-[#ddd9cf] shadow-sm"}`}>

          {/* Terminal prompt header */}
          <div className={`flex items-center gap-2 mb-5 pb-4 border-b font-mono text-xs
            ${isDark ? "border-[#22222e] text-slate-600" : "border-[#e8e4db] text-slate-400"}`}>
            <span className="led-green" />
            <span>user@quberledger:~$ login</span>
            <span className="animate-blink ml-1">_</span>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg border font-mono text-xs
              bg-crimson/8 border-crimson/25 text-crimson">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block font-mono text-[10px] uppercase tracking-widest mb-1.5
                ${isDark ? "text-slate-500" : "text-slate-400"}`}>Email Address</label>
              <input type="email" value={form.email} autoComplete="email"
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="input" placeholder="you@company.com" required />
            </div>

            <div>
              <label className={`block font-mono text-[10px] uppercase tracking-widest mb-1.5
                ${isDark ? "text-slate-500" : "text-slate-400"}`}>Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="input pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm
                    ${isDark ? "text-slate-600 hover:text-slate-300" : "text-slate-400 hover:text-slate-700"}`}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-[#0b0b0f] border-t-transparent rounded-full animate-spin" /> Authenticating…</>
                : "▶ Sign In"
              }
            </button>
          </form>
        </div>

        {/* ── Demo accounts ── */}
        <div className={`mt-4 rounded-xl border p-4 ${isDark
          ? "bg-[#16161e] border-[#22222e]"
          : "bg-white border-[#ddd9cf]"}`}>
          <p className={`font-pixel text-[7px] tracking-widest mb-3
            ${isDark ? "text-slate-600" : "text-slate-400"}`}>DEMO ACCOUNTS</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(DEMO).map(([role, creds]) => (
              <button key={role} onClick={() => setForm(creds)}
                className={`text-[10px] py-2 px-2 rounded-lg font-mono font-medium
                  transition-all border uppercase tracking-wide
                  ${role === "admin"
                    ? "bg-brick/10 border-brick/25 text-brick hover:bg-brick/20"
                    : role === "analyst"
                    ? "bg-teal/8 border-teal/20 text-teal hover:bg-teal/15"
                    : isDark
                    ? "bg-[#1e1e28] border-[#2a2a38] text-slate-400 hover:bg-[#26263a]"
                    : "bg-[#ede9e0] border-[#c8c4bc] text-slate-500 hover:bg-[#e0dcd3]"
                  }`}>
                {role}
              </button>
            ))}
          </div>
          <p className={`font-mono text-[9px] mt-2 ${isDark ? "text-slate-700" : "text-slate-400"}`}>
            Click to auto-fill
          </p>
        </div>

        <p className={`text-center font-mono text-xs mt-5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
          No account?{" "}
          <Link to="/register" className="text-teal hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}
