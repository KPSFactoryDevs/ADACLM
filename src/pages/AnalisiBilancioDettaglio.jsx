// src/pages/AnalisiBilancioDettaglio.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, Link } from "react-router-dom";
import { Gauge } from "../components/ui/Gauge";
import { Badge } from "../components/ui/Badge";
import { Pill } from "../components/ui/Pill";
import { PencilIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, BarsIcon } from "../components/ui/Icons";
import { API_BASE } from "../lib/api";

function getAuth() {
  try {
    const raw = localStorage.getItem("authUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function commonHeaders() {
  const auth = getAuth();
  const token = auth?.token || auth?.access_token || auth?.jwt;
  const h = {
    Accept: "application/json",
    "CurrentCompany": localStorage.getItem("currentCompany") || "",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}
async function postRecapBilancioById(documentId) {
  const res = await fetch(`${API_BASE}/recapBilancio`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...commonHeaders() },
    body: JSON.stringify({ documentId }),
  });

  let data = null; try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data; // payload diretto con { idDocumento, renderHTML, bilancioAnalisi: {...} }
}
async function postAnalisiBilancioBasic(payload) {
  const res = await fetch(`${API_BASE}/analisiBilancioBasic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...commonHeaders() },
    body: JSON.stringify(payload),
  });
  let data = null; try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data;
}
// >>> NEW: salva voci mancanti indici
async function postMissingVoices(documentId, voci) {
  const res = await fetch(`${API_BASE}/missingVoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...commonHeaders() },
    body: JSON.stringify({ documentId, voci }),
  });
  let data = null; try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data;
}

/* ======================= Scale / utils UI ======================= */
// Scala per sezione Basic+Questionari (hero gauge)
const SCALE = [
  { label: "Solido",        min: 90, color: "#16a34a" }, // emerald-600
  { label: "Molto buono",   min: 80, color: "#22c55e" }, // green-500
  { label: "Buono",         min: 70, color: "#4ade80" }, // green-400
  { label: "Neutro",        min: 60, color: "#a3a3a3" }, // neutral-400
  { label: "Debole",        min: 50, color: "#f59e0b" }, // amber-500
  { label: "Molto debole",  min: 40, color: "#f97316" }, // orange-500
  { label: "Fragile",       min: 0,  color: "#ef4444" }, // red-500
];
// Scala per score Advanced (stessa dell'allerta/dashboard)
const SCALE_ADV = [
  { label: "Solidità",          min: 85, color: "#16a34a" },
  { label: "Fragilità",         min: 70, color: "#22c55e" },
  { label: "Fragilità elevata", min: 56, color: "#f59e0b" },
  { label: "Rischio alert",     min: 42, color: "#f97316" },
  { label: "Alert",             min: 28, color: "#fb923c" },
  { label: "Situazione Grave",  min: 14, color: "#ef4444" },
  { label: "Default",           min: 0,  color: "#dc2626" },
];
const ALERT_LINKS = [
  { id:"ade",    label:"Agenzia delle Entrate" },
  { id:"inps",   label:"INPS" },
  { id:"risc",   label:"Agente della Riscossione" },
  { id:"retrib", label:"Debiti per Retribuzioni" },
  { id:"forn",   label:"Debiti verso Fornitori" },
];
// mapping id -> chiave nel payload Questionari
const Q_MAP = {
  ade: "Agenzia delle Entrate",
  inps: "INPS",
  risc: "Agente della Riscossione",
  retrib: "Debiti per Retribuzioni",
  forn: "Debiti verso Fornitori",
};

/* ---------- Scoring Engine Bilancio (solo Basic + Questionari) ----------
 * Questo score riguarda SOLO indici Basic e Questionari.
 * Lo score degli Indici Avanzati è calcolato dal backend (valutazioneIndici)
 * e mostrato separatamente nella sezione dedicata.
 *
 * Pesi (riscalati a 100):
 *   Indici Basic  (CNDC)        → max 60 pt
 *   Questionari Allerta          → max 27 pt
 *   Completezza (basic+Q)        → max 13 pt
 * Totale                         → max 100 pt
 */
