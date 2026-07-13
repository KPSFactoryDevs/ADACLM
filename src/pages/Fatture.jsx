// src/pages/Fatture.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSetPageContext } from "../contexts/PageContext";

// in cima al file (import)
import {
  PieChart as RPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { API_BASE as CENTRAL_API_BASE } from "../lib/api";
const API_BASE = CENTRAL_API_BASE.replace(/\/api$/, "");

// legge il token da localStorage sb_auth -> { token: "..." }
function getBearerHeaders() {
  try {
    const raw = localStorage.getItem("sb_auth") || sessionStorage.getItem("sb_auth");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const token = parsed?.token || parsed?.access_token || parsed?.jwt;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json", ...getBearerHeaders() },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getBearerHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/* ======================= ICONS ======================= */
const IconDoc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M8 13h8M8 17h8M8 9h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconPlus = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const IconImport = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V9M8 13l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M5 5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const IconExport = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v10M8 9l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M5 19h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const IconSearch = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="M21 21l-3.8-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const ChevronLeft = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const ChevronRight = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const ChevronUp = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const ChevronDown = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);

/* ======================= SKELETONS ======================= */
const SkLine = ({ w="100%", h=12, className="" }) => (
  <div className={`animate-pulse rounded ${className}`} style={{ width:w, height:h, backgroundColor:"#E5E7EB" }} />
);
const SkBadge = ({ w=120, h=28 }) => <SkLine w={w} h={h} className="rounded-full" />;
const SkBtn = ({ w=130, h=36 }) => <SkLine w={w} h={h} className="rounded-lg" />;
const SkRect = ({ w="100%", h=200, className="" }) => <SkLine w={w} h={h} className={className} />;

/* ======================= UTILS ======================= */
const fmtMoney = v => (Number(v)||0).toLocaleString("it-IT",{style:"currency", currency:"EUR"});

// ISO già con 'T' => new Date(s), altrimenti aggiungo 'T00:00:00'
const toDate = (s) => {
  if (!s) return null;
  const d = /T/.test(s) ? new Date(s) : new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};
const fmtDate = (s) => {
  const d = toDate(s);
  return d ? d.toLocaleDateString("it-IT", { day:"2-digit", month:"short", year:"numeric" }) : "—";
};
const parseYM = (s) => {
  const d = toDate(s) || new Date();
  return { y: d.getFullYear(), m: d.getMonth() };
};
const MONTHS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

/* ======================= SMALL UI ======================= */
function PillStato({ stato }) {
  const map = {
    "Esigibile":        { bg:"#DBEAFE", text:"#1E40AF", bd:"#93C5FD" },
    "In Valutazione":   { bg:"#FEF3C7", text:"#92400E", bd:"#FCD34D" },
    "Acquistata":       { bg:"#DCFCE7", text:"#166534", bd:"#86EFAC" },
    "Non Elegibile":    { bg:"#FEE2E2", text:"#991B1B", bd:"#FCA5A5" },
  };
  const lab = stato in map ? stato : String(stato||"");
  const s = map[stato] || { bg:"#E5E7EB", text:"#374151", bd:"#D1D5DB" };
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border"
      style={{ background:s.bg, color:s.text, borderColor:s.bd }}>
      <span className="w-2 h-2 rounded-full" style={{ background:s.text }} />
      {lab}
    </span>
  );
}
function Stars({ n=0 }) {
  return <div className="inline-flex">{[1,2,3,4,5].map(i=><Star key={i} filled={i<=n} />)}</div>;
}
function Star({ filled }) {
  const fill = filled ? "#f59e0b" : "none";
  const stroke = filled ? "#f59e0b" : "#9ca3af";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="mx-[1px]">
      <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 19.8l1-6.1L3.2 9.4l6.1-.9L12 3Z"
        fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function SortTh({ children, k, activeKey, dir, onSort, className="" }) {
  const active = activeKey === k;
  return (
    <th onClick={()=>onSort(k)} className={`px-3 py-2 text-left select-none cursor-pointer ${className}`} title="Ordina">
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`transition ${active ? "opacity-100" : "opacity-30 text-neutral-400"}`}>
          {dir === "asc" ? <ChevronUp/> : <ChevronDown/>}
        </span>
      </span>
    </th>
  );
}

/* ======================= CHARTS ======================= */
function GroupBar({ vendibili, vendute, height=200 }) {
  const width = 1100, pad = 24, months = 12;
  const max = Math.max(1, ...vendibili, ...vendute);
  const bw = ((width - pad*2) / months) * 0.8;
  const gap = ((width - pad*2) / months) * 0.2;
  const bar = bw/2 - 4;
  const mapY = v => height - pad - (v/max) * (height - pad*2);
  return (
    <svg className="w-full" viewBox={`0 0 ${width} ${height}`}>
      <line x1="0" y1={height-pad} x2={width} y2={height-pad} stroke="#e5e7eb"/>
      {vendibili.map((v,i)=>{
        const xBand = pad + i*((width - pad*2)/months) + gap/2;
        return (
          <g key={i}>
            <rect x={xBand} y={mapY(v)} width={bar} height={Math.max(1,(height-pad) - mapY(v))} fill="#3B82F6"/>
            <rect x={xBand + bar + 6} y={mapY(vendute[i]||0)} width={bar} height={Math.max(1,(height-pad) - mapY(vendute[i]||0))} fill="#10B981"/>
            <text x={xBand + bw/2} y={height-6} fontSize="10" textAnchor="middle" fill="#6b7280">{MONTHS[i]}</text>
          </g>
        );
      })}
      <g transform="translate(16,14)">
        <rect x="0" y="-8" width="10" height="10" fill="#3B82F6"/><text x="14" y="0" fontSize="11" fill="#374151">Vendibili</text>
        <rect x="84" y="-8" width="10" height="10" fill="#10B981"/><text x="98" y="0" fontSize="11" fill="#374151">Vendute</text>
      </g>
    </svg>
  );
}

function PieDonut({ data }) {
  // Recharts si aspetta { name, value }
  const chartData = data.map(d => ({ name: d.label, value: d.value, color: d.color }));
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <RPieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={900}
            paddingAngle={1}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || "#8884d8"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, n) => [
              (Number(v) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" }),
              n,
            ]}
          />
        </RPieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ======================= PAGE ======================= */
export default function Fatture() {
  const [ficStatus, setFicStatus] = useState({ connected: false, company_id: null });
  const [fatture, setFatture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [q, setQ] = useState("");
  const [fltStato, setFltStato] = useState("tutti");
  const [fltMetodo, setFltMetodo] = useState("tutti");
  const [fltDir, setFltDir] = useState("tutte"); // 'tutte' | 'issued' | 'received'
  const [sortKey, setSortKey] = useState("data");
  const [sortDir, setSortDir] = useState("desc");
  const [perPage, setPerPage] = useState(10);
  const [error, setError] = useState("");

  // paginazioni separate per le due tabelle
  const [pageIssued, setPageIssued] = useState(1);
  const [pageReceived, setPageReceived] = useState(1);

  // rating “placeholder” per la UI “Vendi Fattura”
  const CLIENT_RATING = useMemo(()=>{
    const m = new Map();
    fatture.forEach(f => { if (!m.has(f.cliente)) m.set(f.cliente, 4); });
    return Object.fromEntries(m);
  }, [fatture]);

  // ---- bootstrap: stato OAuth + lista fatture
  useEffect(() => {
    let cancel = false;

    (async () => {
      const ficParam = new URLSearchParams(window.location.search).get("fic");
      if (ficParam === "connected") {
        const url = new URL(window.location.href);
        url.searchParams.delete("fic");
        window.history.replaceState({}, "", url.toString());
      }

      try {
        const status = await apiGet("/api/fic/status");
        if (!cancel) setFicStatus(status);
      } catch (e) {
        if (!cancel) setFicStatus({ connected: false, company_id: null });
      }

      try {
        setLoading(true);
        const rows = await apiGet("/api/invoices");
        if (!cancel) setFatture(mapRows(rows));
      } catch (e) {
        if (!cancel) { setFatture([]); setError("Errore nel caricamento delle fatture."); }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, []);

  // ---- azioni OAuth
  const connectFIC = async () => {
    try {
      const prep = await apiGet("/fic/prepare"); // { state, auth_redirect }
      window.location.href = prep.auth_redirect;
    } catch {
      window.location.href = `${API_BASE}/fic/connect`;
    }
  };

  const disconnectFIC = async () => {
    try {
      await apiPost("/fic/disconnect");
      setFicStatus({ connected:false, company_id:null });
    } catch (e) {
      alert("Errore disconnessione");
    }
  };

  // ---- import da FIC
  const importaDaCloud = async () => {
    try {
      setImporting(true);
      setError("");
      const res = await apiPost("/api/fic/import");
      const rows = await apiGet("/api/invoices");
      setFatture(mapRows(rows));
      alert(`Import completata. Inserite: ${res?.summary?.inserted ?? 0}, aggiornate: ${res?.summary?.updated ?? 0}`);
    } catch (e) {
      console.error(e);
      setError(`Errore import: ${e.message}`);
      alert(`Errore import: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  // ---- mapping record backend -> UI
  function mapRows(rows = []) {
    return rows.map(r => ({
      id: `${r.direction || "out"}-${r.external_id || r.id || Math.random()}`,
      data: r.date || r.data || null,
      numero: r.number || r.document_number || r.numero || "",
      cliente: r.client_name || r.customer?.name || r.cliente_nome || "",
      piva: r.client_vat || r.customer?.vat_number || r.piva || "",
      importo: Number(r.amount_gross ?? r.totale ?? 0),
      scadenza: r.due_date || r.scadenza || null,
      metodo: r.payment_method || r.metodo || "N/D",
      stato: r.status || r.stato || "Esigibile",
      direction: r.direction || r.tipo || "issued", // 'issued'|'received'
    }));
  }

  // ---- anni/mesi (carosello)
  const anni = useMemo(() => {
    const years = Array.from(new Set(
      fatture.map(f => parseYM(f.data).y)
    )).filter(y => Number.isFinite(y)).sort((a,b) => a - b);
    return years.length ? years : [new Date().getFullYear()];
  }, [fatture]);

  const [yearIdx, setYearIdx] = useState(anni.length ? anni.length-1 : 0);
  const [monthSel, setMonthSel] = useState(null);
  useEffect(()=>{ if (anni.length) setYearIdx(anni.length-1); }, [anni.length]);

  // ---- dataset filtrato comune (su cui poi splittiamo)
  const dataset = useMemo(()=>{
    const y = anni[yearIdx] ?? new Date().getFullYear();
    return fatture.filter(f=>{
      const { y:fy, m:fm } = parseYM(f.data);
      const okYear   = fy === y;
      const okMonth  = monthSel == null ? true : fm === monthSel;
      const s = q.trim().toLowerCase();
      const matchQ      = !s || [f.numero, f.cliente, f.piva, f.metodo].join(" ").toLowerCase().includes(s);
      const matchStato  = fltStato === "tutti" ? true : f.stato === fltStato;
      const matchMetodo = fltMetodo === "tutti" ? true : f.metodo === fltMetodo;
      const matchDir    = fltDir === "tutte" ? true : f.direction === fltDir;
      return okYear && okMonth && matchQ && matchStato && matchMetodo && matchDir;
    });
  }, [fatture, anni, yearIdx, monthSel, q, fltStato, fltMetodo, fltDir]);

  // ---- sort condiviso
  const sortFn = (a, b) => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    const get = (f) => {
      switch (sortKey) {
        case "data": case "scadenza": return (toDate(f[sortKey]) || new Date("1970-01-01")).getTime();
        case "importo": return f.importo;
        case "numero": return f.numero;
        case "cliente": return (f.cliente||"").toLowerCase();
        case "stato": return f.stato || "";
        case "tipo": return f.direction || "";
        default: return f.id;
      }
    };
    const va = get(a), vb = get(b);
    return (va > vb ? 1 : va < vb ? -1 : 0) * dirMul;
  };

  // ---- split in due array + sort
  const issuedSorted = useMemo(() => dataset.filter(f => f.direction === "issued").sort(sortFn), [dataset, sortKey, sortDir]);
  const receivedSorted = useMemo(() => dataset.filter(f => f.direction === "received").sort(sortFn), [dataset, sortKey, sortDir]);

  // ---- paging separato
  const totalIssued = issuedSorted.length;
  const totalReceived = receivedSorted.length;

  const pageCountIssued = Math.max(1, Math.ceil(totalIssued / perPage));
  const pageCountReceived = Math.max(1, Math.ceil(totalReceived / perPage));

  const pageIssuedSafe = Math.min(pageIssued, pageCountIssued);
  const pageReceivedSafe = Math.min(pageReceived, pageCountReceived);

  const listIssued = issuedSorted.slice((pageIssuedSafe-1)*perPage, pageIssuedSafe*perPage);
  const listReceived = receivedSorted.slice((pageReceivedSafe-1)*perPage, pageReceivedSafe*perPage);

  // --- Page context for AI ChatWidget ---
  useSetPageContext(
    !loading && fatture.length > 0 ? {
      page: "Fatture",
      summary: `${fatture.length} fatture totali — ${fatture.filter(f => f.direction === 'issued').length} emesse, ${fatture.filter(f => f.direction === 'received').length} ricevute`,
      data: {
        totale_fatture: fatture.length,
        fatture_emesse: fatture.filter(f => f.direction === 'issued').length,
        fatture_ricevute: fatture.filter(f => f.direction === 'received').length,
        importo_totale_emesse: fatture.filter(f => f.direction === 'issued').reduce((s, f) => s + f.importo, 0),
        importo_totale_ricevute: fatture.filter(f => f.direction === 'received').reduce((s, f) => s + f.importo, 0),
        stati: [...new Set(fatture.map(f => f.stato))].map(stato => ({
          stato,
          conteggio: fatture.filter(f => f.stato === stato).length,
          importo: fatture.filter(f => f.stato === stato).reduce((s, f) => s + f.importo, 0),
        })),
        top_clienti: [...new Map(fatture.filter(f => f.direction === 'issued').map(f => [
          f.cliente,
          { nome: f.cliente, piva: f.piva, importo_totale: fatture.filter(ff => ff.cliente === f.cliente && ff.direction === 'issued').reduce((s, ff) => s + ff.importo, 0), num_fatture: fatture.filter(ff => ff.cliente === f.cliente && ff.direction === 'issued').length }
        ])).values()].sort((a, b) => b.importo_totale - a.importo_totale).slice(0, 10),
        anno_selezionato: anni[yearIdx],
        connesso_fatture_in_cloud: ficStatus.connected,
      }
    } : null
  );

  // ---- grafici (restano basati su tutto l'anno, non solo pagina)
  const bars = useMemo(()=>{
    const y = anni[yearIdx] ?? new Date().getFullYear();
    const vendibili = new Array(12).fill(0);
    const vendute   = new Array(12).fill(0);
    fatture.forEach(f=>{
      const { y:fy, m } = parseYM(f.data);
      if (fy !== y) return;
      const rating = CLIENT_RATING[f.cliente] ?? 0;
      if (f.stato === "Esigibile" && rating >= 4) vendibili[m] += 1;
      if (f.stato === "Acquistata") vendute[m] += 1;
    });
    return { vendibili, vendute };
  }, [fatture, anni, yearIdx, CLIENT_RATING]);

  const pieColors = ["#93C5FD","#86EFAC","#FDE68A","#FCA5A5","#C4B5FD","#7DD3FC","#FDBA74","#A7F3D0","#F9A8D4","#FCD34D"];

  const pieIssued = useMemo(()=>{
    const map = new Map();
    dataset.filter(f=>f.direction==="issued").forEach(f=>{
      const key = f.cliente || "Senza nome";
      map.set(key, (map.get(key)||0) + (Number(f.importo)||0));
    });
    return Array.from(map.entries()).map(([label,value],i)=>({ label, value, color: pieColors[i%pieColors.length] }));
  }, [dataset]);

  const pieReceived = useMemo(()=>{
    const map = new Map();
    dataset.filter(f=>f.direction==="received").forEach(f=>{
      const key = f.cliente || "Senza nome";
      map.set(key, (map.get(key)||0) + (Number(f.importo)||0));
    });
    return Array.from(map.entries()).map(([label,value],i)=>({ label, value, color: pieColors[i%pieColors.length] }));
  }, [dataset]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d==="asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPageIssued(1);
    setPageReceived(1);
  };

  const year = anni[yearIdx] ?? new Date().getFullYear();

  const inviaVendita = (id) => {
    setFatture(prev => prev.map(r => r.id === id ? { ...r, stato:"In Valutazione" } : r));
    alert("Fattura inviata per vendita.");
  };

  /* ======================= RENDER ======================= */
  return (
    <div className="space-y-6">
      {/* HERO + OAuth state */}
      <section className="rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            {loading ? (
              <>
                <SkLine w={120} h={14} className="mb-2" />
                <SkLine w={260} h={22} className="mb-2" />
                <SkLine w={360} h={12} />
              </>
            ) : (
              <>
                <div className="text-sm text-[#5b63ff] font-medium">Fatture · Emesse/Ricevute</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">Fatture della tua azienda</h1>
                <p className="text-sm text-neutral-500">Consulta, filtra e vendi le fatture esigibili. Importa dal gestionale in cloud.</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <>
                <SkBtn w={190} />
                <SkBtn w={150} />
                <SkBtn w={140} />
              </>
            ) : (
              <>
                {ficStatus?.connected ? (
                  <>
                    <button
                      onClick={importaDaCloud}
                      className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm flex items-center gap-2 disabled:opacity-50"
                      disabled={importing || !ficStatus?.connected}
                    >
                      <IconImport/>{importing ? "Import in corso…" : "Sincronizza da Contabilità"}
                    </button>

                    <button onClick={disconnectFIC}
                      className="h-9 px-3 rounded-lg border border-neutral-300 text-sm">
                      Disconnetti Contabilità
                    </button>
                  </>
                ) : (
                  <button onClick={connectFIC}
                    className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm">
                    Collega Contabilità
                  </button>
                )}
                <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm flex items-center gap-2">
                  <IconExport/> Esporta
                </button>
                <button onClick={()=>alert("Nuova fattura (UI locale)")}
                  className="h-9 px-3 rounded-lg bg-neutral-900/80 text-white text-sm flex items-center gap-2">
                  <IconPlus/> Nuova fattura
                </button>
              </>
            )}
          </div>
        </div>

        {/* Carosello periodo (anni + mesi) */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-full border border-neutral-300 grid place-items-center disabled:opacity-40"
              onClick={()=> { setYearIdx(i=>Math.max(0, i-1)); setPageIssued(1); setPageReceived(1); }}
              disabled={yearIdx<=0}
              title="Anno precedente"
            >
              <ChevronLeft/>
            </button>
            <div className="text-sm font-semibold">{year}</div>
            <button
              className="h-8 w-8 rounded-full border border-neutral-300 grid place-items-center disabled:opacity-40"
              onClick={()=> { setYearIdx(i=>Math.min((anni.length||1)-1, i+1)); setPageIssued(1); setPageReceived(1); }}
              disabled={yearIdx>=(anni.length-1)}
              title="Anno successivo"
            >
              <ChevronRight/>
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              className={`h-8 px-3 rounded-full border text-xs ${monthSel==null ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}
              onClick={()=>{ setMonthSel(null); setPageIssued(1); setPageReceived(1); }}
            >
              Tutti
            </button>
            {MONTHS.map((m,idx)=>(
              <button key={idx}
                className={`h-8 px-3 rounded-full border text-xs ${monthSel===idx ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}
                onClick={()=>{ setMonthSel(idx); setPageIssued(1); setPageReceived(1); }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KPI + controlli */}
      <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <input
              value={q}
              onChange={e=>{ setQ(e.target.value); setPageIssued(1); setPageReceived(1); }}
              className="h-9 w-[320px] rounded-lg border border-neutral-300 pl-8 pr-3 text-sm"
              placeholder="Cerca numero, cliente, P.IVA, metodo…"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"><IconSearch/></div>
          </div>

          <select
            value={fltStato}
            onChange={e=>{ setFltStato(e.target.value); setPageIssued(1); setPageReceived(1); }}
            className="h-9 rounded-lg border border-neutral-300 text-sm px-3"
          >
            {["tutti","Esigibile","In Valutazione","Acquistata","Non Elegibile"].map(s=>
              <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>
            )}
          </select>

          <select
            value={fltMetodo}
            onChange={e=>{ setFltMetodo(e.target.value); setPageIssued(1); setPageReceived(1); }}
            className="h-9 rounded-lg border border-neutral-300 text-sm px-3"
          >
            {["tutti","Bonifico","Carta","RIBA","N/D"].map(s=>
              <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>
            )}
          </select>

          <select
            value={fltDir}
            onChange={e=>{ setFltDir(e.target.value); setPageIssued(1); setPageReceived(1); }}
            className="h-9 rounded-lg border border-neutral-300 text-sm px-3"
          >
            <option value="tutte">Tutte</option>
            <option value="issued">Emesse (inviate)</option>
            <option value="received">Ricevute</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-neutral-500">Righe per pagina</span>
            <select
              value={perPage}
              onChange={e=>{ setPerPage(Number(e.target.value)); setPageIssued(1); setPageReceived(1); }}
              className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            >
              {[10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        {!loading && (ficStatus?.connected ? (
          <div className="mt-2 text-xs text-emerald-700">Connesso a Fatture in Cloud</div>
        ) : (
          <div className="mt-2 text-xs text-amber-700">Non connesso a Fatture in Cloud. Clicca “Collega Contabilità”.</div>
        ))}
        {loading && <SkLine w={"40%"} h={12} className="mt-2" />}
      </section>

      {/* GRAFICI */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-2">Emesse – Crediti per cliente</h3>
          {loading ? (
            <SkRect h={260} className="rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <PieDonut data={pieIssued} />
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
                {pieIssued.map((p,i)=>(
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded" style={{background:p.color}} />
                    <span className="flex-1 truncate">{p.label}</span>
                    <span className="text-neutral-500">{fmtMoney(p.value)}</span>
                  </div>
                ))}
                {pieIssued.length===0 && (
                  <div className="text-sm text-neutral-500">
                    Nessun dato nel filtro corrente.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-2">Ricevute – Crediti per fornitore</h3>
          {loading ? (
            <SkRect h={260} className="rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <PieDonut data={pieReceived} />
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
                {pieReceived.map((p,i)=>(
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded" style={{background:p.color}} />
                    <span className="flex-1 truncate">{p.label}</span>
                    <span className="text-neutral-500">{fmtMoney(p.value)}</span>
                  </div>
                ))}
                {pieReceived.length===0 && (
                  <div className="text-sm text-neutral-500">
                    Nessun dato nel filtro corrente.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TABELLE: EMESSE + RICEVUTE, con paginazioni indipendenti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* EMESSE */}
        <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 font-semibold">
            Elenco fatture Emesse
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <SortTh k="data"      activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Data</SortTh>
                  <SortTh k="cliente"   activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Cliente</SortTh>
                  <SortTh k="importo"   activeKey={sortKey} dir={sortDir} onSort={toggleSort} className="text-left">Importo</SortTh>
                  <SortTh k="stato"     activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Stato</SortTh>
                  <th className="px-3 py-2 text-left w-[1%]">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:8}).map((_,i)=>(
                    <tr key={`sk-iss-${i}`} className={i? "border-t border-neutral-200": ""}>
                      <td className="px-3 py-2"><SkLine w={70} /></td>
                      <td className="px-3 py-2"><SkLine w={90} /></td>
                      <td className="px-3 py-2"><SkLine w={180} /></td>
                      <td className="px-3 py-2"><SkLine w={80} /></td>
                      <td className="px-3 py-2"><SkBadge w={110} h={24} /></td>
                      <td className="px-3 py-2"><SkBtn w={110} h={28} /></td>
                    </tr>
                  ))
                ) : (
                  listIssued.map((f, i) => {
                    const rating = CLIENT_RATING[f.cliente] ?? null;
                    const vendibile = f.stato === "Esigibile" && (rating ?? 0) >= 4;
                    const disabled = !vendibile;
                    const reason = f.stato !== "Esigibile" ? "Stato non esigibile" : (rating ?? 0) < 4 ? "Rating < 4" : "";
                    return (
                      <tr key={f.id} className={i ? "border-t border-neutral-200" : ""}>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.data)}</td>
                     
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span>{f.cliente || "—"}</span>
                       </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(f.importo)}</td>
                        <td className="px-3 py-2"><PillStato stato={f.stato} /></td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              className="h-8 px-3 rounded-lg border border-neutral-300 text-xs hover:bg-neutral-50"
                              onClick={()=>alert("Anteprima fattura")}
                            >
                              Visualizza
                            </button>
                            <button
                              className={"h-8 px-3 rounded-lg text-xs " + (disabled ? "bg-neutral-300 text-white" : "bg-neutral-900 text-white hover:opacity-90")}
                              disabled={disabled}
                              onClick={()=>inviaVendita(f.id)}
                              title={disabled ? `Non vendibile: ${reason}` : "Vendi Fattura"}
                            >
                              Vendi Fattura
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}

                {!loading && listIssued.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-neutral-500">
                      Nessuna fattura trovata con i filtri correnti.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINAZIONE EMESSE */}
          <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between text-sm">
            <div className="text-neutral-500">
              {loading ? "—" : (totalIssued ? `${(pageIssuedSafe-1)*perPage+1}–${Math.min(pageIssuedSafe*perPage,totalIssued)} di ${totalIssued}` : "0 risultati")}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-40"
                onClick={()=>setPageIssued(p=>Math.max(1, p-1))}
                disabled={loading || pageIssuedSafe===1}
              >
                ‹ Precedente
              </button>
              <span className="text-neutral-600">
                {loading ? "Pagina — / —" : `Pagina ${pageIssuedSafe} / ${Math.max(1, Math.ceil(totalIssued/perPage))}`}
              </span>
              <button
                className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-40"
                onClick={()=>setPageIssued(p=>Math.min(Math.ceil(totalIssued/perPage)||1, p+1))}
                disabled={loading || pageIssuedSafe===Math.ceil(totalIssued/perPage)||totalIssued===0}
              >
                Successiva ›
              </button>
            </div>
          </div>
        </section>

        {/* RICEVUTE */}
        <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 font-semibold">
            Elenco fatture Ricevute
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <SortTh k="data"      activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Data</SortTh>
                  <SortTh k="numero"    activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Numero</SortTh>
                  <SortTh k="cliente"   activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Fornitore</SortTh>
                  <SortTh k="importo"   activeKey={sortKey} dir={sortDir} onSort={toggleSort} className="text-left">Importo</SortTh>
                  <th className="px-3 py-2 text-left w-[1%]">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:8}).map((_,i)=>(
                    <tr key={`sk-rec-${i}`} className={i? "border-t border-neutral-200": ""}>
                      <td className="px-3 py-2"><SkLine w={70} /></td>
                      <td className="px-3 py-2"><SkLine w={90} /></td>
                      <td className="px-3 py-2"><SkLine w={180} /></td>
                      <td className="px-3 py-2"><SkLine w={80} /></td>
                      <td className="px-3 py-2"><SkBtn w={90} h={28} /></td>
                    </tr>
                  ))
                ) : (
                  listReceived.map((f, i) => (
                    <tr key={f.id} className={i ? "border-t border-neutral-200" : ""}>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.data)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2"><IconDoc/>{f.numero || "—"}</span>
                      </td>
                      <td className="px-3 py-2">{f.cliente || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(f.importo)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            className="h-8 px-3 rounded-lg border border-neutral-300 text-xs hover:bg-neutral-50"
                            onClick={()=>alert("Anteprima fattura")}
                          >
                            Visualizza
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {!loading && listReceived.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-neutral-500">
                      Nessuna fattura trovata con i filtri correnti.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINAZIONE RICEVUTE */}
          <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between text-sm">
            <div className="text-neutral-500">
              {loading ? "—" : (totalReceived ? `${(pageReceivedSafe-1)*perPage+1}–${Math.min(pageReceivedSafe*perPage,totalReceived)} di ${totalReceived}` : "0 risultati")}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-40"
                onClick={()=>setPageReceived(p=>Math.max(1, p-1))}
                disabled={loading || pageReceivedSafe===1}
              >
                ‹ Precedente
              </button>
              <span className="text-neutral-600">
                {loading ? "Pagina — / —" : `Pagina ${pageReceivedSafe} / ${Math.max(1, Math.ceil(totalReceived/perPage))}`}
              </span>
              <button
                className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-40"
                onClick={()=>setPageReceived(p=>Math.min(Math.ceil(totalReceived/perPage)||1, p+1))}
                disabled={loading || pageReceivedSafe===Math.ceil(totalReceived/perPage)||totalReceived===0}
              >
                Successiva ›
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* BARS */}
      <section className="grid grid-cols-1 xl:grid-cols-1 gap-4">
        <div className="xl:col-span-3 bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Vendibili vs Vendute – {year}</h3>
            <span className="text-xs text-neutral-500">Barre per mese</span>
          </div>
          {loading ? (
            <SkRect h={220} className="rounded-lg" />
          ) : (
            <GroupBar vendibili={bars.vendibili} vendute={bars.vendute}/>
          )}
        </div>
      </section>
    </div>
  );
}
