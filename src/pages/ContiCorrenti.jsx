import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Banks } from "../lib/banks";

/* ---------------- Utils ---------------- */
function formatMoney(v, masked) {
  if (masked) return "—,— €";
  const n = Number(v || 0);
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

/* ---------------- Page ---------------- */
export default function ContiCorrenti() {
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await Banks.listAccounts(103);
        if (!alive) return;
        setRows(r.data || []);
        setTotal(r.total_balance || 0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[#5b63ff] font-medium">Tutti i Conti</div>
          <div className="mt-1 text-4xl sm:text-[40px] font-semibold tracking-tight">
            {formatMoney(total, hidden)}{hidden && " •••"}
          </div>
          <div className="text-sm text-neutral-500">Totale saldo disponibile in <b>EUR</b></div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHidden(v => !v)}
            className="h-9 px-3 rounded-lg border border-neutral-300 text-sm bg-white hover:bg-neutral-50 flex items-center gap-2"
          >
            <EyeIcon hidden={hidden} />
            {hidden ? "Mostra saldi" : "Nascondi saldi"}
          </button>
          <button
            className="h-9 px-3 rounded-lg border border-neutral-300 text-sm bg-white hover:bg-neutral-50 flex items-center gap-2"
            onClick={() => alert("Export (mock)")}
          >
            <DownloadIcon />
            Esporta
          </button>
          <Link
            to="/conti-correnti/nuovo"
            className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm hover:opacity-90 flex items-center gap-2"
          >
            <PlusIcon />
            Aggiungi conto
          </Link>
        </div>
      </div>

      {/* Loader */}
      {loading && (
        <div className="rounded-xl border border-neutral-200 p-6 text-sm text-neutral-600 bg-white">
          Caricamento conti…
        </div>
      )}

      {/* Cards elenco banche */}
      {!loading && (
        <div className="space-y-4">
          {rows.map((bank) => (
            <BankCard key={bank.id} bank={bank} hidden={hidden} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Components ---------------- */

function BankCard({ bank, hidden }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      {/* Header banca */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <BrandLogo code={bank.bank_code} />
          <h2 className="text-[17px] font-semibold">{bank.name}</h2>
        </div>
        <div className="flex items-center gap-3 text-neutral-700">
          {/* placeholders */}
          <button className="p-2 rounded-lg hover:bg-neutral-50" onClick={()=>alert("Sincronizza (mock)")}>
            <SyncIcon />
          </button>
          <span className="p-2 rounded-lg hover:bg-neutral-50" title="Ultima sincronizzazione">
            <ClockIcon />
          </span>
        </div>
      </div>

      {/* Righe conto (unico: ogni conto = 1 riga “principale”) */}
      <div className="divide-y divide-neutral-200">
        <div className="px-5 py-4 flex items-start justify-between">
          <div>
            <div className="text-[15px] font-medium">Conto Principale</div>
            <div className="text-sm text-neutral-500">{bank.iban || '—'}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[15px] font-semibold tabular-nums">
              {hidden ? "•••" : formatMoney(bank.balance)}
            </div>
            <Link to={`/conti-correnti/${bank.id}`} className="h-8 px-3 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50">
              Dettaglio
            </Link>
            <button className="p-1.5 rounded hover:bg-neutral-50">
              <KebabIcon className="text-neutral-700" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandLogo({ code }) {
  const initials = (code || 'BA').slice(0,2).toUpperCase();
  return <div className="w-9 h-9 grid place-items-center rounded-full bg-neutral-800 text-white text-xs font-semibold">{initials}</div>;
}

/* ---------------- Icons (copiati dal tuo file) ---------------- */

function EyeIcon({ hidden }) { return hidden ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" />
    <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 5.2A9.7 9.7 0 0 1 12 5c6 0 9 6 9 6a12.8 12.8 0 0 1-3 3.7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 7.8A12.5 12.5 0 0 0 3 11s3 6 9 6c.9 0 1.8-.1 2.6-.4" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5c6 0 9 6 9 6s-3 6-9 6-9-6-9-6 3-6 9-6Z" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);}
function DownloadIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>)}
function PlusIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>)}
function SyncIcon(){return(<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7a8 8 0 0 1 13.9-2M20 17a8 8 0 0 1-13.9 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>)}
function ClockIcon(){return(<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>)}
function KebabIcon({className}){return(<svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg>)}
