"use client";
import { useState } from "react";
export default function Login() {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
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
      <label>Password</label><input type="password" value={f.password} onChange={set("password")} required minLength={8} />
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
