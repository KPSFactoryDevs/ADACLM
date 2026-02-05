// src/pages/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ---------------- MOCK ---------------- */
// trend (0–100)
const TREND_CR = [62, 64, 61, 59, 66, 68, 71, 70, 69, 72, 74, 73];
const TREND_BILANCIO = [70, 72, 71, 69, 68, 70, 72, 73, 75, 76, 78, 80];
// saldi conti
const CONTI = [1450.45, 218.96, 0.05, 300.0];
// questionari
const QUESTIONARI = { asIs: 68, toBe: 78 };
// scala giudizi
const SCALE = [
  { label: "Solida",        min: 90, color: "#16a34a" },
  { label: "Molto buona",   min: 80, color: "#22c55e" },
  { label: "Buona",         min: 70, color: "#4ade80" },
  { label: "Neutra",        min: 60, color: "#a3a3a3" },
  { label: "Debole",        min: 50, color: "#f59e0b" },
  { label: "Molto debole",  min: 40, color: "#f97316" },
  { label: "Fragile",       min: 0,  color: "#ef4444" },
];

/* ===== Analisi per area (mock) ===== */
const AREA_RESULTS = [
  { id: "com",  label: "Minacce rapporti commerciali",      result: "Solidità" },
  { id: "org",  label: "Minacce gestione aziendale",        result: "Solidità" },
  { id: "evt",  label: "Minacce da eventi pregiudizievoli", result: "Solidità" },
  { id: "tax",  label: "Minacce erariali e rischi caratteristici", result: "Solidità" },
  { id: "asis", label: "Profilo rischio AS IS",             result: "Fragilità" },
  { id: "tobe", label: "Questionario TO BE",                 result: "Stabilità" },
];

/* mappa risultato -> colori */
function resultColor(result) {
  switch ((result || "").toLowerCase()) {
    case "solidità":  return "#16a34a";
    case "stabilità": return "#14b8a6";
    case "alert":     return "#f59e0b";
    case "fragilità": return "#ef4444";
    default:          return "#6b7280";
  }
}

/* pill risultato */
function ResultPill({ result }) {
  const c = resultColor(result);
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
      style={{ color: c, backgroundColor: c + "1A", borderColor: c + "33" }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: c }} />
      {result}
    </span>
  );
}

/* icone semplici per le aree */
const IcoCR = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 13l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoBil = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M7 9h10M7 13h6M7 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IcoBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);
const IcoBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="10" height="18" rx="1" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M17 9h3v12h-3" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M7 7h4M7 11h4M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IcoAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M12 9v5m0 3v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IcoShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 3 5 6v6c0 5 7 9 7 9s7-4 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);

/* selettore icona per id area */
function AreaIcon({ id }) {
  switch (id) {
    case "cr":   return <IcoCR/>;
    case "bil":  return <IcoBil/>;
    case "com":  return <IcoBriefcase/>;
    case "org":  return <IcoBuilding/>;
    case "evt":  return <IcoAlert/>;
    case "tax":  return <IcoShield/>;
    case "asis": return <IcoShield/>;
    case "tobe": return <IcoAlert/>;
    default:     return <IcoShield/>;
  }
}

// Banche trovate nei documenti CR (mock)
const CR_ISTITUTI = [
  { id: "intesa",   name: "Intesa Sanpaolo",   last: "Novembre 2024", exposure: 125000.0, positions: 5, status: "Attivo" },
  { id: "unicredit",name: "UniCredit",         last: "Novembre 2024", exposure: 87000.8,  positions: 3, status: "Attivo" },
  { id: "bpm",      name: "Banco BPM",         last: "Ottobre 2024",  exposure: 34000.0,  positions: 2, status: "In calo" },
  { id: "bnl",      name: "BNL",               last: "Settembre 2024",exposure: 0.0,      positions: 0, status: "Nessuna esposizione" },
];

// Banche dei conti correnti (mock coerente con pagina Conti)
const BANKS = [
  {
    id: "mps",
    name: "Monte dei Paschi Personal",
    logo: { type: "circle", initials: "MP" },
    accounts: [
      { id: "op",   name: "Conto Operativo Mps", balance: 1450.45 },
      { id: "tech", name: "Conto Tecnico Mps",   balance: 218.96 },
    ],
    lastSync: "2h fa",
  },
  {
    id: "pp",
    name: "Paypal",
    logo: { type: "image", provider: "paypal" },
    accounts: [{ id: "pp", name: "Paypal", balance: 0.05 }],
    lastSync: "ieri",
  },
  {
    id: "manual",
    name: "Conti creati manualmente",
    logo: { type: "square", initials: "CM" },
    accounts: [{ id: "cash", name: "Cassa Contanti", balance: 300.0 }],
    lastSync: "—",
  },
];

