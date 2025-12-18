// src/pages/Scadenze.jsx
import React from "react";

/** ===== Mock data ===== */
const KPIS = {
  saldoOggi: 1969.41,
  pagamenti: 23750.33,
  incassi: 23307.0,
  saldoFinale: 1526.08,
  scadutoPagare: 99273.87,
  scadutoIncassare: 19083.89,
  saldoFinaleIncluso: -78663.9,
};
const CHART_POINTS = [
  6000, 13000, 12000, 15000, 15000, 15000, 21500, 19000, 18500, 18000, 17000, 16000,
  15500, 15000, 14500, 13500, 13000, 12000, 11000, 10500, 9500,  8500,  8200,  8000,
  7200,  7100,  6900,  6500,  6300,  6200,  6150,  6100,  6000,  5900,  5800,  5700,
];
const ROWS = [
  {
    id: 1,
    date: "06/12/23",
    metodo: "Bonifico",
    controparte: "Hotel Castello SpA",
    doc: "Fattura · FPR 22/3 · 31/05/2023",
    importo: 145.0,
    stato: "Incassato",
    noteStato: "Scadenza 2 di 2",
    conto: "Non assegnato",
  },
  {
    id: 2,
    date: "26/11/23",
    metodo: "Bonifico",
    controparte: "Hotel Castello SpA",
    doc: "Fattura · FPR 61/23 · 26/10/2023",
    importo: 584.0,
    stato: "Incassato",
    noteStato: "Unica soluzione",
    conto: "Conto operativo M...",
  },
  {
    id: 3,
    date: "15/10/23",
    metodo: "Bonifico",
    controparte: "Hotel Castello SpA",
    doc: "Fattura · FPR 51/23 · 15/09/2023",
    importo: 1134.0,
    stato: "Incassato",
    noteStato: "Unica soluzione",
    conto: "Conto operativo M...",
  },
  {
    id: 4,
    date: "30/09/23",
    metodo: "Bonifico",
    controparte: "Hotel Castello SpA",
    doc: "Fattura · FPR 45/23 · 31/08/2023",
    importo: 1186.0,
    stato: "Incassato",
    noteStato: "",
    conto: "Conto operativo M...",
  },
  {
    id: 5,
    date: "27/09/23",
    metodo: "Bonifico",
    controparte: "Hotel Castello SpA",
    doc: "Fattura · FPR 58/23 · 27/09/2023",
    importo: 1000.0,
    stato: "Incassato",
    noteStato: "",
    conto: "Conto operativo M...",
  },
];

