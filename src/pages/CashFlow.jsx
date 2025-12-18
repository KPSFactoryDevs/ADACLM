// src/pages/CashFlow.jsx
import React, { useMemo, useState } from "react";

/* ===== utils ===== */
const fmtMoney = (v) =>
  (Number(v) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const MONTHS = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];

/* ===== MOCK ===== */
const YEARS = [2023, 2024];
const MOCK_ACCOUNTS = [
  { id:"all", label:"Tutti i conti (3)" },
  { id:"op",  label:"Operativo MPS •••X417" },
  { id:"tec", label:"Tecnico MPS •••X903" },
  { id:"pp",  label:"PayPal ••••12" },
];

// val[12] per ogni mese
const M = (...m) => m; // helper
const DATA = {
  // valori/random coerenti con lo screen (in €)
  entrate: {
    "Incassi Extra": M(14752,  0,   50, 19050, 15494,   0,   0,   0,   0, 10264,   0,   0),
    "Punto vendita": M(36376,33952,32382,30462,25432,31998,80413,89129,42750,53789,40477, 8240),
    "Non categorizzata": M(18000, 7000,   0,   0, 1240, 10000,  0,  2716, 18691,   25,   0,   0),
  },
  uscite: {
    "Fornitori": M(25480,18159,14446,13665,25252,31133,23388,22824,18904,28363,20152, 4394),
    "Marketing": M(   0,  550,   0,  444,  445,  690,    0,  630,  490,    0,  489,    0),
    "Rimborso mutuo": M(1827,1827,1827,1827,3655,1827,1827,1827,1827,3655,1827,1827),
    "Servizi": M(2477, 3693, 1909, 2214, 1706, 11176, 8474, 8182, 1567, 1368,  2310,  682),
    "Spese bancarie": M(  0,  568,  0,   0,   0,    0,    0,  18,  8235,  9337,  7258, 4996),
    "Spese di gestione": M(30671,3654,1305,  273,  19,  455, 72303, 1132,  2760,  1152,  3647,  821),
    "Spese per leasing": M(4890, 4913, 3398,  934,  981,    0,    0,    0,    0,  5012,    0,    0),
    "Spese Second...": M( 0,   0,   0,   0,   0,  25600,  501,  0,  0,  0,  0,  0),
    "Spese straord...": M( 0,   0,   0, 62738,   0,  62610,  38307,    0,  23089,    0,    0,    0),
    "Stipendi": M(10422,7530, 5891, 3671,  8098,  8754,  10190,  9896,  87392,  7372, 10092,   0),
  },
};

/* ===== mini chart (barre Entrate/Uscite + linea nera) ===== */
function CashflowChart({ inData, outData }) {
  const width = 760, height = 220, pad = 28;
  const max = Math.max(1, ...inData, ...outData) * 1.15;
  const xStep = (width - pad*2) / 11;
  const mapY = (v) => height - pad - (v/max)*(height - pad*2);
  // linea: flusso netto cumulato
  let cum = 0;
  const cumSeries = outData.map((o,i)=> (cum += (inData[i]||0) - (o||0), cum));
  const cumMaxAbs = Math.max(1, ...cumSeries.map(v=>Math.abs(v)));
  const mapYLine = (v) => height - pad - ((v + cumMaxAbs)/(2*cumMaxAbs))*(height - pad*2);

  return (
    <svg className="w-full" viewBox={`0 0 ${width} ${height}`}>
      {/* grid & axis */}
      {[0.2,0.4,0.6,0.8].map((t,i)=>(
        <line key={i} x1={pad} y1={pad + t*(height-pad*2)} x2={width-pad} y2={pad + t*(height-pad*2)} stroke="#eee"/>
      ))}
      {/* bars */}
      {inData.map((v,i)=>(
        <rect key={"in"+i} x={pad + i*xStep - 8} y={mapY(v)} width="16"
          height={height - pad - mapY(v)} fill="#22c55e" opacity="0.9" />
      ))}
      {outData.map((v,i)=>(
        <rect key={"out"+i} x={pad + i*xStep + 8} y={mapY(v)} width="16"
          height={height - pad - mapY(v)} fill="#ef4444" opacity="0.9" />
      ))}
      {/* line */}
      <polyline
        fill="none"
        stroke="#111"
        strokeWidth="2"
        points={cumSeries.map((v,i)=>`${pad + i*xStep},${mapYLine(v)}`).join(" ")}
      />
      {/* month labels */}
      {MONTHS.map((m,i)=>(
        <text key={m} x={pad + i*xStep} y={height-6} fontSize="10" textAnchor="middle" fill="#6b7280">
          {m} 23
        </text>
      ))}
      {/* legend */}
      <g transform="translate(12,14)">
        <rect width="10" height="10" fill="#22c55e"/><text x="14" y="9" fontSize="11" fill="#374151">Entrate</text>
        <rect x="80" width="10" height="10" fill="#ef4444"/><text x="94" y="9" fontSize="11" fill="#374151">Uscite</text>
        <line x1="160" y1="5" x2="172" y2="5" stroke="#111" strokeWidth="2"/><text x="178" y="9" fontSize="11" fill="#374151">Netto (linea)</text>
      </g>
    </svg>
  );
}

