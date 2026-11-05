"use client";
import { useState } from "react";
export default function Login() {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function go(e) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const x = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, mode }) });
      const text = await x.text();
      let result = {};
      try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }
      if (!x.ok) {
        setErr(result.error || `The server could not complete the request (${x.status}). Please try again.`);
        return;
      }
      if (!result.ok) {
        setErr(result.error || "The server returned an unexpected response. Please try again.");
        return;
      }
      window.location.replace("/dashboard");
    } catch {
      setErr("Could not connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card login" onSubmit={go}>
      <div className="brand login-brand"><img src="/logo.png" alt="Emmanuel Tours & Transfers, Victoria Falls" /><h2>{mode === "login" ? "Log in" : "Create account"}</h2></div>
      {mode === "signup" && <><label>Name</label><input value={f.name} onChange={set("name")} required /></>}
      <label>Email</label><input type="email" value={f.email} onChange={set("email")} required />
      <label>Password</label>
      <div className="password-field">
        <input type={showPassword ? "text" : "password"} value={f.password} onChange={set("password")} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <button type="button" className="eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
          {showPassword ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>
      {mode === "signup" && <><label>Invite code (not needed for the very first account)</label><input value={f.code} onChange={set("code")} /></>}
      {err && <div className="err">{err}</div>}
      <div className="bar" style={{ marginTop: 14 }}>
        <button disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}</button>
        <button type="button" className="g" disabled={busy} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>
          {mode === "login" ? "Create an account" : "I have an account"}
        </button>
      </div>
    </form>
  );
}