/** ===== Page ===== */
export default function Scadenze() {
  return (
    <div className="space-y-5">
      {/* TOP TABS + titolo + filtri rapidi */}
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Tab active>Scadenzario</Tab>
            <Tab>Regole</Tab>
            <Tab>Ricorrenze</Tab>
          </div>
          <h1 className="mt-3 text-[22px] font-semibold tracking-tight">Proiezione scadenze</h1>
        </div>

        <div className="flex items-center gap-2">
          <QuickFilter label="Tutti i conti e le scadenze" end="3/3" />
          <QuickFilter label="90 giorni" end="4 dic → 3 mar" />
          <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm flex items-center gap-2">
            <EyeOff /> Nascondi scaduto
          </button>
        </div>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard title="Saldo oggi" value={euro(KPIS.saldoOggi)} tag="Oggi" icon={<Wallet />} />
        <KpiCard
          title="Pagamenti"
          value={euro(KPIS.pagamenti)}
          sub="di cui 16.800,00 € ricorrenti"
          icon={<ArrowUpRight />}
          tone="pink"
        />
        <KpiCard
          title="Incassi"
          value={euro(KPIS.incassi)}
          sub="di cui 22.500,00 € ricorrenti"
          icon={<ArrowDownRight />}
          tone="emerald"
        />
        <KpiCard title="Saldo finale" value={euro(KPIS.saldoFinale)} tag="3 marzo" icon={<Balance />} tone="indigo" />
        {/* second line (mini KPI) */}
        <MiniKpi title="Scaduto da pagare" value={euro(KPIS.scadutoPagare)} tone="rose" />
        <MiniKpi title="Scaduto da incassare" value={euro(KPIS.scadutoIncassare)} tone="emerald" />
        <MiniKpi title="Saldo finale incluso scaduto" value={euro(KPIS.saldoFinaleIncluso)} tone="indigo" />
      </section>

      {/* Chart */}
      <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-3">
        <LineChart points={CHART_POINTS} height={220} />
      </section>

      {/* Toolbar + tabs secondari */}
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <SubTab>tutte</SubTab>
          <SubTab>scadute</SubTab>
          <SubTab>da saldare</SubTab>
          <SubTab active>saldate</SubTab>
          <SubTab>conto non assegnato</SubTab>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm flex items-center gap-2">
            <Search /> Cerca movimenti
          </button>
          <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm flex items-center gap-2">
            <Download /> Scarica
          </button>
          <button className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm flex items-center gap-2">
            <Plus /> Aggiungi scadenza
          </button>
        </div>
      </section>

      {/* Filters bar */}
      <section className="flex flex-wrap items-center gap-2 text-sm">
        <Token text="caruso" canClose />
        <Dropdown label="Data" />
        <Dropdown label="Tip:" value="Incassi" />
        <Dropdown label="Conto di pagamento:" value="Tutti i conti" />
        <Dropdown label="Pagamento" />
        <Dropdown label="Tipo documento" />
        <button className="text-neutral-500 hover:text-neutral-900 text-sm">✕ Reimposta</button>
      </section>

      {/* Result header */}
      <section className="bg-white border border-neutral-200 rounded-t-xl px-4 py-2 text-sm flex items-center justify-between">
        <div className="text-neutral-700">23 risultati</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-neutral-500">
            <UpThin /> <span>0 €</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600">
            <ArrowUpRight /> <span>36.467 €</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-600">
            <ArrowDownRight /> <span>36.467 €</span>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="bg-white border-x border-b border-neutral-200 rounded-b-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <Th className="w-[48px]"><input type="checkbox" /></Th>
              <Th>Pagamento</Th>
              <Th>Controparte</Th>
              <Th className="text-right">Importo</Th>
              <Th>Stato</Th>
              <Th>Conto di pagamento</Th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={r.id} className={i ? "border-t border-neutral-200" : ""}>
                <Td className="text-center"><input type="checkbox" /></Td>
                <Td>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-neutral-100 grid place-items-center text-neutral-600">
                      <Calendar />
                    </div>
                    <div>
                      <div className="font-medium">{r.date}</div>
                      <div className="text-xs text-neutral-500">{r.metodo}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 mt-1 text-neutral-500"><Doc /></div>
                    <div>
                      <div className="font-medium">{r.controparte}</div>
                      <div className="text-xs text-neutral-500">{r.doc}</div>
                    </div>
                  </div>
                </Td>
                <Td className="text-right font-medium">{euro(r.importo)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Pill ok>{r.stato}</Pill>
                    {r.noteStato && <span className="text-xs text-neutral-500">{r.noteStato}</span>}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-neutral-100 grid place-items-center text-neutral-600">
                      <Bank />
                    </div>
                    <button className="px-3 h-8 rounded-full border border-neutral-300 text-xs flex items-center gap-1">
                      {r.conto} <ChevronDown />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/** ===== Small building blocks ===== */
function Tab({ children, active }) {
  return (
    <button
      className={
        "h-8 px-3 rounded-full border text-xs " +
        (active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "border-neutral-300 text-neutral-700 hover:bg-neutral-50")
      }
    >
      {children}
    </button>
  );
}
function SubTab({ children, active }) {
  return (
    <button
      className={
        "capitalize px-2 py-1 rounded-md " +
        (active ? "bg-[#ECE8FF] text-[#5b63ff]" : "text-neutral-600 hover:bg-neutral-50")
      }
    >
      {children}
    </button>
  );
}
function QuickFilter({ label, end }) {
  return (
    <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm flex items-center gap-2">
      <ChevronDown /> {label} {end && <span className="text-neutral-400">·</span>} {end && <span>{end}</span>}
    </button>
  );
}
function KpiCard({ title, value, sub, tag, icon, tone="slate" }) {
  const toneMap = {
    slate:  { bg:"bg-white", ring:"border-neutral-200", chipBg:"bg-neutral-100", chipText:"text-neutral-600" },
    pink:   { bg:"bg-white", ring:"border-neutral-200", chipBg:"bg-pink-50",    chipText:"text-pink-700" },
    emerald:{ bg:"bg-white", ring:"border-neutral-200", chipBg:"bg-emerald-50", chipText:"text-emerald-700" },
    indigo: { bg:"bg-white", ring:"border-neutral-200", chipBg:"bg-indigo-50",  chipText:"text-indigo-700" },
  }[tone] || {};
  return (
    <div className={`rounded-xl ${toneMap.bg} border ${toneMap.ring} shadow-sm p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-neutral-500 text-xs flex items-center gap-2"><span className="w-5 h-5 grid place-items-center text-neutral-600">{icon}</span>{title}</div>
        {tag && <span className={`text-[11px] px-2 py-0.5 rounded-md border ${toneMap.chipBg} ${toneMap.chipText} border-transparent`}>{tag}</span>}
      </div>
      <div className="text-[20px] font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}
function MiniKpi({ title, value, tone="slate" }) {
  const toneMap = {
    rose:    { dot:"bg-rose-500", text:"text-rose-700", bg:"bg-rose-50" },
    emerald: { dot:"bg-emerald-500", text:"text-emerald-700", bg:"bg-emerald-50" },
    indigo:  { dot:"bg-indigo-500", text:"text-indigo-700", bg:"bg-indigo-50" },
    slate:   { dot:"bg-neutral-400", text:"text-neutral-700", bg:"bg-neutral-50" },
  }[tone] || {};
  return (
    <div className="rounded-xl border border-neutral-200 shadow-sm p-3">
      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span className={`w-2 h-2 rounded-full ${toneMap.dot}`} />
        {title}
      </div>
      <div className={`mt-1 inline-flex px-2 py-1 rounded-md ${toneMap.bg} ${toneMap.text} text-sm font-medium`}>{value}</div>
    </div>
  );
}
function Token({ text, canClose }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-neutral-300 bg-white">
      {text}
      {canClose && <button className="text-neutral-400 hover:text-neutral-600">×</button>}
    </span>
  );
}
function Dropdown({ label, value }) {
  return (
    <button className="h-8 px-2 rounded-md border border-neutral-300 text-xs flex items-center gap-2">
      {label} {value && <span className="text-neutral-500">·</span>} {value || ""} <ChevronDown />
    </button>
  );
}
function Th({ children, className="" }) {
  return <th className={`px-3 py-2 text-left ${className}`}>{children}</th>;
}
function Td({ children, className="" }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}
function Pill({ children, ok=false }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs border " +
        (ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-neutral-100 text-neutral-700 border-neutral-300")
      }
    >
      <Check /> {children}
    </span>
  );
}

/** ===== Simple line chart (SVG) ===== */
function LineChart({ points, height=220 }) {
  const width = 1100; // virtual width
  const max = Math.max(...points);
  const min = Math.min(...points);
  const pad = 20;
  const dx = (width - pad*2) / (points.length - 1);
  const mapY = (v) => {
    const t = (v - min) / (max - min || 1);
    return height - pad - t * (height - pad*2);
  };
  const d = points.map((v, i) => `${i ? "L" : "M"} ${pad + i*dx} ${mapY(v)}`).join(" ");
  return (
    <svg className="w-full" viewBox={`0 0 ${width} ${height}`}>
      {/* axis baseline */}
      <line x1="0" y1={height-pad} x2={width} y2={height-pad} stroke="#e5e7eb"/>
      {/* path */}
      <path d={d} fill="none" stroke="#3B82F6" strokeWidth="2" />
    </svg>
  );
}

/** ===== Icons ===== */
function ChevronDown(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function ArrowUpRight(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function ArrowDownRight(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M15 17h2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function Wallet(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M21 11h-6a2 2 0 0 0 0 4h6" stroke="currentColor" strokeWidth="1.7"/></svg>);}
function Balance(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M5 7h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M6 7l-3 5a4 4 0 0 0 8 0L8 7m10 0-3 5a4 4 0 1 0 8 0l-3-5" stroke="currentColor" strokeWidth="1.2"/></svg>);}
function EyeOff(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6A3.4 3.4 0 0 0 12 16a4 4 0 0 0 4-4c0-1.1-.5-2.1-1.4-2.8M4 12s3.3-6 8-6 8 6 8 6-1.3 2.4-3.4 4.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function Search(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7"/><path d="M21 21l-3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function Download(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v10M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M5 21h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function Plus(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function Calendar(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function Doc(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-5-6Z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.6"/><path d="M9 13h6M9 17h6M9 9h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>);}
function Bank(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3 4 7v2h16V7l-8-4Z" stroke="currentColor" strokeWidth="1.6"/><path d="M6 11v7m4-7v7m4-7v7m4-7v7M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function Check(){return(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function UpThin(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>);}

/** ===== helpers ===== */
const euro = (v) =>
  (Number(v)||0).toLocaleString("it-IT", { style:"currency", currency:"EUR" });
