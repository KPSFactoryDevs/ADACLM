import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ----------------------------- MOCK DATI ----------------------------- */
const MOCK_BILANCI = [
  { id: "bil-2023", periodo: "Esercizio 2023", file: "Bilancio 2023.pdf", score: 8.0 },
  { id: "bil-2022", periodo: "Esercizio 2022", file: "Bilancio 2022.pdf", score: 7.2 },
  { id: "bil-2021", periodo: "Esercizio 2021", file: "Bilancio 2021.pdf", score: 6.5 },
];

const MOCK_CR = [
  { id: "cr-nov24",  periodo: "Novembre 2024", intermediari: 4, score: 8.9 },
  { id: "cr-ott24",  periodo: "Ottobre 2024",  intermediari: 3, score: 8.4 },
  { id: "cr-set24",  periodo: "Settembre 2024",intermediari: 5, score: 8.7 },
];

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
/* ===== Analisi per area (mock) ===== */
const AREA_RESULTS = [
  { id: "com",  label: "Minacce rapporti commerciali",      result: "Solidità" },
  { id: "org",  label: "Minacce gestione aziendale",        result: "Solidità" },
  { id: "evt",  label: "Minacce da eventi pregiudizievoli", result: "Solidità" },
  { id: "tax",  label: "Minacce erariali e rischi caratteristici", result: "Solidità" },
  { id: "asis", label: "Profilo rischio AS IS",             result: "Fragilità" },
  { id: "tobe", label: "Questionario TO BE",                 result: "Stabilità" },
];
/* Indici bilancio (tabella “Esito Analisi”) */
const MOCK_INDICI = [
  { k: "ofric",  label: "OF Ricavi",                        val: "0,27%",   giud: "N/A" },
  { k: "ade",    label: "Adeguatezza Patrimoniale",         val: "7,95%",   giud: "N/A" },
  { k: "fatt",   label: "Andamento Del Fatturato",          val: "116,63%", giud: "Ottimo" },
  { k: "mol",    label: "Andamento Del Mol",                val: "11,82%",  giud: "Ottimo" },
  { k: "roi",    label: "ROI",                               val: "5,09%",   giud: "Rischio Elevato" },
  { k: "ros",    label: "ROS",                               val: "3,40%",   giud: "N/A" },
  { k: "roe",    label: "ROE",                               val: "35,00%",  giud: "N/A" },
  { k: "ebit",   label: "Ebitda Fatturato",                  val: "3,85%",   giud: "Rischio Elevato" },
  { k: "mezzi",  label: "Andamento Dei Mezzi Propri",        val: "53,84%",  giud: "Ottimo" },
  { k: "marg",   label: "Margine Struttura Primario",        val: "157,21%", giud: "Ottimo" },
  { k: "auto",   label: "Autonomia Finanziaria",             val: "7,48%",   giud: "Rischio Elevato" },
  { k: "inv",    label: "Livello Investimenti Aziendali",    val: "7,46%",   giud: "Situazione Critica" },
  { k: "oneri",  label: "Peso Oneri Finanziari",             val: "0,27%",   giud: "Ottimo" },
  { k: "copon",  label: "Copertura Lorda Degli Oneri Fin.",  val: "1.443,66%",giud: "N/A" },
  { k: "costo",  label: "Costo Del Personale",               val: "10,00%",  giud: "N/A" },
];

/* CR – Scoring andamentale dettagliato (solo mock Yes/No) */
const MOCK_CR_DETT = [
  { sec: "Scoring Centrale Rischi Andamentale", voci: [
    { label: "Valutazione Negativa del CR Scoring da analisi sintetica", esito: "No" },
  ]},
  { sec: "SconfinI e Ritardi nei Pagamenti", voci: [
    { label: "SconfinI significativi e/o ripetuti negli ultimi 12 mesi", esito: "No" },
    { label: "Mancato pagamento di finanziamenti o altre scadenze", esito: "No" },
  ]},
  { sec: "Aumento delle Garanzie", voci: [
    { label: "Aumento richieste di garanzie su beni aziendali", esito: "No" },
    { label: "Aumento garanzie concesse su esposizioni di altri soggetti", esito: "No" },
  ]},
  { sec: "Insoluti Portafoglio Anticipi", voci: [
    { label: "Peso elevato/incidenza insoluti su anticipo crediti", esito: "No" },
  ]},
  { sec: "Aumento Affidamenti e Utilizzi", voci: [
    { label: "Aumento richieste di affidamenti di cassa", esito: "No" },
    { label: "Richiesta finanziamenti straordinari", esito: "Sì" },
    { label: "Crescita utilizzi per liquidità di cassa", esito: "No" },
    { label: "Crescita utilizzi per smobilizzo crediti", esito: "Sì" },
  ]},
];

