// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gauge } from "../components/ui/Gauge";
import { Pill } from "../components/ui/Pill";
import { Sparkline } from "../components/ui/Sparkline";
import { AlertIcon, TrendIcon, BarsIcon, BriefcaseIcon, BuildingIcon, CrIcon, ShieldIcon, ArrowRightIcon } from "../components/ui/Icons";
import { API_BASE } from "../lib/api";

function getToken() {
  try { return JSON.parse(localStorage.getItem("sb_auth"))?.token || null; }
  catch { return null; }
}

function getUserId() {
  try {
    const userStr = localStorage.getItem("sb_user");
    if (!userStr) return null;
    const u = JSON.parse(userStr);
    return u?.id || null;
  } catch {
    return null;
  }
}

function getCurrentCompanyId() {
  try { return JSON.parse(localStorage.getItem("sb_company"))?.id || null; }
  catch { return null; }
}

/* ---------------- MOCK ---------------- */
// trend (0-100)
const TREND_CR = [62, 64, 61, 59, 66, 68, 71, 70, 69, 72, 74, 73];
const TREND_BILANCIO = [70, 72, 71, 69, 68, 70, 72, 73, 75, 76, 78, 80];
// saldi conti
const CONTI = [1450.45, 218.96, 0.05, 300.0];
// scala giudizi (no longer used directly by classification but kept as reference if needed)

function resultColor(result) {
  const s = (result || "").toLowerCase();
  if (s === "default") return "#991b1b";        // darkest red
  if (s.includes("situazione grave")) return "#ef4444"; // red-500
  if (s.includes("rischio")) return "#f59e0b";  // amber-500 (Rischio alert)
  if (s === "alert") return "#f97316";           // orange-500
  if (s.includes("fragilità elevata") || s.includes("elevat")) return "#eab308"; // yellow-500
  if (s.includes("fragilit") || s.includes("fragil")) return "#a3a3a3"; // neutral
  if (s.includes("solidit") || s.includes("solid")) return "#16a34a"; // emerald-600
  if (s.includes("miglior")) return "#16a34a";
  if (s.includes("stabilit")) return "#a3a3a3";
  if (s.includes("peggiora")) return "#ef4444";
  return "#64748b"; // slate-500
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
/* Icone per "Vai a" */
const IconCircle = ({ children }) => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7e85ff] to-[#5b63ff] text-white flex items-center justify-center shadow-md">
    {children}
  </div>
);

/* ── Scala orizzontale Allerta ── */
const ALLERTA_SCALE = [
  { label: "Default",            color: "#991b1b", keywords: ["default"] },
  { label: "Situazione Grave",   color: "#ef4444", keywords: ["situazione grave"] },
  { label: "Alert",              color: "#f97316", keywords: ["alert"] },
  { label: "Rischio alert",      color: "#f59e0b", keywords: ["rischio alert", "rischio"] },
  { label: "Fragilità elevata",  color: "#eab308", keywords: ["fragilità elevata", "elevat"] },
  { label: "Fragilità",          color: "#a3a3a3", keywords: ["fragilit", "fragil"] },
  { label: "Solidità",           color: "#16a34a", keywords: ["solidit", "solid"] },
];

function matchScaleIndex(word) {
  if (!word || word === "N/A") return -1;
  const w = word.toLowerCase();
  // exact label match first
  for (let i = 0; i < ALLERTA_SCALE.length; i++) {
    if (w === ALLERTA_SCALE[i].label.toLowerCase()) return i;
  }
  // then keyword match — check longer/more specific keywords first
  // iterate in reverse so more specific items (e.g. "Fragilità elevata") match before generic ("Fragilità")
  for (let i = ALLERTA_SCALE.length - 1; i >= 0; i--) {
    for (const kw of ALLERTA_SCALE[i].keywords) {
      if (w.includes(kw)) return i;
    }
  }
  return -1;
}