/* ---------------- UTILS ---------------- */
function fmtMoney(v) {
  return Number(v || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
function companyFromStorage() {
  try { return JSON.parse(localStorage.getItem("sb_company")) || { name: "ACME S.p.A." }; }
  catch { return { name: "ACME S.p.A." }; }
}
function classify(score) { for (const s of SCALE) if (score >= s.min) return s; return SCALE.at(-1); }
function computeAllertaScore({ bilancio, cr, toBe }) { return Math.round(0.4*bilancio + 0.4*cr + 0.2*toBe); }

/* ---------------- SMALL UI ---------------- */
function Gauge({ value = 0, color = "#111", size = 84, stroke = 10, label = "" }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#eee" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="600">{value}</text>
      </svg>
      <div className="text-sm">
        <div className="font-medium">{label}</div>
        <div className="text-neutral-500">punteggio 77/100</div>
      </div>
    </div>
  );
}
function Sparkline({ data = [], color = "#111", width = 260, height = 60 }) {
  if (!data.length) return null;
  const max = Math.max(...data), min = Math.min(...data), dx = width / (data.length - 1 || 1);
  const sy = (v)=> max===min ? height/2 : height - ((v - min) / (max - min)) * height;
  let d = ""; data.forEach((v,i)=>{ const x=i*dx, y=sy(v); d+=(i?"L":"M")+x+" "+y+" "; });
  return <svg width={width} height={height}><path d={d} fill="none" stroke={color} strokeWidth="2"/></svg>;
}
function Pill({ text, color }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
      style={{ color, backgroundColor: color+"22", borderColor: color+"55" }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {text}
    </span>
  );
}

/* Icone per “Vai a” */
const IconCircle = ({ children }) => (
  <div className="w-9 h-9 rounded-full bg-[#F1EFFF] text-[#5b63ff] grid place-items-center">{children}</div>
);
function BarsIcon(){ return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="10" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
  <rect x="10.5" y="6" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.8"/>
  <rect x="17" y="12" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.8"/>
</svg>); }
function TrendIcon(){ return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
  <path d="M3 17l6-6 4 4 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
</svg>); }
function AlertIcon(){ return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
  <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.8"/><path d="M12 9v5m0 3v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
</svg>); }

