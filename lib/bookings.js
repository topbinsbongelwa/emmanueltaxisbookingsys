const F = ["date", "time", "type", "pickup", "dest", "guest", "phone", "driver", "vehicle", "notes", "status"];
export function pick(b) {
  const o = {};
  F.forEach((k) => { if (b[k] !== undefined) o[k] = String(b[k]).trim(); });
  if (b.pax !== undefined) o.pax = Math.max(1, parseInt(b.pax) || 1);
  if (o.status && !["pending", "booked", "approved", "done", "cancelled"].includes(o.status)) delete o.status;
  if (o.type && !["transfer", "tour"].includes(o.type)) o.type = "transfer";
  return o;
}