function AllertaScale({ currentWord }) {
  const activeIdx = matchScaleIndex(currentWord);

  return (
    <div className="mt-5 w-full">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Scala di valutazione</div>
      <div className="flex items-stretch gap-1 w-full">
        {ALLERTA_SCALE.map((level, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={level.label} className="flex-1 flex flex-col items-center relative group">
              {/* Segmento barra */}
              <div
                className="w-full rounded-md transition-all duration-500"
                style={{
                  height: isActive ? 14 : 10,
                  backgroundColor: level.color,
                  opacity: isActive ? 1 : (activeIdx === -1 ? 0.35 : 0.25),
                  boxShadow: isActive ? `0 2px 12px ${level.color}55` : "none",
                }}
              />
              {/* Marker attivo */}
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center animate-fade-in">
                  <div
                    className="w-5 h-5 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: level.color }}
                  >
                    <div
                      className="w-2 h-2 rounded-full bg-white animate-pulse"
                    />
                  </div>
                </div>
              )}
              {/* Label */}
              <div
                className="mt-2 text-center transition-all duration-300 leading-tight"
                style={{
                  fontSize: isActive ? 11 : 10,
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? level.color : "#94a3b8",
                }}
              >
                {level.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sb_user")) || { name: "Utente" }; }
    catch { return { name: "Utente" }; }
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [noDefault, setNoDefault] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = getToken();
        if (!token) throw new Error("No auth token");

        const headers = { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        };
        
        const companyId = getCurrentCompanyId();
        if (companyId) {
          headers["CurrentCompany"] = companyId;
        }

        const [rBil, rCr] = await Promise.all([
          fetch(`${API_BASE}/getBilanciDocuments`, { headers }),
          fetch(`${API_BASE}/getCrDocuments`, { headers })
        ]);

        if (!rBil.ok || !rCr.ok) throw new Error("Failed to fetch documents");

        const bilData = await rBil.json();
        const crData = await rCr.json();

        // Extract list of documents
        let blist = Array.isArray(bilData) ? bilData : (bilData?.data ?? []);
        if (Array.isArray(blist)) blist = blist.flat(Infinity);
        else blist = [];
        
        let clist = Array.isArray(crData) ? crData : (crData?.data ?? []);
        if (Array.isArray(clist)) clist = clist.flat(Infinity);
        else clist = [];

        // Filter specifically for "bilancio" and "centrale rischi" types to prevent mismatch
        const defBilancio = blist.find(b => 
          (b.predefinito == true || b.predefinito === 1 || b.predefinito === "1") && 
          String(b.type || "").toLowerCase() === "bilancio"
        );
        const defCr = clist.find(c => 
          (c.predefinito == true || c.predefinito === 1 || c.predefinito === "1") && 
          (String(c.type || "").toLowerCase() === "centrale rischi" || String(c.type || "").toLowerCase() === "cr")
        );

        console.log(defCr)
        if (!defBilancio || !defCr) {
          setNoDefault(true);
          setLoading(false);
          return;
        }

        const userId = getUserId();
        if (!userId) {
          setNoDefault(true);
          setLoading(false);
          return;
        }

        const crId = defCr.codice_documento || defCr.id;
        const resAllerta = await fetch(`${API_BASE}/generalAllerta/${defBilancio.id}/${crId}/${userId}`, { headers });
        console.log(userId)
        if (!resAllerta.ok) {
           const errText = await resAllerta.text();
           console.error("GeneralAllerta API error:", resAllerta.status, errText);
           throw new Error("L'analisi del sistema di allerta non è ancora completa (" + resAllerta.status + ").");
        }

        const allertaResult = JSON.parse(await resAllerta.text());
        if (allertaResult.error) {
           throw new Error(allertaResult.message || "Errore sconosciuto during allerta computation");
        }

        setData({ ...allertaResult, bilancioId: defBilancio.id, crId: crId });
      } catch (err) {
        console.error("Dashboard failed to load analysis:", err);
        setNoDefault(true);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-slate-500">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Analisi in corso...</p>
      </div>
    );
  }

  if (noDefault || !data || data.error) {
    return (
      <div className="space-y-6 pb-12 font-sans bg-slate-50 min-h-screen text-slate-800">
        <div className="flex flex-col mb-10">
          <div className="text-sm text-[#5b63ff] tracking-wide font-semibold uppercase">Workspace</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Bentornato, {user?.name}
          </h1> 
          <p className="mt-1 text-slate-500">È richiesta un'azione per sbloccare la dashboard.</p>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200/60 p-10 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
               <AlertIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Nessun documento predefinito impostato</h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
              Per attivare il sistema di allerta e visualizzare le analisi intelligenti, è necessario impostare 
              sia un <strong>Bilancio</strong> sia una <strong>Centrale Rischi</strong> come "Predefinito".
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/analisi-bilancio" className="h-11 px-6 bg-white border border-slate-200 shadow-sm text-slate-700 font-semibold rounded-xl flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <BarsIcon className="w-5 h-5 text-slate-400" />
                Vai ai Bilanci
              </Link>
              <Link to="/analisi-cr" className="h-11 px-6 bg-white border border-slate-200 shadow-sm text-slate-700 font-semibold rounded-xl flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <CrIcon className="w-5 h-5 text-slate-400" />
                Vai a Centrale Rischi
              </Link>
            </div>
        </section>
      </div>
    );
  }

  // Estrazione dati dinamici
  const finalScoreWord = data.pageData?.FinalScore || "N/A";

  function getScoreColor(w) {
    const s = w.toLowerCase();
    if (s === "default") return "#991b1b";
    if (s.includes("situazione grave")) return "#ef4444";
    if (s === "alert") return "#f97316";
    if (s.includes("rischio")) return "#f59e0b";
    if (s.includes("fragilità elevata")) return "#eab308";
    if (s.includes("fragilit")) return "#a3a3a3";
    if (s.includes("solidit")) return "#16a34a";
    return "#64748b";
  }

  function getScoreValue(w) {
    const s = w.toLowerCase();
    if (s === "default") return 0;
    if (s.includes("situazione grave")) return 14;
    if (s === "alert") return 28;
    if (s.includes("rischio")) return 42;
    if (s.includes("fragilità elevata")) return 56;
    if (s.includes("fragilit")) return 70;
    if (s.includes("solidit")) return 100;
    return 0;
  }

  const allertaColor = getScoreColor(finalScoreWord);
  const allertaNum = getScoreValue(finalScoreWord);

  const downloadReport = async () => {
    if (!data?.bilancioId || !data?.crId) {
      alert("Dati non sufficienti per generare il report.");
      return;
    }
    try {
      setPdfLoading(true);
      const token = getToken();
      const headers = { "Authorization": `Bearer ${token}` };
      const companyId = getCurrentCompanyId();
      if (companyId) headers["CurrentCompany"] = companyId;

      const res = await fetch(`${API_BASE}/reportAllertaFormale/${data.bilancioId}/${data.crId}`, { headers });
      if (!res.ok) throw new Error("Errore API");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      alert("Errore durante la generazione del PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const crGiudizio = data.GeneralScore?.['Giudizio Centrale Rischi'] || "N/A";
  const bilancioGiudizio = data.GeneralScore?.['Giudizio_Bilancio'] || "N/A";
  const asIsGiudizio = data.GeneralScore?.['Profilo rischio AS IS'] || "N/A";

  const areaResults = [
    { id: "com",  label: "Minacce rapporti commerciali",      result: data?.GeneralScore?.['Minacce rapporti commerciali'] || "N/A" },
    { id: "org",  label: "Minacce gestione aziendale",        result: data?.GeneralScore?.['Minacce gestione aziendale'] || "N/A" },
    { id: "evt",  label: "Minacce da eventi pregiudizievoli", result: data?.GeneralScore?.['Minacce da eventi pregiudizievoli'] || "N/A" },
    { id: "tax",  label: "Minacce erariali e rischi",         result: data?.GeneralScore?.['Minacce erariali e rischi caratteristici'] || "N/A" },
    { id: "asis", label: "Profilo rischio AS IS",             result: asIsGiudizio },
    { id: "tobe", label: "Questionario TO BE",                result: data?.GeneralScore?.['Questionario TO BE'] || "N/A" },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans bg-slate-50 min-h-screen text-slate-800">
      {/* Header benvenuto */}
      <div className="flex items-start justify-between">
        <div className="animate-fade-in-up">
          <div className="text-sm text-[#5b63ff] tracking-wide font-semibold uppercase print:hidden">Workspace</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Bentornato, {user?.name}
          </h1> 
          <p className="mt-1 text-slate-500 print:hidden">Ecco un riepilogo della situazione finanziaria aggiornata ad oggi.</p>
        </div>
        <button
          onClick={downloadReport}
          disabled={pdfLoading}
          className={`h-10 px-5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 print:hidden shrink-0 ${pdfLoading ? 'bg-slate-500 cursor-wait' : 'bg-slate-900 hover:bg-slate-800'}`}
        >
          {pdfLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Generazione in corso...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Stampa Rapporto
            </>
          )}
        </button>
      </div>

      {/* RIGA 1 — Allerta Principale */}
      <section className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm transition duration-300 hover:shadow-md">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex-1 w-full">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Giudizio Allerta Globale</div>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">Stato Complessivo</h2>
              <Pill text={finalScoreWord} color={allertaColor} className="text-sm shadow-sm" />
            </div>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-lg">
              Basato su algoritmi proprietari che analizzano l'ultimo bilancio depositato, 
              le segnalazioni in Centrale Rischi e l'esito dei questionari qualitativi.
            </p>

            {/* ── Scala orizzontale ── */}
            <AllertaScale currentWord={finalScoreWord} />
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Valutazione Bilancio</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-lg font-bold text-slate-800">{bilancioGiudizio}</div>
                  <ResultPill result={bilancioGiudizio} />
                </div>
              </div>
              
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Centrale Rischi</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-lg font-bold text-slate-800">{crGiudizio}</div>
                  <ResultPill result={crGiudizio} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Profilo Rischio AS IS</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-lg font-bold text-slate-800">{asIsGiudizio}</div>
                  <ResultPill result={asIsGiudizio} />
                </div>
              </div>
            </div>
          </div>
 
        </div>
      </section>

      {/* === Analisi per area ======================================== */}
      <section className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#5b63ff] rounded-full"></div>
            Analisi dettagliata per area
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areaResults.map((a, i) => (
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

    </div>
  );
}
