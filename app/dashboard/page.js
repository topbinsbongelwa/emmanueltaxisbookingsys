"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
const hd = (n = 0) => { const d = new Date(Date.now() + 7200e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const blank = { time: "08:00", type: "transfer", pickup: "", dest: "", pax: 1, guest: "", phone: "", driver: "", vehicle: "", notes: "" };
const J = { "Content-Type": "application/json" };
export default function Dash() {
  const r = useRouter();
  const [B, setB] = useState([]), [N, setN] = useState([]), [day, setDay] = useState(hd()), [f, setF] = useState(blank), [err, setErr] = useState("");
  const [browserPermission, setBrowserPermission] = useState("");
  const seenNotifications = useRef(new Set());
  const notificationsLoaded = useRef(false);
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch("/api/bookings"), fetch("/api/notifications")]);
    if (a.status === 401) return r.push("/login");
    const [bookings, notifications] = await Promise.all([a.json(), b.json()]);
    setB(bookings); setN(notifications);
    if (notificationsLoaded.current && browserPermission === "granted") {
      notifications.filter((n) => !seenNotifications.current.has(n.id)).forEach((n) => {
        new Notification(n.title, { body: n.body, icon: "/logo.png" });
      });
    }
    notifications.forEach((n) => seenNotifications.current.add(n.id));
    notificationsLoaded.current = true;
  }, [browserPermission, r]);
  useEffect(() => {
    if ("Notification" in window) setBrowserPermission(Notification.permission);
    else setBrowserPermission("unsupported");
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, [load]);
  const enableBrowserNotifications = async () => {
    if ("Notification" in window) setBrowserPermission(await Notification.requestPermission());
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function add(e) {
    e.preventDefault(); setErr("");
    const x = await fetch("/api/bookings", { method: "POST", headers: J, body: JSON.stringify({ ...f, date: day }) });
    if (!x.ok) return setErr((await x.json()).error || "Could not save.");
    setF(blank); load();
  }
  const mark = async (id, status) => { await fetch("/api/bookings/" + id, { method: "PATCH", headers: J, body: JSON.stringify({ status }) }); load(); };
  const del = async (id) => { if (confirm("Delete this booking?")) { const x = await fetch("/api/bookings/" + id, { method: "DELETE" }); if (!x.ok) alert("Only admins can delete."); load(); } };
  const read = async () => { await fetch("/api/notifications", { method: "POST" }); load(); };
  const out = async () => { await fetch("/api/auth", { method: "POST", headers: J, body: JSON.stringify({ mode: "logout" }) }); r.push("/login"); };
  const t = hd(), wk = hd(7), mo = t.slice(0, 7);
  const dayB = B.filter((b) => b.date === day);
  const opts = (k) => [...new Set(B.map((b) => b[k]).filter(Boolean))].map((v) => <option key={v} value={v} />);
  const unread = N.filter((n) => !n.read).length;
  return (
    <div className="w">
      <div className="bar" style={{ marginBottom: 12 }}><div className="brand"><img src="/logo.png" alt="Emmanuel Tours & Transfers, Victoria Falls" /><h2>Bookings</h2></div><button className="g" onClick={out}>Log out</button></div>
      <div className="stats">
        <div className="card"><b>{B.filter((b) => b.date === t && b.status === "booked").length}</b>Today</div>
        <div className="card"><b>{B.filter((b) => b.date > t && b.date <= wk && b.status === "booked").length}</b>Next 7 days</div>
        <div className="card"><b>{B.filter((b) => b.date.startsWith(mo) && b.status === "done").length}</b>Done this month</div>
      </div>
      <div className="card">
        <div className="bar"><strong>Notifications {unread > 0 && `(${unread} new)`}</strong><div className="bar">
          {browserPermission === "default" && <button className="g s" onClick={enableBrowserNotifications}>Enable browser alerts</button>}
          {browserPermission === "granted" && <small>Browser alerts enabled</small>}
          {browserPermission === "denied" && <small>Allow notifications in browser settings</small>}
          {unread > 0 && <button className="g s" onClick={read}>Mark read</button>}
        </div></div>
        {browserPermission === "unsupported" && <p style={{ color: "#5b6b64" }}>Browser alerts are not available in this browser.</p>}
        {N.length === 0 && <p style={{ color: "#5b6b64" }}>No notifications yet.</p>}
        {N.slice(0, 3).map((n) => (<div key={n.id} style={{ marginTop: 8, fontWeight: n.read ? 400 : 600 }}>{n.title}<pre>{n.body}</pre></div>))}
      </div>
      <div className="card">
        <label style={{ marginTop: 0 }}>Day</label><input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        {dayB.length === 0 && <p style={{ color: "#5b6b64" }}>No bookings on this day yet.</p>}
        {dayB.map((b) => (
          <div key={b.id} className={"bk " + b.status}>
            <strong>{b.time} · {b.pickup} to {b.dest}</strong>
            <small>{b.pax} guest{b.pax > 1 ? "s" : ""} · {b.driver || "no driver"} · {b.vehicle || "no vehicle"} · {b.type}</small>
            {(b.guest || b.phone) && <small>{b.guest} {b.phone}</small>}{b.notes && <small>{b.notes}</small>}
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              {b.status === "booked" && <><button className="s" onClick={() => mark(b.id, "done")}>Mark done</button><button className="g s" onClick={() => mark(b.id, "cancelled")}>Cancel</button></>}
              {b.status !== "booked" && <button className="g s" onClick={() => mark(b.id, "booked")}>Reopen</button>}
              <button className="g s" onClick={() => del(b.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <form className="card" onSubmit={add}>
        <strong>Book a guest on {day}</strong>
        <div className="row"><div><label>Time</label><input type="time" value={f.time} onChange={set("time")} required /></div>
          <div><label>Type</label><select value={f.type} onChange={set("type")}><option value="transfer">Transfer</option><option value="tour">Tour</option></select></div></div>
        <div className="row"><div><label>Pickup point</label><input value={f.pickup} onChange={set("pickup")} required /></div>
          <div><label>Destination</label><input value={f.dest} onChange={set("dest")} required /></div></div>
        <div className="row"><div><label>Driver</label><input list="d" value={f.driver} onChange={set("driver")} /></div>
          <div><label>Vehicle</label><input list="v" value={f.vehicle} onChange={set("vehicle")} /></div></div>
        <div className="row"><div><label>Guests</label><input type="number" min="1" value={f.pax} onChange={set("pax")} /></div>
          <div><label>Guest name</label><input value={f.guest} onChange={set("guest")} /></div></div>
        <div className="row"><div><label>Guest phone</label><input value={f.phone} onChange={set("phone")} /></div>
          <div><label>Notes</label><input value={f.notes} onChange={set("notes")} /></div></div>
        <datalist id="d">{opts("driver")}</datalist><datalist id="v">{opts("vehicle")}</datalist>
        {err && <div className="err">{err}</div>}
        <button style={{ marginTop: 12 }}>Save booking</button>
      </form>
    </div>
  );
}
