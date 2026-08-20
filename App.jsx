import React, { useState, useMemo } from "react";

/* ============ isolved brand ============ */
const B = {
  mag: "#E50082", magD: "#B00068", ink: "#1A1A1A", dim: "#6B6F76",
  line: "#E3E5E8", bg: "#F6F6F7", ok: "#3BA55D", warn: "#E8A317", risk: "#D64545",
  navy: "#22262E", soft: "#FDF3F8",
};
const dotBg = {
  backgroundColor: B.bg,
  backgroundImage: `radial-gradient(circle at 10px 10px, #E9EAEC 5px, transparent 5.5px),
    radial-gradient(circle at 42px 46px, ${B.mag}22 5px, transparent 5.5px)`,
  backgroundSize: "64px 64px",
};

const TODAY = "2026-08-19";

/* ============ date helpers (business-day aware) ============ */
const toDate = (iso) => new Date(iso + "T00:00:00");
const toISO = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
function addBusinessDays(iso, n, workSet) {
  if (!iso) return null;
  const d = toDate(iso); let added = 0;
  while (added < n) { d.setDate(d.getDate() + 1); if (workSet.has(d.getDay())) added++; }
  return toISO(d);
}
function addCalendarDays(iso, n) {
  if (!iso) return null;
  const d = toDate(iso); d.setDate(d.getDate() + n); return toISO(d);
}
function daysUntil(iso) { return iso ? Math.round((toDate(iso) - toDate(TODAY)) / 86400000) : null; }
function workdaysBetween(startIso, endIso, workSet) {
  if (!startIso || !endIso) return 0;
  const d = toDate(startIso), end = toDate(endIso); let n = 0;
  while (d <= end) { if (workSet.has(d.getDay())) n++; d.setDate(d.getDate() + 1); }
  return n;
}
const fmt = (iso) => iso ? toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/* ============ default config ============ */
const defaultConfig = {
  workDays: [1, 2, 3, 4, 5], // Mon–Fri
  hoursPerDay: 8,
  entitlementHrs: 480,
  clocks: { eligibility: 5, certification: 15, review: 5, cure: 7, rtwReminderCalDays: 14 },
  leaveTypes: ["FMLA", "FMLA + STD", "State PFML", "ADA Accommodation", "Parental (Company)", "Workers' Comp", "Personal (Unprotected)"],
  absenceTypes: ["Employee's own serious health condition", "Care for family member", "Bonding with new child", "Pregnancy / prenatal care", "Military exigency", "Military caregiver", "Other"],
  relatedPersons: ["Self", "Spouse", "Child", "Parent", "Domestic partner", "In loco parentis", "Next of kin (military)"],
  policies: [
    { id: "fmla", name: "FMLA", entitlementHrs: 480, minTenureMonths: 12, minHours12mo: 1250, minHeadcount: 50, states: [], notes: "50+ employees within 75 miles of worksite" },
    { id: "mapfml", name: "State PFML", entitlementHrs: 800, minTenureMonths: 0, minHours12mo: 0, minHeadcount: 1, states: ["MA"], notes: "Financial eligibility test applies — verify with DFML" },
    { id: "parental", name: "Parental (Company)", entitlementHrs: 240, minTenureMonths: 6, minHours12mo: 0, minHeadcount: 1, states: [], notes: "Company policy — bonding only" },
  ],
};

/* ============ seed cases ============ */
const seed = [
  { id: 154, name: "James Okafor", dept: "Sales", hireDate: "2024-01-15", hoursWorked12mo: 1180, workState: "FL", worksiteHeadcount: 120, leaveType: "FMLA", absenceType: "Employee's own serious health condition", relatedPerson: "Self", schedule: "Continuous",
    requestReceived: "2026-08-10", eligibilitySent: "2026-08-12", certReceived: "", cureRequested: "", cureReceived: "", designationDate: "", designation: "", leaveStart: "2026-08-10", expectedRTW: "2026-10-05", actualRTW: "", itor: [], notes: "WH-380-E sent with eligibility notice." },
  { id: 142, name: "Maria Torres", dept: "Operations", hireDate: "2019-05-01", hoursWorked12mo: 2080, workState: "TX", worksiteHeadcount: 120, leaveType: "FMLA + STD", absenceType: "Employee's own serious health condition", relatedPerson: "Self", schedule: "Continuous",
    requestReceived: "2026-06-29", eligibilitySent: "2026-07-01", certReceived: "2026-07-10", cureRequested: "", cureReceived: "", designationDate: "2026-07-13", designation: "Approved", leaveStart: "2026-07-06", expectedRTW: "2026-09-28", actualRTW: "", itor: [], notes: "STD approved through 9/25. Recert if extended." },
  { id: 153, name: "Dana Whitfield", dept: "Client Services", hireDate: "2021-08-09", hoursWorked12mo: 1960, workState: "FL", worksiteHeadcount: 120, leaveType: "FMLA", absenceType: "Care for family member", relatedPerson: "Parent", schedule: "Intermittent",
    requestReceived: "2026-02-20", eligibilitySent: "2026-02-24", certReceived: "2026-03-06", cureRequested: "2026-03-09", cureReceived: "2026-03-13", designationDate: "2026-03-16", designation: "Approved", leaveStart: "2026-03-02", expectedRTW: "", actualRTW: "",
    cert: { freqTimes: 2, freqPer: "week", durAmount: 1, durUnit: "days", condition: "Chronic condition — episodic flare-ups", provider: "Dr. Reyes, Internal Medicine", recertDue: "2026-09-02" },
    itor: [{ date: "2026-08-14", hrs: 4 }, { date: "2026-08-17", hrs: 6 }, { date: "2026-08-18", hrs: 4 }, { date: "2026-07-28", hrs: 8 }], notes: "Up to 2 days/week per cert. Cure was for missing frequency/duration." },
  { id: 138, name: "Priya Nair", dept: "Engineering", hireDate: "2023-02-20", hoursWorked12mo: 2000, workState: "MA", worksiteHeadcount: 85, leaveType: "State PFML", absenceType: "Bonding with new child", relatedPerson: "Child", schedule: "Continuous",
    requestReceived: "2026-05-28", eligibilitySent: "2026-05-29", certReceived: "2026-06-05", cureRequested: "", cureReceived: "", designationDate: "2026-06-08", designation: "Approved", leaveStart: "2026-06-15", expectedRTW: "2026-09-07", actualRTW: "", itor: [], notes: "MA PFML bonding; FMLA concurrent." },
];

/* ============ lifecycle engine ============ */
function lifecycle(c, cfg) {
  const ws = new Set(cfg.workDays);
  const k = cfg.clocks;
  const eligDue = addBusinessDays(c.requestReceived, k.eligibility, ws);
  const certDue = addBusinessDays(c.eligibilitySent, k.certification, ws);
  const cureDue = c.cureRequested ? addBusinessDays(c.cureRequested, k.cure, ws) : null;
  // review clock restarts from cure receipt if a cure happened
  const reviewAnchor = c.cureReceived || c.certReceived;
  const reviewDue = addBusinessDays(reviewAnchor, k.review, ws);
  const rtwReminder = c.expectedRTW ? addCalendarDays(c.expectedRTW, -k.rtwReminderCalDays) : null;

  const stages = [
    { key: "request", who: "EE", label: "Request Received", done: !!c.requestReceived, doneDate: c.requestReceived, due: null, field: "requestReceived" },
    { key: "eligibility", who: "HR", label: "Eligibility Notice Sent", done: !!c.eligibilitySent, doneDate: c.eligibilitySent, due: eligDue, field: "eligibilitySent", clockNote: `${k.eligibility} business days from request` },
    { key: "certification", who: "EE", label: "Certification Received", done: !!c.certReceived, doneDate: c.certReceived, due: certDue, field: "certReceived", clockNote: `${k.certification} business days from eligibility notice` },
    { key: "review", who: "HR", label: "Review & Designation", done: !!c.designationDate, doneDate: c.designationDate, due: reviewDue, field: "designationDate", clockNote: `${k.review} business days from certification${c.cureReceived ? " (restarted at cure receipt)" : ""}`,
      sub: c.cureRequested ? { label: "Cure requested", done: !!c.cureReceived, doneDate: c.cureReceived, due: cureDue, field: "cureReceived", clockNote: `${k.cure} business days to cure` } : null },
    { key: "rtw", who: "EE", label: "Return to Work", done: !!c.actualRTW, doneDate: c.actualRTW, due: c.expectedRTW || null, field: "actualRTW", clockNote: rtwReminder ? `RTW reminder: ${fmt(rtwReminder)}` : "Set expected RTW to schedule reminder", reminder: rtwReminder },
  ];
  const current = stages.findIndex(s => !s.done);
  const closed = current === -1 || c.designation === "Denied" || !!c.cancelled;
  // next actionable deadline
  let nextDue = null, nextLabel = "";
  if (!closed && current >= 0) {
    const st = stages[current];
    if (st.sub && !st.sub.done) { nextDue = st.sub.due; nextLabel = "Cure due"; }
    else { nextDue = st.due; nextLabel = st.key === "rtw" ? "Expected RTW" : `${st.label} due`; }
  }
  const reminderActive = !closed && rtwReminder && daysUntil(rtwReminder) <= 0 && !c.actualRTW;
  return { stages, current: closed ? stages.length : current, closed, nextDue, nextLabel, rtwReminder, reminderActive };
}

