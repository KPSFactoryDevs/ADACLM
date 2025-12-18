// src/pages/Movimenti.jsx
import React, { useMemo, useState } from "react";

const MOVES = [
  {
    id: "m1",
    date: "30 novembre 2023",
    method: "Bonifico",
    logo: { type: "circle", initials: "MP" },
    title: "Associazione Astor Srl",
    subtitle: "Pag. Fatt. N. 11-23 A Saldo Fatt. N. 2 Del 14-05",
    amount: -288.7,
    category: { name: "Servizi" },
    verified: null, // null = nessuna selezione, true/false = SI/NO
  },
  {
    id: "m2",
    date: "30 novembre 2023",
    method: "Pagamento Carta",
    logo: { type: "circle", initials: "MP" },
    title: "Caruso Mario",
    subtitle: "Pagamento Pos - Pagobancomat N.Carta: 13328733",
    amount: -12.5,
    category: { name: "Fornitori / CAFFÈ" },
    verified: false,
  },
  {
    id: "m3",
    date: "30 novembre 2023",
    method: "Pagamento Carta",
    logo: { type: "circle", initials: "MP" },
    title: "Napoli Srls",
    subtitle: "Pagamento Pos - Mastercard/Maestr N.Carta: 13328733",
    amount: -2.0,
    category: { name: "Non categorizzata", muted: true },
    verified: false,
  },
  {
    id: "m4",
    date: "30 novembre 2023",
    method: "Bonifico",
    logo: { type: "circle", initials: "MP" },
    title: "Hotel Cavallo S.P.A.",
    subtitle: "Fpr 56/23 - 2023-09-30 - Fpr 53/23 - 2023-09-30 Eft-219607",
    amount: 914.0,
    category: { name: "Punto vendita / B2B", color: "amber" },
    verified: true,
  },
  {
    id: "m5",
    date: "29 novembre 2023",
    method: "Pagamento Carta",
    logo: { type: "circle", initials: "MP" },
    title: "Farmacia Carola di Carola Maria",
    subtitle: "Pagamento Pos - Pagobancomat N.Carta: 13328733",
    amount: -21.6,
    category: { name: "Fornitori / componenti" },
    verified: null,
  },
  {
    id: "m6",
    date: "29 novembre 2023",
    method: "Bonifico",
    logo: { type: "circle", initials: "MP" },
    title: "Agenzia delle Entratel",
    subtitle:
      "Rif. 70-98-0000-0002 Dom. 34820587284 - Anti Cipo - Int. Feasr 2023-2027",
    amount: 1712.82,
    category: { name: "Incassi Extra" },
    verified: true,
  },
  {
    id: "m7",
    date: "29 novembre 2023",
    method: "Pagamento Carta",
    logo: { type: "circle", initials: "MP" },
    title: "Supermarket Srl",
    subtitle: "Pagamento Pos - Pagobancomat N.Carta: 13328733",
    amount: -40.0,
    category: { name: "Servizi / CONSULENZ...", muted: false },
    verified: null,
  },
];

