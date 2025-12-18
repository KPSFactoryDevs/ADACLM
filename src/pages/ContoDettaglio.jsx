import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Banks } from "../lib/banks";

function formatMoney(n) {
  const num = Number(n || 0);
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  return `${sign}${abs.toLocaleString("it-IT", { style:"currency", currency:"EUR" })}`;
}

export default function ContoDettaglio() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ inc:0, out:0, net:0, count:0 });
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // filtri
  const [query, setQuery] = useState("");
  const [subTab, setSubTab] = useState("tutti"); // tutti | entrate | uscite | verificare | noncat
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  useEffect(()=>{
    let alive = true;
    (async () => {
      const acc = await Banks.getAccount(id);
      if (!alive) return;
      setAccount(acc);
    })();
    return ()=>{ alive=false; };
  }, [id]);

  useEffect(()=>{
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const type = subTab === 'entrate' ? 'in' : subTab === 'uscite' ? 'out' : undefined;
        const verified = subTab === 'verificare' ? 'todo' : undefined;
        const category = subTab === 'noncat' ? 'Non categorizzata' : undefined;

        const r = await Banks.listTransactions(id, {
          q: query || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          type, verified, category,
          page, per_page: 25,
        });

        if (!alive) return;
        setRows(r.data || []);
        setSummary(r.summary || {inc:0,out:0,net:0,count:0});
        setLastPage(r.pagination?.last_page || 1);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return ()=>{ alive=false; };
  }, [id, query, subTab, dateFrom, dateTo, page]);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start gap-4">
        <Link to="/conti-correnti" className="h-9 px-3 rounded-lg border border-neutral-300 text-sm bg-white hover:bg-neutral-50">← Indietro</Link>
        <div>
          <div className="text-sm text-[#5b63ff] font-medium">Dettaglio Conto</div>
          <div className="mt-1 text-2xl font-semibold">{account?.name || "—"}</div>
          <div className="text-sm text-neutral-500">{account?.iban || "—"}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-neutral-500 text-sm">Saldo</div>
          <div className="text-2xl font-semibold">{formatMoney(account?.balance || 0)}</div>
        </div>
      </div>

      {/* sub tabs */}
      <div className="flex items-center gap-6 text-sm">
        {[
          { id: "tutti", label: "Tutti" },
          { id: "entrate", label: "Entrate" },
          { id: "uscite", label: "Uscite" },
          { id: "verificare", label: "Da verificare" },
          { id: "noncat", label: "Non categorizzati" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => { setSubTab(s.id); setPage(1); }}
            className={`pb-2 -mb-px border-b-2 ${
              subTab === s.id
                ? "border-black text-black"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {s.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* filtri rapidi */}
          <div className="relative">
            <span className="absolute inset-y-0 left-2 grid place-items-center">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Ricerca descrizioni e note"
              className="h-9 pl-8 pr-3 rounded-lg border border-neutral-300 text-sm w-[260px]"
            />
          </div>
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value); setPage(1);}} className="h-9 px-2 rounded-lg border border-neutral-300 text-sm"/>
          <span className="text-neutral-400">→</span>
          <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value); setPage(1);}} className="h-9 px-2 rounded-lg border border-neutral-300 text-sm"/>
          <button className="ml-2 text-sm text-neutral-500 hover:text-neutral-800" onClick={()=>{
            setQuery(''); setSubTab('tutti'); setDateFrom(''); setDateTo(''); setPage(1);
          }}>× Reimposta</button>
        </div>
      </div>

      {/* riga risultati */}
      <div className="rounded-xl bg-[#F3F4FD] border border-[#E8E8F9] px-4 py-3 text-sm text-neutral-800">
        <div className="flex items-center gap-6">
          <div className="font-medium">{summary.count} risultati</div>
          <div className="flex items-center gap-6 ml-auto">
            <Kpi icon="out" value={summary.out} />
            <Kpi icon="in"  value={summary.inc} />
            <Kpi icon="net" value={summary.net} />
          </div>
        </div>
      </div>

      {/* tabella */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <th className="w-10 px-3 py-3"><input type="checkbox" className="accent-black" /></th>
              <th className="w-52 px-3 py-3 text-left">Data</th>
              <th className="px-3 py-3 text-left">Descrizione</th>
              <th className="w-32 px-3 py-3 text-right">Importo</th>
              <th className="w-56 px-3 py-3 text-left">Categoria</th>
              <th className="w-36 px-3 py-3 text-center">Verificato</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-neutral-500">Caricamento…</td></tr>
            )}
            {!loading && rows.map((m) => (
              <tr key={m.id} className="border-t border-neutral-200">
                <td className="px-3 py-3 align-top"><input type="checkbox" className="accent-black" /></td>
                <td className="px-3 py-3 align-top">
                  <div className="font-medium">{m.date}</div>
                  <div className="text-neutral-500 text-xs">{m.method}</div>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex items-start gap-3">
                    <Logo logo={m.logo} />
                    <div>
                      <div className="font-medium">{m.title}</div>
                      <div className="text-neutral-500 text-xs">{m.subtitle}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-right tabular-nums">
                  <span className={m.amount < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                    {formatMoney(m.amount)}
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <Badge label={m.category?.name} muted={m.category?.muted} />
                </td>
                <td className="px-3 py-3 align-top"><VerifyPill value={m.verified} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between text-sm">
        <div>Pagina {page} di {lastPage}</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}
            className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-50">←</button>
          <button disabled={page>=lastPage} onClick={()=>setPage(p=>Math.min(lastPage,p+1))}
            className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-50">→</button>
        </div>
      </div>
    </div>
  );
}

/* --- small UI bits (riuso dal tuo stile) --- */
function SearchIcon(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>)}
function TrendUp(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l6-6 4 4 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
function TrendDown(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7l6 6 4-4 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
function ArrowsSwap(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 7h10M7 7l3-3M7 7l3 3M17 17H7m10 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>)}
function Kpi({icon,value}){return(<div className="flex items-center gap-2">{icon==="out"&&<TrendDown/>}{icon==="in"&&<TrendUp/>}{icon==="net"&&<ArrowsSwap/>}<span className={value<0?"text-red-600 font-medium":value>0?"text-green-600 font-medium":""}>{formatMoney(value)}</span></div>)}
function Logo({ logo }){return(<div className="w-8 h-8 rounded-full grid place-items-center text-white text-xs font-semibold bg-neutral-800">{logo?.initials || "•"}</div>)}
function Badge({ label, muted }){let cls="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ";cls+=muted?"bg-neutral-100 text-neutral-700 border-neutral-200":"bg-amber-50 text-amber-700 border-amber-200";return(<span className={cls}><span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />{label||"—"}</span>)}
function VerifyPill({ value }){return(<div className="flex items-center gap-2 justify-center"><span className={`px-2 py-1 rounded-full text-xs border ${value===false?"bg-amber-100 text-amber-800 border-amber-200":"bg-neutral-100 text-neutral-700 border-neutral-200"}`}>NO</span><span className={`px-2 py-1 rounded-full text-xs border ${value===true?"bg-teal-100 text-teal-800 border-teal-200":"bg-neutral-100 text-neutral-700 border-neutral-200"}`}>Sì</span></div>)}