/* Loghi banche */
function BrandLogo({ logo }) {
  if (logo?.type === "image" && logo.provider === "paypal") {
    return (
      <div className="w-7 h-7 grid place-items-center rounded-full bg-white border border-neutral-200">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M8 17h6.5c2.5 0 4.5-2 4.5-4.5S17 8 14.5 8H10" stroke="#2c5cc5" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 17l1.2-9H14c2 0 3.5 1.5 3.5 3.5S16 15 14 15h-3" stroke="#00a8ea" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  if (logo?.type === "square")
    return <div className="w-7 h-7 grid place-items-center rounded-md bg-neutral-200 text-neutral-700 text-[10px] font-semibold">{logo.initials}</div>;
  return <div className="w-7 h-7 grid place-items-center rounded-full bg-neutral-800 text-white text-[10px] font-semibold">{logo?.initials || "•"}</div>;
}

/* ---------------- PAGE ---------------- */
export default function Dashboard() {
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sb_user")) || { name: "Utente" }; }
    catch { return { name: "Utente" }; }
  });
  const company = companyFromStorage();

  // calcoli mock
  const saldoTotale = useMemo(() => CONTI.reduce((a, b) => a + b, 0), []);
  const scoreCR  = TREND_CR.at(-1);
  const scoreBil = TREND_BILANCIO.at(-1);
  const allertaScore = computeAllertaScore({ bilancio: scoreBil, cr: scoreCR, toBe: QUESTIONARI.toBe });
  const allerta = classify(allertaScore);
  const crClass = classify(scoreCR);
  const bilClass = classify(scoreBil);

  return (
    <div className="space-y-6">
      {/* Header benvenuto */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[#5b63ff] font-medium">Dashboard</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Benvenuto, {user?.name}</h1> 
        </div>
     
      </div>

      {/* RIGA 1 — Allerta + Saldo */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        <section className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-neutral-500">Giudizio Allerta</div>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-xl font-semibold">Stato complessivo</h2>
                <Pill text={allerta.label} color={allerta.color} />
              </div>
              <p className="text-sm text-neutral-500 mt-1">Basato su: Bilancio recente, Centrale Rischi (ultimo anno), Questionari.</p>
            </div>
            <Gauge value={allertaScore} color={allerta.color} label="Allerta" />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Bilancio (più recente)</div>
              <div className="mt-1 flex items-center justify-between">
                <div className="font-medium">{scoreBil}/100</div>
                <Pill text={bilClass.label} color={bilClass.color} />
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Centrale Rischi (ultimo anno)</div>
              <div className="mt-1 flex items-center justify-between">
                <div className="font-medium">{scoreCR}/100</div>
                <Pill text={crClass.label} color={crClass.color} />
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Questionari</div>
               <div className="mt-1 flex items-center justify-between">
                <div className="font-medium">{scoreCR}/100</div>
                <Pill text={crClass.label} color={crClass.color} />
              </div>
            </div>
          </div>
        </section>

 
      </div>

      {/* === Analisi per area ======================================== */}
<section className="bg-white border border-neutral-200 rounded-xl shadow-sm">
  <div className="px-4 py-3 border-b border-neutral-200">
    <h2 className="font-semibold">Analisi per area</h2>
  </div>

  {/* Griglia responsive: 2 colonne su md, 3 su xl */}
  <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    {AREA_RESULTS.map((a) => (
      <div
        key={a.id}
        className="rounded-xl border border-neutral-200 px-3 py-3 flex items-center justify-between hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full grid place-items-center bg-neutral-900 text-white shrink-0">
            <AreaIcon id={a.id} />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{a.label}</div>
          </div>
        </div>
        <ResultPill result={a.result} />
      </div>
    ))}
  </div>
</section>


      {/* RIGA 2 — Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-neutral-500">Andamento giudizio Bilancio</div>
              <div className="mt-1 font-semibold">{TREND_BILANCIO.length} mesi</div>
            </div>
            <Pill text={bilClass.label} color={bilClass.color} />
          </div>
          <div className="mt-3"><Sparkline data={TREND_BILANCIO} color={bilClass.color} /></div>
        </section>

        <section className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-neutral-500">Andamento giudizio CR</div>
              <div className="mt-1 font-semibold">{TREND_CR.length} mesi</div>
            </div>
            <Pill text={crClass.label} color={crClass.color} />
          </div>
          <div className="mt-3"><Sparkline data={TREND_CR} color={crClass.color} /></div>
        </section>
      </div>

      {/* RIGA 3 — Vai a (con icone) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/analisi-bilancio" className="rounded-xl border border-neutral-200 p-4 bg-white hover:bg-neutral-50 transition flex items-center gap-3">
          <IconCircle><BarsIcon /></IconCircle>
          <div>
            <div className="text-sm text-neutral-500">Vai a</div>
            <div className="mt-0.5 font-semibold">Tutti i Bilanci</div>
          </div>
        </Link>
        <Link to="/analisi-cr" className="rounded-xl border border-neutral-200 p-4 bg-white hover:bg-neutral-50 transition flex items-center gap-3">
          <IconCircle><TrendIcon /></IconCircle>
          <div>
            <div className="text-sm text-neutral-500">Vai a</div>
            <div className="mt-0.5 font-semibold">Centrale Rischi</div>
          </div>
        </Link>
        <Link to="/allerta" className="rounded-xl border border-neutral-200 p-4 bg-white hover:bg-neutral-50 transition flex items-center gap-3">
          <IconCircle><AlertIcon /></IconCircle>
          <div>
            <div className="text-sm text-neutral-500">Vai a</div>
            <div className="mt-0.5 font-semibold">Questionari</div>
          </div>
        </Link>

       
      </div>

      {/* RIGA 4 — Tabelle istituti & banche */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
        {/* Istituti trovati nelle CR */}
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="px-4 py-3 border-b border-neutral-200">
            <h3 className="font-semibold">Istituti di credito (da Centrale Rischi)</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-3 text-left">Istituto</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">Ultimo periodo</th>
                <th className="px-3 py-3 text-right">Esposizione</th>
                <th className="px-3 py-3 text-center">Posizioni</th>
                <th className="px-3 py-3 text-left">Stato</th>
              </tr>
            </thead>
            <tbody>
              {CR_ISTITUTI.map((b) => (
                <tr key={b.id} className="border-t border-neutral-200">
                  <td className="px-3 py-3">{b.name}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{b.last}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(b.exposure)}</td>
                  <td className="px-3 py-3 text-center">{b.positions}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
                      b.status === "Attivo"
                        ? "bg-teal-100 text-teal-800 border-teal-200"
                        : b.status === "In calo"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-neutral-100 text-neutral-700 border-neutral-200"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

 
      </div>
    </div>
  );
}