function hoursUsed(c, cfg) {
  if (c.designation !== "Approved") return { total: 0, source: "Not yet designated" };
  const ws = new Set(cfg.workDays);
  if (c.schedule === "Intermittent") {
    const total = c.itor.reduce((a, e) => a + (Number(e.hrs) || 0), 0);
    return { total, source: `${c.itor.length} ITOR entries` };
  }
  const end = c.actualRTW || (daysUntil(c.expectedRTW) < 0 ? c.expectedRTW : TODAY);
  const days = workdaysBetween(c.leaveStart, end, ws);
  return { total: days * cfg.hoursPerDay, source: `Auto: ${days} workdays × ${cfg.hoursPerDay} hrs (from ${fmt(c.leaveStart)})` };
}

/* ============ certification check engine ============ */
function weekKey(iso) {
  const d = toDate(iso);
  const off = (d.getDay() + 6) % 7; // days since Monday
  d.setDate(d.getDate() - off);
  return toISO(d); // Monday of that week
}
function certCheck(c, cfg) {
  const cd = c.cert || {};
  const hasCert = Number(cd.freqTimes) > 0 || Number(cd.durAmount) > 0;
  if (!hasCert) return null;
  const epMaxHrs = Number(cd.durAmount) > 0 ? Number(cd.durAmount) * (cd.durUnit === "days" ? cfg.hoursPerDay : 1) : null;
  const overDur = epMaxHrs ? (c.itor || []).filter(e => Number(e.hrs) > epMaxHrs) : [];
  let overFreq = [];
  if (Number(cd.freqTimes) > 0) {
    const groups = {};
    (c.itor || []).forEach(e => {
      const key = cd.freqPer === "month" ? e.date.slice(0, 7) : weekKey(e.date);
      groups[key] = (groups[key] || 0) + 1;
    });
    overFreq = Object.entries(groups).filter(([, v]) => v > Number(cd.freqTimes)).map(([k, v]) => ({ period: k, count: v }));
  }
  return { epMaxHrs, overDur, overFreq, recertDue: cd.recertDue || null };
}

/* ============ eligibility engine ============ */
function tenureMonths(hireIso, asOfIso) {
  if (!hireIso) return null;
  const h = toDate(hireIso), a = toDate(asOfIso);
  return (a.getFullYear() - h.getFullYear()) * 12 + (a.getMonth() - h.getMonth()) - (a.getDate() < h.getDate() ? 1 : 0);
}
function policyEligibility(c, p) {
  const asOf = c.requestReceived || TODAY;
  const checks = [];
  if (Number(p.minTenureMonths) > 0) {
    const tm = tenureMonths(c.hireDate, asOf);
    checks.push({ label: `${p.minTenureMonths}+ mo service`, pass: tm != null && tm >= Number(p.minTenureMonths), detail: tm != null ? `${tm} mo` : "no hire date" });
  }
  if (Number(p.minHours12mo) > 0) checks.push({ label: `${p.minHours12mo}+ hrs / prior 12 mo`, pass: Number(c.hoursWorked12mo) >= Number(p.minHours12mo), detail: `${c.hoursWorked12mo || 0} hrs` });
  if (Number(p.minHeadcount) > 1) checks.push({ label: `${p.minHeadcount}+ EEs within 75 mi`, pass: Number(c.worksiteHeadcount) >= Number(p.minHeadcount), detail: `${c.worksiteHeadcount || 0} EEs` });
  if ((p.states || []).length > 0) checks.push({ label: `Works in ${p.states.join("/")}`, pass: p.states.includes((c.workState || "").toUpperCase()), detail: c.workState || "—" });
  return { policy: p, eligible: checks.every(x => x.pass), checks, asOf };
}
function allEligibility(c, cfg) { return (cfg.policies || []).map(p => policyEligibility(c, p)); }

/* ============ small components ============ */
function PersonIcon({ group, color, size = 13 }) {
  return group ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.4"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5H3z"/><path d="M15.4 13.9c2.8.2 5.6 2 5.6 5.1h-4.2c0-2-.5-3.8-1.4-5.1z"/></svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="12" cy="8" r="3.6"/><path d="M4.5 19.5c0-3.8 3.3-6 7.5-6s7.5 2.2 7.5 6h-15z"/></svg>
  );
}

function StepTrack({ lc, size = 24 }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {lc.stages.map((s, i) => {
        const done = s.done;
        const active = i === lc.current && !lc.closed;
        const isHR = s.who === "HR";
        const fill = done ? (isHR ? B.navy : B.mag) : "#E9EAEC";
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <div style={{ width: 12, height: 2, background: done ? "#C9CCD1" : "#EDEEF0" }} />}
            <div title={s.label} style={{ width: size, height: size, borderRadius: "50%", background: fill, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: active ? `0 0 0 2.5px ${B.mag}55` : "none" }}>
              <PersonIcon group={isHR} color={done ? "#fff" : "#B6BAC0"} size={size * 0.52} />
            </div>
          </React.Fragment>
        );
      })}
      {lc.closed && (
        <div style={{ width: size, height: size, borderRadius: "50%", background: B.ok, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 7, flexShrink: 0 }}>
          <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4.5 4.5L19 7"/></svg>
        </div>
      )}
    </div>
  );
}

