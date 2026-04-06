import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, clearError } from "../store/authSlice.js";
import { useTheme } from "../hooks/useTheme.js";
import logo from "../assets/logo-alt.png";
import api from "../api/axios.js";


const STEPS = [{ id: 1, label: "EMAIL" }, { id: 2, label: "VERIFY" }, { id: 3, label: "SETUP" }];

function StepBar({ current }) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center justify-center gap-0 mb-7">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-8 h-8 rounded flex items-center justify-center font-pixel text-[8px] transition-all
              ${current > step.id  ? "bg-teal text-[#0b0b0f]"
              : current === step.id ? "bg-brick text-white ring-4 ring-brick/20"
              : isDark ? "bg-[#1e1e28] text-slate-600" : "bg-[#ede9e0] text-slate-400"}`}>
              {current > step.id ? "✓" : step.id}
            </div>
            <span className={`font-pixel text-[6px] tracking-wide
              ${current === step.id ? "text-brick" : isDark ? "text-slate-700" : "text-slate-400"}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-12 mb-4 transition-all ${current > step.id ? "bg-teal" : isDark ? "bg-[#22222e]" : "bg-[#ddd9cf]"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function OTPInput({ value, onChange, disabled }) {
  const { isDark } = useTheme();
  const refs = useRef([]);
  const handleKey = (e, i) => {
    if (e.key === "Backspace") {
      const next = [...value]; if (next[i]) { next[i] = ""; onChange(next.join("")); } else if (i > 0) refs.current[i-1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft"  && i > 0) refs.current[i-1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i+1]?.focus();
  };
  const handleChange = (e, i) => {
    const c = e.target.value.replace(/\D/g,"").slice(-1); if (!c) return;
    const n = value.split(""); n[i] = c; const j = n.join("").slice(0,6); onChange(j);
    if (i < 5) refs.current[i+1]?.focus();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); onChange(p);
    refs.current[Math.min(p.length, 5)]?.focus();
  };
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} type="text" inputMode="numeric"
          maxLength={1} value={value[i] || ""} disabled={disabled}
          onChange={(e) => handleChange(e, i)} onKeyDown={(e) => handleKey(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`w-10 h-12 text-center font-pixel text-sm rounded-lg border transition-all
            focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal/60
            disabled:opacity-40
            ${value[i]
              ? isDark ? "bg-teal/10 border-teal/40 text-teal" : "bg-teal/10 border-teal/40 text-teal"
              : isDark ? "bg-[#111117] border-[#2a2a38] text-slate-200" : "bg-[#f4f1eb] border-[#c8c4bc] text-slate-700"
            }`} />
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading: authLoading, error: authError } = useSelector((s) => s.auth);
  const { isDark, toggle } = useTheme();

  const [step,    setStep]    = useState(1);
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [form,    setForm]    = useState({ name: "", password: "", confirm: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [resendCD,setResendCD]= useState(0);

  useEffect(() => { if (resendCD <= 0) return; const t = setTimeout(() => setResendCD((c) => c-1), 1000); return () => clearTimeout(t); }, [resendCD]);
  useEffect(() => () => dispatch(clearError()), []);

  const handleSendOTP = async (e) => {
    e?.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await api.post("/auth/send-otp", { email });
      setStep(2); setResendCD(120); setSuccess(`Code sent to ${email}`);
    } catch (err) {
      const retry = err.response?.data?.retryAfter;
      setError(err.response?.data?.message || "Failed to send code.");
      if (retry) setResendCD(retry);
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return setError("Enter the full 6-digit code.");
    setError(""); setLoading(true);
    try { await api.post("/auth/verify-otp", { email, otp }); setStep(3); setSuccess("Email verified!"); }
    catch (err) { setError(err.response?.data?.message || "Verification failed."); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    const result = await dispatch(registerUser({ name: form.name, email, password: form.password }));
    if (registerUser.fulfilled.match(result)) navigate("/");
  };

  const displayError = error || authError;
  const surface = isDark ? "bg-[#16161e] border-[#22222e]" : "bg-white border-[#ddd9cf]";
  const labelCls = `block font-mono text-[10px] uppercase tracking-widest mb-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-10 transition-colors duration-300 ${isDark ? "bg-[#0b0b0f]" : "bg-[#f4f1eb]"}`}>
      <button onClick={toggle} className={`fixed top-4 right-4 w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${isDark ? "bg-[#16161e] border-[#2a2a38] text-slate-400" : "bg-white border-[#ddd9cf] text-slate-500"}`}>
        {isDark ? "🌙" : "☀️"}
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-7 flex flex-col items-center">
          <img src={logo} alt="QuberLedger" className="w-40 h-40 object-contain mb-1" />
          <p className="pixel-heading text-lg mb-2">REGISTER</p>
          <p className={`font-mono text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>▸ Create your account</p>
        </div>


        <StepBar current={step} />

        <div className={`rounded-xl border p-5 ${surface}`}>
          {success && (
            <div className="mb-4 px-3 py-2 rounded-lg border font-mono text-xs bg-teal/8 border-teal/20 text-teal flex items-center gap-2">
              <span className="led-green shrink-0" /> {success}
            </div>
          )}
          {displayError && (
            <div className="mb-4 px-3 py-2 rounded-lg border font-mono text-xs bg-crimson/8 border-crimson/25 text-crimson">
              ⚠ {displayError}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" placeholder="you@company.com" required autoFocus />
                <p className={`font-mono text-[9px] mt-1.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                  Disposable emails are not accepted
                </p>
              </div>
              <button type="submit" disabled={loading || !email} className="btn-primary w-full">
                {loading ? <><span className="w-3 h-3 border-2 border-[#0b0b0f] border-t-transparent rounded-full animate-spin" /> Sending…</> : "▶ Send Verification Code"}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className={`font-mono text-xs mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Code sent to</p>
                <p className="font-mono text-xs text-teal font-semibold mb-4">{email}</p>
                <OTPInput value={otp} onChange={setOtp} disabled={loading} />
              </div>
              <button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6} className="btn-primary w-full">
                {loading ? <><span className="w-3 h-3 border-2 border-[#0b0b0f] border-t-transparent rounded-full animate-spin" /> Verifying…</> : "▶ Verify Code"}
              </button>
              <div className="text-center space-y-2">
                {resendCD > 0
                  ? <p className={`font-mono text-[10px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>Resend in <span className="font-pixel text-[8px] text-brick">{resendCD}s</span></p>
                  : <button onClick={handleSendOTP} disabled={loading} className="font-mono text-xs text-teal hover:underline">Resend code</button>
                }
                <br />
                <button onClick={() => { setStep(1); setOtp(""); setError(""); setSuccess(""); }}
                  className={`font-mono text-[10px] ${isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-600"}`}>
                  ← Change email
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-teal/8 border-teal/20 mb-2">
                <span className="led-green shrink-0" />
                <span className="font-mono text-[10px] text-teal">{email} — verified</span>
              </div>
              <div>
                <label className={labelCls}>Full Name</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input" placeholder="John Doe" required minLength={2} autoFocus />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="input" placeholder="Min. 6 characters" required />
              </div>
              <div>
                <label className={labelCls}>Confirm Password</label>
                <input type="password" value={form.confirm} onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                  className="input" placeholder="Re-enter password" required />
              </div>
              <div className={`px-3 py-2 rounded-lg border font-mono text-[10px] ${isDark ? "bg-[#111117] border-[#22222e] text-slate-500" : "bg-[#f4f1eb] border-[#ddd9cf] text-slate-400"}`}>
                You'll start as a <span className={isDark ? "text-slate-300" : "text-slate-600"}>Viewer</span>. An admin can upgrade your role.
              </div>
              <button type="submit" disabled={authLoading} className="btn-primary w-full">
                {authLoading ? <><span className="w-3 h-3 border-2 border-[#0b0b0f] border-t-transparent rounded-full animate-spin" /> Creating…</> : "▶ Create Account"}
              </button>
            </form>
          )}
        </div>

        <p className={`text-center font-mono text-xs mt-5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
          Already registered? <Link to="/login" className="text-teal hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