/* ------------------------------ UI HELPERS ------------------------------ */
const fmtEur = (v)=> (Number(v)||0).toLocaleString("it-IT",{style:"currency",currency:"EUR"});
const colorBy = (r)=>{
  const s = (r||"").toLowerCase();
  if (["ottimo","solidità","solida","molto buona"].some(x=>s.includes(x))) return "#16a34a";
  if (["stabilità","buona","neutra"].some(x=>s.includes(x))) return "#14b8a6";
  if (["rischio elevato","alert","critica"].some(x=>s.includes(x))) return "#f59e0b";
  if (["situazione critica","fragile","fragilità"].some(x=>s.includes(x))) return "#ef4444";
  return "#6b7280";
};

function Section({ title, right, children }) {
  return (
    <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function YesNo({ v }) {
  const ok = (v || "").toLowerCase() === "no";
  const na = (v || "").toLowerCase() === "n/a";
  if (na) {
    return (
      <span className="inline-flex min-w-[52px] justify-center px-2.5 py-1 rounded-md text-xs bg-neutral-100 text-neutral-700">
        N/A
      </span>
    );
  }
  return ok ? (
    <span className="inline-flex min-w-[52px] justify-center px-2.5 py-1 rounded-md text-xs bg-emerald-600 text-white">
      No
    </span>
  ) : (
    <span className="inline-flex min-w-[52px] justify-center px-2.5 py-1 rounded-md text-xs bg-rose-600 text-white">
      Sì
    </span>
  );
}


function BigScore({ value }) {
  const color = value >= 7.5 ? "#16a34a" : value >= 6 ? "#14b8a6" : value >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="text-3xl font-semibold" style={{color}}>
      {value.toLocaleString("it-IT",{maximumFractionDigits:1})}
      <span className="text-neutral-500 text-lg"> / 10</span>
    </div>
  );
}

/* === Icone piccole === */
const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const X = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);