/* ============ backend status ============ */
const STATUS_META = {
  "Inquiry": { col: "#8A6FD1" },
  "Requested": { col: B.warn },
  "Open / Ongoing": { col: B.ok },
  "Cancelled": { col: B.dim },
  "Closed / Completed": { col: B.navy },
};
function caseStatus(c) {
  if (c.cancelled) return "Cancelled";
  if (!c.requestReceived) return "Inquiry";
  if (c.designation === "Denied" || c.actualRTW) return "Closed / Completed";
  if (c.designation === "Approved") return "Open / Ongoing";
  return "Requested";
}
function StatusChip({ status, small }) {
  const col = (STATUS_META[status] || {}).col || B.dim;
  return <span style={{ fontSize: small ? 10.5 : 11.5, color: col, border: `1px solid ${col}66`, background: col + "11", borderRadius: 999, padding: small ? "2px 8px" : "3px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>{status}</span>;
}

function Field({ label, children, style }) {
  return (
    <div style={{ position: "relative", border: "1px solid #C6C9CE", borderRadius: 6, padding: "9px 12px 7px", background: "#fff", ...style }}>
      <span style={{ position: "absolute", top: -8, left: 10, background: "#fff", padding: "0 5px", fontSize: 11, color: B.dim, whiteSpace: "nowrap" }}>{label}</span>
      {children}
    </div>
  );
}
const bare = { border: "none", outline: "none", width: "100%", fontSize: 13.5, color: B.ink, background: "transparent", fontFamily: "inherit" };

function DueBadge({ due, done }) {
  if (done || !due) return null;
  const d = daysUntil(due);
  const col = d < 0 ? B.risk : d <= 3 ? B.warn : B.dim;
  return <span style={{ fontSize: 11, color: col, fontWeight: d <= 3 ? 700 : 500, border: `1px solid ${col}55`, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>
    due {fmt(due)} · {d < 0 ? `${-d}d overdue` : `${d}d left`}</span>;
}

function Bar({ used, total }) {
  const pct = Math.min(100, (used / total) * 100);
  const col = pct >= 90 ? B.risk : pct >= 70 ? B.warn : B.mag;
  return (
    <div style={{ minWidth: 130 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: B.dim, marginBottom: 2 }}>
        <span>{used}h</span><span style={{ color: total - used <= 80 ? B.risk : B.dim }}>{Math.max(0, total - used)}h left</span>
      </div>
      <div style={{ height: 5, background: "#EDEEF0", borderRadius: 3 }}><div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 3 }} /></div>
    </div>
  );
}

function ListEditor({ title, items, setItems }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>{title}</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {items.map(it => (
          <span key={it} style={{ background: B.soft, border: `1px solid ${B.mag}44`, borderRadius: 999, padding: "4px 10px", fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
            {it}<button onClick={() => setItems(items.filter(x => x !== it))} style={{ border: "none", background: "none", color: B.magD, cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder={`Add ${title.toLowerCase()}…`} value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) { setItems([...items, val.trim()]); setVal(""); } }}
          style={{ ...bare, border: `1px solid ${B.line}`, borderRadius: 6, padding: "7px 10px", fontSize: 12.5, flex: 1 }} />
        <button onClick={() => { if (val.trim()) { setItems([...items, val.trim()]); setVal(""); } }}
          style={{ background: B.mag, color: "#fff", border: "none", borderRadius: 6, padding: "0 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
      </div>
    </div>
  );
}

/* ============ main ============ */
const newCase = () => ({ id: 0, name: "", dept: "", hireDate: "", hoursWorked12mo: "", workState: "", worksiteHeadcount: "", leaveType: "FMLA", absenceType: "Employee's own serious health condition", relatedPerson: "Self", schedule: "Continuous",
  requestReceived: TODAY, eligibilitySent: "", certReceived: "", cureRequested: "", cureReceived: "", designationDate: "", designation: "", leaveStart: "", expectedRTW: "", actualRTW: "",
  cert: { freqTimes: "", freqPer: "week", durAmount: "", durUnit: "hours", condition: "", provider: "", recertDue: "" }, itor: [], notes: "" });

export default function LOATracker() {
  const [tab, setTab] = useState("requests");
  const [cases, setCases] = useState(seed);
  const [cfg, setCfg] = useState(defaultConfig);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [itorDraft, setItorDraft] = useState({ date: TODAY, hrs: "" });

  const upd = (id, patch) => setCases(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));

  const rows = useMemo(() => cases
    .map(c => ({ c, lc: lifecycle(c, cfg), hrs: hoursUsed(c, cfg) }))
    .filter(({ c }) => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || String(c.id).includes(q) || c.leaveType.toLowerCase().includes(q) || c.absenceType.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const ad = a.lc.nextDue ? daysUntil(a.lc.nextDue) : 9999, bd = b.lc.nextDue ? daysUntil(b.lc.nextDue) : 9999;
      return (a.lc.closed ? 1 : 0) - (b.lc.closed ? 1 : 0) || ad - bd;
    }), [cases, cfg, search]);

  const alerts = rows.filter(r => !r.lc.closed && (r.lc.reminderActive || (r.lc.nextDue && daysUntil(r.lc.nextDue) <= 3)));

  const addCase = () => {
    const id = Math.max(100, ...cases.map(x => x.id)) + 1;
    setCases(cs => [...cs, { ...newCase(), id }]);
    setOpenId(id);
  };

  const tabBtn = (id, txt) => (
    <button onClick={() => setTab(id)} style={{ background: "none", border: "none", borderBottom: tab === id ? `3px solid ${B.mag}` : "3px solid transparent", padding: "12px 4px", marginRight: 20, fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? B.ink : B.dim, cursor: "pointer" }}>{txt}</button>
  );

  const open = openId != null ? cases.find(c => c.id === openId) : null;
  const openLc = open ? lifecycle(open, cfg) : null;
  const openHrs = open ? hoursUsed(open, cfg) : null;

  return (
    <div style={{ minHeight: "100vh", ...dotBg, fontFamily: "'Segoe UI', system-ui, sans-serif", color: B.ink, paddingBottom: 60 }}>
      {/* app bar */}
      <div style={{ background: B.navy, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI4LjMuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCgkgdmlld0JveD0iMCAwIDEwODAgMjg4IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAxMDgwIDI4ODsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkZGRkY7fQoJLnN0MXtmaWxsOiNFNTAwODI7fQo8L3N0eWxlPgo8ZyBpZD0iTGF5ZXJfMSI+Cgk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTAwMC44NCw0OS44OGMwLDY5LjcsMCwxMTQuNTMsMCwxODQuMDljMCwwLjg3LDAsMi42My0yLjU3LDIuNjJoLTM1LjMzYy0yLjU1LDAuMDEtMy4zNi0xLjEtMy40MS0zLjQ2di02LjI5CgkJYy0wLjMxLTAuMzIsMC41NC0wLjMxLDAsMGMtMTcuMTQsMTIuMi0zNi43NywxNy4wMi01Ni4zMywxMS40Yy0yOC4wMS04LjA2LTQ0Ljc0LTI3Ljc4LTUxLjIyLTU1Ljc0CgkJYy01LjA0LTIxLjcyLTIuOC00My4wNCw3Ljk1LTYyLjkyYzE2LjI5LTMwLjExLDU0LjEtNDMuNzgsODQuNjUtMzAuNzJjNC4zNiwxLjg3LDguNCw0LjQ5LDEzLjAxLDdjMC0xLjUyLDAtMi44MSwwLTQuMQoJCWMtMC4wNi0yMi4zOS0wLjA0LTE5LjQzLTAuMjUtNDEuODNjMCwwLTAuMzEtMi41LDIuMDEtMi41YzExLjc4LDAuMTIsMjUuNjgsMC4wNywzNy40NiwwYzAuNTMsMCwxLjA3LDAsMS42OCwwCgkJQzEwMDAuODQsNDcuNDMsMTAwMC44NCw0OS4wNywxMDAwLjg0LDQ5Ljg4eiBNOTU4LjMxLDE1OS45N2MwLTIuNzYtMC41OS02LjUzLTEuNjMtMTAuNjJjLTMuMDktMTIuMTUtMTAuMDctMjAuODktMjIuNzUtMjQuMDQKCQljLTEyLjQ4LTMuMS0yMy4xMiwwLjE1LTMxLjU1LDkuODZjLTEyLjEsMTMuOTUtMTIuNTMsMzcuMjYtMS4xMyw1MS43NmMxMi4yOSwxNS42NCwzNS41OCwxNi42Myw0OC4yNiwxLjk2CgkJQzk1Ni4xOCwxODEuMTksOTU4LjAyLDE3MS44Miw5NTguMzEsMTU5Ljk3eiIvPgoJPHBhdGggY2xhc3M9InN0MCIgZD0iTTczMC42MSwxNzcuOTFjMS43OCwxMC4yOSwxMS43NSwyMC4wNSwyMy43MywyMi44OGMxMy4wMSwzLjA3LDI4LjgxLDIuNTksMzkuNzgtMTYuNDcKCQljMC4xNi0wLjI3LDEuMzktMi4wNiwzLjU0LTEuMjZjMTEuOTEsMy43MSwyMy44OCw3LjQ1LDM2LjA1LDExLjI1YzIuMjcsMC43NCwxLjYxLDIuMywxLjMxLDMuMDkKCQljLTIuNTMsNi42NS02LjM0LDEyLjIxLTEwLjk2LDE3LjIyYy0xOC41NywyMC4xMy00MS45NSwyNy4zOS02OC43MiwyNS4wNmMtMTUuNzctMS4zNy0zMC4xMi02LjctNDIuNTUtMTYuNjIKCQljLTE1Ljg1LTEyLjY1LTI0LjktMjkuMjMtMjcuNTMtNDkuMjJjLTIuMzUtMTcuODUtMC4yNi0zNS4xOCw4LjI3LTUxLjI0YzEyLjYtMjMuNzQsMzMuMjctMzUuNDgsNTkuNDEtMzguNTEKCQljMTUuNTEtMS44LDMwLjcxLTAuMzEsNDUuMDQsNi4xN2MyMC4xNiw5LjExLDMxLjg4LDI1LjI1LDM3LjM4LDQ2LjI1YzIuOTYsMTEuMywzLjU0LDIyLjgsMi45OSwzNC40NAoJCWMtMC4xNiwzLjI3LTAuOSw0LjM3LTQuNDQsNC40Yy0zMy4xOSwwLjIyLTY2LjM3LDAuNjYtOTkuNTYsMS4wNGMtMC43MywwLjAxLTEuNDYsMC4wMS0yLjI1LDAuMDEKCQlDNzMxLjA5LDE3Ni4zMyw3MzAuMzEsMTc2LjYxLDczMC42MSwxNzcuOTF6IE03OTEuNDMsMTQwLjEyYy0xLjM5LTEwLjkzLTE1LjYyLTIwLjEzLTMwLjkzLTIwLjAzCgkJYy0xMy42NywwLjA5LTI4LjE3LDEwLjI4LTI5LjM0LDIwLjIzYy0wLjA0LDAuMzUsMCwxLjA1LDAuOTQsMS4wNWMxOS40NSwwLDM4LjksMCw1OC4zNywwCgkJQzc5MS44NSwxNDEuMzgsNzkxLjQ5LDE0MC41NCw3OTEuNDMsMTQwLjEyeiIvPgoJPHBhdGggY2xhc3M9InN0MCIgZD0iTTI5Mi43LDE2MC44MWMwLjAyLTQzLjQ3LDM0LjY3LTc3LjkzLDc4LjQtNzcuOTZjNDMuNi0wLjAzLDc4LjI5LDM0LjYxLDc4LjIxLDc4LjEKCQljLTAuMDgsNDMuOTQtMzUuMyw3OS42OC03OC4zNiw3OS41MUMzMjcuNjQsMjQwLjI5LDI5Mi42OCwyMDQuNzEsMjkyLjcsMTYwLjgxeiBNMzcxLjMzLDEyMy40OWMtNy41NSwwLjAyLTE0LjMyLDIuMzYtMjAuMyw2LjkzCgkJYy0xNi44MSwxMi44My0xOS42NywzOS40Ny02LjA1LDU2LjMyYzE0Ljg5LDE4LjQ0LDQzLjczLDE2LjM4LDU1LjYzLTQuMDZjNS4yMS04Ljk1LDYuNTktMTguNjYsNC45NS0yOC44NQoJCUM0MDIuNzMsMTM2LjQyLDM4OC4xLDEyMy40NCwzNzEuMzMsMTIzLjQ5eiIvPgoJPHBhdGggY2xhc3M9InN0MCIgZD0iTTUyMyw4Ni45MWM3LjMxLDAuMDUsMzMuNzksMC4yNSw0NS40OCwwYzEuOTcsMCwyLjMsMiwyLjMsMmM5LjE2LDI0LjQ4LDI3Ljk3LDc0LjA0LDMyLjY2LDg2LjMxCgkJYzEuMiwzLjA2LDIuMDQsMC45NiwyLjQsMC4xNmMwLjE4LTAuNDEsMjIuMjYtNTguNjQsMzIuODItODYuNDdjMCwwLDAuNTgtMiwyLjcyLTEuOTljMTEuMjYsMC4yMywzNS4xNCwwLjAyLDQzLjM2LTAuMDEKCQljMS43Ny0wLjAxLDIuNjQsMS4yOSwxLjgxLDMuMjdjLTcuMjgsMTcuNC00MS45OSwxMDAuNTYtNTkuODcsMTQyLjc1Yy0wLjk3LDIuMjgtMi4xLDMuMjItNC42OCwzLjE5bC0zNS4zNC0wLjAxCgkJYy0yLjI4LDAuMDItMy4zOC0wLjc1LTQuMjUtMi44Yy0xOC41LTQzLjYyLTU0LjY3LTEzMC4yMS02MC41OC0xNDQuNEM1MjEuMzMsODcuNzEsNTIxLjk2LDg2LjksNTIzLDg2LjkxeiIvPgoJPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ2Ny40Niw0Ni45N2gzOS4xOWMzLjA4LDAsMy41NywwLjY1LDMuNTcsMy42MWMtMC4wNyw2OS40NS0wLjA0LDExMi40MSwwLjA0LDE4MS44NmMwLDMtMC44NywzLjc5LTMuODEsMy43NgoJCWMtMTIuNzktMC4xNS0yNS41OC0wLjEyLTM4LjM4LTAuMDJjLTIuNDksMC4wMi0zLjUzLTAuNDktMy41My0zLjNjMC4wOC02OS45LDAuMDMtMTEzLjMxLDAuMDQtMTgzLjIxCgkJQzQ2NC41Miw0Ny44OSw0NjUuNzgsNDYuOSw0NjcuNDYsNDYuOTd6Ii8+Cgk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTMxLjI5LDkwLjgxdi0yLjAzYzAtMS4wMy0wLjg0LTEuODctMS44Ny0xLjg3SDg3LjY5Yy0xLjAzLDAtMS44NywwLjg0LTEuODcsMS44OGMwLDExLjYzLDAsMjMuMywwLDM0LjQzCgkJYzAsMC43OSwwLjUsMS40OCwxLjI1LDEuNzVjMTYuMTEsNS45MywyNi44NiwyMS42MiwyNS42NywzOS42OWMtMS4wNiwxNi4xNy0xMS40OCwyOS4zMS0yNS43LDM0LjU5CgkJYy0wLjc0LDAuMjctMS4yNCwwLjk2LTEuMjQsMS43NWMwLDEwLjQ3LDAsMjAuMTksMCwzMC45OGMwLDMuOTIsMS45MiwzLjkyLDMuNzgsMy45MmM1LjI2LDAsMzguMSwwLDM4LjEsMAoJCWMzLjEyLDAuMDQsMy42NS0xLjExLDMuNjUtNC4wNEMxMzEuMjQsMTgyLjU3LDEzMS4yOSwxNDAuMTEsMTMxLjI5LDkwLjgxeiIvPgoJPHBhdGggY2xhc3M9InN0MCIgZD0iTTE1MC4zNiwxOTUuNzljMTEuMzEtNC45NiwzMS41MS0xMy44MiwzNC44NS0xNS4yOGMyLjAzLTAuNzcsMi42NiwwLjkxLDIuNzMsMS4wOQoJCWMwLjI0LDAuNTcsMC4zOCwwLjkyLDAuNTEsMS4yM2M2LjIyLDE1LjM1LDIzLjQ4LDIzLjE1LDM5LjEzLDE3LjY3YzAuNzMtMC4yNSwxLjQ3LTAuNTEsMi4xNC0wLjg3YzMuMjEtMS43LDYuMjEtMy42NSw2LjI3LTcuODEKCQljMC4wNi0zLjk3LTIuNDUtNi41OC01Ljc2LTcuNzRjLTYuOTQtMi40NC0xNC4wNS00LjQ0LTIxLjE2LTYuMzhjLTguNi0yLjM0LTE3LjY3LTMuNDgtMjUuODMtNi44NAoJCWMtMTMuMDQtNS4zNy0yMi44My0xNC43Ni0yNy4wNy0yOC42N2MtMy40MS0xMS4yLTAuNTUtMjEuNzIsNS40NC0zMS4zYzkuMzktMTUuMDMsMjMuNTctMjMuNDYsNDAuNjUtMjYuNjEKCQljMjMuNjctNC4zNSw0My42NiwxLjA5LDYyLjA0LDE4LjU2YzYuMjMsNy4wNiw5LjIxLDEwLjk1LDExLjg5LDE3LjczYzAuNTksMS40OSwwLjksMi42My0xLjA0LDMuNDIKCQljLTExLjM4LDQuNTktMjIuNzMsOS4yNi0zNC4xLDEzLjg5Yy0wLjYsMC4yNy0xLjc2LDAuMTQtMi4wMi0wLjc4Yy01LjA4LTExLjE1LTE0LjM4LTE1Ljc3LTI2LjMxLTE1LjE4CgkJYy0xMy4xNCwwLjY1LTE4LjA4LDEwLjkzLTExLjk3LDE0LjI1YzMuMzUsMS44Miw3LjA5LDMuMDcsMTAuOCw0LjA2YzEwLjU2LDIuODIsMjEuMjgsNS4wNSwzMS43Niw4LjEzCgkJYzEwLjQ2LDMuMDcsMTkuNjYsOC40NywyNi41NywxNy4xOWMxMy43NiwxNy4zNywxMi4wOCw0MS44NS0zLjk4LDU3LjA3Yy05Ljg3LDkuMzYtMjEuODgsMTQuNDQtMzUuMTQsMTYuNTUKCQljLTE5LjcxLDMuMTQtMzguNiwwLjg0LTU1LjktOS43NmMtMTIuMTItNy40NC0yMC4zLTE3LjM3LTI1LjUtMzEuMDFDMTQ5LjMxLDE5OC4yNiwxNDguNDMsMTk2LjYzLDE1MC4zNiwxOTUuNzl6Ii8+Cgk8Y2lyY2xlIGNsYXNzPSJzdDEiIGN4PSI3Mi4yNyIgY3k9IjE2Mi4wOSIgcj0iMjYuMjEiLz4KCTxnPgoJCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMDIxLjY3LDczLjNjLTEuODEsMC0zLjUxLTAuMzQtNS4xLTEuMDJjLTEuNTktMC42OC0zLTEuNjItNC4yMS0yLjg0Yy0xLjIxLTEuMjEtMi4xNi0yLjYxLTIuODQtNC4yMQoJCQljLTAuNjgtMS41OS0xLjAyLTMuMy0xLjAyLTUuMTNjMC0xLjgxLDAuMzQtMy41MSwxLjAyLTUuMDljMC42OC0xLjU4LDEuNjItMi45OCwyLjg0LTQuMThjMS4yMS0xLjIsMi42Mi0yLjE1LDQuMjEtMi44NAoJCQljMS41OS0wLjY5LDMuMjktMS4wMyw1LjEtMS4wM2MxLjgzLDAsMy41MywwLjM0LDUuMTIsMS4wM2MxLjU4LDAuNjksMi45OCwxLjYzLDQuMTksMi44NHMyLjE2LDIuNiwyLjg0LDQuMTgKCQkJYzAuNjgsMS41OCwxLjAyLDMuMjgsMS4wMiw1LjA5YzAsMS44My0wLjM0LDMuNTQtMS4wMiw1LjEzYy0wLjY4LDEuNTktMS42MiwzLTIuODQsNC4yMWMtMS4yMSwxLjIxLTIuNjEsMi4xNi00LjE5LDIuODQKCQkJQzEwMjUuMiw3Mi45NiwxMDIzLjQ5LDczLjMsMTAyMS42Nyw3My4zeiBNMTAyMS42OSw3MC4yYzEuODQsMCwzLjUzLTAuNDYsNS4wNS0xLjM3YzEuNTItMC45MSwyLjczLTIuMTMsMy42NC0zLjY1CgkJCWMwLjktMS41MiwxLjM2LTMuMjEsMS4zNi01LjA4YzAtMS44NS0wLjQ1LTMuNTMtMS4zNi01LjA1Yy0wLjkxLTEuNTItMi4xMi0yLjczLTMuNjQtMy42NGMtMS41Mi0wLjktMy4yLTEuMzYtNS4wNS0xLjM2CgkJCWMtMS44NywwLTMuNTYsMC40NS01LjA4LDEuMzZjLTEuNTIsMC45MS0yLjczLDIuMTItMy42NCwzLjY0Yy0wLjksMS41Mi0xLjM2LDMuMi0xLjM2LDUuMDVjMCwxLjg2LDAuNDUsMy41NiwxLjM2LDUuMDgKCQkJYzAuOSwxLjUyLDIuMTIsMi43NCwzLjY0LDMuNjVDMTAxOC4xNCw2OS43NCwxMDE5LjgzLDcwLjIsMTAyMS42OSw3MC4yeiBNMTAxNy4yNCw2Ni4zNVY1My43Mmg1LjUxYzEuMTgsMCwyLjE2LDAuMzksMi45NiwxLjE4CgkJCWMwLjgsMC43OSwxLjIsMS43NiwxLjIyLDIuOTJjMCwwLjc0LTAuMiwxLjQ1LTAuNiwyLjEzYy0wLjQsMC42OC0wLjk4LDEuMi0xLjc0LDEuNTZsMi4zOSw0LjgzaC0yLjM5bC0yLjE3LTQuNDJoLTMuMDd2NC40MgoJCQlIMTAxNy4yNHogTTEwMTkuMzYsNTkuOTRoMy4zOWMwLjU0LDAsMS4wMS0wLjIsMS40MS0wLjYxczAuNi0wLjkxLDAuNi0xLjUxYzAtMC42My0wLjItMS4xNC0wLjYxLTEuNTIKCQkJYy0wLjQxLTAuMzgtMC44Ny0wLjU3LTEuNC0wLjU3aC0zLjM5VjU5Ljk0eiIvPgoJPC9nPgo8L2c+CjxnIGlkPSJMYXllcl8yIj4KPC9nPgo8L3N2Zz4K" alt="isolved" style={{ height: 26, display: "block" }} />
        <span style={{ color: "#5A5F6A" }}>|</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>LOA Tracker</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9AA0AB" }}>Internal · {fmt(TODAY)}</span>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: B.mag, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>D</div>
      </div>

      <div style={{ maxWidth: 1100, margin: "22px auto 0", padding: "0 20px" }}>
        {/* alerts */}
        {alerts.length > 0 && (
          <div style={{ background: "#fff", borderLeft: `4px solid ${B.warn}`, borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "12px 18px", marginBottom: 16 }}>
            <b style={{ fontSize: 13 }}>Action needed</b>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
              {alerts.map(({ c, lc }) => (
                <button key={c.id} onClick={() => setOpenId(c.id)} style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: 12.5, color: B.ink, padding: 0 }}>
                  <span style={{ color: B.mag, fontWeight: 700 }}>#{c.id} {c.name}</span> — {lc.reminderActive && !lc.nextDue ? `RTW reminder window open (expected ${fmt(c.expectedRTW)})` : `${lc.nextLabel} ${fmt(lc.nextDue)} (${daysUntil(lc.nextDue) < 0 ? Math.abs(daysUntil(lc.nextDue)) + "d overdue" : daysUntil(lc.nextDue) + "d left"})`}
                  {lc.reminderActive && lc.nextDue && <span style={{ color: B.warn }}> · RTW reminder window open</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "0 24px", borderBottom: `1px solid ${B.line}` }}>
            {tabBtn("requests", "Leave Requests")}
            {tabBtn("config", "Configuration")}
          </div>

          {tab === "requests" && (
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <Field label="Search" style={{ flex: 1 }}><input style={bare} placeholder="Name, ID, leave or absence type…" value={search} onChange={e => setSearch(e.target.value)} /></Field>
                <button onClick={addCase} style={{ background: B.mag, color: "#fff", border: "none", borderRadius: 6, padding: "0 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New request</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "56px 1.3fr 1.3fr 200px 170px 150px", gap: 10, padding: "6px 10px", fontSize: 10.5, color: B.dim, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${B.line}` }}>
                <span>ID</span><span>Employee</span><span>Leave / Absence</span><span>Status / Progress</span><span>Next deadline</span><span>Hours (of {cfg.entitlementHrs})</span>
              </div>

              {rows.map(({ c, lc, hrs }) => {
                return (
                  <div key={c.id} onClick={() => setOpenId(c.id)} style={{ display: "grid", gridTemplateColumns: "56px 1.3fr 1.3fr 200px 170px 150px", gap: 10, padding: "13px 10px", alignItems: "center", cursor: "pointer", borderBottom: `1px solid ${B.line}`, background: openId === c.id ? B.soft : "#fff" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.id}</span>
                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{c.name || <i style={{ color: B.dim }}>Unnamed</i>}</div><div style={{ fontSize: 11, color: B.dim }}>{c.dept} · {c.schedule}</div></div>
                    <div style={{ fontSize: 12 }}>{c.leaveType}<div style={{ fontSize: 11, color: B.dim }}>{c.absenceType}{c.relatedPerson !== "Self" ? ` (${c.relatedPerson})` : ""}</div></div>
                    <div style={{ justifySelf: "start" }}>
                      <StatusChip status={caseStatus(c)} small />
                      <div style={{ marginTop: 5 }}><StepTrack lc={lc} size={22} /></div>
                      {(() => { const sel = allEligibility(c, cfg).find(r => r.policy.name === c.leaveType); return sel && !sel.eligible ? <div style={{ fontSize: 10, color: B.risk, fontWeight: 700, marginTop: 3 }}>⚠ not eligible</div> : null; })()}
                    </div>
                    <div>{lc.nextDue ? <DueBadge due={lc.nextDue} /> : <span style={{ fontSize: 11, color: B.dim }}>—</span>}
                      {lc.reminderActive && <div style={{ fontSize: 10.5, color: B.warn, fontWeight: 700, marginTop: 2 }}>⏰ Send RTW reminder</div>}</div>
                    <Bar used={hrs.total} total={cfg.entitlementHrs} />
                  </div>
                );
              })}
            </div>
          )}

          {tab === "config" && (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 28 }}>
              {/* policies */}
              <div>
                <h4 style={{ margin: "0 0 4px", fontSize: 13 }}>Leave policies & eligibility rules</h4>
                <div style={{ fontSize: 11, color: B.dim, marginBottom: 12 }}>Each case is auto-checked against these rules as of its request date. Set a rule to 0 to skip it; leave States blank for all states.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {cfg.policies.map(p => {
                    const setP = (patch) => setCfg({ ...cfg, policies: cfg.policies.map(x => x.id === p.id ? { ...x, ...patch } : x) });
                    return (
                      <div key={p.id} style={{ border: `1px solid ${B.line}`, borderRadius: 8, padding: 14, background: "#FAFAFB" }}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <Field label="Policy name" style={{ flex: "1 1 160px" }}><input style={bare} value={p.name} onChange={e => setP({ name: e.target.value })} /></Field>
                          <Field label="Entitlement (hrs)" style={{ width: 110 }}><input type="number" min="0" style={bare} value={p.entitlementHrs} onChange={e => setP({ entitlementHrs: Number(e.target.value) || 0 })} /></Field>
                          <Field label="Min tenure (mo)" style={{ width: 105 }}><input type="number" min="0" style={bare} value={p.minTenureMonths} onChange={e => setP({ minTenureMonths: Number(e.target.value) || 0 })} /></Field>
                          <Field label="Min hrs / 12 mo" style={{ width: 105 }}><input type="number" min="0" style={bare} value={p.minHours12mo} onChange={e => setP({ minHours12mo: Number(e.target.value) || 0 })} /></Field>
                          <Field label="Min EEs / 75 mi" style={{ width: 105 }}><input type="number" min="0" style={bare} value={p.minHeadcount} onChange={e => setP({ minHeadcount: Number(e.target.value) || 0 })} /></Field>
                          <Field label="States (blank = all)" style={{ width: 130 }}><input style={bare} placeholder="MA, CA" value={(p.states || []).join(", ")} onChange={e => setP({ states: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean) })} /></Field>
                          <button onClick={() => setCfg({ ...cfg, policies: cfg.policies.filter(x => x.id !== p.id) })} style={{ background: "none", border: "none", color: B.dim, cursor: "pointer", fontSize: 14 }}>✕</button>
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <Field label="Notes / caveats"><input style={bare} value={p.notes || ""} onChange={e => setP({ notes: e.target.value })} /></Field>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => setCfg({ ...cfg, policies: [...cfg.policies, { id: "p" + Date.now(), name: "New policy", entitlementHrs: 480, minTenureMonths: 0, minHours12mo: 0, minHeadcount: 1, states: [], notes: "" }] })}
                    style={{ alignSelf: "flex-start", background: "#fff", color: B.mag, border: `1.5px solid ${B.mag}`, borderRadius: 6, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>+ Add policy</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13 }}>Lifecycle clocks (business days)</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[["eligibility", "Eligibility notice"], ["certification", "Certification return"], ["review", "Review & designation"], ["cure", "Cure period"]].map(([k, lbl]) => (
                      <Field key={k} label={lbl}><input type="number" min="1" style={bare} value={cfg.clocks[k]} onChange={e => setCfg({ ...cfg, clocks: { ...cfg.clocks, [k]: Number(e.target.value) || 1 } })} /></Field>
                    ))}
                    <Field label="RTW reminder (calendar days before)"><input type="number" min="1" style={bare} value={cfg.clocks.rtwReminderCalDays} onChange={e => setCfg({ ...cfg, clocks: { ...cfg.clocks, rtwReminderCalDays: Number(e.target.value) || 1 } })} /></Field>
                  </div>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13 }}>Work week & hours</h4>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
                      const on = cfg.workDays.includes(i);
                      return <button key={d} onClick={() => setCfg({ ...cfg, workDays: on ? cfg.workDays.filter(x => x !== i) : [...cfg.workDays, i] })}
                        style={{ background: on ? B.mag : "#EDEEF0", color: on ? "#fff" : B.dim, border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{d}</button>;
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Hours per workday"><input type="number" min="1" max="24" style={bare} value={cfg.hoursPerDay} onChange={e => setCfg({ ...cfg, hoursPerDay: Number(e.target.value) || 8 })} /></Field>
                    <Field label="FMLA entitlement (hrs)"><input type="number" min="1" style={bare} value={cfg.entitlementHrs} onChange={e => setCfg({ ...cfg, entitlementHrs: Number(e.target.value) || 480 })} /></Field>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <ListEditor title="Leave types" items={cfg.leaveTypes} setItems={v => setCfg({ ...cfg, leaveTypes: v })} />
                <ListEditor title="Absence types" items={cfg.absenceTypes} setItems={v => setCfg({ ...cfg, absenceTypes: v })} />
                <ListEditor title="Related persons" items={cfg.relatedPersons} setItems={v => setCfg({ ...cfg, relatedPersons: v })} />
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ case detail drawer ============ */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 20, display: "flex", justifyContent: "flex-end" }} onClick={() => setOpenId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 640, maxWidth: "100%", background: "#fff", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${B.line}`, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "#fff", zIndex: 1, flexWrap: "wrap" }}>
              <b style={{ fontSize: 15 }}>Request #{open.id}</b>
              <StatusChip status={caseStatus(open)} />
              <StepTrack lc={openLc} size={22} />
              {!open.cancelled && caseStatus(open) !== "Closed / Completed" && (
                <button onClick={() => upd(open.id, { cancelled: true })} style={{ marginLeft: "auto", background: "none", border: `1px solid ${B.line}`, color: B.dim, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Cancel request</button>
              )}
              {open.cancelled && (
                <button onClick={() => upd(open.id, { cancelled: false })} style={{ marginLeft: "auto", background: "none", border: `1px solid ${B.mag}`, color: B.mag, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reopen</button>
              )}
              <button onClick={() => { setCases(cs => cs.filter(x => x.id !== open.id)); setOpenId(null); }} style={{ marginLeft: open.cancelled || caseStatus(open) !== "Closed / Completed" ? 0 : "auto", background: "none", border: `1px solid ${B.line}`, color: B.dim, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Delete</button>
              <button onClick={() => setOpenId(null)} style={{ background: "none", border: "none", fontSize: 18, color: B.dim, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>
              {/* identity */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Employee name"><input style={bare} value={open.name} onChange={e => upd(open.id, { name: e.target.value })} /></Field>
                <Field label="Department"><input style={bare} value={open.dept} onChange={e => upd(open.id, { dept: e.target.value })} /></Field>
                <Field label="Leave type"><select style={bare} value={open.leaveType} onChange={e => upd(open.id, { leaveType: e.target.value })}>{cfg.leaveTypes.map(t => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Absence type"><select style={bare} value={open.absenceType} onChange={e => upd(open.id, { absenceType: e.target.value })}>{cfg.absenceTypes.map(t => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Related person"><select style={bare} value={open.relatedPerson} onChange={e => upd(open.id, { relatedPerson: e.target.value })}>{cfg.relatedPersons.map(t => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Schedule"><select style={bare} value={open.schedule} onChange={e => upd(open.id, { schedule: e.target.value })}><option>Continuous</option><option>Intermittent</option><option>Reduced Schedule</option></select></Field>
              </div>

              {/* eligibility engine */}
              {(() => {
                const results = allEligibility(open, cfg);
                const selected = results.find(r => r.policy.name === open.leaveType);
                return (
                  <div style={{ background: "#FAFAFB", border: `1px solid ${B.line}`, borderRadius: 8, padding: 16 }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: 13 }}>Eligibility <span style={{ fontWeight: 400, color: B.dim }}>(auto-calculated as of {fmt(open.requestReceived || TODAY)})</span></h4>
                    <div style={{ fontSize: 11, color: B.dim, marginBottom: 12 }}>Rules come from the Policies section in Configuration.</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                      <Field label="Hire date" style={{ width: 150 }}><input type="date" style={bare} value={open.hireDate || ""} onChange={e => upd(open.id, { hireDate: e.target.value })} /></Field>
                      <Field label="Hrs worked / prior 12 mo" style={{ width: 150 }}><input type="number" min="0" style={bare} value={open.hoursWorked12mo ?? ""} onChange={e => upd(open.id, { hoursWorked12mo: e.target.value })} /></Field>
                      <Field label="Work state" style={{ width: 90 }}><input style={bare} maxLength={2} placeholder="FL" value={open.workState || ""} onChange={e => upd(open.id, { workState: e.target.value.toUpperCase() })} /></Field>
                      <Field label="EEs within 75 mi" style={{ width: 120 }}><input type="number" min="0" style={bare} value={open.worksiteHeadcount ?? ""} onChange={e => upd(open.id, { worksiteHeadcount: e.target.value })} /></Field>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {results.map(r => (
                        <div key={r.policy.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 6, background: "#fff", border: `1px solid ${r.eligible ? B.ok + "66" : B.line}` }}>
                          <span style={{ fontSize: 14, color: r.eligible ? B.ok : B.risk, fontWeight: 800, width: 16 }}>{r.eligible ? "✓" : "✗"}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <b style={{ fontSize: 12.5 }}>{r.policy.name}</b>
                              <span style={{ fontSize: 11, color: B.dim }}>{r.policy.entitlementHrs} hrs entitlement</span>
                              {r.eligible && open.leaveType !== r.policy.name && (
                                <button onClick={() => upd(open.id, { leaveType: r.policy.name })} style={{ fontSize: 10.5, color: B.mag, background: "none", border: `1px solid ${B.mag}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontWeight: 700 }}>Use this policy</button>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: B.dim, marginTop: 3, display: "flex", flexWrap: "wrap", gap: "3px 12px" }}>
                              {r.checks.length === 0 && <span>No eligibility rules — all employees qualify</span>}
                              {r.checks.map((k, i) => (
                                <span key={i} style={{ color: k.pass ? B.dim : B.risk, fontWeight: k.pass ? 400 : 600 }}>{k.pass ? "✓" : "✗"} {k.label} ({k.detail})</span>
                              ))}
                            </div>
                            {r.policy.notes && <div style={{ fontSize: 10.5, color: B.dim, fontStyle: "italic", marginTop: 2 }}>{r.policy.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selected && !selected.eligible && (
                      <div style={{ marginTop: 10, fontSize: 12, color: B.risk, fontWeight: 700 }}>⚠ Selected leave type "{open.leaveType}" — employee does not meet eligibility. Review before sending eligibility notice.</div>
                    )}
                  </div>
                );
              })()}

              {/* lifecycle */}
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 13 }}>Lifecycle</h4>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {openLc.stages.map((s, i) => {
                    const active = i === openLc.current && !openLc.closed;
                    const isHR = s.who === "HR";
                    const fill = s.done ? (isHR ? B.navy : B.mag) : active ? "#fff" : "#E9EAEC";
                    return (
                      <div key={s.key} style={{ display: "flex", gap: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: fill, border: active ? `2px solid ${B.mag}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                            <PersonIcon group={isHR} color={s.done ? "#fff" : active ? B.mag : "#B6BAC0"} size={13} />
                            {s.done && <div style={{ position: "absolute", right: -4, bottom: -4, width: 13, height: 13, borderRadius: "50%", background: B.ok, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4.5 4.5L19 7"/></svg>
                            </div>}
                          </div>
                          {i < openLc.stages.length - 1 && <div style={{ width: 2, flex: 1, background: s.done ? B.ok + "88" : "#E9EAEC", minHeight: 22 }} />}
                        </div>
                        <div style={{ paddingBottom: 18, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <b style={{ fontSize: 13, color: active ? B.mag : B.ink }}>{s.label}</b>
                            <span style={{ fontSize: 10, color: isHR ? B.navy : B.mag, background: (isHR ? B.navy : B.mag) + "14", borderRadius: 4, padding: "1px 6px", fontWeight: 700, letterSpacing: "0.04em" }}>{isHR ? "HR" : "EMPLOYEE"}</span>
                            <DueBadge due={s.due} done={s.done} />
                            {s.done && <span style={{ fontSize: 11, color: B.ok, fontWeight: 600 }}>✓ {fmt(s.doneDate)}</span>}
                          </div>
                          {s.clockNote && <div style={{ fontSize: 11, color: B.dim, marginTop: 2 }}>{s.clockNote}</div>}
                          {(active || s.done) && (
                            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              <Field label={s.done ? "Completed on" : "Mark complete — date"} style={{ width: 170 }}>
                                <input type="date" style={bare} value={s.doneDate || ""} onChange={e => upd(open.id, { [s.field]: e.target.value })} />
                              </Field>
                              {s.key === "review" && (
                                <>
                                  <Field label="Designation" style={{ width: 140 }}>
                                    <select style={bare} value={open.designation} onChange={e => upd(open.id, { designation: e.target.value })}><option value="">—</option><option>Approved</option><option>Denied</option></select>
                                  </Field>
                                  {!open.cureRequested && !s.done && (
                                    <button onClick={() => upd(open.id, { cureRequested: TODAY })} style={{ background: "#fff", color: B.warn, border: `1.5px solid ${B.warn}`, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Needs cure →</button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          {/* cure substep */}
                          {s.sub && (
                            <div style={{ marginTop: 10, marginLeft: 6, paddingLeft: 12, borderLeft: `2px dashed ${B.warn}88` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: B.warn }}>↳ {s.sub.label} {fmt(open.cureRequested)}</span>
                                <DueBadge due={s.sub.due} done={s.sub.done} />
                                {s.sub.done && <span style={{ fontSize: 11, color: B.ok, fontWeight: 600 }}>✓ cured {fmt(s.sub.doneDate)}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: B.dim, marginTop: 2 }}>{s.sub.clockNote} — review clock restarts on receipt</div>
                              {!s.sub.done && (
                                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                                  <Field label="Cured docs received" style={{ width: 170 }}>
                                    <input type="date" style={bare} value={open.cureReceived} onChange={e => upd(open.id, { cureReceived: e.target.value })} />
                                  </Field>
                                  <button onClick={() => upd(open.id, { cureRequested: "", cureReceived: "" })} style={{ background: "none", border: "none", color: B.dim, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>remove cure</button>
                                </div>
                              )}
                            </div>
                          )}
                          {s.key === "rtw" && (
                            <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <Field label="Leave start" style={{ width: 160 }}><input type="date" style={bare} value={open.leaveStart} onChange={e => upd(open.id, { leaveStart: e.target.value })} /></Field>
                              <Field label="Expected RTW" style={{ width: 160 }}><input type="date" style={bare} value={open.expectedRTW} onChange={e => upd(open.id, { expectedRTW: e.target.value })} /></Field>
                              {openLc.rtwReminder && !s.done && (
                                <span style={{ alignSelf: "center", fontSize: 11.5, color: openLc.reminderActive ? B.warn : B.dim, fontWeight: openLc.reminderActive ? 700 : 500 }}>
                                  {openLc.reminderActive ? "⏰ Reminder window OPEN since " : "Reminder scheduled "} {fmt(openLc.rtwReminder)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* certification details — intermittent / reduced schedule */}
              {open.schedule !== "Continuous" && (() => {
                const cd = open.cert || {};
                const setCert = (patch) => upd(open.id, { cert: { ...cd, ...patch } });
                const chk = certCheck(open, cfg);
                return (
                  <div style={{ background: "#FAFAFB", border: `1px solid ${B.line}`, borderRadius: 8, padding: 16 }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: 13 }}>Certification details</h4>
                    <div style={{ fontSize: 11, color: B.dim, marginBottom: 12 }}>Certified frequency & duration from the WH-380 — ITOR entries are checked against these limits.</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                      <Field label="Frequency — up to" style={{ width: 90 }}><input type="number" min="0" style={bare} value={cd.freqTimes ?? ""} onChange={e => setCert({ freqTimes: e.target.value })} /></Field>
                      <Field label="times per" style={{ width: 110 }}><select style={bare} value={cd.freqPer || "week"} onChange={e => setCert({ freqPer: e.target.value })}><option value="week">week</option><option value="month">month</option></select></Field>
                      <Field label="Duration — up to" style={{ width: 100 }}><input type="number" min="0" step="0.5" style={bare} value={cd.durAmount ?? ""} onChange={e => setCert({ durAmount: e.target.value })} /></Field>
                      <Field label="per episode" style={{ width: 110 }}><select style={bare} value={cd.durUnit || "hours"} onChange={e => setCert({ durUnit: e.target.value })}><option value="hours">hours</option><option value="days">days</option></select></Field>
                      <Field label="Recertification due" style={{ width: 165 }}><input type="date" style={bare} value={cd.recertDue || ""} onChange={e => setCert({ recertDue: e.target.value })} /></Field>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="Condition (as certified)"><input style={bare} value={cd.condition || ""} onChange={e => setCert({ condition: e.target.value })} /></Field>
                      <Field label="Provider"><input style={bare} value={cd.provider || ""} onChange={e => setCert({ provider: e.target.value })} /></Field>
                    </div>
                    {chk && (
                      <div style={{ marginTop: 12, fontSize: 12 }}>
                        <div style={{ color: B.dim }}>Certified: up to <b style={{ color: B.ink }}>{cd.freqTimes || "—"}×/{cd.freqPer}</b>, <b style={{ color: B.ink }}>{cd.durAmount || "—"} {cd.durUnit}</b> per episode{chk.epMaxHrs ? ` (${chk.epMaxHrs} hrs)` : ""}.</div>
                        {chk.recertDue && (
                          <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: B.dim }}>Recert:</span><DueBadge due={chk.recertDue} done={false} />
                          </div>
                        )}
                        {chk.overFreq.length > 0 && chk.overFreq.map(o => (
                          <div key={o.period} style={{ color: B.risk, fontWeight: 600, marginTop: 4 }}>⚠ {o.count} episodes in {cd.freqPer === "month" ? o.period : `week of ${fmt(o.period)}`} — exceeds certified {cd.freqTimes}×/{cd.freqPer}. Consider recertification.</div>
                        ))}
                        {chk.overDur.length > 0 && (
                          <div style={{ color: B.risk, fontWeight: 600, marginTop: 4 }}>⚠ {chk.overDur.length} entr{chk.overDur.length === 1 ? "y" : "ies"} exceed{chk.overDur.length === 1 ? "s" : ""} certified episode duration (flagged below).</div>
                        )}
                        {chk.overFreq.length === 0 && chk.overDur.length === 0 && (open.itor || []).length > 0 && (
                          <div style={{ color: B.ok, fontWeight: 600, marginTop: 4 }}>✓ Usage within certified frequency & duration.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* hours */}
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Hours tracking</h4>
                <div style={{ fontSize: 11.5, color: B.dim, marginBottom: 8 }}>{openHrs.source}</div>
                <Bar used={openHrs.total} total={cfg.entitlementHrs} />
                {open.schedule === "Intermittent" && open.designation === "Approved" && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>ITOR entries</div>
                    {open.itor.sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${B.line}`, alignItems: "center" }}>
                        <span style={{ width: 120 }}>{fmt(e.date)}</span><b>{e.hrs} hrs</b>
                        {(() => { const chk = certCheck(open, cfg); return chk && chk.epMaxHrs && Number(e.hrs) > chk.epMaxHrs ? <span style={{ fontSize: 11, color: B.risk, fontWeight: 700 }}>⚠ over cert ({chk.epMaxHrs}h max)</span> : null; })()}
                        <button onClick={() => upd(open.id, { itor: open.itor.filter((_, j) => j !== i) })} style={{ marginLeft: "auto", background: "none", border: "none", color: B.dim, cursor: "pointer", fontSize: 12 }}>✕</button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <Field label="Date" style={{ width: 160 }}><input type="date" style={bare} value={itorDraft.date} onChange={e => setItorDraft({ ...itorDraft, date: e.target.value })} /></Field>
                      <Field label="Hours" style={{ width: 90 }}><input type="number" step="0.25" min="0" style={bare} value={itorDraft.hrs} onChange={e => setItorDraft({ ...itorDraft, hrs: e.target.value })} /></Field>
                      <button onClick={() => { if (itorDraft.date && Number(itorDraft.hrs) > 0) { upd(open.id, { itor: [...open.itor, { date: itorDraft.date, hrs: Number(itorDraft.hrs) }] }); setItorDraft({ date: TODAY, hrs: "" }); } }}
                        style={{ background: B.mag, color: "#fff", border: "none", borderRadius: 6, padding: "0 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Log</button>
                    </div>
                  </div>
                )}
                {open.schedule !== "Intermittent" && open.designation === "Approved" && open.actualRTW === "" && (
                  <div style={{ marginTop: 10 }}>
                    <Field label="Actual RTW (stops the auto-clock)" style={{ width: 200 }}><input type="date" style={bare} value={open.actualRTW} onChange={e => upd(open.id, { actualRTW: e.target.value })} /></Field>
                  </div>
                )}
              </div>

              <Field label="Case notes"><textarea style={{ ...bare, minHeight: 64, resize: "vertical" }} value={open.notes} onChange={e => upd(open.id, { notes: e.target.value })} /></Field>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
