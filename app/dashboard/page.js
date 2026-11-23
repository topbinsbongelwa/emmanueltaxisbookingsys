"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendFormSubmitRequest } from "@/lib/booking-email";
const hd = (n = 0) => { const d = new Date(Date.now() + 7200e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const pad = (n) => String(n).padStart(2, "0");
const statusOf = (b) => (b.status === "done" ? "approved" : b.status);
const STATUS_LABEL = { pending: "Pending", booked: "Booked", approved: "Approved", cancelled: "Cancelled" };
const blank = { time: "08:00", type: "transfer", pickup: "", dest: "", pax: 1, guest: "", email: "", phone: "", driver: "", vehicle: "", notes: "" };
const J = { "Content-Type": "application/json" };
const COLORS = ["pending", "booked", "approved"];
export default function Dash() {
  const r = useRouter();
  const [B, setB] = useState([]), [N, setN] = useState([]), [day, setDay] = useState(hd()), [month, setMonth] = useState(hd().slice(0, 7)), [f, setF] = useState(blank), [err, setErr] = useState("");
  const [me, setMe] = useState(null);
  const [accountLinks, setAccountLinks] = useState({ linked: [], incoming: [], outgoing: [] });
  const [linkEmail, setLinkEmail] = useState("");
  const [linkMessage, setLinkMessage] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [browserPermission, setBrowserPermission] = useState("");
  const [popup, setPopup] = useState(null);
  const [toast, setToast] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [testBusy, setTestBusy] = useState(false);
  const toastTimer = useRef(null);
  const seenNotifications = useRef(new Set());
  const notificationsLoaded = useRef(false);
  const showToast = useCallback((message, ok) => {
    setToast({ message, ok });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);
  // If FormSubmit rejected the server call, resend the exact same payload from
  // the browser and report the real result on the Save button toast.
  const handleEmailResult = useCallback(async (result) => {
    if (!result || result.emailFailed === false) {
      showToast("Booking saved and emailed", true);
      return;
    }
    if (result.emailFailed && result.emailRequest) {
      const retry = await sendFormSubmitRequest(result.emailRequest);
      try {
        await fetch("/api/notification-logs", {
          method: "POST",
          headers: J,
          body: JSON.stringify({
            bookingId: result.id,
            type: result.emailType || "new",
            ok: retry.ok,
            error: retry.error,
          }),
        });
      } catch (error) {
        console.error("Could not record browser email result:", error);
      }
      showToast(
        retry.ok
          ? "Booking saved and emailed"
          : "Booking saved, but the email could not be sent",
        retry.ok
      );
      return;
    }
    showToast("Booking saved, but the email could not be sent", false);
  }, [showToast]);
  const load = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/notifications"),
        fetch("/api/account-links"),
        fetch("/api/notification-logs"),
      ]);
      if (responses.some((x) => x.status === 401)) return r.push("/login");
      const failed = responses.find((x) => !x.ok);
      if (failed) {
        const result = await failed.json().catch(() => ({}));
        setErr(result.error || `Could not load your data (${failed.status}). Please try again.`);
        return;
      }
      const [bookings, notifications, links, logs] = await Promise.all(responses.map((x) => x.json()));
      setErr("");
      setB(bookings); setN(notifications);
      setAccountLinks(links);
      setEmailLogs(logs);
      if (notificationsLoaded.current) {
        const fresh = notifications.filter((n) => !seenNotifications.current.has(n.id));
        if (fresh.length) {
          if (browserPermission === "granted") {
            fresh.forEach((n) => {
              new Notification(n.title, { body: n.body, icon: "/logo.png" });
            });
          }
          setPopup(fresh[0]);
        }
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
    fetch("/api/auth").then((x) => (x.ok ? x.json() : null)).then((data) => data?.user && setMe(data.user)).catch(() => {});
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!ready) return;
    const now = new Date(Date.now() + 7200e3);
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 86400e3).toISOString().slice(0, 10);
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    B.forEach((b) => {
      if (!["pending", "booked", "approved"].includes(b.status)) return;
      if (b.date !== today && b.date !== tomorrow) return;
      const [h, m] = String(b.time || "").split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return;
      const until = h * 60 + m + (b.date === tomorrow ? 1440 : 0) - minutes;
      if (until <= 0 || until > 60) return;
      const key = "hour_reminder_" + b.id;
      const stamp = `${b.date}T${b.time}`;
      let previous = null;
      try { previous = window.localStorage.getItem(key); } catch {}
      if (previous === stamp) return;
      try { window.localStorage.setItem(key, stamp); } catch {}
      const body = `${b.date} ${b.time}: ${b.pickup} to ${b.dest}; ${b.pax} guest${b.pax === 1 ? "" : "s"}${b.guest ? `; ${b.guest}` : ""}${b.phone ? `; ${b.phone}` : ""}`;
      setPopup({ title: "Booking in 1 hour", body });
      if (browserPermission === "granted") new Notification("Booking in 1 hour", { body, icon: "/logo.png" });
    });
  }, [B, browserPermission, ready]);
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
      setF(blank);
      await load();
      await handleEmailResult(result);
      await load();
    } catch {
      setErr("Could not save. Check your connection and try again.");
    }
  }
  const mark = async (id, status) => {
    try {
      const x = await fetch("/api/bookings/" + id, { method: "PATCH", headers: J, body: JSON.stringify({ status }) });
      const result = await x.json().catch(() => ({}));
      if (!x.ok) return setErr(result.error || "Could not update this booking.");
      await load();
      await handleEmailResult(result);
      await load();
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
  const sendTest = async () => {
    setTestBusy(true);
    try {
      const x = await fetch("/api/test-notify", { method: "POST" });
      const result = await x.json().catch(() => ({}));
      if (!x.ok) return showToast(result.error || "Test email failed", false);
      showToast(
        result.ok ? "Test email sent" : `Test email failed: ${result.error || "unknown error"}`,
        !!result.ok
      );
      await load();
    } catch {
      showToast("Test email failed", false);
    } finally {
      setTestBusy(false);
    }
  };
  const updateAccountLink = async (method, body, successMessage) => {
    setLinkBusy(true); setLinkMessage("");
    try {
      const response = await fetch("/api/account-links", {
        method,
        headers: J,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLinkMessage(result.error || "Could not update account sharing.");
        return;
      }
      setLinkMessage(successMessage);
      setLinkEmail("");
      await load();
    } catch {
      setLinkMessage("Could not update account sharing. Check your connection and try again.");
    } finally {
      setLinkBusy(false);
    }
  };
  const requestAccountLink = (event) => {
    event.preventDefault();
    updateAccountLink("POST", { email: linkEmail }, "Link request sent. Bookings will be shared after it is accepted.");
  };
  const out = async () => { await fetch("/api/auth", { method: "POST", headers: J, body: JSON.stringify({ mode: "logout" }) }); r.push("/login"); };
  const t = hd(), wk = hd(7), mo = t.slice(0, 7);
  const harareHour = new Date(Date.now() + 7200e3).getUTCHours();
  const greeting = harareHour < 12 ? "Good morning" : harareHour < 17 ? "Good afternoon" : "Good evening";
  const dayB = B.filter((b) => b.date === day);
  const opts = (k) => [...new Set(B.map((b) => b[k]).filter(Boolean))].map((v) => <option key={v} value={v} />);
  const unread = N.filter((n) => !n.read).length;
  const tomorrowDate = hd(1);
  const tomorrowB = B.filter((b) => b.date === tomorrowDate && statusOf(b) !== "cancelled")
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

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
      <div className="bar" style={{ marginBottom: 12 }}><div className="brand"><img src="/logo.png" alt="Emmanuel Tours & Transfers, Victoria Falls" /><h2>Bookings</h2></div><div className="bar"><button className="g" onClick={out}>Log out</button></div></div>
      <div className="dashboard-intro">
        <div><p className="eyebrow">OPERATIONS</p><h1>{greeting}, {me?.name || "there"}</h1></div>
        <p>Your booking system</p>
      </div>
      {err && <div className="err">{err}</div>}
      {tomorrowB.length > 0 && (
        <div className="card tomorrow-banner">
          <strong>Tomorrow's bookings ({tomorrowB.length})</strong>
          <p>Next-day email reminder: these bookings are due on {tomorrowDate}.</p>
          {tomorrowB.map((b) => (
            <div key={b.id} className="tomorrow-item">
              <b>{b.time}</b> · {b.pickup} to {b.dest} · {b.pax} guest{b.pax > 1 ? "s" : ""}
              {b.guest ? ` · ${b.guest}` : ""}
              {b.phone ? ` · ${b.phone}` : ""}
              {b.reminderSentAt ? " · emailed" : " · reminder pending"}
            </div>
          ))}
        </div>
      )}
      <div className="stats">
        <div className="card stat pending"><b>{B.filter((b) => b.date === t && statusOf(b) === "pending").length}</b>Pending today</div>
        <div className="card stat booked"><b>{B.filter((b) => b.date >= t && b.date <= wk && statusOf(b) === "booked").length}</b>Booked next 7 days</div>
        <div className="card stat approved"><b>{B.filter((b) => b.date.startsWith(mo) && statusOf(b) === "approved").length}</b>Approved this month</div>
      </div>
      <div className="card">
        <strong>Account sharing</strong>
        <p style={{ color: "#5b6b64" }}>
          Bookings are private unless another account accepts a link request. {me?.role === "admin" && "As an admin, you can also see every account's bookings."}
        </p>
        <form className="bar" onSubmit={requestAccountLink}>
          <label style={{ flex: "1 1 240px", marginTop: 0 }}>Link an existing account by email
            <input type="email" value={linkEmail} onChange={(event) => setLinkEmail(event.target.value)} required />
          </label>
          <button type="submit" disabled={linkBusy}>Send link request</button>
        </form>
        {linkMessage && <p role="status">{linkMessage}</p>}
        {accountLinks.linked.map((link) => (
          <div className="bar" key={link.id} style={{ marginTop: 10 }}>
            <span>Linked with {link.user.name} ({link.user.email})</span>
            <button type="button" className="g s" disabled={linkBusy} onClick={() => updateAccountLink("DELETE", { linkId: link.id }, "Accounts unlinked.")}>Unlink</button>
          </div>
        ))}
        {accountLinks.incoming.map((link) => (
          <div className="bar" key={link.id} style={{ marginTop: 10 }}>
            <span>{link.user.name} ({link.user.email}) wants to share bookings.</span>
            <div className="bar">
              <button type="button" className="s" disabled={linkBusy} onClick={() => updateAccountLink("POST", { action: "accept", linkId: link.id }, "Accounts linked. Bookings are now shared.")}>Accept</button>
              <button type="button" className="g s" disabled={linkBusy} onClick={() => updateAccountLink("POST", { action: "decline", linkId: link.id }, "Link request declined.")}>Decline</button>
            </div>
          </div>
        ))}
        {accountLinks.outgoing.map((link) => (
          <div className="bar" key={link.id} style={{ marginTop: 10 }}>
            <span>Waiting for {link.user.name} ({link.user.email}) to accept.</span>
            <button type="button" className="g s" disabled={linkBusy} onClick={() => updateAccountLink("DELETE", { linkId: link.id }, "Link request cancelled.")}>Cancel</button>
          </div>
        ))}
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
        <div className="bar"><strong>In-app notifications {unread > 0 && `(${unread} new)`}</strong><div className="bar">
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
        <div className="bar">
          <strong>Email notifications</strong>
          {me?.role === "admin" && (
            <button className="g s" onClick={sendTest} disabled={testBusy}>
              {testBusy ? "Sending..." : "Send test email"}
            </button>
          )}
        </div>
        <p style={{ color: "#5b6b64" }}>
          Bookings are emailed through FormSubmit. Green ✓ = accepted, red ✗ = failed (first-time activation may be needed).
        </p>
        {emailLogs.length === 0 && <p style={{ color: "#5b6b64" }}>No emails sent yet.</p>}
        {emailLogs.map((log) => (
          <div key={log.id} className="email-log">
            <span className={log.ok ? "log-ok" : "log-fail"}>{log.ok ? "✓" : "✗"}</span>
            <span>{log.type}</span>
            <span>{log.bookingId || "reminder digest"}</span>
            <span>{new Date(log.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Harare" })}</span>
            {!!log.error && <small className="log-error">{log.error}</small>}
          </div>
        ))}
      </div>
      <div className="card">
        <div className="bar"><label style={{ marginTop: 0 }}>Bookings for</label><input type="date" style={{ maxWidth: 190 }} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></div>
        {dayB.length === 0 && <p style={{ color: "#5b6b64" }}>No bookings on this day yet.</p>}
        {dayB.map((b) => (
          <div key={b.id} className={"bk " + statusOf(b)}>
            <div className="bar"><strong>{b.time} · {b.pickup} to {b.dest}</strong><span className={"status-tag " + statusOf(b)}>{STATUS_LABEL[statusOf(b)] || b.status}</span></div>
            <small>{b.pax} guest{b.pax > 1 ? "s" : ""} · {b.driver || "no driver"} · {b.vehicle || "no vehicle"} · {b.type}</small>
            {(b.guest || b.phone || b.email) && <small>{b.guest} {b.phone} {b.email}</small>}{b.notes && <small>{b.notes}</small>}
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
        <div className="row"><div><label>Guest email</label><input type="email" value={f.email} onChange={set("email")} placeholder="guest@example.com" /></div>
          <div><label>Guest phone</label><input value={f.phone} onChange={set("phone")} /></div></div>
        <div className="row"><div><label>Notes</label><input value={f.notes} onChange={set("notes")} /></div>
          <div><label>Email notifications</label><p style={{ margin: "5px 0 0", color: "#5b6b64" }}>A copy is emailed to mthabisi45@gmail.com when you save.</p></div></div>
        <datalist id="d">{opts("driver")}</datalist><datalist id="v">{opts("vehicle")}</datalist>
        <button style={{ marginTop: 12 }}>Save booking</button>
      </form>
      {toast && (
        <div className={"toast " + (toast.ok ? "ok" : "fail")} role="status">
          <span>{toast.ok ? "✓" : "✗"} {toast.message}</span>
          <button type="button" className="g s" onClick={() => setToast(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      {popup && (
        <div className="popup-backdrop" onClick={() => setPopup(null)}>
          <div className="popup-card" role="alertdialog" aria-modal="true" aria-labelledby="popup-title" aria-describedby="popup-body" onClick={(event) => event.stopPropagation()}>
            <p className="popup-eyebrow">{popup.title.toLowerCase().includes("upcoming") ? "Booking reminder" : "Notification"}</p>
            <h3 id="popup-title">{popup.title}</h3>
            <pre id="popup-body">{popup.body}</pre>
            <button onClick={() => setPopup(null)}>OK, got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
