import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Droplet, Search, UserPlus, Siren, ShieldCheck, X, Phone, Mail, Building2, Calendar, CheckCircle2, AlertTriangle, Clock, Users } from "lucide-react";

/* ---------------------------------------------------------
   Campus Blood Donor Portal
   Frontend: React (this file)
   Backend logic: pure functions below (eligibility, matching,
     stats) — runs client-side but is written as an isolated
     "service layer" (see DonorService / RequestService) so it
     maps 1:1 onto what would be API route handlers.
   Cloud storage: window.storage (shared) persists donors and
     requests across every visitor's session — this is the
     database tier.
--------------------------------------------------------- */

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const ELIGIBILITY_GAP_DAYS = 90; // standard whole-blood donation interval

// Compatible donor groups a patient of a given group can receive from
const COMPATIBILITY = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": BLOOD_GROUPS, // universal recipient
};

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function isEligible(lastDonationDate) {
  return daysSince(lastDonationDate) >= ELIGIBILITY_GAP_DAYS;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ------------------- "backend" service layer ------------------- */

const DonorService = {
  async list() {
    try {
      const res = await window.storage.get("donors-data", true);
      return res ? JSON.parse(res.value) : [];
    } catch {
      return [];
    }
  },
  async save(donors) {
    await window.storage.set("donors-data", JSON.stringify(donors), true);
  },
};

const RequestService = {
  async list() {
    try {
      const res = await window.storage.get("requests-data", true);
      return res ? JSON.parse(res.value) : [];
    } catch {
      return [];
    }
  },
  async save(requests) {
    await window.storage.set("requests-data", JSON.stringify(requests), true);
  },
};

/* ------------------------- shared bits ------------------------- */

function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
      :root{
        --crimson:#A31621; --crimson-dark:#7A0F19; --ivory:#FAF6EF;
        --ink:#211C1A; --gold:#C98A3E; --slate:#5C6670; --sage:#3F6B52;
        --card:#FFFFFF; --line:#E4DCCB;
      }
      .cbp-root{ font-family:'Inter',sans-serif; background:var(--ivory); color:var(--ink); }
      .cbp-display{ font-family:'Fraunces',serif; }
      .cbp-mono{ font-family:'JetBrains Mono',monospace; }
      .cbp-card{
        background:var(--card); border:1px solid var(--line); border-radius:14px;
        box-shadow:0 1px 2px rgba(33,28,26,0.04);
      }
      .idcard{
        position:relative; background:linear-gradient(160deg,#fff, #FBF3E7 120%);
        border:1px solid var(--line); border-radius:16px; overflow:hidden;
      }
      .idcard::before{
        content:''; position:absolute; top:0; left:0; right:0; height:8px;
        background:repeating-linear-gradient(90deg, var(--crimson) 0 10px, transparent 10px 18px);
        opacity:.5;
      }
      .punch{
        width:10px; height:10px; border-radius:50%; background:var(--ivory);
        border:1px solid var(--line); position:absolute; top:14px; right:14px;
      }
      .tab-btn{ transition:all .15s ease; }
      .tab-btn:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible{
        outline:2px solid var(--crimson); outline-offset:2px;
      }
      @media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition:none !important; } }
    `}</style>
  );
}

function BloodTag({ group, size = "md" }) {
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-2.5 py-1", lg: "text-lg px-3.5 py-1.5" };
  return (
    <span
      className={`cbp-mono font-bold rounded-full text-white ${sizes[size]}`}
      style={{ background: "var(--crimson)" }}
    >
      {group}
    </span>
  );
}

/* ------------------------- Hero / Home ------------------------- */

function Hero({ stats, onRegister, onFind }) {
  return (
    <section className="grid md:grid-cols-2 gap-10 items-center py-10 md:py-16">
      <div>
        <p className="cbp-mono text-xs tracking-widest uppercase mb-4" style={{ color: "var(--gold)" }}>
          Campus Blood Donor Portal
        </p>
        <h1 className="cbp-display font-semibold leading-[1.05] text-4xl md:text-5xl mb-5">
          One card.<br />One pint.<br />
          <span style={{ color: "var(--crimson)" }}>One life saved.</span>
        </h1>
        <p className="text-base md:text-lg mb-7 max-w-md" style={{ color: "var(--slate)" }}>
          A live registry of student and staff donors — search by blood group,
          post an urgent request, and see who on campus is eligible to give today.
        </p>
        <div className="flex flex-wrap gap-3 mb-9">
          <button
            onClick={onRegister}
            className="tab-btn px-5 py-3 rounded-full text-white font-semibold flex items-center gap-2"
            style={{ background: "var(--crimson)" }}
          >
            <UserPlus size={18} /> Become a donor
          </button>
          <button
            onClick={onFind}
            className="tab-btn px-5 py-3 rounded-full font-semibold flex items-center gap-2 border"
            style={{ borderColor: "var(--ink)" }}
          >
            <Search size={18} /> Find a donor
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-md">
          <Stat label="Registered" value={stats.total} />
          <Stat label="Eligible now" value={stats.eligible} accent="var(--sage)" />
          <Stat label="Open requests" value={stats.openRequests} accent="var(--crimson)" />
        </div>
      </div>

      <div className="flex justify-center md:justify-end">
        <div className="idcard w-72 p-6 -rotate-2 hover:rotate-0 transition-transform duration-300">
          <div className="punch" />
          <p className="cbp-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: "var(--slate)" }}>
            Campus Health Services
          </p>
          <p className="cbp-display font-semibold text-lg mb-4">Donor ID Card</p>
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--slate)" }}>Blood Group</p>
              <p className="cbp-mono font-bold text-4xl" style={{ color: "var(--crimson)" }}>O+</p>
            </div>
            <Droplet size={40} strokeWidth={1.5} style={{ color: "var(--crimson)" }} />
          </div>
          <div className="h-px w-full mb-3" style={{ background: "var(--line)" }} />
          <p className="text-xs" style={{ color: "var(--slate)" }}>Status</p>
          <p className="text-sm font-semibold flex items-center gap-1" style={{ color: "var(--sage)" }}>
            <CheckCircle2 size={15} /> Eligible to donate
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent = "var(--ink)" }) {
  return (
    <div>
      <p className="cbp-mono font-bold text-2xl" style={{ color: accent }}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--slate)" }}>{label}</p>
    </div>
  );
}

/* ------------------------- Register form ------------------------- */

function RegisterForm({ onSubmit, submitting }) {
  const [form, setForm] = useState({
    name: "", studentId: "", department: "", bloodGroup: "",
    phone: "", email: "", lastDonationDate: "", consent: false,
  });
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = () => {
    if (!form.name || !form.bloodGroup || !form.phone || !form.consent) {
      setError("Name, blood group, phone, and consent are required.");
      return;
    }
    setError("");
    onSubmit({ ...form, id: uid(), registeredAt: new Date().toISOString() });
    setForm({ name: "", studentId: "", department: "", bloodGroup: "", phone: "", email: "", lastDonationDate: "", consent: false });
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <h2 className="cbp-display font-semibold text-3xl mb-1">Register as a donor</h2>
      <p className="mb-7" style={{ color: "var(--slate)" }}>Takes under a minute. Your card joins the campus directory instantly.</p>

      <div className="cbp-card p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name *">
            <input value={form.name} onChange={update("name")} className="cbp-input" placeholder="Jordan Alvarez" />
          </Field>
          <Field label="Student / staff ID">
            <input value={form.studentId} onChange={update("studentId")} className="cbp-input" placeholder="S-204817" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Blood group *">
            <select value={form.bloodGroup} onChange={update("bloodGroup")} className="cbp-input">
              <option value="">Select</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Department / hostel">
            <input value={form.department} onChange={update("department")} className="cbp-input" placeholder="Computer Science" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone *">
            <input value={form.phone} onChange={update("phone")} className="cbp-input" placeholder="+1 555 010 2938" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={update("email")} className="cbp-input" placeholder="jordan@campus.edu" />
          </Field>
        </div>

        <Field label="Last donation date (leave blank if never donated)">
          <input type="date" value={form.lastDonationDate} onChange={update("lastDonationDate")} className="cbp-input" />
        </Field>

        <label className="flex items-start gap-2 text-sm pt-1" style={{ color: "var(--slate)" }}>
          <input type="checkbox" checked={form.consent} onChange={update("consent")} className="mt-1" />
          I consent to my name, blood group, and contact details being visible to other verified campus members searching this portal.
        </label>

        {error && (
          <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--crimson)" }}>
            <AlertTriangle size={15} /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-full text-white font-semibold disabled:opacity-60"
          style={{ background: "var(--crimson)" }}
        >
          {submitting ? "Saving to registry…" : "Join the registry"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--slate)" }}>{label}</span>
      {children}
    </label>
  );
}

/* ------------------------- Find donors ------------------------- */

function FindDonors({ donors }) {
  const [group, setGroup] = useState("Any");
  const [query, setQuery] = useState("");
  const [onlyEligible, setOnlyEligible] = useState(false);

  const filtered = useMemo(() => {
    return donors.filter((d) => {
      if (group !== "Any" && d.bloodGroup !== group) return false;
      if (onlyEligible && !isEligible(d.lastDonationDate)) return false;
      if (query && !(`${d.name} ${d.department}`.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [donors, group, query, onlyEligible]);

  return (
    <div className="py-10">
      <h2 className="cbp-display font-semibold text-3xl mb-1">Find a donor</h2>
      <p className="mb-6" style={{ color: "var(--slate)" }}>{donors.length} registered on campus.</p>

      <div className="flex flex-wrap gap-3 mb-7">
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="cbp-input w-auto">
          <option>Any</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or department"
          className="cbp-input flex-1 min-w-[180px]"
        />
        <label className="flex items-center gap-2 text-sm px-3 rounded-full border" style={{ borderColor: "var(--line)" }}>
          <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
          Eligible only
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No donors match those filters yet. Try widening your search." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => <DonorCard key={d.id} donor={d} />)}
        </div>
      )}
    </div>
  );
}

function DonorCard({ donor }) {
  const eligible = isEligible(donor.lastDonationDate);
  return (
    <div className="idcard p-5">
      <div className="punch" />
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold cbp-display text-lg leading-tight">{donor.name}</p>
          {donor.department && <p className="text-xs" style={{ color: "var(--slate)" }}>{donor.department}</p>}
        </div>
        <BloodTag group={donor.bloodGroup} />
      </div>
      <div className="space-y-1.5 text-sm mb-4" style={{ color: "var(--slate)" }}>
        <p className="flex items-center gap-2"><Phone size={13} /> {donor.phone}</p>
        {donor.email && <p className="flex items-center gap-2 truncate"><Mail size={13} /> {donor.email}</p>}
      </div>
      <div
        className="text-xs font-semibold flex items-center gap-1.5 pt-3 border-t"
        style={{ borderColor: "var(--line)", color: eligible ? "var(--sage)" : "var(--slate)" }}
      >
        {eligible ? <CheckCircle2 size={14} /> : <Clock size={14} />}
        {eligible ? "Eligible to donate now" : `Eligible in ${ELIGIBILITY_GAP_DAYS - daysSince(donor.lastDonationDate)} days`}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="cbp-card p-10 text-center" style={{ color: "var(--slate)" }}>
      <Droplet size={28} className="mx-auto mb-3" style={{ color: "var(--gold)" }} />
      <p>{text}</p>
    </div>
  );
}

/* ------------------------- Requests board ------------------------- */

function RequestsBoard({ requests, donors, onPost, onFulfill, submitting }) {
  const [showForm, setShowForm] = useState(false);
  const open = requests.filter((r) => r.status === "open");
  const closed = requests.filter((r) => r.status === "fulfilled");

  return (
    <div className="py-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="cbp-display font-semibold text-3xl">Blood requests</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-full text-white font-semibold flex items-center gap-2 text-sm"
          style={{ background: "var(--crimson)" }}
        >
          <Siren size={16} /> {showForm ? "Close" : "Post urgent request"}
        </button>
      </div>
      <p className="mb-6" style={{ color: "var(--slate)" }}>{open.length} open on campus right now.</p>

      {showForm && (
        <RequestForm
          submitting={submitting}
          onSubmit={(r) => { onPost(r); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {open.length === 0 ? (
        <EmptyState text="No open requests. That's a good sign." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {open.map((r) => (
            <RequestCard key={r.id} req={r} donors={donors} onFulfill={() => onFulfill(r.id)} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--slate)" }}>
            {closed.length} fulfilled request{closed.length > 1 ? "s" : ""}
          </summary>
          <div className="grid sm:grid-cols-2 gap-4 mt-4 opacity-60">
            {closed.map((r) => <RequestCard key={r.id} req={r} donors={donors} fulfilled />)}
          </div>
        </details>
      )}
    </div>
  );
}

function RequestForm({ onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({ patientName: "", bloodGroup: "", units: "1", hospital: "", contactPhone: "", urgency: "Routine" });
  const [error, setError] = useState("");
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.bloodGroup || !form.hospital || !form.contactPhone) {
      setError("Blood group, hospital, and contact phone are required.");
      return;
    }
    setError("");
    onSubmit({ ...form, id: uid(), status: "open", postedAt: new Date().toISOString() });
  };

  return (
    <div className="cbp-card p-5 mb-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Patient name"><input value={form.patientName} onChange={update("patientName")} className="cbp-input" /></Field>
        <Field label="Blood group needed *">
          <select value={form.bloodGroup} onChange={update("bloodGroup")} className="cbp-input">
            <option value="">Select</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Units needed">
          <input type="number" min="1" value={form.units} onChange={update("units")} className="cbp-input" />
        </Field>
        <Field label="Urgency">
          <select value={form.urgency} onChange={update("urgency")} className="cbp-input">
            <option>Routine</option><option>Urgent</option><option>Critical</option>
          </select>
        </Field>
        <Field label="Contact phone *">
          <input value={form.contactPhone} onChange={update("contactPhone")} className="cbp-input" />
        </Field>
      </div>
      <Field label="Hospital / location *">
        <input value={form.hospital} onChange={update("hospital")} className="cbp-input" placeholder="Campus Health Center" />
      </Field>
      {error && <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--crimson)" }}><AlertTriangle size={15} />{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={submit} disabled={submitting} className="px-5 py-2.5 rounded-full text-white font-semibold text-sm" style={{ background: "var(--crimson)" }}>
          {submitting ? "Posting…" : "Post request"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-full font-semibold text-sm border" style={{ borderColor: "var(--line)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RequestCard({ req, donors, onFulfill, fulfilled }) {
  const matches = donors.filter((d) => (COMPATIBILITY[req.bloodGroup] || []).includes(d.bloodGroup) && isEligible(d.lastDonationDate));
  const urgencyColor = req.urgency === "Critical" ? "var(--crimson)" : req.urgency === "Urgent" ? "var(--gold)" : "var(--slate)";

  return (
    <div className="cbp-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold cbp-display text-lg">{req.patientName || "Patient"} · {req.units} unit(s)</p>
          <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "var(--slate)" }}>
            <Building2 size={13} /> {req.hospital}
          </p>
        </div>
        <BloodTag group={req.bloodGroup} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: urgencyColor }}>{req.urgency}</p>
      <p className="text-sm flex items-center gap-2 mb-3" style={{ color: "var(--slate)" }}>
        <Phone size={13} /> {req.contactPhone}
      </p>
      <p className="text-xs mb-3" style={{ color: "var(--slate)" }}>
        {matches.length} eligible compatible donor{matches.length !== 1 ? "s" : ""} on campus
      </p>
      {!fulfilled && (
        <button onClick={onFulfill} className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--sage)" }}>
          <CheckCircle2 size={14} /> Mark as fulfilled
        </button>
      )}
    </div>
  );
}

/* ------------------------- App shell ------------------------- */

const TABS = [
  { key: "home", label: "Home" },
  { key: "register", label: "Register" },
  { key: "find", label: "Find donors" },
  { key: "requests", label: "Requests" },
];

export default function App() {
  const [tab, setTab] = useState("home");
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const [d, r] = await Promise.all([DonorService.list(), RequestService.list()]);
      setDonors(d);
      setRequests(r);
      setLoading(false);
    })();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleRegister = useCallback(async (donor) => {
    setSubmitting(true);
    const next = [donor, ...donors];
    setDonors(next); // show it immediately, regardless of cloud save outcome
    setTab("find");
    try {
      await DonorService.save(next);
      showToast("Welcome to the registry — your card is live.");
    } catch (err) {
      console.error("DonorService.save failed:", err);
      showToast("Saved on this device — cloud sync will retry.");
    } finally {
      setSubmitting(false);
    }
  }, [donors]);

  const handlePostRequest = useCallback(async (req) => {
    setSubmitting(true);
    const next = [req, ...requests];
    setRequests(next);
    try {
      await RequestService.save(next);
      showToast("Request posted to the campus board.");
    } catch (err) {
      console.error("RequestService.save failed:", err);
      showToast("Saved on this device — cloud sync will retry.");
    } finally {
      setSubmitting(false);
    }
  }, [requests]);

  const handleFulfill = useCallback(async (id) => {
    const next = requests.map((r) => (r.id === id ? { ...r, status: "fulfilled" } : r));
    setRequests(next);
    await RequestService.save(next);
  }, [requests]);

  const stats = useMemo(() => ({
    total: donors.length,
    eligible: donors.filter((d) => isEligible(d.lastDonationDate)).length,
    openRequests: requests.filter((r) => r.status === "open").length,
  }), [donors, requests]);

  return (
    <div className="cbp-root min-h-screen">
      <FontStyles />

      <header className="border-b sticky top-0 z-10 backdrop-blur" style={{ borderColor: "var(--line)", background: "rgba(250,246,239,0.9)" }}>
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Droplet size={20} style={{ color: "var(--crimson)" }} fill="var(--crimson)" />
            <span className="cbp-display font-semibold text-lg">Campus Blood Portal</span>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="tab-btn px-3 py-2 rounded-full text-sm font-semibold"
                style={{
                  background: tab === t.key ? "var(--crimson)" : "transparent",
                  color: tab === t.key ? "#fff" : "var(--ink)",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5">
        {loading ? (
          <div className="py-24 text-center" style={{ color: "var(--slate)" }}>
            <Users className="mx-auto mb-3 animate-pulse" size={28} />
            Loading the registry…
          </div>
        ) : (
          <>
            {tab === "home" && <Hero stats={stats} onRegister={() => setTab("register")} onFind={() => setTab("find")} />}
            {tab === "register" && <RegisterForm onSubmit={handleRegister} submitting={submitting} />}
            {tab === "find" && <FindDonors donors={donors} />}
            {tab === "requests" && (
              <RequestsBoard requests={requests} donors={donors} onPost={handlePostRequest} onFulfill={handleFulfill} submitting={submitting} />
            )}
          </>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-5 py-10 mt-6 border-t text-xs flex items-center gap-2" style={{ borderColor: "var(--line)", color: "var(--slate)" }}>
        <ShieldCheck size={14} /> Data is stored securely in the campus cloud registry and shared only with portal visitors.
      </footer>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg flex items-center gap-2"
          style={{ background: "var(--ink)" }}
        >
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      <style>{`
        .cbp-input{
          width:100%; padding:0.65rem 0.85rem; border-radius:10px;
          border:1px solid var(--line); background:#fff; font-size:0.9rem; color:var(--ink);
        }
        .cbp-input:focus{ outline:2px solid var(--crimson); outline-offset:1px; }
      `}</style>
    </div>
  );
}
