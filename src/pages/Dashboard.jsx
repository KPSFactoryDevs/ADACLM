// src/pages/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gauge } from "../components/ui/Gauge";
import { Pill } from "../components/ui/Pill";
import { Sparkline } from "../components/ui/Sparkline";
import { AlertIcon, TrendIcon, BarsIcon, BriefcaseIcon, BuildingIcon, CrIcon, ShieldIcon, ArrowRightIcon } from "../components/ui/Icons";

/* ---------------- MOCK ---------------- */
// trend (0-100)
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
  { id: "tax",  label: "Minacce erariali e rischi",         result: "Solidità" },
  { id: "asis", label: "Profilo rischio AS IS",             result: "Fragilità" },
  { id: "tobe", label: "Questionario TO BE",                result: "Stabilità" },
];

function resultColor(result) {
  switch ((result || "").toLowerCase()) {
    case "solidità":  return "#16a34a"; // emerald-600
    case "stabilità": return "#14b8a6"; // teal-500
    case "alert":     return "#f59e0b"; // amber-500
    case "fragilità": return "#ef4444"; // red-500
    default:          return "#64748b"; // slate-500
  }
}

function ResultPill({ result }) {
  const c = resultColor(result);
  return <Pill text={result} color={c} className="font-medium px-3" />;
}

function AreaIconWrapper({ id }) {
  const className = "text-white";
  switch (id) {
    case "cr":   return <CrIcon className={className}/>;
    case "bil":  return <BarsIcon className={className}/>;
    case "com":  return <BriefcaseIcon className={className}/>;
    case "org":  return <BuildingIcon className={className}/>;
    case "evt":  return <AlertIcon className={className}/>;
    case "tax":  return <ShieldIcon className={className}/>;
    case "asis": return <ShieldIcon className={className}/>;
    case "tobe": return <AlertIcon className={className}/>;
    default:     return <ShieldIcon className={className}/>;
  }
}

// Banche trovate nei documenti CR (mock)
const CR_ISTITUTI = [
  { id: "intesa",   name: "Intesa Sanpaolo",   last: "Novembre 2024", exposure: 125000.0, positions: 5, status: "Attivo" },
  { id: "unicredit",name: "UniCredit",         last: "Novembre 2024", exposure: 87000.8,  positions: 3, status: "Attivo" },
  { id: "bpm",      name: "Banco BPM",         last: "Ottobre 2024",  exposure: 34000.0,  positions: 2, status: "In calo" },
  { id: "bnl",      name: "BNL",               last: "Settembre 2024",exposure: 0.0,      positions: 0, status: "Nessuna esposizione" },
];

