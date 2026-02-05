// src/pages/AnalisiBilancioDettaglio.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/* ======================= Config & API ======================= */
const API_BASE = "https://ada-stage.compaynet-b2b.com/api"

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

  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data; // payload diretto con { idDocumento, renderHTML, bilancioAnalisi: {...} }
}
async function postAnalisiBilancioBasic(payload) {
  const res = await fetch(`${API_BASE}/analisiBilancioBasic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...commonHeaders() },
    body: JSON.stringify(payload),
  });
  let data = null; try { data = await res.json(); } catch {}
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
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data;
}

/* ======================= Scale / utils UI ======================= */
const SCALE = [
  { label: "Solido",        min: 90, color: "#16a34a" },
  { label: "Molto buono",   min: 80, color: "#22c55e" },
  { label: "Buono",         min: 70, color: "#4ade80" },
  { label: "Neutro",        min: 60, color: "#a3a3a3" },
  { label: "Debole",        min: 50, color: "#f59e0b" },
  { label: "Molto debole",  min: 40, color: "#f97316" },
  { label: "Fragile",       min: 0,  color: "#ef4444" },
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

const classify = (score)=> SCALE.find(s=>score>=s.min) || SCALE.at(-1);
const fmtPerc = (v) => v==null ? "N/A" : (v).toLocaleString("it-IT",{maximumFractionDigits:2}) + "%";
const load = (k, def) => { try { const r = localStorage.getItem(k); return r?JSON.parse(r):def; } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
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
// normalizza valore in stringa per API (usa punto come separatore decimale)
function toApiString(v) {
  const n = parseNum(v);
  return n == null ? "" : String(n);
}

/* ======================= Small UI + Skeletons ======================= */
function Gauge({ value=0, color="#111", size=96, stroke=10 }) {
  const r=(size-stroke)/2, c=2*Math.PI*r, off=c*(1-Math.max(0,Math.min(100,value))/100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#eee" strokeWidth={stroke} fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="700">{value}</text>
    </svg>
  );
}
const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.9a7 7 0 0 0-1.7-1l-.2-2.6H11l-.2 2.6a7 7 0 0 0-1.7 1L6.7 6l-2 3.5 2 1.5a7 7 0 0 0 0 2.1l-2 1.5 2 3.5 2.4.9 2-3.5-2-1.5c.07-.33.1-.66.1-.1Z" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);
const PencilIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M14.06 6.19l3.75 3.75L20.5 7.25a1.77 1.77 0 0 0 0-2.5l-1.25-1.25a1.77 1.77 0 0 0-2.5 0l-2.69 2.69Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);
function StatusIcon({ kind }) {
  if (kind === "ok")
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-teal-200 text-teal-700 bg-teal-50">✅ No</span>;
  if (kind === "bad")
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-rose-200 text-rose-700 bg-rose-50">❌ Sì</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-amber-200 text-amber-700 bg-amber-50">⚠️ N/D</span>;
}

function StatusIconTwo({ kind }) {
  if (kind === "ok")
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-teal-200 text-teal-700 bg-teal-50">✅</span>;
  if (kind === "bad")
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-rose-200 text-rose-700 bg-rose-50">❌</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-amber-200 text-amber-700 bg-amber-50">⚠️</span>;
}

/* === Skeleton helpers === */
const SkLine = ({ w="100%", h=12, className="" }) => (
  <div className={`animate-pulse rounded ${className}`} style={{ width:w, height:h, backgroundColor:"#E5E7EB" }} />
);
const SkBadge = ({ w=120, h=28 }) => <SkLine w={w} h={h} className="rounded-full" />;
const SkBtn = ({ w=130, h=36 }) => <SkLine w={w} h={h} className="rounded-lg" />;
const SkCircle = ({ size=96 }) => (
  <div className="animate-pulse rounded-full" style={{ width:size, height:size, backgroundColor:"#E5E7EB" }} />
);

/* === Full page loader (overlay) === */
function FullPageLoader({ show }) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-white/70 backdrop-blur-[1px] grid place-items-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full border-4 border-neutral-300 border-t-neutral-900 animate-spin" />
        <div className="text-sm text-neutral-700">Caricamento dati bilancio…</div>
      </div>
    </div>
  );
}

/* ======================= Page ======================= */
export default function AnalisiBilancioDettaglio() {
  const { id } = useParams(); 
  const initialDocId = Number(id) || null;

  const [docId, setDocId] = useState(initialDocId);
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [nomeAzienda, setNomeAzienda] = useState(null);

  // score UI
  const [score, setScore] = useState(78);
  const rating = classify(score);

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
  const [qFlags, setQFlags] = useState({}); // { "Agenzia delle Entrate": true|false|null, ... }

  // Modale voci mancanti per indice
  const [modalVoci, setModalVoci] = useState(null); // { id, nome, voci:[] }
  const [tmpVoci, setTmpVoci] = useState({});
  const autoSaveRef = useRef(null); // debounce salvataggio immediato

  // Modale anteprima bilancio
  const [previewOpen, setPreviewOpen] = useState(false);
  // Modale questionario singolo
  const [qModal, setQModal] = useState(null); // "ade"|"inps"|"risc"|"retrib"|"forn"|null

  // aggiorna docId se cambia la route
  useEffect(()=>{
    const next = Number(id);
    if (next && next !== docId) setDocId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        setRecap(payload);

        setNomeAzienda(payload?.nome_azienda ?? null);

        // Score (se disponibile)
        const maybeScore =
          payload?.bilancioAnalisi?.Score ??
          payload?.bilancioAnalisi?.score ??
          null;
        if (maybeScore != null) {
          const s = parseNum(maybeScore);
          if (s != null) setScore(Math.max(0, Math.min(100, Math.round(s))));
        }

        // ---- mappa voci mancanti per indice ----
        const missingMap = {};
        const missSrc = payload?.bilancioAnalisi?.indiceVociMancanti || {};
        for (const [k,v] of Object.entries(missSrc)) {
          missingMap[normKey(k)] = v; // es. {"1":[...]} ecc.
        }

        // ---- Indici Basic ----
        const rawBasic = payload?.bilancioAnalisi?.Indici?.Basic || {};
        const arr = Object.entries(rawBasic).map(([nome, val])=>{
          const id   = nomeToId(nome);
          const norm = normKey(nome);
          const missingVoci = missingMap[norm] || null;

          if (val === false) {
            return { id, nome, valore:null, fmt:"%", fuori:"N/A", missing:true, missingVoci };
          }
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

        setIndici(arr);
        save(keyFor("indici", docId), arr);

        const rawBasicAdvanced = payload?.bilancioAnalisi?.Indici?.Advanced || {};
        const arrAdvanced = Object.entries(rawBasicAdvanced).map(([nome, val])=>{
          const id   = nomeToId(nome);
          const norm = normKey(nome);
          const missingVoci = missingMap[norm] || null;

          if (val === false) {
            return { id, nome, valore:null, fmt:"%", fuori:"N/A", missing:true, missingVoci };
          }
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

        setIndiciAdvanced(arrAdvanced);
        save(keyFor("indiciarrAdvanced", docId), arrAdvanced);

        // Prefill Questionari se l’API te li rimanda (stesso naming legacy)
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

        // Flags Questionari (true/false/null)
        setQFlags(payload?.bilancioAnalisi?.Questionari || {});
      } catch (e) {
        console.error(e);
        if (!cancel) setLoadErr("Errore nel caricamento del bilancio.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return ()=>{ cancel=true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  /* -------------------- Alert sintetico basato su Questionari -------------------- */
  const alertStatus = useMemo(() => {
    const out = {};
    for (const a of ALERT_LINKS) {
      const flag = qFlags?.[Q_MAP[a.id]];
      if (Array.isArray(flag)) out[a.id] = "ok";
      else if (flag === false) out[a.id] = "missing";
      else out[a.id] = "missing";
    }
    return out;
  }, [qFlags]);

  /* -------------------- Salvataggio questionari -------------------- */
  const saveQuestionari = async () => {
    try {
      if (!docId) throw new Error("Documento non trovato.");

      const ade4 = ratio(qData.ade.debito, qData.ade.vaTrimestre) ?? null;
      const inps3= ratio(qData.inps.nonVersati, qData.inps.totAnnoPrec) ?? null;
      const re3  = ratio(qData.retrib.debiti, qData.retrib.totMensili, true) ?? null;

      const payload = {
        idBilancio: docId,
        agenziaEntrate1: qData.ade.debito || "",
        agenziaEntrate2: qData.ade.vaTrimestre || "",
        agenziaEntrate3: qData.ade.vaAnnoPrec || "",
        agenziaEntrate4: ade4,
        INPS1: qData.inps.nonVersati || "",
        INPS2: qData.inps.totAnnoPrec || "",
        INPS3: inps3,
        riscossione: qData.risc.crediti || "",
        retribuzioni1: qData.retrib.debiti || "",
        retribuzioni2: qData.retrib.totMensili || "",
        retribuzioni3: re3,
        fornitori1: qData.forn.debiti || "",
        fornitori2: qData.forn.acquisti || "",
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

      // refetch recap per aggiornare i flag Questionari (mostra overlay loader)
      try {
        setLoading(true);
        const refreshed = await postRecapBilancioById(docId);
        setQFlags(refreshed?.bilancioAnalisi?.Questionari || qFlags);

        // aggiorna anche indici in caso siano cambiati
        const missSrc = refreshed?.bilancioAnalisi?.indiceVociMancanti || {};
        const mm = {};
        for (const [k,v] of Object.entries(missSrc)) mm[normKey(k)] = v;

        const rawBasic = refreshed?.bilancioAnalisi?.Indici?.Basic || {};
        const arr = Object.entries(rawBasic).map(([nome, val])=>{
          const id = nomeToId(nome);
          const norm = normKey(nome);
          const missingVoci = mm[norm] || null;
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
        setIndici(arr);
        save(keyFor("indici", docId), arr);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }

      alert("Dati salvati.");
      setQModal(null);
    } catch (e) {
      console.error(e);
      alert("Errore salvataggio dati.");
    }
  };

  /* -------------------- Modale VOCI MANCANTI per indice -------------------- */
  const openVoci = (row) => {
    const voci = listMissingKeys(row?.missingVoci);
    const prefill = {};
    const init = {};
    voci.forEach(k => { init[k] = prefill?.[k] ?? ""; });
    setTmpVoci(init);
    setModalVoci({ id: row.id, nome: row.nome, voci });
  };

  // >>> NEW: salvataggio immediato (debounced) al cambio di un singolo valore
  const handleVociChange = (key, val) => {
    setTmpVoci(s => ({ ...s, [key]: val }));
    save(keyFor(`voci_${modalVoci?.id}`, docId), { ...(tmpVoci || {}), [key]: val });
    // debounce placeholder
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(()=>{}, 600);
  };

  // Salva TUTTE le voci inserite (bottone "Salva valori")
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
      setRecap(refreshed);
      setNomeAzienda(refreshed?.nome_azienda ?? null);

      const missSrc = refreshed?.bilancioAnalisi?.indiceVociMancanti || {};
      const mm = {};
      for (const [k,v] of Object.entries(missSrc)) mm[normKey(k)] = v;

      const rawBasic = refreshed?.bilancioAnalisi?.Indici?.Basic || {};
      const arr = Object.entries(rawBasic).map(([nome, val])=>{
        const id = nomeToId(nome);
        const norm = normKey(nome);
        const missingVoci = mm[norm] || null;

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
      setIndici(arr);
      save(keyFor("indici", docId), arr);

      setModalVoci(null);
    } catch (e) {
      console.error(e);
      alert("Errore nel salvataggio delle voci mancanti.");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- Helpers UI -------------------- */
  const indexStatus = (r) => {
    if (r.missing || r.fuori === "N/A") return "missing";
    if (String(r.fuori).toLowerCase().startsWith("sì") || String(r.fuori).toLowerCase()==="si") return "bad";
    return "ok";
  };
  const labelsMap = recap?.bilancioAnalisi?.labels || {};

  const openQuestionario = (id) => setQModal(id);

  /* ======================= Render ======================= */
  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-stretch gap-4">
          <div className="shrink-0 flex items-center justify-center px-2">
            <div className="text-center">
              {loading ? (
                <>
                  <SkCircle size={96} />
                  <div className="text-xs text-neutral-500 mt-1"><SkLine w={90} h={12} className="mx-auto" /></div>
                </>
              ) : (
                <>
                  <Gauge value={score} color={rating.color}/>
                  <div className="text-xs text-neutral-500 mt-1">Scoring /100</div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-[#5b63ff] font-medium">Analisi Bilancio</div>
                <h1 className="mt-1 text-2xl font-semibold">
                  {loading ? <SkLine w={280} h={24} /> : <>Panoramica bilancio {nomeAzienda ? `${nomeAzienda}` : ""}</>}
                </h1>
                <p className="text-sm text-neutral-500">
                  {loading ? <SkLine w={340} /> : "Punteggio calcolato su grandezze contabili e indicatori CNDC\\EC."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-neutral-500">{loading ? <SkLine w={60} /> : "Giudizio"}</span>
                  {loading ? (
                    <SkBadge w={130} />
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
                      style={{color:rating.color, backgroundColor:rating.color+"22", borderColor:rating.color+"55"}}>
                      <span className="w-2 h-2 rounded-full" style={{background:rating.color}}/>
                      {rating.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {loading ? <SkBtn w={160} /> : (
                  <button
                    onClick={()=>setPreviewOpen(true)}
                    className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm hover:opacity-90 grid place-items-center"
                  >
                    Anteprima bilancio
                  </button>
                )}
              </div>
            </div>

            {loadErr && <div className="mt-2 text-sm text-red-600">{loadErr}</div>}
          </div>
        </div>
      </section>

      {/* INDICI + ALERT */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Indici */}
        <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="font-semibold">Indici</h2>
            <div className="text-xs text-neutral-500">Mancanti: <b>{missingCount}</b></div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-3 text-left">Indici</th>
                <th className="px-3 py-3 text-left">Valore</th>
                <th className="px-3 py-3 text-left">Fuori soglia?</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
  Array.from({length:6}).map((_,i)=>(
    <tr key={`sk-indici-${i}`} className="border-t border-neutral-200">
      <td className="px-3 py-3"><SkLine w="60%" /></td>
      <td className="px-3 py-3"><SkLine w="40%" /></td>
      <td className="px-3 py-3"><SkBadge w={80} h={24} /></td>
    </tr>
  ))
) : (
  indici.map((r, idx, arr) => {
    const isLast = idx === arr.length - 1;
    const v = String(r.note ?? '');
  
const kind = v.includes('Azienda NON a Rischio') ? 'ok'
            : v.includes('Azienda a Rischio')    ? 'bad'
            : undefined;
    return (
      <tr key={r.id} className="border-t border-neutral-200">
        <td className={"px-3 py-3 " + (r.missing ? "text-red-600" : "")}>{r.nome}</td>
        <td className="px-3 py-3">
          {!r.missing ? (
            <span className="font-medium">

                <span className="mr-2">


{kind && <StatusIconTwo kind={kind} />}

                </span>
              {r.fmt === "%" ? fmtPerc(r.valore) : (r.fmt ? `${r.valore}${r.fmt}` : (r.note || "—"))}

              
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={()=>openVoci(r)}
                className="px-3 py-1.5 rounded-lg border border-[#D8D2FF] bg-[#ECE8FF] text-[#5b63ff] text-xs"
              >
                INSERISCI VALORI MANCANTI
              </button>
              {r.missingVoci && (
                <span className="text-xs text-neutral-500">
                  ({countMissingVoci(r.missingVoci)} voci XBRL mancanti)
                </span>
              )}
            </div>
          )}
        </td>
        <td className="px-3 py-3">
          {!isLast && <StatusIcon kind={indexStatus(r)} />}
        </td>
      </tr>
    );
  })
)}

            </tbody>
          </table>
        </section>

        {/* Alert (pilotati da Questionari) */}
        <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200">
            <h2 className="font-semibold">Alert</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left">Voce</th>
                <th className="px-4 py-3 text-left">Alert</th>
                <th className="px-4 py-3 text-left w-[1%]">Azione</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i)=>(
                  <tr key={`sk-alert-${i}`} className={i? "border-t border-neutral-200": ""}>
                    <td className="px-4 py-3"><SkLine w="55%" /></td>
                    <td className="px-4 py-3"><SkBadge w={70} h={24} /></td>
                    <td className="px-4 py-3">
                      <SkBtn w={36} h={36} />
                    </td>
                  </tr>
                ))
              ) : (
                ALERT_LINKS.map((a, i)=> {
                  const s = alertStatus[a.id] || "missing";
                  const qVal = qFlags?.[Q_MAP[a.id]];
                  return (
                    <tr key={a.id} className={i? "border-t border-neutral-200": ""}>
                      <td className="px-4 py-3">{a.label}</td>
                      <td className="px-4 py-3">
                        <StatusIcon kind={s}/>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={()=>openQuestionario(a.id)}
                            className="h-8 w-8 rounded-full border border-neutral-300 grid place-items-center hover:bg-neutral-50"
                            title="Compila/Modifica questionario"
                          >
                            <PencilIcon/>
                          </button>
                          {qVal == null && (
                            <button
                              onClick={()=>openQuestionario(a.id)}
                              className="px-3 py-1.5 rounded-lg border border-[#D8D2FF] bg-[#ECE8FF] text-[#5b63ff] text-xs"
                            >
                              COMPILA QUESTIONARIO
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
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
        {/* Indici Advanced */}
        <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="font-semibold">Indici Advanced</h2> 
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-3 text-left">Indici</th>
                <th className="px-3 py-3 text-left">Valore</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:6}).map((_,i)=>(
                  <tr key={`sk-adv-${i}`} className="border-t border-neutral-200">
                    <td className="px-3 py-3"><SkLine w="60%" /></td>
                    <td className="px-3 py-3"><SkLine w="40%" /></td>
                    <td className="px-3 py-3"><SkBadge w={80} h={24} /></td>
                  </tr>
                ))
              ) : (
                indiciAdvanced.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-200">
                    <td className={"px-3 py-3 " + (r.missing ? "text-red-600" : "")}>{r.nome}</td>
                    <td className="px-3 py-3">
                      {!r.missing ? (
                        <span className="font-medium">
                          {r.fmt === "%" ? fmtPerc(r.valore) : (r.fmt ? `${r.valore}${r.fmt}` : (r.note || "—"))}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={()=>openVoci(r)}
                            className="px-3 py-1.5 rounded-lg border border-[#D8D2FF] bg-[#ECE8FF] text-[#5b63ff] text-xs"
                          >
                            INSERISCI VALORI MANCANTI
                          </button>
                          {r.missingVoci && (
                            <span className="text-xs text-neutral-500">
                              ({countMissingVoci(r.missingVoci)} voci XBRL mancanti)
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusIconTwo kind={indexStatus(r)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* MODALE: valori mancanti per indice */}
      {modalVoci && (
        <div className="fixed inset-0 bg-black/30 z-40 grid place-items-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-3xl p-4">
            <h3 className="font-semibold">Valori mancanti – {modalVoci.nome}</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Inserisci i valori per le voci XBRL mancanti. Salviamo in automatico e aggiorniamo il bilancio.
            </p>
            <div className="mt-4 max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Voce</th>
                    <th className="px-3 py-2 text-left">Chiave</th>
                    <th className="px-3 py-2 text-left">Valore</th>
                  </tr>
                </thead>
                <tbody>
                  {modalVoci.voci.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-500">Nessuna voce elencata.</td></tr>
                  ) : modalVoci.voci.map(k=>(
                    <tr key={k} className="border-t border-neutral-200">
                      {(() => {
                        const { base, idx } = splitCombinedKey(k);
                        return (
                          <td className="px-3 py-2">
                            {labelsMap[base] || base}
                            {idx && <span className="ml-1 text-xs text-neutral-500">_{idx}</span>}
                          </td>
                        );
                      })()}
                      <td className="px-3 py-2 text-xs text-neutral-500">{k}</td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full border border-neutral-300 rounded-md px-2 py-1"
                          placeholder="es. 12345,67"
                          onChange={e=>handleVociChange(k, e.target.value)}
                          inputMode="decimal"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setModalVoci(null)} className="px-3 py-1.5 rounded-md border border-neutral-300 text-sm">Chiudi</button>
              <button onClick={saveVoci} className="px-3 py-1.5 rounded-md bg-neutral-900 text-white text-sm">
                Salva valori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE: Anteprima bilancio (renderHTML) */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 grid place-items-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-5xl h-[80vh] flex flex-col">
            <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-semibold">Anteprima bilancio</h3>
              <button onClick={()=>setPreviewOpen(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 text-sm">Chiudi</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {recap?.renderHTML ? (
                <div dangerouslySetInnerHTML={{ __html: recap.renderHTML }} />
              ) : (
                <div className="text-sm text-neutral-600">
                  Nessun contenuto HTML disponibile per il bilancio.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE: Questionario (dinamico) */}
      {qModal && (
        <div className="fixed inset-0 bg-black/40 z-40 grid place-items-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-2xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Compila questionario – {Q_MAP[qModal]}</h3>
              <button onClick={()=>setQModal(null)} className="px-3 py-1.5 rounded-md border border-neutral-300 text-sm">Chiudi</button>
            </div>
            <div className="mt-4 grid gap-3">
              {/* ... (questionari invariati) ... */}
              {qModal === "ade" && (
                <>
                  <P>L’Agenzia delle Entrate si attiva in presenza di un debito IVA scaduto “rilevante”.</P>
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
                  <Field label="Volume d’affari del trimestre dell’ultima liquidazione IVA">
                    <Input money value={qData.ade.vaTrimestre}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, ade:{...s.ade, vaTrimestre:v} };
                          next.ade.ratio = ratio(next.ade.debito, next.ade.vaTrimestre) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <Field label="Volume d’affari della dichiarazione IVA anno precedente (facoltativo)">
                    <Input money value={qData.ade.vaAnnoPrec}
                      onChange={(v)=>setQData(s=>({ ...s, ade:{...s.ade, vaAnnoPrec:v} }))}/>
                  </Field>
                  <ReadOnly label="Debito / Volume ultima liquidazione IVA" value={
                    qData.ade.ratio==null ? "—" : (qData.ade.ratio*100).toLocaleString("it-IT",{maximumFractionDigits:2}) + " %"
                  } />
                </>
              )}

              {qModal === "inps" && (
                <>
                  <P>Attivazione se non versati &gt; 6 mesi superano la metà dell’anno precedente e 50.000 €.</P>
                  <Field label="Contributi NON versati (oltre 6 mesi)">
                    <Input money value={qData.inps.nonVersati}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, inps:{...s.inps, nonVersati:v} };
                          next.inps.ratio = ratio(next.inps.nonVersati, next.inps.totAnnoPrec) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <Field label="Totale contributi anno precedente">
                    <Input money value={qData.inps.totAnnoPrec}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, inps:{...s.inps, totAnnoPrec:v} };
                          next.inps.ratio = ratio(next.inps.nonVersati, next.inps.totAnnoPrec) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <ReadOnly label="Non versati &gt;6m / Totale anno prec." value={
                    qData.inps.ratio==null ? "—" : (qData.inps.ratio*100).toLocaleString("it-IT",{maximumFractionDigits:2}) + " %"
                  } />
                </>
              )}

              {qModal === "risc" && (
                <>
                  <P>Attivazione con crediti affidati scaduti da oltre 90 giorni, oltre soglia.</P>
                  <Field label="Totale crediti affidati scaduti da oltre 90 giorni">
                    <Input money value={qData.risc.crediti}
                      onChange={(v)=>setQData(s=>({ ...s, risc:{...s.risc, crediti:v} }))}/>
                  </Field>
                </>
              )}

              {qModal === "retrib" && (
                <>
                  <P>Verifica presenza di debiti per retribuzioni scaduti &gt;60 giorni.</P>
                  <Field label="Debiti retribuzioni scaduti &gt; 60 giorni">
                    <Input money value={qData.retrib.debiti}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, retrib:{...s.retrib, debiti:v} };
                          next.retrib.ratio = ratio(next.retrib.debiti, next.retrib.totMensili, true) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <Field label="Totale retribuzioni mensili">
                    <Input money value={qData.retrib.totMensili}
                      onChange={(v)=>{
                        setQData(s=>{
                          const next = { ...s, retrib:{...s.retrib, totMensili:v} };
                          next.retrib.ratio = ratio(next.retrib.debiti, next.retrib.totMensili, true) ?? null;
                          return next;
                        });
                      }}/>
                  </Field>
                  <ReadOnly label="Debiti / Retribuzioni mensili" value={
                    qData.retrib.ratio==null ? "—" : (qData.retrib.ratio).toLocaleString("it-IT",{maximumFractionDigits:2}) + " %"
                  } />
                </>
              )}

              {qModal === "forn" && (
                <>
                  <P>Verifica debiti verso fornitori scaduti da più di 120 giorni.</P>
                  <Field label="Debiti verso fornitori scaduti &gt; 120 giorni">
                    <Input money value={qData.forn.debiti}
                      onChange={(v)=>setQData(s=>({ ...s, forn:{...s.forn, debiti:v} }))}/>
                  </Field>
                  <Field label="Debiti verso fornitori non scaduti (facoltativo)">
                    <Input money value={qData.forn.acquisti}
                      onChange={(v)=>setQData(s=>({ ...s, forn:{...s.forn, acquisti:v} }))}/>
                  </Field>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setQModal(null)} className="px-3 py-1.5 rounded-md border border-neutral-300 text-sm">Annulla</button>
              <button onClick={saveQuestionari} className="px-3 py-1.5 rounded-md bg-neutral-900 text-white text-sm">
                Salva questionario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay loader */}
      <FullPageLoader show={loading} />
    </div>
  );
}

/* ====== tiny components ====== */
function Card({ id, title, children, onSave }) {
  return (
    <section id={id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={onSave} className="h-8 px-3 rounded-lg bg-neutral-900 text-white text-xs hover:opacity-90">Salva</button>
      </div>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm mb-1">{label}</div>
      {children}
    </label>
  );
}
function Input({ value, onChange, placeholder="", money=false }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e)=>onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
      inputMode={money ? "decimal" : "text"}
    />
  );
}
function ReadOnly({ label, value }) {
  return (
    <div>
      <div className="text-sm mb-1">{label}</div>
      <div className="border border-neutral-200 bg-neutral-50 rounded-md px-3 py-2 text-sm">
        {value ?? "—"}
      </div>
    </div>
  );
}
function P({ children }) { return <p className="text-sm text-neutral-600">{children}</p>; }

/* ====== helpers ====== */
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
  // Restituisce SEMPRE chiavi pronte per l’API, es. "XBRLKey_1"
  const out = [];
  if (!miss) return out;

  for (const bucket of Object.values(miss)) {
    if (!Array.isArray(bucket)) continue;

    for (const item of bucket) {
      if (Array.isArray(item) && item.length >= 2) {
        const [key, idx] = item;
        out.push(String(key) + "_" + String(idx));
      } else if (item && typeof item === "object" && "key" in item) {
        const idx = item.index ?? item.idx ?? item.period ?? 1;
        out.push(String(item.key) + "_" + String(idx));
      } else {
        out.push(String(item));
      }
    }
  }
  return out;
}

function splitCombinedKey(k){
  const m = String(k).match(/^(.*)_(\d+)$/);
  return m ? { base: m[1], idx: m[2] } : { base: String(k), idx: null };
}