export default function Movimenti() {
  const [tab, setTab] = useState("movimenti"); // movimenti | reg-in | reg-out
  const [subTab, setSubTab] = useState("tutti"); // tutti | entrate | uscite | verificare | noncat
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    const view = MOVES.filter((m) =>
      m.title.toLowerCase().includes(query.toLowerCase())
    );
    const inc = view.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0);
    const out = view.filter((m) => m.amount < 0).reduce((s, m) => s + m.amount, 0);
    return { inc, out, net: inc + out };
  }, [query]);

  const filtered = useMemo(() => {
    let rows = MOVES.filter((m) =>
      m.title.toLowerCase().includes(query.toLowerCase())
    );
    if (subTab === "entrate") rows = rows.filter((m) => m.amount > 0);
    if (subTab === "uscite") rows = rows.filter((m) => m.amount < 0);
    if (subTab === "verificare") rows = rows.filter((m) => m.verified !== true);
    if (subTab === "noncat")
      rows = rows.filter((m) => m.category?.name?.toLowerCase().includes("non"));
    return rows;
  }, [query, subTab]);

  return (
    <div className="space-y-4">
      {/* Tabs principali */}
      <div className="flex items-center gap-8">
        {[
          { id: "movimenti", label: "Movimenti" },
          { id: "reg-in", label: "Regole in entrata" },
          { id: "reg-out", label: "Regole in uscita" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              tab === t.id ? "bg-[#ECE8FF] text-[#5b63ff]" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm bg-white hover:bg-neutral-50">
            Proposte di categorizzazione
          </button>
          <button className="h-9 px-3 rounded-lg border border-neutral-300 text-sm bg-white hover:bg-neutral-50">
            + Aggiungi transazione
          </button>
          <button className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm hover:opacity-90">
            Scarica
          </button>
        </div>
      </div>

      {/* Sub tabs */}
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
            onClick={() => setSubTab(s.id)}
            className={`pb-2 -mb-px border-b-2 ${
              subTab === s.id
                ? "border-black text-black"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Barra filtri */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-2 grid place-items-center">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ricerca descrizioni e note"
            className="h-9 pl-8 pr-3 rounded-lg border border-neutral-300 text-sm w-[260px]"
          />
        </div>

        <SelectChip label="Conto operativo MPS | ***X417" />
        <SelectChip label="Categoria" />
        <SelectChip label="Novembre 23" />
        <SelectChip label="Status" />
        <SelectChip label="Tipo" />
        <button className="ml-2 text-sm text-neutral-500 hover:text-neutral-800">
          × Reimposta
        </button>
      </div>

      {/* Riga risultati */}
      <div className="rounded-xl bg-[#F3F4FD] border border-[#E8E8F9] px-4 py-3 text-sm text-neutral-800">
        <div className="flex items-center gap-6">
          <div className="font-medium">{filtered.length} risultati</div>
          <div className="flex items-center gap-6 ml-auto">
            <Kpi icon="out" value={totals.out} />
            <Kpi icon="in" value={totals.inc} />
            <Kpi icon="net" value={totals.net} />
          </div>
        </div>
      </div>

      {/* Tabella */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <th className="w-10 px-3 py-3">
                <input type="checkbox" className="accent-black" />
              </th>
              <th className="w-52 px-3 py-3 text-left">Data</th>
              <th className="px-3 py-3 text-left">Descrizione</th>
              <th className="w-32 px-3 py-3 text-right">Importo</th>
              <th className="w-56 px-3 py-3 text-left">Categoria</th>
              <th className="w-36 px-3 py-3 text-center">Verificato</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-t border-neutral-200">
                <td className="px-3 py-3 align-top">
                  <input type="checkbox" className="accent-black" />
                </td>
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
                  <span
                    className={
                      m.amount < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"
                    }
                  >
                    {formatMoney(m.amount)}
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <Badge label={m.category.name} muted={m.category.muted} />
                </td>
                <td className="px-3 py-3 align-top">
                  <VerifyPill value={m.verified} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */

function SelectChip({ label }) {
  return (
    <button className="h-9 px-3 rounded-lg border border-neutral-300 bg-white text-sm flex items-center gap-2">
      {label}
      <ChevronDown />
    </button>
  );
}

function Kpi({ icon, value }) {
  return (
    <div className="flex items-center gap-2">
      {icon === "in" && <TrendUp />}
      {icon === "out" && <TrendDown />}
      {icon === "net" && <ArrowsSwap />}
      <span className={value < 0 ? "text-red-600 font-medium" : value > 0 ? "text-green-600 font-medium" : ""}>
        {formatMoney(value)}
      </span>
    </div>
  );
}

function Logo({ logo }) {
  const base = "w-8 h-8 rounded-full grid place-items-center text-white text-xs font-semibold bg-neutral-800";
  return <div className={base}>{logo.initials || "•"}</div>;
}

function Badge({ label, muted }) {
  let cls = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ";
  if (muted) {
    cls += "bg-neutral-100 text-neutral-700 border-neutral-200";
  } else {
    cls += "bg-amber-50 text-amber-700 border-amber-200";
  }
  return (
    <span className={cls}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function VerifyPill({ value }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      <span
        className={`px-2 py-1 rounded-full text-xs border ${
          value === false ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-neutral-100 text-neutral-700 border-neutral-200"
        }`}
      >
        NO
      </span>
      <span
        className={`px-2 py-1 rounded-full text-xs border ${
          value === true ? "bg-teal-100 text-teal-800 border-teal-200" : "bg-neutral-100 text-neutral-700 border-neutral-200"
        }`}
      >
        Sì
      </span>
    </div>
  );
}

/* ---------- Icons ---------- */
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function TrendUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 17l6-6 4 4 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrendDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 7l6 6 4-4 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowsSwap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h10M7 7l3-3M7 7l3 3M17 17H7m10 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Utils ---------- */
function formatMoney(n) {
  const num = Number(n || 0);
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  return `${sign}${abs.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  })}`;
}
