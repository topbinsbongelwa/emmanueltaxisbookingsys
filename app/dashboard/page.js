"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
const hd = (n = 0) => { const d = new Date(Date.now() + 7200e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const pad = (n) => String(n).padStart(2, "0");
const statusOf = (b) => (b.status === "done" ? "approved" : b.status);
const STATUS_LABEL = { pending: "Pending", booked: "Booked", approved: "Approved", cancelled: "Cancelled" };
const blank = { time: "08:00", type: "transfer", pickup: "", dest: "", pax: 1, guest: "", phone: "", driver: "", vehicle: "", notes: "" };
const J = { "Content-Type": "application/json" };
const COLORS = ["pending", "booked", "approved"];
export default function Dash() {
  const r = useRouter();
  const [B, setB] = useState([]), [N, setN] = useState([]), [day, setDay] = useState(hd()), [month, setMonth] = useState(hd().slice(0, 7)), [f, setF] = useState(blank), [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [browserPermission, setBrowserPermission] = useState("");
  const seenNotifications = useRef(new Set());
  const notificationsLoaded = useRef(false);
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch("/api/bookings"), fetch("/api/notifications")]);
      if (a.status === 401) return r.push("/login");
      const failed = !a.ok ? a : !b.ok ? b : null;
      if (failed) {
        const result = await failed.json().catch(() => ({}));
        setErr(result.error || `Could not load your data (${failed.status}). Please try again.`);
        return;
      }
      const [bookings, notifications] = await Promise.all([a.json(), b.json()]);
      setErr("");
      setB(bookings); setN(notifications);
      if (notificationsLoaded.current && browserPermission === "granted") {
        notifications.filter((n) => !seenNotifications.current.has(n.id)).forEach((n) => {
          new Notification(n.title, { body: n.body, icon: "/logo.png" });
        });
      }
      notifications.forEach((n) => seenNotifications.current.add(n.id));
      notificationsLoaded.current = true;
    } catch {
      setErr("Could not load your data. Check your connection and try again.");
    } finally {
      setReady(true);
    }
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
    try {
      const x = await fetch("/api/bookings", { method: "POST", headers: J, body: JSON.stringify({ ...f, date: day }) });
      const result = await x.json().catch(() => ({}));
      if (!x.ok) return setErr(result.error || "Could not save.");
      setF(blank); load();
    } catch {
      setErr("Could not save. Check your connection and try again.");
    }
  }
  const mark = async (id, status) => {
    try {
      const x = await fetch("/api/bookings/" + id, { method: "PATCH", headers: J, body: JSON.stringify({ status }) });
      const result = await x.json().catch(() => ({}));
      if (!x.ok) return setErr(result.error || "Could not update this booking.");
      load();
    } catch {
      setErr("Could not update this booking. Check your connection and try again.");
    }
  };
  const del = async (id) => {
    if (!confirm("Delete this booking?")) return;
    try {
      const x = await fetch("/api/bookings/" + id, { method: "DELETE" });
      const result = await x.json().catch(() => ({}));
      if (!x.ok) return alert(result.error || "Only admins can delete.");
      load();
    } catch {
      alert("Could not delete this booking. Check your connection and try again.");
    }
  };
  const read = async () => { await fetch("/api/notifications", { method: "POST" }); load(); };
  const out = async () => { await fetch("/api/auth", { method: "POST", headers: J, body: JSON.stringify({ mode: "logout" }) }); r.push("/login"); };
  const t = hd(), wk = hd(7), mo = t.slice(0, 7);
  const dayB = B.filter((b) => b.date === day);
  const opts = (k) => [...new Set(B.map((b) => b[k]).filter(Boolean))].map((v) => <option key={v} value={v} />);
  const unread = N.filter((n) => !n.read).length;

  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Array(offset).fill(null);
  for (let d = 1; d <= total; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const monthName = first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const shiftMonth = (n) => {
    const next = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(next.toISOString().slice(0, 7));
  };
  const dayCounts = (date) => {
    const counts = { pending: 0, booked: 0, approved: 0 };
    B.forEach((b) => {
      if (b.date !== date) return;
      const status = statusOf(b);
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  };

  if (!ready) {
    return (
      <div className="w">
        <div className="card loading-screen">
          <img src="/logo.png" alt="Emmanuel Tours & Transfers, Victoria Falls" />
          <h2>Getting information...</h2>
          <p>Gathering your bookings, calendar and notifications.</p>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="w">
      <div className="bar" style={{ marginBottom: 12 }}><div className="brand"><img src="/logo.png" alt="Emmanuel Tours & Transfers, Victoria Falls" /><h2>Bookings</h2></div><button className="g" onClick={out}>Log out</button></div>
      <div className="dashboard-intro">
        <div><p className="eyebrow">OPERATIONS</p><h1>Bookings dashboard</h1></div>
        <p>Manage trips, guests, and daily activity.</p>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="stats">
        <div className="card stat pending"><b>{B.filter((b) => b.date === t && statusOf(b) === "pending").length}</b>Pending today</div>
        <div className="card stat booked"><b>{B.filter((b) => b.date >= t && b.date <= wk && statusOf(b) === "booked").length}</b>Booked next 7 days</div>
        <div className="card stat approved"><b>{B.filter((b) => b.date.startsWith(mo) && statusOf(b) === "approved").length}</b>Approved this month</div>
      </div>
      <div className="card calendar-card">
        <div className="bar">
          <strong>Calendar</strong>
          <div className="bar">
            <button type="button" className="g s" onClick={() => shiftMonth(-1)} aria-label="Previous month">&larr;</button>
            <strong>{monthName}</strong>
            <button type="button" className="g s" onClick={() => shiftMonth(1)} aria-label="Next month">&rarr;</button>
          </div>
        </div>
        <div className="cal-legend">
          <span><i className="dot booked" />Booked</span>
          <span><i className="dot pending" />Pending</span>
          <span><i className="dot approved" />Approved</span>
        </div>
        <div className="cal">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="cal-head">{d}</div>)}
          {cells.map((date, i) => {
            if (!date) return <div key={"empty" + i} className="cal-day empty" />;
            const counts = dayCounts(date);
            const has = COLORS.some((s) => counts[s] > 0);
            return (
              <button type="button" key={date} className={"cal-day" + (date === t ? " today" : "") + (date === day ? " selected" : "") + (has ? " has-bookings" : "")} onClick={() => setDay(date)}>
                <span className="cal-num">{Number(date.slice(8))}</span>
                <span className="cal-marks">
                  {COLORS.map((s) => counts[s] > 0 && <span key={s} className={"cal-mark " + s} title={`${counts[s]} ${STATUS_LABEL[s]}`}>{counts[s]}</span>)}
                </span>
              </button>
            );
          })}
        </div>
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
        <div className="bar"><label style={{ marginTop: 0 }}>Bookings for</label><input type="date" style={{ maxWidth: 190 }} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></div>
        {dayB.length === 0 && <p style={{ color: "#5b6b64" }}>No bookings on this day yet.</p>}
        {dayB.map((b) => (
          <div key={b.id} className={"bk " + statusOf(b)}>
            <div className="bar"><strong>{b.time} · {b.pickup} to {b.dest}</strong><span className={"status-tag " + statusOf(b)}>{STATUS_LABEL[statusOf(b)] || b.status}</span></div>
            <small>{b.pax} guest{b.pax > 1 ? "s" : ""} · {b.driver || "no driver"} · {b.vehicle || "no vehicle"} · {b.type}</small>
            {(b.guest || b.phone) && <small>{b.guest} {b.phone}</small>}{b.notes && <small>{b.notes}</small>}
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {b.status === "pending" && <><button className="s" onClick={() => mark(b.id, "booked")}>Mark booked</button><button className="s approve" onClick={() => mark(b.id, "approved")}>Approve</button><button className="g s" onClick={() => mark(b.id, "cancelled")}>Cancel</button></>}
              {b.status === "booked" && <><button className="s approve" onClick={() => mark(b.id, "approved")}>Approve</button><button className="g s" onClick={() => mark(b.id, "cancelled")}>Cancel</button></>}
              {(statusOf(b) === "approved" || b.status === "cancelled") && <button className="g s" onClick={() => mark(b.id, "pending")}>Reopen</button>}
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
        <button style={{ marginTop: 12 }}>Save booking</button>
      </form>
    </div>
  );
}
