import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Gauge } from "../components/ui/Gauge";
import { Badge } from "../components/ui/Badge";
import { Pill } from "../components/ui/Pill";
import { ArrowRightIcon } from "../components/ui/Icons";
import { BankStatements } from "../lib/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
  ComposedChart, Line,
} from "recharts";

/* ======================= Helpers ======================= */
const fmtMoney = (v) => {
  if (v == null) return "—";
  return Number(v).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
};

const fmtDateShort = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  } catch { return d; }
};

const SCORE_SCALE = [
  { label: "Ottimo",     min: 90, color: "#16a34a" },
  { label: "Buono",      min: 70, color: "#22c55e" },
  { label: "Attenzione", min: 50, color: "#f59e0b" },
  { label: "Critico",    min: 30, color: "#f97316" },
  { label: "Grave",      min: 0,  color: "#ef4444" },
];
const classify = (score) => SCORE_SCALE.find((s) => score >= s.min) || SCORE_SCALE.at(-1);

/* ======================= Skeleton helpers ======================= */
const SkLine = ({ w = "100%", h = 12, className = "" }) => (
  <div className={`animate-pulse rounded ${className}`} style={{ width: w, height: h, backgroundColor: "#f1f5f9" }} />
);

/* ======================= Page ======================= */
export default function EstrattoContoDettaglio() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [movTab, setMovTab] = useState("tutti"); // tutti | entrate | uscite
  const [movPage, setMovPage] = useState(1);
  const PER_PAGE = 30;

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await BankStatements.show(id);
        if (!alive) return;
        setData(res);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Errore nel caricamento");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const analysis = data?.analysis || {};
  const summary = analysis?.summary || {};
  const daily = analysis?.daily || [];

  const entries = data?.entries || [];
  const score = summary?.score ?? 0;
  const rating = classify(score);
  const hasFido = summary?.has_fido ?? false;

  // ── Filtered movements ──
  const filteredEntries = useMemo(() => {
    if (movTab === "entrate") return entries.filter((e) => e.avere > 0);
    if (movTab === "uscite") return entries.filter((e) => e.dare > 0);
    return entries;
  }, [entries, movTab]);

  const pagedEntries = useMemo(() => {
    const start = (movPage - 1) * PER_PAGE;
    return filteredEntries.slice(start, start + PER_PAGE);
  }, [filteredEntries, movPage]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PER_PAGE));

  // ── Chart data ──
  const chartData = useMemo(() => {
    return daily.map((d) => ({
      ...d,
      date_label: fmtDateShort(d.date),
      fido_line: hasFido ? -(summary.fido_accordato || 0) : undefined,
    }));
  }, [daily, hasFido, summary.fido_accordato]);

  // ── Utilizzo Fido chart data (daily %) ──
  const fidoChartData = useMemo(() => {
    if (!hasFido) return [];
    return daily
      .filter((d) => d.utilizzo_fido != null)
      .map((d) => ({
        date_label: fmtDateShort(d.date),
        utilizzo: d.utilizzo_fido,
        fill: d.utilizzo_fido > 90 ? "#ef4444" : d.utilizzo_fido > 70 ? "#f97316" : d.utilizzo_fido > 50 ? "#f59e0b" : "#22c55e",
      }));
  }, [daily, hasFido]);

  if (loading) {
    return (
      <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800 animate-fade-in-up">
        <Link to="/estratti-conto" className="inline-flex items-center gap-2 text-sm text-[#5b63ff] hover:text-[#454de0] font-semibold transition-colors">
          <ArrowRightIcon className="w-4 h-4 rotate-180" /> Torna all'archivio
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin" />
            <span className="font-semibold text-sm text-slate-500">Caricamento analisi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800">
        <Link to="/estratti-conto" className="inline-flex items-center gap-2 text-sm text-[#5b63ff] font-semibold">
          <ArrowRightIcon className="w-4 h-4 rotate-180" /> Torna all'archivio
        </Link>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-700">
          <strong>Errore:</strong> {error}
        </div>
      </div>
    );
  }

  if (data?.status !== "completed") {
    return (
      <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800">
        <Link to="/estratti-conto" className="inline-flex items-center gap-2 text-sm text-[#5b63ff] font-semibold">
          <ArrowRightIcon className="w-4 h-4 rotate-180" /> Torna all'archivio
        </Link>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-amber-800">
          <strong>Analisi non completata.</strong> Stato attuale: {data?.status || "—"}.
          {data?.error_message && <div className="mt-2 text-sm">{data.error_message}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800 animate-fade-in-up">
      <Link to="/estratti-conto" className="inline-flex items-center gap-2 text-sm text-[#5b63ff] hover:text-[#454de0] font-semibold transition-colors">
        <ArrowRightIcon className="w-4 h-4 rotate-180" /> Torna all'archivio
      </Link>

      {/* ═══════════ HERO ═══════════ */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col xl:flex-row items-center xl:items-stretch gap-6">
        {/* Gauge */}
        <div className="shrink-0 flex items-center justify-center pt-2 xl:pt-0 xl:pr-6 xl:border-r border-slate-100">
          <div className="text-center">
            <Gauge value={score} color={rating.color} size={150} stroke={14} label="Score" subtitle="salute conto" />
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-[#5b63ff] font-semibold uppercase tracking-widest">Analisi Estratto Conto</div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                {data.bank_name || "Banca"} — {data.filename}
              </h1>
              <div className="mt-1 text-sm text-slate-500 flex flex-wrap items-center gap-3">
                {data.iban && <span className="font-mono">{data.iban}</span>}
                {data.date_from && data.date_to && (
                  <span>Periodo: {fmtDate(data.date_from)} → {fmtDate(data.date_to)}</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Giudizio</span>
                <Pill text={rating.label} color={rating.color} className="text-base px-5 py-1.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ KPI CARDS ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Saldo Medio" value={fmtMoney(summary.saldo_medio)} icon="💰" color="from-blue-50 to-indigo-50" border="border-blue-100" />
        <KpiCard label="Saldo Minimo" value={fmtMoney(summary.saldo_min)} icon="📉" color="from-rose-50 to-pink-50" border="border-rose-100" />
        <KpiCard label="Saldo Massimo" value={fmtMoney(summary.saldo_max)} icon="📈" color="from-emerald-50 to-teal-50" border="border-emerald-100" />
        {hasFido ? (
          <KpiCard
            label="Fido Accordato"
            value={fmtMoney(summary.fido_accordato)}
            icon="🏦"
            color="from-amber-50 to-orange-50"
            border="border-amber-100"
            sub={`Utilizzo medio: ${summary.utilizzo_fido_medio ?? 0}%`}
          />
        ) : (
          <KpiCard
            label="Movimenti"
            value={summary.num_movimenti || 0}
            icon="🔄"
            color="from-violet-50 to-purple-50"
            border="border-violet-100"
            sub={`Turnover ratio: ${summary.turnover_ratio ?? 0}x`}
          />
        )}
      </div>

      {/* ═══════════ EXTRA KPIs ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Totale Uscite" value={fmtMoney(summary.totale_dare)} icon="⬇️" color="from-red-50 to-rose-50" border="border-red-100" />
        <KpiCard label="Totale Entrate" value={fmtMoney(summary.totale_avere)} icon="⬆️" color="from-green-50 to-emerald-50" border="border-green-100" />
        <KpiCard label="Giorni Analizzati" value={summary.giorni_analizzati || 0} icon="📅" color="from-slate-50 to-gray-50" border="border-slate-200" />
        {hasFido && (
          <KpiCard
            label="Giorni Sconfinamento"
            value={summary.giorni_sconfinamento || 0}
            icon="⚠️"
            color={summary.giorni_sconfinamento > 0 ? "from-red-50 to-rose-50" : "from-emerald-50 to-teal-50"}
            border={summary.giorni_sconfinamento > 0 ? "border-red-200" : "border-emerald-100"}
          />
        )}
      </div>

      {/* ═══════════ GRAFICO SALDO GIORNALIERO + FIDO ═══════════ */}
      <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#5b63ff] rounded-full" />
            Andamento Saldo Giornaliero
            {hasFido && <span className="text-xs font-normal text-slate-500 ml-2">(con linea fido)</span>}
          </h2>
        </div>
        <div className="px-4 py-6">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5b63ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5b63ff" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date_label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  interval={Math.max(0, Math.floor(chartData.length / 12))}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
                    return v;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 13,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                  }}
                  labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                  formatter={(value, name) => {
                    if (name === "saldo") return [fmtMoney(value), "Saldo"];
                    if (name === "fido_line") return [fmtMoney(Math.abs(value)), "Fido Accordato"];
                    return [value, name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#5b63ff"
                  strokeWidth={2.5}
                  fill="url(#saldoGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#5b63ff", stroke: "#fff", strokeWidth: 2 }}
                />
                {/* Reference line per saldo zero */}
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
                {/* Linea fido se presente */}
                {hasFido && (
                  <Line
                    type="monotone"
                    dataKey="fido_line"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    name="fido_line"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-400 py-12">Nessun dato giornaliero disponibile</div>
          )}
        </div>
        {hasFido && (
          <div className="px-6 pb-4 flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#5b63ff] rounded inline-block" /> Saldo giornaliero
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#ef4444] rounded inline-block" style={{ borderBottom: "2px dashed #ef4444" }} /> Linea fido ({fmtMoney(summary.fido_accordato)})
            </span>
          </div>
        )}
      </section>

      {/* ═══════════ GRAFICO UTILIZZO FIDO % (solo se ha fido) ═══════════ */}
      {hasFido && fidoChartData.length > 0 && (
        <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
              Utilizzo Fido Giornaliero (%)
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> &lt;50%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> 50-70%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> 70-90%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> &gt;90%</span>
            </div>
          </div>
          <div className="px-4 py-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fidoChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date_label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  interval={Math.max(0, Math.floor(fidoChartData.length / 12))}
                />
                <YAxis
                  domain={[0, 120]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 13,
                  }}
                  formatter={(v) => [`${v}%`, "Utilizzo Fido"]}
                />
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={2} label={{ value: "Soglia 90%", position: "right", fill: "#ef4444", fontSize: 11 }} />
                <Bar dataKey="utilizzo" radius={[4, 4, 0, 0]} maxBarSize={20}>
                  {fidoChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ═══════════ TABELLA MOVIMENTI ═══════════ */}
      <section className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#5b63ff] rounded-full" />
            Movimenti Estratti
            <span className="text-xs font-normal text-slate-500 ml-1">({filteredEntries.length})</span>
          </h2>

          <div className="flex items-center gap-2">
            {["tutti", "entrate", "uscite"].map((tab) => (
              <button
                key={tab}
                onClick={() => { setMovTab(tab); setMovPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  movTab === tab
                    ? "bg-[#5b63ff] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab === "tutti" ? "Tutti" : tab === "entrate" ? "Entrate" : "Uscite"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left">Data Op.</th>
                <th className="px-6 py-3 text-left">Data Valuta</th>
                <th className="px-6 py-3 text-left">Descrizione</th>
                <th className="px-6 py-3 text-right">Dare</th>
                <th className="px-6 py-3 text-right">Avere</th>
                <th className="px-6 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nessun movimento</td>
                </tr>
              ) : (
                pagedEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-700">{fmtDate(e.date_operazione)}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500">{fmtDate(e.date_valuta)}</td>
                    <td className="px-6 py-3 text-slate-600 max-w-[400px] truncate" title={e.descrizione}>{e.descrizione}</td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {e.dare > 0 ? (
                        <span className="text-red-600 font-medium">-{fmtMoney(e.dare)}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {e.avere > 0 ? (
                        <span className="text-emerald-600 font-medium">+{fmtMoney(e.avere)}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-semibold text-slate-800">
                      {e.saldo != null ? fmtMoney(e.saldo) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <div className="text-slate-500">Pagina {movPage} di {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                disabled={movPage <= 1}
                onClick={() => setMovPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                ←
              </button>
              <button
                disabled={movPage >= totalPages}
                onClick={() => setMovPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* TOAST */}
      {toast && (
        <div className={`fixed z-50 bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-up ${
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ Sub-components ═══════════ */

function KpiCard({ label, value, icon, color, border, sub }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} border ${border} p-5 transition-transform hover:-translate-y-0.5 duration-300`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-slate-800 tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}