/* ===== cell & badge ===== */
const Dots = () => <span className="inline-block w-5 text-center text-neutral-400">⋮</span>;
const Badge = ({ text, color }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border"
    style={{
      color,
      background: color + "1a",
      borderColor: color + "4d",
    }}
  >
    {text}
  </span>
);

/* ===== page ===== */
export default function CashFlow() {
  const [account, setAccount] = useState(MOCK_ACCOUNTS[0].id);
  const [year, setYear] = useState(YEARS[0]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [open, setOpen] = useState({ entrate:true, uscite:true });

  // totali mensili
  const inTotals = useMemo(()=>{
    const res = new Array(12).fill(0);
    Object.values(DATA.entrate).forEach(arr => arr.forEach((v,i)=> res[i]+=v));
    return res;
  },[]);
  const outTotals = useMemo(()=>{
    const res = new Array(12).fill(0);
    Object.values(DATA.uscite).forEach(arr => arr.forEach((v,i)=> res[i]+=v));
    return res;
  },[]);

  // helpers
  const sum = (arr) => arr.reduce((a,b)=>a+b,0);

  const colorFor = (name) => {
    const palette = {
      "Incassi Extra":"#22c55e",
      "Punto vendita":"#16a34a",
      "Non categorizzata":"#0891b2",
      "Fornitori":"#ef4444",
      "Marketing":"#eab308",
      "Rimborso mutuo":"#a3a3a3",
      "Servizi":"#fb7185",
      "Spese bancarie":"#f59e0b",
      "Spese di gestione":"#6b7280",
      "Spese per leasing":"#0ea5e9",
      "Spese Second...":"#f97316",
      "Spese straord...":"#60a5fa",
      "Stipendi":"#22d3ee",
    };
    return palette[name] || "#64748b";
  };

  return (
    <div className="space-y-4">
      {/* header riga filtri + bottoni */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <select
            value={account}
            onChange={e=>setAccount(e.target.value)}
            className="h-9 rounded-lg border border-neutral-300 text-sm px-2"
          >
            {MOCK_ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <select
            value={year}
            onChange={e=>setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-neutral-300 text-sm px-2"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={()=>setShowAnalysis(s=>!s)}
            className="h-9 px-3 rounded-lg border border-neutral-300 text-sm"
          >
            {showAnalysis ? "Nascondi analisi" : "Mostra analisi"}
          </button>
        </div>

        <button
          onClick={()=>alert("Esporta CSV (mock)")}
          className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm"
        >
          Esporta
        </button>
      </div>

      {/* chart */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm">
        <CashflowChart inData={inTotals} outData={outTotals} />
      </div>

      {/* tabella */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-auto shadow-sm">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <th className="px-2 py-2 text-left w-[280px]">Flusso di cassa</th>
              {MONTHS.map((m,i)=>(
                <th key={i} className="px-2 py-2 text-right">{m} 23</th>
              ))}
              <th className="px-2 py-2 text-right">Totale</th>
            </tr>
          </thead>

          <tbody>
            {/* NETTO */}
            <tr className="bg-neutral-50/60 border-t border-neutral-200 font-medium">
              <td className="px-2 py-2">Flusso di cassa netto</td>
              {MONTHS.map((_,i)=>(
                <td key={i} className="px-2 py-2 text-right">
                  {fmtMoney((inTotals[i]||0) - (outTotals[i]||0))}
                </td>
              ))}
              <td className="px-2 py-2 text-right">
                {fmtMoney(sum(inTotals) - sum(outTotals))}
              </td>
            </tr>

            {/* ENTRATE */}
            <tr className="border-t border-neutral-200">
              <td className="px-2 py-2">
                <button
                  onClick={()=>setOpen(s=>({...s, entrate:!s.entrate}))}
                  className="inline-flex items-center gap-2"
                >
                  <span className="inline-block w-5 text-neutral-500">{open.entrate ? "▾" : "▸"}</span>
                  <span className="font-medium">Tutte le entrate</span>
                </button>
              </td>
              {MONTHS.map((_,i)=>(
                <td key={i} className="px-2 py-2 text-right">
                  {fmtMoney(inTotals[i]||0)}
                </td>
              ))}
              <td className="px-2 py-2 text-right">{fmtMoney(sum(inTotals))}</td>
            </tr>

            {open.entrate && Object.entries(DATA.entrate).map(([name, arr],ix)=>(
              <tr key={name} className="border-t border-neutral-100">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2 ml-7">
                    <Badge text={name} color={colorFor(name)} />
                    <span className="text-neutral-400"><Dots/></span>
                  </div>
                </td>
                {arr.map((v,i)=><td key={i} className="px-2 py-2 text-right">{v ? fmtMoney(v) : "—"}</td>)}
                <td className="px-2 py-2 text-right">{fmtMoney(sum(arr))}</td>
              </tr>
            ))}

            {/* ADD CATEGORY ENTRATE */}
            <tr className="border-t border-neutral-100">
              <td className="px-2 py-2">
                <button
                  onClick={()=>alert("Aggiungi categoria entrata (mock)")}
                  className="ml-7 text-xs text-neutral-600 hover:underline"
                >
                  + Aggiungi categoria
                </button>
              </td>
              <td colSpan={13}></td>
            </tr>

            {/* USCITE */}
            <tr className="border-t border-neutral-200">
              <td className="px-2 py-2">
                <button
                  onClick={()=>setOpen(s=>({...s, uscite:!s.uscite}))}
                  className="inline-flex items-center gap-2"
                >
                  <span className="inline-block w-5 text-neutral-500">{open.uscite ? "▾" : "▸"}</span>
                  <span className="font-medium">Tutte le uscite</span>
                </button>
              </td>
              {MONTHS.map((_,i)=>(
                <td key={i} className="px-2 py-2 text-right">
                  {fmtMoney(outTotals[i]||0)}
                </td>
              ))}
              <td className="px-2 py-2 text-right">{fmtMoney(sum(outTotals))}</td>
            </tr>

            {open.uscite && Object.entries(DATA.uscite).map(([name, arr])=>(
              <tr key={name} className="border-t border-neutral-100">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2 ml-7">
                    <Badge text={name} color={colorFor(name)} />
                    <span className="text-neutral-400"><Dots/></span>
                  </div>
                </td>
                {arr.map((v,i)=><td key={i} className="px-2 py-2 text-right">{v ? fmtMoney(v) : "—"}</td>)}
                <td className="px-2 py-2 text-right">{fmtMoney(sum(arr))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* analisi opzionale */}
      {showAnalysis && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 text-sm text-neutral-700 shadow-sm">
          <div className="font-semibold mb-2">Analisi (mock)</div>
          <p>
            Qui potrai visualizzare breakdown, trend e indici di sostenibilità del flusso di cassa.
          </p>
        </div>
      )}
    </div>
  );
}
