"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Login() {
  const r = useRouter();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", code: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function go(e) {
    e.preventDefault(); setErr("");
    const x = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, mode }) });
    if (x.ok) r.push("/dashboard"); else setErr((await x.json()).error || "Something went wrong.");
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
        <button>{mode === "login" ? "Log in" : "Create account"}</button>
        <button type="button" className="g" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>
          {mode === "login" ? "Create an account" : "I have an account"}
        </button>
      </div>
    </form>
  );
}