// Utilities
function fmtMoney(v) {
  return Number(v || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
function classify(score) { 
  for (const s of SCALE) if (score >= s.min) return s; 
  return SCALE.at(-1); 
}
function computeAllertaScore({ bilancio, cr, toBe }) { return Math.round(0.4*bilancio + 0.4*cr + 0.2*toBe); }

/* Icone per "Vai a" */
const IconCircle = ({ children }) => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7e85ff] to-[#5b63ff] text-white flex items-center justify-center shadow-md">
    {children}
  </div>
);

export default function Dashboard() {
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sb_user")) || { name: "Utente" }; }
    catch { return { name: "Utente" }; }
  });

  const scoreCR  = TREND_CR.at(-1);
  const scoreBil = TREND_BILANCIO.at(-1);
  const allertaScore = computeAllertaScore({ bilancio: scoreBil, cr: scoreCR, toBe: QUESTIONARI.toBe });
  
  const allerta = classify(allertaScore);
  const crClass = classify(scoreCR);
  const bilClass = classify(scoreBil);

  return (
    <div className="space-y-6 pb-12 font-sans bg-slate-50 min-h-screen text-slate-800">
      {/* Header benvenuto */}
      <div className="flex items-start justify-between">
        <div className="animate-fade-in-up">
          <div className="text-sm text-[#5b63ff] tracking-wide font-semibold uppercase">Workspace</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Bentornato, {user?.name}
          </h1> 
          <p className="mt-1 text-slate-500">Ecco un riepilogo della situazione finanziaria aggiornata ad oggi.</p>
        </div>
      </div>

      {/* RIGA 1 — Allerta Principale */}
      <section className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 transition duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex-1 w-full">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Giudizio Allerta Globale</div>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">Stato Complessivo</h2>
              <Pill text={allerta.label} color={allerta.color} className="text-sm shadow-sm" />
            </div>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-lg">
              Basato su algoritmi proprietari che analizzano l'ultimo bilancio depositato, 
              le segnalazioni in Centrale Rischi e l'esito dei questionari qualitativi.
            </p>
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Bilancio", score: scoreBil, css: bilClass },
                { label: "Centrale Rischi", score: scoreCR, css: crClass },
                { label: "Questionari", score: scoreCR, css: crClass }
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm">
                  <div className="text-xs font-semibold text-slate-500">{item.label}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xl font-bold text-slate-800" style={{ color: item.css.color }}>{item.score}/100</div>
                    <Pill text={item.css.label} color={item.css.color} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="shrink-0 flex items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 shadow-inner">
            <Gauge value={allertaScore} color={allerta.color} size={140} stroke={12} label="Score Globale" />
          </div>
        </div>
      </section>

      {/* === Analisi per area ======================================== */}
      <section className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#5b63ff] rounded-full"></div>
            Analisi dettagliata per area
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {AREA_RESULTS.map((a, i) => (
            <div
              key={a.id}
              className="group rounded-xl border border-slate-100 px-4 py-4 flex items-center justify-between bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 shadow-sm cursor-default"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full grid place-items-center bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <AreaIconWrapper id={a.id} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-700 truncate text-sm">{a.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Assessment automatico</div>
                </div>
              </div>
              <ResultPill result={a.result} />
            </div>
          ))}
        </div>
      </section>

      {/* RIGA 2 — Trend Grafici ==================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-500 uppercase">Trend Bilancio</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{TREND_BILANCIO.length} Mesi <span className="text-sm font-normal text-slate-400">di storico</span></div>
            </div>
            <Pill text={bilClass.label} color={bilClass.color} />
          </div>
          <div className="mt-6 h-[80px]">
            <Sparkline data={TREND_BILANCIO} color={bilClass.color} height={80} strokeWidth={3} />
          </div>
        </section>

        <section className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-500 uppercase">Trend Centrale Rischi</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{TREND_CR.length} Mesi <span className="text-sm font-normal text-slate-400">di storico</span></div>
            </div>
            <Pill text={crClass.label} color={crClass.color} />
          </div>
          <div className="mt-6 h-[80px]">
            <Sparkline data={TREND_CR} color={crClass.color} height={80} strokeWidth={3} />
          </div>
        </section>
      </div>

      {/* RIGA 3 — Navigation Cards ================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link to="/analisi-bilancio" className="group relative overflow-hidden rounded-2xl border border-slate-200/80 p-5 bg-white shadow-sm ring-1 ring-slate-50 hover:shadow-md hover:border-[#5b63ff]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700 ease-out text-[#5b63ff]">
            <BarsIcon className="w-24 h-24" />
          </div>
          <div className="relative flex items-center justify-between">
             <div className="flex items-center gap-4">
               <IconCircle><BarsIcon className="w-5 h-5"/></IconCircle>
               <div>
                 <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Esplora</div>
                 <div className="mt-0.5 font-bold text-slate-800 text-lg group-hover:text-[#5b63ff] transition-colors">Tutti i Bilanci</div>
               </div>
             </div>
             <ArrowRightIcon className="w-5 h-5 text-slate-300 group-hover:text-[#5b63ff] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link to="/analisi-cr" className="group relative overflow-hidden rounded-2xl border border-slate-200/80 p-5 bg-white shadow-sm ring-1 ring-slate-50 hover:shadow-md hover:border-[#5b63ff]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700 ease-out text-[#5b63ff]">
             <CrIcon className="w-24 h-24" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <IconCircle><CrIcon className="w-5 h-5" /></IconCircle>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Esplora</div>
                <div className="mt-0.5 font-bold text-slate-800 text-lg group-hover:text-[#5b63ff] transition-colors">Centrale Rischi</div>
              </div>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-slate-300 group-hover:text-[#5b63ff] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link to="/allerta" className="group relative overflow-hidden rounded-2xl border border-slate-200/80 p-5 bg-white shadow-sm ring-1 ring-slate-50 hover:shadow-md hover:border-[#5b63ff]/30 transition-all duration-300">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700 ease-out text-[#5b63ff]">
             <AlertIcon className="w-24 h-24" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <IconCircle><AlertIcon className="w-5 h-5" /></IconCircle>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Esplora</div>
                <div className="mt-0.5 font-bold text-slate-800 text-lg group-hover:text-[#5b63ff] transition-colors">Questionari</div>
              </div>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-slate-300 group-hover:text-[#5b63ff] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* RIGA 4 — Tabelle istituti & banche ========================== */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#5b63ff] rounded-full"></div>
            <h3 className="font-bold text-slate-800">Istituti di credito <span className="text-slate-400 font-normal ml-1">(da Centrale Rischi)</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Istituto</th>
                <th className="px-6 py-4 text-left whitespace-nowrap font-semibold">Ultimo periodo</th>
                <th className="px-6 py-4 text-right font-semibold">Esposizione</th>
                <th className="px-6 py-4 text-center font-semibold">Posizioni</th>
                <th className="px-6 py-4 text-left font-semibold">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {CR_ISTITUTI.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-800">{b.name}</td>
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{b.last}</td>
                  <td className="px-6 py-4 text-right tabular-nums font-semibold text-slate-700">{fmtMoney(b.exposure)}</td>
                  <td className="px-6 py-4 text-center text-slate-500 font-medium">
                    <span className="bg-slate-100 px-2 py-1 rounded-md">{b.positions}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-transform duration-300 group-hover:scale-105 ${
                      b.status === "Attivo"
                        ? "bg-teal-50 text-teal-700 border border-teal-200/60 ring-1 ring-teal-500/10"
                        : b.status === "In calo"
                        ? "bg-amber-50 text-amber-700 border border-amber-200/60 ring-1 ring-amber-500/10"
                        : "bg-slate-50 text-slate-600 border border-slate-200/60 ring-1 ring-slate-900/5"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        b.status === 'Attivo' ? 'bg-teal-500 shadow-[0_0_4px_#14b8a6]' :
                        b.status === 'In calo' ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]' :
                        'bg-slate-400'
                      }`} />
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