/* === Gauge punteggio /10 === */
function ScoreRing({ value=0, size=120 }) {
  const color = value >= 9 ? "#16a34a" : value >= 8 ? "#22c55e" : value >= 7 ? "#4ade80" : value >= 6 ? "#a3a3a3" : value >= 5 ? "#f59e0b" : value >= 4 ? "#f97316" : "#ef4444";
  const pct = Math.max(0, Math.min(100, (value/10)*100));
  const stroke = 10, r=(size-stroke)/2, c=2*Math.PI*r, off=c*(1-pct/100);
  return (
    <div className="relative" style={{width:size, height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#eee" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-xl font-semibold" style={{color}}>{value}</div>
      </div>
    </div>
  );
}

/* === KPI “normale” === */
function KpiTile({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/60 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full grid place-items-center bg-neutral-900 text-white"><Icon /></div>
      <div>
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="text-[15px] font-medium">{value}</div>
      </div>
    </div>
  );
}

/* === KPI “Posizioni contestate” con stato === */
function KpiContestazioni({ value=0 }) {
  const ok = Number(value) === 0;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/60 backdrop-blur px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full grid place-items-center text-white" style={{background: ok ? "#16a34a" : "#dc2626"}}>
          {ok ? <Check/> : <X/>}
        </div>
        <div>
          <div className="text-xs text-neutral-500">N° Posizioni contestate</div>
          <div className="text-[15px] font-medium">{value}</div>
        </div>
      </div>
      {!ok && <span className="px-2 py-0.5 rounded-md text-xs bg-rose-50 text-rose-700 border border-rose-200">Da verificare</span>}
    </div>
  );
}

/* === Avatar/loghi banche + tile Intermediari === */
function colorFromString(s){ const p=["#111827","#0ea5e9","#16a34a","#f59e0b","#6d28d9","#dc2626","#14b8a6","#a855f7"]; let h=0; for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;} return p[Math.abs(h)%p.length]; }
function BankAvatar({ name, code, logo }) {
  if (logo) return <img src={logo} alt={name} className="w-8 h-8 rounded-full ring-2 ring-white object-cover" title={name}/>;
  const initials=(code||name).replace(/[^A-Za-z]/g,"").slice(0,2).toUpperCase();
  return <div className="w-8 h-8 rounded-full ring-2 ring-white grid place-items-center text-[11px] font-semibold text-white" style={{background: colorFromString(name)}} title={name}>{initials}</div>;
}
function AvatarsStack({ items }){ return <div className="flex -space-x-2">{items.slice(0,6).map((b,i)=><BankAvatar key={i} {...b} />)}</div>; }
function IntermediariTile({ items, total, onClick }){
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/60 backdrop-blur px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs text-neutral-500">Intermediari</div>
        <div className="mt-1 flex items-center gap-3">
          <AvatarsStack items={items}/>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-neutral-300">{total} totali</span>
        </div>
      </div>
      <button onClick={onClick ?? (()=>alert("Elenco intermediari (mock)"))} className="h-8 px-3 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50">Vedi tutti</button>
    </div>
  );
}