function computeBilancioScore(indiciBasic, alertStatusMap) {
  // ── 1) Indici Basic (60 pt) ──
  const basicItems = indiciBasic.length > 0 ? indiciBasic.slice(0, -1) : [];
  const basicSummary = indiciBasic.length > 0 ? indiciBasic.at(-1) : null;

  let basicEvaluable = 0, basicOk = 0;
  for (const r of basicItems) {
    if (r.missing || r.fuori === "N/A") continue;
    basicEvaluable++;
    const f = String(r.fuori).toLowerCase();
    if (f === "no") basicOk++;
  }

  let summaryWeight = 0, summaryOk = 0;
  if (basicSummary && !basicSummary.missing) {
    const note = String(basicSummary.note ?? "").toLowerCase();
    summaryWeight = 2;
    if (note.includes("non a rischio") || note.includes("non rischio")) {
      summaryOk = 2;
    } else if (note.includes("rischio")) {
      summaryOk = 0;
    } else {
      const f = String(basicSummary.fuori).toLowerCase();
      summaryOk = f === "no" ? 2 : 0;
    }
  }

  const basicTotal = basicEvaluable + summaryWeight;
  const basicScore = basicTotal > 0
    ? ((basicOk + summaryOk) / basicTotal) * 60
    : 0;

  // ── 2) Questionari Allerta (27 pt) ──
  const qIds = ["ade", "inps", "risc", "retrib", "forn"];
  let qPoints = 0;
  let qEvaluable = 0;
  for (const qid of qIds) {
    const status = alertStatusMap?.[qid];
    if (!status || status === "missing") continue;
    qEvaluable++;
    if (status === "ok") qPoints += 5.4; // 27/5 = 5.4 per questionario ok
  }
  const qScore = Math.min(27, qPoints);

  // ── 3) Completezza dati basic+questionari (13 pt) ──
  const totalBasic = basicItems.length;
  const totalMissing = basicItems.filter(r => r.missing).length;
  const totalCompiled = totalBasic - totalMissing;
  const dataCompleteness = totalBasic > 0 ? (totalCompiled / totalBasic) : 0;
  const qCompleteness = qIds.length > 0 ? (qEvaluable / qIds.length) : 0;
  const completenessScore = (dataCompleteness * 8) + (qCompleteness * 5); // max 13

  // ── Totale ──
  const raw = basicScore + qScore + completenessScore;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

const classify = (score)=> SCALE.find(s=>score>=s.min) || SCALE.at(-1);
const classifyAdv = (label) => SCALE_ADV.find(s => s.label === label) || SCALE_ADV.at(-1);
const fmtPerc = (v) => v==null ? "N/A" : (v).toLocaleString("it-IT",{maximumFractionDigits:2}) + "%";
const load = (k, def) => { try { const r = localStorage.getItem(k); return r?JSON.parse(r):def; } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
function parseNum(v){
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replaceAll(".", "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function ratio(a,b, asPercent=false){
  const x = parseNum(a), y = parseNum(b);
  if (x == null || y == null || y === 0) return null;
  const r = x / y;
  return asPercent ? r*100 : r;
}
function toApiString(v) {
  const n = parseNum(v);
  return n == null ? "" : String(n);
}

/* ======================= Small UI / Skeletons ======================= */
function StatusIcon({ kind }) {
  if (kind === "ok") return <Badge tone="teal"><CheckCircleIcon className="w-3.5 h-3.5 mr-0.5"/>No</Badge>;
  if (kind === "bad") return <Badge tone="rose"><XCircleIcon className="w-3.5 h-3.5 mr-0.5"/>Sì</Badge>;
  return <Badge tone="amber"><AlertTriangleInline className="w-3.5 h-3.5 mr-0.5"/>N/D</Badge>;
}

function StatusIconTwo({ kind }) {
  if (kind === "ok") return <Badge tone="emerald" className="px-2 py-0.5"><CheckCircleIcon className="w-4 h-4 mr-0.5"/>OK</Badge>;
  if (kind === "bad") return <Badge tone="rose" className="px-2 py-0.5"><XCircleIcon className="w-4 h-4 mr-0.5"/>Rischio</Badge>;
  return <Badge tone="amber" className="px-2 py-0.5"><AlertTriangleInline className="w-3.5 h-3.5 mr-0.5"/>Da valutare</Badge>;
}

// Inline tiny alert triangle SVG (replaces emoji ⚠️)
function AlertTriangleInline({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}

const SkLine = ({ w="100%", h=12, className="" }) => (
  <div className={`animate-pulse rounded ${className}`} style={{ width:w, height:h, backgroundColor:"var(--sk-bg, #e8ecf1)" }} />
);
const SkBadge = ({ w=120, h=28 }) => <SkLine w={w} h={h} className="rounded-full" />;
const SkBtn = ({ w=130, h=36 }) => <SkLine w={w} h={h} className="rounded-xl" />;
const SkCircle = ({ size=96 }) => (
  <div className="animate-pulse rounded-full" style={{ width:size, height:size, backgroundColor:"var(--sk-bg, #e8ecf1)" }} />
);

function FullPageLoader({ show }) {
  if (!show) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/50 grid place-items-center anim-fade-in" role="status">
      <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl">
        <div className="h-10 w-10 border-4 border-slate-100 border-t-[var(--brand)] rounded-full animate-spin" style={{ willChange: 'transform' }} />
        <div className="text-sm font-semibold text-slate-700">Elaborazione bilancio in corso...</div>
      </div>
    </div>,
    document.body
  );
}

/* ======================= Memoized Sub-Tables ======================= */

/** Indici Primari (Basic) Table — React.memo prevents re-render unless data changes */
const IndiciBasicTable = React.memo(function IndiciBasicTable({ loading, indici, missingCount, indexStatus, openVoci, countMissingVoci }) {
  return (
    <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-[var(--brand)] rounded-full"></div>
          Indici Primari
        </h2>
        <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          Mancanti: <span className="text-rose-600 font-bold ml-1">{missingCount}</span>
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Indice Analizzato</th>
              <th className="px-6 py-4 text-left font-semibold">Valore</th>
              <th className="px-6 py-4 text-left font-semibold">Fuori soglia?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({length:6}).map((_,i)=>(
                <tr key={`sk-indici-${i}`}>
                  <td className="px-6 py-4"><SkLine w="70%" /></td>
                  <td className="px-6 py-4"><SkLine w="40%" /></td>
                  <td className="px-6 py-4"><SkBadge w={80} h={24} /></td>
                </tr>
              ))
            ) : (
              indici.map((r, idx, arr) => {
                const isLast = idx === arr.length - 1;
                const v = String(r.note ?? '');
                const kind = v.includes('Azienda NON a Rischio') ? 'ok'
                            : v.includes('Azienda a Rischio') ? 'bad' : undefined;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className={`px-6 py-4 font-medium ${r.missing ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}>{r.nome}</td>
                    <td className="px-6 py-4">
                      {!r.missing ? (
                        <span className="font-semibold text-slate-800 flex items-center min-h-[32px]">
                            {kind && <span className="mr-2"><StatusIconTwo kind={kind} /></span>}
                            {r.fmt === "%" ? fmtPerc(r.valore) : (r.fmt ? `${r.valore}${r.fmt}` : (r.note || "—"))}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={()=>openVoci(r)}
                            className="inline-flex max-w-[max-content] px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors duration-150 shadow-sm"
                          >
                            INSERISCI DATI
                          </button>
                          {r.missingVoci && (
                            <span className="text-xs font-medium text-slate-400">
                              Richiede {countMissingVoci(r.missingVoci)} voci XBRL
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!isLast && <StatusIcon kind={indexStatus(r)} />}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});

/** Questionari Allerta Table — React.memo */
const AlertTable = React.memo(function AlertTable({ loading, alertStatus, qFlags, openQuestionario }) {
  return (
    <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-[#f59e0b] rounded-full"></div>
          Questionari Allerta (CNDC)
        </h2>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Voce Questionario</th>
              <th className="px-6 py-4 text-left font-semibold">Stato Alert</th>
              <th className="px-6 py-4 text-right font-semibold">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({length:5}).map((_,i)=>(
                <tr key={`sk-alert-${i}`}>
                  <td className="px-6 py-4"><SkLine w="65%" /></td>
                  <td className="px-6 py-4"><SkBadge w={70} h={24} /></td>
                  <td className="px-6 py-4 flex justify-end"><SkBtn w={36} h={36} className="rounded-full" /></td>
                </tr>
              ))
            ) : (
              ALERT_LINKS.map((a)=> {
                const s = alertStatus[a.id] || "missing";
                const qVal = qFlags?.[Q_MAP[a.id]];
                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="px-6 py-4 font-medium text-slate-700">{a.label}</td>
                    <td className="px-6 py-4">
                      <StatusIcon kind={s}/>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {qVal == null ? (
                          <button
                            onClick={()=>openQuestionario(a.id)}
                            className="px-4 py-2 rounded-xl border border-[#D8D2FF] bg-[#ECE8FF] text-[var(--brand)] text-xs font-semibold hover:bg-[var(--brand)] hover:text-white transition-all duration-200 shadow-sm whitespace-nowrap"
                          >
                            COMPILA ORA
                          </button>
                        ) : (
                          <button
                            onClick={()=>openQuestionario(a.id)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all duration-150 font-semibold"
                            title="Modifica questionario"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});

const GIUDIZIO_COLORS = {
  'Ottimo':              { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  'Buono':               { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  'Situazione Critica':  { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  'Rischio Elevato':     { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
};
const GIUDIZIO_DEFAULT = { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };

/** Indici Avanzati Table — React.memo */
const IndiciAdvancedTable = React.memo(function IndiciAdvancedTable({ loading, indiciAdvanced, indexStatus, openVoci, countMissingVoci, advancedGiudizio, advancedScore, advancedGiudizi }) {
  const advRating = classifyAdv(advancedGiudizio);
  return (
    <div className="space-y-6">
      {/* ── Card Valutazione Avanzata (stile hero) ── */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col xl:flex-row items-center xl:items-stretch gap-6">
        <div className="shrink-0 flex items-center justify-center pt-2 xl:pt-0 xl:pr-6 xl:border-r border-slate-100">
          <div className="text-center">
            {loading ? (
              <>
                <SkCircle size={120} />
                <div className="mt-3"><SkLine w={80} h={12} className="mx-auto" /></div>
              </>
            ) : (
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-xl opacity-20 transition-colors duration-700"
                  style={{ backgroundColor: advRating.color }}
                />
                <Gauge value={advancedScore ?? 0} color={advRating.color} size={120} stroke={12} label="Scoring" subtitle="su 100" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 w-full flex flex-col justify-center">
          <div className="text-sm text-teal-600 font-semibold uppercase tracking-widest">Valutazione Bilancio</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            {loading ? <SkLine w={220} h={28} /> : "Indici Avanzati"}
          </h2>
          <div className="mt-2 text-sm text-slate-500 max-w-xl leading-relaxed">
            {loading ? <SkLine w={300} /> : "Punteggio calcolato sugli indici avanzati di bilancio."}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">{loading ? <SkLine w={60} /> : "Giudizio"}</span>
            {loading ? (
              <SkBadge w={130} />
            ) : (
              <Pill text={advRating.label} color={advRating.color} className="text-base px-5 py-1.5" />
            )}
          </div>
        </div>
      </section>

      {/* ── Tabella Indici Avanzati ── */}
      <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-teal-500 rounded-full"></div>
            Indici Avanzati (Analisi Supplementare)
          </h2>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Indice Analizzato</th>
              <th className="px-6 py-4 text-left font-semibold">Valore Calcolato</th>
              <th className="px-6 py-4 text-left font-semibold">Giudizio</th>
              <th className="px-6 py-4 text-left font-semibold">Fuori soglia?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({length:4}).map((_,i)=>(
                <tr key={`sk-adv-${i}`}>
                  <td className="px-6 py-4"><SkLine w="50%" /></td>
                  <td className="px-6 py-4"><SkLine w="30%" /></td>
                  <td className="px-6 py-4"><SkBadge w={90} h={24} /></td>
                  <td className="px-6 py-4"><SkBadge w={80} h={24} /></td>
                </tr>
              ))
            ) : (
              indiciAdvanced.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                  <td className={`px-6 py-4 font-medium ${r.missing ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}>{r.nome}</td>
                  <td className="px-6 py-4">
                    {!r.missing ? (
                      <span className="font-semibold text-slate-800 text-base">
                        {r.fmt === "%" ? fmtPerc(r.valore) : (r.fmt ? `${r.valore}${r.fmt}` : (r.note || "—"))}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={()=>openVoci(r)}
                          className="inline-flex max-w-[max-content] px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors duration-150 shadow-sm"
                        >
                          INSERISCI DATI
                        </button>
                        {r.missingVoci && (
                          <span className="text-xs font-medium text-slate-400">
                            Richiede {countMissingVoci(r.missingVoci)} voci XBRL
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const g = advancedGiudizi?.[r.nome];
                      if (!g || g === false) return <span className="text-xs text-slate-400">—</span>;
                      const giudizio = g.Giudizio || 'N/A';
                      const colors = GIUDIZIO_COLORS[giudizio] || GIUDIZIO_DEFAULT;
                      return (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                        >
                          {giudizio}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusIconTwo kind={indexStatus(r)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
    </div>
  );
});


/* ======================= Page ======================= */
export default function AnalisiBilancioDettaglio() {
  const { id } = useParams(); 
  const initialDocId = Number(id) || null;

  const [docId, setDocId] = useState(initialDocId);
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [toast, setToast] = useState(null); 
  const [nomeAzienda, setNomeAzienda] = useState(null);

  // score UI – calcolato dinamicamente da indici basic e questionari
  const [score, setScore] = useState(null);
  // score Advanced dal backend (stessa logica dell'allerta/dashboard)
  const [advancedGiudizio, setAdvancedGiudizio] = useState(null);
  const [advancedScore, setAdvancedScore] = useState(null);
  const [advancedGiudizi, setAdvancedGiudizi] = useState(null);
  const rating = classify(score ?? 0);

  // indici UI (persist per documento)
  const [indici, setIndici] = useState(()=> load(keyFor("indici", initialDocId), []));
  const [indiciAdvanced, setIndiciAdvanced] = useState(()=> load(keyFor("indiciAdvanced", initialDocId), []));
  const missingCount = useMemo(()=> indici.filter(i=>i.missing).length, [indici]);

  // Questionari – dati e flag da backend
  const [qData, setQData] = useState(()=> load(keyFor("q", initialDocId), {
    ade: { debito:"", vaTrimestre:"", vaAnnoPrec:"", ratio:null },
    inps: { nonVersati:"", totAnnoPrec:"", ratio:null },
    risc: { crediti:"" },
    retrib: { debiti:"", totMensili:"", ratio:null },
    forn: { debiti:"", acquisti:"", ratio:null },
  }));
  const [qFlags, setQFlags] = useState({});

  // Modale voci mancanti per indice
  const [modalVoci, setModalVoci] = useState(null);
  const [tmpVoci, setTmpVoci] = useState({});
  const debounceSaveRef = useRef(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [qModal, setQModal] = useState(null);

  // Sync docId from URL param — only update when param actually changes
  const prevIdRef = useRef(initialDocId);
  useEffect(()=>{
    const next = Number(id);
    if (next && next !== prevIdRef.current) {
      prevIdRef.current = next;
      setDocId(next);
    }
  }, [id]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const handleRefreshedData = useCallback((payload) => {
    if (!payload) return;
    setRecap(payload);
    setNomeAzienda(payload?.nome_azienda ?? null);

    // Leggi lo score Advanced dal backend (stessa logica dell'allerta)
    const advGiudizio = payload?.bilancioAnalisi?.AdvancedGiudizio ?? null;
    if (advGiudizio) setAdvancedGiudizio(advGiudizio);
    const advScoreRaw = payload?.bilancioAnalisi?.AdvancedScore ?? null;
    if (advScoreRaw != null) {
      const s = parseNum(advScoreRaw);
      if (s != null) setAdvancedScore(Math.max(0, Math.min(100, Math.round(s <= 1 ? s * 100 : s))));
    }
    const advGiudiziMap = payload?.bilancioAnalisi?.AdvancedGiudizi ?? null;
    if (advGiudiziMap) setAdvancedGiudizi(advGiudiziMap);

    const missingMap = {};
    const missSrc = payload?.bilancioAnalisi?.indiceVociMancanti || {};
    for (const [k,v] of Object.entries(missSrc)) missingMap[normKey(k)] = v;

    const buildIndices = (srcObj) => {
      return Object.entries(srcObj || {}).map(([nome, val]) => {
        const id   = nomeToId(nome);
        const norm = normKey(nome);
        const missingVoci = missingMap[norm] || null;

        if (val === false) return { id, nome, valore:null, fmt:"%", fuori:"N/A", missing:true, missingVoci };
        if (typeof val === "object" && val !== null) {
          const v  = parseNum(val.value);
          const fs = !!val.fuoriSoglia;
          return { id, nome, valore:v, fmt:"%", fuori: v==null ? "N/A" : (fs ? "Sì" : "No"), missing: v==null, missingVoci };
        }
        if (typeof val === "string") {
          const note = val;
          const bad  = /rischio/i.test(val);
          return { id, nome, valore:null, fmt:"", fuori: bad ? "Sì" : "No", missing:false, note, missingVoci };
        }
        return { id, nome, valore:null, fmt:"", fuori:"N/A", missing:true, missingVoci };
      });
    };

    const arr = buildIndices(payload?.bilancioAnalisi?.Indici?.Basic);
    setIndici(arr);
    save(keyFor("indici", docId), arr);

    const arrAdvanced = buildIndices(payload?.bilancioAnalisi?.Indici?.Advanced);
    setIndiciAdvanced(arrAdvanced);
    save(keyFor("indiciAdvanced", docId), arrAdvanced);
  }, [docId]);

  /* -------------------- Fetch via /recapBilancio -------------------- */
  useEffect(()=>{
    if (!docId) return;
    let cancel=false;
    (async ()=>{
      setLoading(true); setLoadErr("");
      try {
        const data = await postRecapBilancioById(docId);
        if (cancel) return;
        const payload = data || null;
        if (payload) handleRefreshedData(payload);

        const In = payload?.bilancioAnalisi?.InputData || {};
        const nextQ = { ...qData };

        if (In.agenziaEntrate1!=null) nextQ.ade.debito = In.agenziaEntrate1;
        if (In.agenziaEntrate2!=null) nextQ.ade.vaTrimestre = In.agenziaEntrate2;
        if (In.agenziaEntrate3!=null) nextQ.ade.vaAnnoPrec = In.agenziaEntrate3;
        nextQ.ade.ratio = ratio(nextQ.ade.debito, nextQ.ade.vaTrimestre) ?? In.agenziaEntrate4 ?? null;

        if (In.INPS1!=null) nextQ.inps.nonVersati = In.INPS1;
        if (In.INPS2!=null) nextQ.inps.totAnnoPrec = In.INPS2;
        nextQ.inps.ratio = ratio(nextQ.inps.nonVersati, nextQ.inps.totAnnoPrec) ?? In.INPS3 ?? null;

        if (In.riscossione!=null) nextQ.risc.crediti = In.riscossione;

        if (In.retribuzioni1!=null) nextQ.retrib.debiti = In.retribuzioni1;
        if (In.retribuzioni2!=null) nextQ.retrib.totMensili = In.retribuzioni2;
        nextQ.retrib.ratio = ratio(nextQ.retrib.debiti, nextQ.retrib.totMensili, true) ?? In.retribuzioni3 ?? null;

        if (In.fornitori1!=null) nextQ.forn.debiti = In.fornitori1;
        if (In.fornitori2!=null) nextQ.forn.acquisti = In.fornitori2;

        setQData(nextQ);
        save(keyFor("q", docId), nextQ);

        setQFlags(payload?.bilancioAnalisi?.Questionari || {});
      } catch {
        if (!cancel) setLoadErr("Errore nel caricamento del bilancio.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return ()=>{ cancel=true; };
  }, [docId]);

  const alertStatus = useMemo(() => {
    const out = {};
    for (const a of ALERT_LINKS) {
      const flag = qFlags?.[Q_MAP[a.id]];
      if (flag === false || flag == null) {
        out[a.id] = "missing";
      } else if (typeof flag === "object" && !Array.isArray(flag)) {
        // The backend returns an object with `alert` (or specific key like `alertAgenziaEntrate`)
        const val = flag.alert || flag.alertAgenziaEntrate || flag.alertINPS || flag.alertRiscossione || flag.alertRetribuzioni || flag.alertFornitori;
        if (typeof val === "string") {
            const v = val.toLowerCase();
            if (v === "si" || v === "sì") out[a.id] = "bad";
            else if (v === "no") out[a.id] = "ok";
            else out[a.id] = "missing";
        } else {
            out[a.id] = "missing";
        }
      } else {
        out[a.id] = "missing";
      }
    }
    return out;
  }, [qFlags]);

  // ── Analisi completezza dati per l'indicatore visivo ──
  const incompleteness = useMemo(() => {
    const issues = [];
    // Indici basic mancanti
    const missingBasic = indici.filter(r => r.missing);
    if (missingBasic.length > 0) {
      issues.push(`${missingBasic.length} indic${missingBasic.length === 1 ? 'e primario mancante' : 'i primari mancanti'}`);
    }
    // Indici advanced mancanti
    const missingAdv = indiciAdvanced.filter(r => r.missing);
    if (missingAdv.length > 0) {
      issues.push(`${missingAdv.length} indic${missingAdv.length === 1 ? 'e avanzato mancante' : 'i avanzati mancanti'}`);
    }
    // Questionari non compilati
    const qIds = ["ade", "inps", "risc", "retrib", "forn"];
    const missingQ = qIds.filter(qid => !alertStatus[qid] || alertStatus[qid] === "missing");
    if (missingQ.length > 0) {
      issues.push(`${missingQ.length} questionari${missingQ.length === 1 ? 'o allerta non compilato' : ' allerta non compilati'}`);
    }
    return { incomplete: issues.length > 0, issues };
  }, [indici, indiciAdvanced, alertStatus]);

  // ── Ricalcola lo score Basic+Questionari ogni volta che cambiano i dati ──
  useEffect(() => {
    if (indici.length === 0) return;
    const computed = computeBilancioScore(indici, alertStatus);
    setScore(computed);
  }, [indici, alertStatus]);

  const saveQuestionari = async () => {
    try {
      if (!docId) throw new Error("Documento non trovato.");

      const ade4 = ratio(qData.ade.debito, qData.ade.vaTrimestre) ?? null;
      const inps3= ratio(qData.inps.nonVersati, qData.inps.totAnnoPrec) ?? null;
      const re3  = ratio(qData.retrib.debiti, qData.retrib.totMensili, true) ?? null;

      const payload = {
        idBilancio: docId,
        agenziaEntrate1: toApiString(qData.ade.debito),
        agenziaEntrate2: toApiString(qData.ade.vaTrimestre),
        agenziaEntrate3: toApiString(qData.ade.vaAnnoPrec),
        agenziaEntrate4: ade4,
        INPS1: toApiString(qData.inps.nonVersati),
        INPS2: toApiString(qData.inps.totAnnoPrec),
        INPS3: inps3,
        riscossione: toApiString(qData.risc.crediti),
        retribuzioni1: toApiString(qData.retrib.debiti),
        retribuzioni2: toApiString(qData.retrib.totMensili),
        retribuzioni3: re3,
        fornitori1: toApiString(qData.forn.debiti),
        fornitori2: toApiString(qData.forn.acquisti),
      };

      await postAnalisiBilancioBasic(payload);

      const next = {
        ...qData,
        ade:    { ...qData.ade,    ratio: ade4 },
        inps:   { ...qData.inps,   ratio: inps3 },
        retrib: { ...qData.retrib, ratio: re3   },
      };
      setQData(next);
      save(keyFor("q", docId), next);

      try {
        setLoading(true);
        const refreshed = await postRecapBilancioById(docId);
        setQFlags(refreshed?.bilancioAnalisi?.Questionari || qFlags);

        handleRefreshedData(refreshed);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }

      showToast("success", "Dati salvati con successo.");
      setQModal(null);
    } catch (e) {
      console.error(e);
      showToast("error", "Errore salvataggio dati.");
    }
  };

  const openVoci = (row) => {
    let voci = listMissingKeys(row?.missingVoci);
    
    // If the index requires missing voices but none were found mapped specifically to it
    // (e.g. they are mapped under shared keys like "Totale Crediti"), fallback to ALL missing voices
    if (voci.length === 0 && recap?.bilancioAnalisi?.indiceVociMancanti) {
      voci = getAllMissingKeys(recap.bilancioAnalisi.indiceVociMancanti);
    }

    const prefill = {};
    const init = {};
    voci.forEach(k => { init[k] = prefill?.[k] ?? ""; });
    setTmpVoci(init);
    setModalVoci({ id: row.id, nome: row.nome, voci });
  };

  // Debounced localStorage save for voci changes (400ms)
  const handleVociChange = (key, val) => {
    setTmpVoci(s => ({ ...s, [key]: val }));
    if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
    debounceSaveRef.current = setTimeout(() => {
      save(keyFor(`voci_${modalVoci?.id}`, docId), { ...(tmpVoci || {}), [key]: val });
    }, 400);
  };

  const saveVoci = async () => {
    if (!modalVoci) return;
    try {
      const payloadVoci = {};
      for (const [k, v] of Object.entries(tmpVoci)) {
        if (v === "" || v == null) continue;
        payloadVoci[String(k)] = toApiString(v);
      }

      save(keyFor(`voci_${modalVoci.id}`, docId), tmpVoci);

      setLoading(true);
      await postMissingVoices(docId, payloadVoci);

      const refreshed = await postRecapBilancioById(docId);
      handleRefreshedData(refreshed);

      showToast("success", "Voci salvate e indici aggiornati.");
      setModalVoci(null);
    } catch (e) {
      console.error(e);
      showToast("error", "Errore nel salvataggio delle voci mancanti.");
    } finally {
      setLoading(false);
    }
  };

  const indexStatus = useCallback((r) => {
    if (r.missing || r.fuori === "N/A") return "missing";
    if (String(r.fuori).toLowerCase().startsWith("sì") || String(r.fuori).toLowerCase()==="si") return "bad";
    return "ok";
  }, []);

  const labelsMap = recap?.bilancioAnalisi?.labels || {};
  const openQuestionario = useCallback((id) => setQModal(id), []);

  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadReport = async () => {
    if (!docId) return;
    try {
      setPdfLoading(true);
      showToast("info", "Generazione relazione formale in corso...");
      const res = await fetch(`${API_BASE}/reportBilancioFormale/${docId}`, {
        headers: commonHeaders()
      });
      if (!res.ok) throw new Error("Errore API");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      showToast("success", "Relazione generata.");
    } catch (err) {
      console.error(err);
      showToast("error", "Errore durante la generazione del PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  /* ======================= Render ======================= */
  return (
    <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800 anim-fade-in-up">
      <Link to="/analisi-bilancio" className="inline-flex items-center gap-2 text-sm text-[var(--brand)] hover:text-[var(--brand-dark)] font-semibold transition-colors duration-150">
        <ArrowRightIcon className="w-4 h-4 rotate-180" /> Torna a tutti i bilanci
      </Link>
      
      {/* HERO SECTION */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col xl:flex-row items-center xl:items-stretch gap-6">
        <div className="shrink-0 flex items-center justify-center pt-2 xl:pt-0 xl:pr-6 xl:border-r border-slate-100">
          <div className="text-center group">
            {loading ? (
              <>
                <SkCircle size={140} />
                <div className="mt-3"><SkLine w={90} h={12} className="mx-auto" /></div>
              </>
            ) : (
              <div className="relative">
                {/* Anello arancione esterno quando dati incompleti */}
                {incompleteness.incomplete && (
                  <svg
                    width={174} height={174}
                    viewBox="0 0 174 174"
                    className="absolute -top-[12px] -left-[12px] pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    <circle
                      cx={87} cy={87} r={83}
                      stroke="#f59e0b" strokeWidth={3} fill="none"
                      strokeDasharray="8 6" opacity={0.7}
                      className="animate-[spin_18s_linear_infinite]"
                      style={{ transformOrigin: '87px 87px' }}
                    />
                  </svg>
                )}
                {/* Glow effect behind the gauge */}
                <div
                  className="absolute inset-0 rounded-full blur-xl opacity-20 transition-colors duration-700"
                  style={{ backgroundColor: rating.color }}
                />
                <Gauge value={score ?? 0} color={rating.color} size={150} stroke={14} label="Scoring" subtitle="su 100" />
                {/* Badge warning con tooltip */}
                {incompleteness.incomplete && (
                  <div className="absolute -top-1 -right-1 z-10 group/warn">
                    <div className="w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow-md flex items-center justify-center cursor-help transition-transform duration-200 hover:scale-110">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                    </div>
                    {/* Tooltip */}
                    <div className="invisible group-hover/warn:visible opacity-0 group-hover/warn:opacity-100 transition-all duration-200 absolute top-full right-0 mt-2 w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl z-50">
                      <div className="font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 9v4" /><path d="M12 17h.01" />
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        Punteggio parziale
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        Lo score potrebbe non riflettere la situazione reale. Completa i dati mancanti per un giudizio preciso:
                      </div>
                      <ul className="mt-2 space-y-1">
                        {incompleteness.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                      {/* Freccia tooltip */}
                      <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-[var(--brand)] font-semibold uppercase tracking-widest">Rapporto Dettagliato</div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                {loading ? <SkLine w={280} h={32} /> : <>Panoramica di Azienda Censurata</>}
              </h1>
              <div className="mt-2 text-sm text-slate-500 max-w-xl leading-relaxed">
                {loading ? <SkLine w={340} /> : "Punteggio calcolato in tempo reale sulle grandezze contabili estratte, integrato con gli indicatori del Consiglio Nazionale dei Dottori Commercialisti (CNDC\\EC)."}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">{loading ? <SkLine w={60} /> : "Giudizio finale"}</span>
                {loading ? (
                  <SkBadge w={130} />
                ) : (
                  <Pill text={rating.label} color={rating.color} className="text-base px-5 py-1.5" />
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {loading ? <SkBtn w={160} /> : (
                <>
                  <button
                    onClick={downloadReport}
                    disabled={pdfLoading}
                    className={`h-10 px-5 rounded-xl border text-sm font-semibold shadow-sm transition-all duration-200 flex items-center gap-2 print:hidden ${pdfLoading ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-wait' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
                  >
                    {pdfLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                        Generazione in corso...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Stampa Relazione
                      </>
                    )}
                  </button>
                  <button
                    onClick={()=>setPreviewOpen(true)}
                    className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-200 print:hidden"
                  >
                    Anteprima bilancio {'>'}
                  </button>
                </>
              )}
            </div>
          </div>
          {loadErr && <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">Errore: {loadErr}</div>}
        </div>
      </section>

      {/* INDICI + ALERT GRIDS — Memoized sub-components */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IndiciBasicTable
          loading={loading}
          indici={indici}
          missingCount={missingCount}
          indexStatus={indexStatus}
          openVoci={openVoci}
          countMissingVoci={countMissingVoci}
        />
        <AlertTable
          loading={loading}
          alertStatus={alertStatus}
          qFlags={qFlags}
          openQuestionario={openQuestionario}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        <IndiciAdvancedTable
          loading={loading}
          indiciAdvanced={indiciAdvanced}
          indexStatus={indexStatus}
          openVoci={openVoci}
          countMissingVoci={countMissingVoci}
          advancedGiudizio={advancedGiudizio}
          advancedScore={advancedScore}
          advancedGiudizi={advancedGiudizi}
        />
      </div>

      {/* TOAST NOTIFICATIONS */}
      {toast && createPortal(
        <div className={`fixed z-[100] bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium anim-slide-up ${
          toast.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10" 
            : toast.type === "info"
            ? "bg-blue-50 text-blue-800 border-blue-200 shadow-blue-500/10"
            : "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10"
        }`}>
          <div className="flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-rose-500'}`} />
             {toast.msg}
          </div>
        </div>,
        document.body
      )}

      {/* MODALE: VALORI MANCANTI ========================================================= */}
      {modalVoci && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 z-50 grid place-items-center p-4 anim-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl max-h-[90vh]">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{modalVoci.nome}</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Digita le grandezze per le voci XBRL mancanti. I dati verranno elaborati automaticamente e l'indice verrà aggiornato.
              </p>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 bg-slate-50/50">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Descrizione Voce</th>
                      <th className="px-4 py-3 text-left w-1/3">Importo (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalVoci.voci.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-10 text-center font-medium text-slate-500">Nessuna voce richiesta trovata.</td></tr>
                    ) : modalVoci.voci.map(k=>(
                      <tr key={k} className="hover:bg-slate-50/50 transition-colors duration-150">
                        {(() => {
                          const { base, idx } = splitCombinedKey(k);
                          const periodLabel = idx === "1" ? "Anno Corrente" : idx === "2" ? "Anno Precedente" : "";

                          return (
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {labelsMap[base] || base}
                              {periodLabel && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-xs font-semibold text-amber-800">{periodLabel}</span>}
                            </td>
                          );
                        })()}

                        <td className="px-4 py-3">
                          <input
                            className="w-full h-9 border border-slate-200 rounded-lg px-3 py-1.5 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all duration-150 shadow-inner font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                            placeholder="0,00"
                            onChange={e=>handleVociChange(k, e.target.value)}
                            inputMode="decimal"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button 
                onClick={()=>setModalVoci(null)} 
                className="h-10 px-5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors duration-150"
               >
                Annulla
              </button>
              <button 
                onClick={saveVoci} 
                className="h-10 px-6 rounded-xl font-semibold bg-[var(--brand)] text-white shadow-md hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
              >
                Conferma ed elabora
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODALE: ANTEPRIMA BILANCIO ========================================================= */}
      {previewOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 z-50 grid place-items-center p-4 anim-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-xl font-bold text-slate-800">Visualizzatore Anteprima XBRL</h3>
              <button onClick={()=>setPreviewOpen(false)} className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-sm font-semibold shadow-sm hover:bg-slate-100 transition-colors duration-150">Chiudi Preview</button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-[#f8fafc] content-html-preview">
              {recap?.renderHTML ? (
                <div dangerouslySetInnerHTML={{ __html: recap.renderHTML }} className="prose prose-slate max-w-none" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="mb-4"><BarsIcon className="w-16 h-16 opacity-30"/></div>
                  <h4 className="text-lg font-semibold text-slate-500">Anteprima Visiva Non Disponibile</h4>
                  <p className="text-sm mt-1">Il motore non ha restituito markup HTML per questo file.</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODALE: QUESTIONARI ========================================================= */}
      {qModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 z-50 grid place-items-center p-4 anim-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col flex-1 max-h-[90vh] shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <div className="text-sm font-bold text-[#f59e0b] uppercase tracking-widest mb-1">Questionario Qualitativo</div>
              <h3 className="text-2xl font-extrabold text-slate-800">{Q_MAP[qModal]}</h3>
            </div>
            <div className="overflow-y-auto p-6 flex flex-col gap-6">
              {qModal === "ade" && (
                <>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-medium text-blue-800">L'Agenzia delle Entrate si attiva in presenza di un debito IVA scaduto "rilevante". Compila per stabilire il rischio soglia.</div>
                  <Field label="Debito IVA scaduto non versato (ultima liquidazione trimestrale)">
                    <Input money value={qData.ade.debito}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, ade:{...s.ade, debito:v} };
                          next.ade.ratio = ratio(next.ade.debito, next.ade.vaTrimestre) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <Field label="Volume d'affari del trimestre dell'ultima liquidazione IVA">
                    <Input money value={qData.ade.vaTrimestre}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, ade:{...s.ade, vaTrimestre:v} };
                          next.ade.ratio = ratio(next.ade.debito, next.ade.vaTrimestre) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <Field label="Volume d'affari della dichiarazione IVA anno precedente (facoltativo)">
                    <Input money value={qData.ade.vaAnnoPrec}
                      onChange={(v)=>setQData(s=>({ ...s, ade:{...s.ade, vaAnnoPrec:v} }))}/>
                  </Field>
                  <ReadOnly label="Rapporto: Debito / Volume ultima liquidazione" value={
                    qData.ade.ratio==null ? "Dati insuff. per il calcolo" : (qData.ade.ratio*100).toLocaleString("it-IT",{maximumFractionDigits:2}) + " %"
                  } />
                </>
              )}

              {qModal === "inps" && (
                <>
                  <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl text-sm font-medium text-orange-800">L'INPS si attiva automaticamente segnalando l'azienda qualora i debiti non pagati eccedano la metà di quelli dell'esercizio precedente e siano superiori ad euro 50.000,00.</div>
                  <Field label="Contributi NON versati (scaduti da oltre 6 mesi)">
                    <Input money value={qData.inps.nonVersati}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, inps:{...s.inps, nonVersati:v} };
                          next.inps.ratio = ratio(next.inps.nonVersati, next.inps.totAnnoPrec) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <Field label="Totale contributi previdenziali dichiarati e dovuti anno precedente">
                    <Input money value={qData.inps.totAnnoPrec}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, inps:{...s.inps, totAnnoPrec:v} };
                          next.inps.ratio = ratio(next.inps.nonVersati, next.inps.totAnnoPrec) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <ReadOnly label="Rapporto: Non versati >6m / Totale anno prec." value={
                    qData.inps.ratio==null ? "Dati insuff. per il calcolo" : (qData.inps.ratio*100).toLocaleString("it-IT",{maximumFractionDigits:2}) + " %"
                  } />
                </>
              )}

              {qModal === "risc" && (
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700">L'agente della riscossione si attiva inviando la segnalazione, in presenza di crediti affidati oltre a specifici limiti dimensionali che variano proporzionalmente all'entità.</div>
                  <Field label="Totale crediti affidati per la riscossione, autoliquidati o definitivamente accertati, scaduti da oltre 90 giorni">
                    <Input money value={qData.risc.crediti}
                      onChange={(v)=>setQData(s=>({ ...s, risc:{...s.risc, crediti:v} }))}/>
                  </Field>
                </>
              )}

              {qModal === "retrib" && (
                <>
                  <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-xl text-sm font-medium text-emerald-800">Si verifica una fattispecie di presunzione in base alla presenza di debiti per retribuzioni scaduti da almeno 60 giorni per un ammontare pari a oltre la metà.</div>
                  <Field label="Ammontare dei debiti per Retribuzioni scaduti da oltre 60 giorni">
                    <Input money value={qData.retrib.debiti}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, retrib:{...s.retrib, debiti:v} };
                          next.retrib.ratio = ratio(next.retrib.debiti, next.retrib.totMensili, true) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <Field label="Ammontare complessivo delle retribuzioni mensili">
                    <Input money value={qData.retrib.totMensili}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, retrib:{...s.retrib, totMensili:v} };
                          next.retrib.ratio = ratio(next.retrib.debiti, next.retrib.totMensili, true) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <ReadOnly label="Rapporto: Debiti vs Retribuzioni Mensili" value={
                    qData.retrib.ratio==null ? "Dati insuff. per il calcolo" : (qData.retrib.ratio).toLocaleString("it-IT",{maximumFractionDigits:2}) + " %"
                  } />
                </>
              )}

              {qModal === "forn" && (
                <>
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl text-sm font-medium text-purple-800">Viene valutata l'esistenza di debiti verso fornitori scaduti da oltre 120 giorni d'ammontare maggiore rispetto a quelli non scaduti.</div>
                  <Field label="Ammontare dei debiti di fornitura scaduti da oltre 120 giorni">
                    <Input money value={qData.forn.debiti}
                      onChange={(v)=>setQData(s=>({ ...s, forn:{...s.forn, debiti:v} }))}/>
                  </Field>
                  <Field label="Ammontare dei debiti verso fornitori non scaduti (facoltativo se debiti scaduti > 120gg sono assenti)">
                    <Input money value={qData.forn.acquisti}
                      onChange={(v)=>setQData(s=>({ ...s, forn:{...s.forn, acquisti:v} }))}/>
                  </Field>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/30">
              <button onClick={()=>setQModal(null)} className="h-10 px-6 rounded-xl font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-150">Ignora e Chiudi</button>
              <button onClick={saveQuestionari} className="h-10 px-8 rounded-xl font-bold bg-[#1e293b] text-white shadow-md hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5">
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Overlay loader main data fetching */}
      <FullPageLoader show={loading} />
    </div>
  );
}

/* ====== tiny custom form inputs ====== */
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder="0,00", money=false }) {
  return (
    <div className="relative">
      <input
        value={value ?? ""}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-4 h-11 border border-slate-200 rounded-xl focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 bg-slate-50 text-slate-800 font-semibold focus:bg-white outline-none transition-all duration-150"
        inputMode={money ? "decimal" : "text"}
      />
      {money && <span className="absolute left-3.5 top-[11px] font-semibold text-slate-400">€</span>}
    </div>
  );
}
function ReadOnly({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5 w-full mt-2">
      <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="bg-slate-100 border border-slate-100 text-slate-800 font-bold rounded-xl px-4 py-3 leading-none shadow-inner">
        {value ?? "—"}
      </div>
    </div>
  );
}

/* ====== pure helpers ====== */
function nomeToId(nome) {
  return String(nome)
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
function normKey(s){
  return String(s)
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}
function keyFor(kind, id) {
  return `sb_bilancio_${id || "noid"}_${kind}`;
}
function countMissingVoci(miss){
  if (!miss) return 0;
  return Object.values(miss).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
}
function listMissingKeys(miss){
  const out = [];
  if (!miss) return out;
  if (Array.isArray(miss) && miss.length > 0 && typeof miss[0] === "string") {
    // legacy array fallback ONLY if it's an array of strings
    for (const item of miss) {
      out.push(String(item) + "_1");
    }
    return out;
  }
  
  // Normalize miss into entries (period, bucket)
  // If miss is an array (e.g. due to PHP 0-idx), its periods become "0", "1", etc.
  for (const [period, bucket] of Object.entries(miss)) {
    const arr = Array.isArray(bucket) ? bucket : Object.values(bucket);
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (Array.isArray(item) && item.length >= 2) {
        const [key, idx] = item;
        out.push(String(key) + "_" + String(idx));
      } else if (item && typeof item === "object" && "key" in item) {
        const idx = item.index ?? item.idx ?? item.period ?? period;
        out.push(String(item.key) + "_" + String(idx));
      } else {
        out.push(String(item) + "_" + period);
      }
    }
  }
  return out;
}

function getAllMissingKeys(missSrc) {
  if (!missSrc) return [];
  const set = new Set();
  for (const bucket of Object.values(missSrc)) {
    const keys = listMissingKeys(bucket);
    for (const k of keys) set.add(k);
  }
  return Array.from(set);
}
function splitCombinedKey(k){
  const m = String(k).match(/^(.*)_(\d+)$/);
  return m ? { base: m[1], idx: m[2] } : { base: String(k), idx: null };
}