/* === Card anomalie (utilizzi/lievi) === */
const IcoBolt = ()=> (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>);
const IcoShield = ()=> (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3 5 6v6c0 5 7 9 7 9s7-4 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8"/></svg>);
const IcoAlert  = ()=> (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.8"/><path d="M12 9v5m0 3v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
const IconCalendar = ()=> (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const IconBank     = ()=> (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3 3 7v2h18V7L12 3Z" stroke="currentColor" strokeWidth="1.6"/><path d="M5 11v7m4-7v7m6-7v7m4-7v7M3 20h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);

function StatusPill({ ok, neutral, label }) {
  if (neutral) return <span className="px-2.5 py-1 rounded-md text-xs bg-neutral-100 text-neutral-700">N/A{label?` · ${label}`:""}</span>;
  return ok
    ? <span className="px-2.5 py-1 rounded-md text-xs bg-emerald-600 text-white">No</span>
    : <span className="px-2.5 py-1 rounded-md text-xs bg-rose-600 text-white">Sì</span>;
}
function AnomaliaCard({ icon, title, ok=true, neutral=false, label }) {
  const Icon = icon==="bolt"?IcoBolt:icon==="alert"?IcoAlert:IcoShield;
  const col = neutral ? "#9ca3af" : ok ? "#16a34a" : "#dc2626";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm flex items-start gap-3">
      <div className="w-9 h-9 rounded-full grid place-items-center text-white shrink-0" style={{background:col}}><Icon/></div>
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-tight">{title}</div>
        <div className="text-xs text-neutral-500">{neutral?"Dato non applicabile": ok?"Nessuna anomalia rilevata":"Anomalia rilevata"}</div>
      </div>
      <StatusPill ok={ok} neutral={neutral} label={label}/>
    </div>
  );
}
function AnomalieGrid({ title, items }) {
  return (
    <section className="">
      <div className="p-0 grid grid-cols-1 md:grid-cols-1 xl:grid-cols-1 gap-3">
        {items.map((it,i)=>(<AnomaliaCard key={i} {...it}/>))}
      </div>
    </section>
  );
}


/* ------------------------------- PAGINA ------------------------------- */
export default function Simulazione() {
  const [selBil, setSelBil] = useState(null);
  const [selCR, setSelCR] = useState(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  const risultatoBilancio = useMemo(()=> 3.5, []);    // mock
  const risultatoCR       = useMemo(()=> (selCR?.score ?? 8.9), [selCR]);

  return (
    <div className="space-y-6">
      {/* STEP 1 – Scelta documenti */}
      {!ready && (
        <>
             <section className="rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5">
          <div className="text-sm text-[#5b63ff] font-medium">Simulazione Veloce</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Simulazione</h1> 
        </div>
      </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Section title="1) Seleziona un Bilancio">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-700">
                  <tr>
                    <th className="text-left px-3 py-2">Periodo</th>
                    <th className="text-left px-3 py-2">File</th>
                    <th className="text-left px-3 py-2">Scoring</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_BILANCI.map(b=>(
                    <tr key={b.id} className="border-t border-neutral-200">
                      <td className="px-3 py-2">{b.periodo}</td>
                      <td className="px-3 py-2">{b.file}</td>
                      <td className="px-3 py-2">{(b.score*10).toFixed(0)}/100</td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" name="bil" onChange={()=>setSelBil(b)} checked={selBil?.id===b.id}/>
                          <span className="text-sm">Usa</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="2) Seleziona una Centrale Rischi">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-700">
                  <tr>
                    <th className="text-left px-3 py-2">Periodo</th>
                    <th className="text-left px-3 py-2">Intermediari</th>
                    <th className="text-left px-3 py-2">Scoring</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CR.map(c=>(
                    <tr key={c.id} className="border-t border-neutral-200">
                      <td className="px-3 py-2">{c.periodo}</td>
                      <td className="px-3 py-2">{c.intermediari}</td>
                      <td className="px-3 py-2">{c.score.toLocaleString("it-IT")}/10</td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" name="cr" onChange={()=>setSelCR(c)} checked={selCR?.id===c.id}/>
                          <span className="text-sm">Usa</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              className="h-9 px-3 rounded-lg border border-neutral-300 text-sm"
              onClick={()=>{ setSelBil(null); setSelCR(null); }}
            >
              Annulla
            </button>
            <button
              disabled={!selBil || !selCR}
              className={"h-9 px-4 rounded-lg text-sm text-white " + (!selBil || !selCR ? "bg-neutral-300" : "bg-neutral-900 hover:opacity-90")}
              onClick={()=>setReady(true)}
              title={!selBil || !selCR ? "Seleziona sia Bilancio che Centrale Rischi" : "Procedi"}
            >
              Procedi
            </button>
          </div>
        </>
      )}

      

      {/* STEP 2 – Risultato simulazione */}
      {ready && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Risultato simulazione</h1>
              <p className="text-sm text-neutral-500">
                Bilancio: <b>{selBil?.periodo}</b> · Centrale Rischi: <b>{selCR?.periodo}</b>
              </p>
            </div>
            <div className="flex gap-2">
              <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm" onClick={()=>setReady(false)}>
                Cambia selezione
              </button>
              <button className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm" onClick={()=>alert("Esporta (mock)")}>
                Esporta
              </button>
            </div>
          </div>

{/* === PANORAMICA CR (come 1° screenshot) =============================== */}
{(() => {
  // mock loghi/intermediari
  const INTERMEDIARI = [
    { name:"Intesa Sanpaolo", code:"ISP" },
    { name:"UniCredit", code:"UCG" },
    { name:"Banca Sella", code:"SEL" },
    { name:"Banco BPM", code:"BPM" },
    { name:"BNL", code:"BNL" },
    { name:"Credem", code:"CRD" },
  ];
  const contestate = 0; // mock come nello shot

  // anomalie (utilizzi + lievi) mock
  const ANOMALIE_UTILIZZI = [
    { icon:"bolt",  title:"Tensione Finanziaria Utilizzi Autoliquidanti", ok:true },
    { icon:"bolt",  title:"Tensione Finanziaria Utilizzi A Revoca",       ok:true },
    { icon:"bolt",  title:"Tensione Finanziaria Utilizzi A Scadenza",     ok:true },
  ];
  const ANOMALIE_LIEVI = [
    { icon:"shield", title:"Impagati",            ok:true },
    { icon:"alert",  title:"Presenza Sconfini",   ok:false },
    { icon:"shield", title:"N° Sconfini Autoliquidanti", neutral:true, label:"0" },
    { icon:"shield", title:"N° Sconfini a Revoca",       neutral:true, label:"0" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero CR */}
      <section className="rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5 flex items-center justify-left gap-4">
                      <ScoreRing value={selCR?.score ?? 8.9}/>

          <div>
            <div className="text-sm text-[#5b63ff] font-medium">Simulazione Veloce · Panoramica</div>
            <h2 className="mt-1 text-2xl  tracking-tight">Valutazione Complessiva: <span className="font-bold">Stabilità</span></h2>
            <p className="text-sm text-neutral-500">Ultimo periodo selezionato in questa simulazione.</p>
          </div>
        </div>

        {/* KPI */}
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiTile icon={IconCalendar} label="Periodo di riferimento" value={selCR?.periodo || "—"} />
          <IntermediariTile items={INTERMEDIARI} total={INTERMEDIARI.length} />
          <KpiContestazioni value={contestate} />
        </div>
      </section>

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

      {/* Anomalie */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
        <AnomalieGrid title="Anomalie Utilizzi" items={ANOMALIE_UTILIZZI}/>
        <AnomalieGrid title="Anomalie Lievi"   items={ANOMALIE_LIEVI}/>
      </div>
    </div>
  );
})()}

 


          {/* Esito Analisi Bilancio */}
          <Section
            title={    <div className="p-5 flex items-center justify-left gap-4">
                      <ScoreRing value={8}/>

          <div>
            <div className="text-sm text-[#5b63ff] font-medium">Simulazione · Dettaglio</div>
            <h2 className="mt-1 text-1xl  tracking-tight">Valutazione Bilancio Positiva</h2>
            <p className="text-sm text-neutral-500">Ultimo periodo selezionato in questa simulazione.</p>
          </div>
        </div>}
            
          >
           
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="text-left px-3 py-2">Indice</th>
                  <th className="text-left px-3 py-2">Valore</th>
                  <th className="text-left px-3 py-2">Giudizio</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_INDICI.map((r,i)=>(
                  <tr key={r.k} className={i? "border-t border-neutral-200" : ""}>
                    <td className="px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2">{r.val}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border"
                        style={{
                          color: colorBy(r.giud),
                          background: colorBy(r.giud) + "1A",
                          borderColor: colorBy(r.giud) + "33"
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{background: colorBy(r.giud)}}/>
                        {r.giud}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          

          {/* Centrale Rischi – macroarea + dettagli */}
          <Section
           title={    <div className="p-5 flex items-center justify-left gap-4">
                      <ScoreRing value={9}/>

          <div>
            <div className="text-sm text-[#5b63ff] font-medium">Simulazione · Dettaglio</div>
            <h2 className="mt-1 text-1xl  tracking-tight">Valutazione Centrale Rischi Positiva</h2>
            <p className="text-sm text-neutral-500">Ultimo documento selezionato in questa simulazione.</p>
          </div>
        </div>}
          >
        
 

       <div className="mt-2 space-y-5">
  {MOCK_CR_DETT.map((blk, bi) => (
    <div key={bi}>
      <div className="font-medium border-b border-neutral-200 pb-1 mb-2">
        {blk.sec}
      </div>

      <table className="w-full text-sm table-fixed">
        {/* 1a colonna fluida, 2a colonna fissa e allineata */}
        <colgroup>
          <col />                       {/* Voce */}
          <col className="w-[160px]" /> {/* Risultato: larghezza fissa */}
        </colgroup>

        <thead className="bg-neutral-50 text-neutral-700">
          <tr>
            <th className="text-left px-3 py-2">Voce</th>
            <th className="px-3 py-2 text-right">Risultato</th>
          </tr>
        </thead>

        <tbody>
          {blk.voci.map((v, vi) => (
            <tr key={vi} className={vi ? "border-top border-neutral-200" : ""}>
              <td className="px-3 py-2">
                {v.label}
              </td>
              <td className="px-3 py-2 text-right">
                <YesNo v={v.esito} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ))}
</div>

          </Section>
        </>
      )}
    </div>
  );
}
