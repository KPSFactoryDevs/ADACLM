import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, UploadIcon, DownloadIcon, TrashIcon } from "../components/ui/Icons";
import { Badge } from "../components/ui/Badge";
import { BankStatements } from "../lib/api";

/* ======================= COMPONENTE PRINCIPALE ======================= */

export default function EstrattiConto() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    setLoading(true);
    try {
      const data = await BankStatements.list();
      setRows(data?.data || []);
    } catch (e) {
      showToast("error", e.message || "Errore nel recupero degli estratti conto");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.filename || "").toLowerCase().includes(term) ||
        (r.bank_name || "").toLowerCase().includes(term) ||
        (r.iban || "").toLowerCase().includes(term)
    );
  }, [q, rows]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function formatDateTime(dt) {
    if (!dt) return "—";
    try {
      const d = new Date(dt);
      return d.toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dt;
    }
  }

  function formatDate(dt) {
    if (!dt) return "—";
    try {
      return new Date(dt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dt;
    }
  }

  function statusBadge(status) {
    const map = {
      uploaded:  { tone: "neutral", label: "Caricato" },
      analyzing: { tone: "indigo",  label: "In analisi…" },
      completed: { tone: "teal",    label: "Completato" },
      error:     { tone: "rose",    label: "Errore" },
    };
    const s = map[status] || { tone: "neutral", label: status };
    return <Badge tone={s.tone}>{s.label}</Badge>;
  }

  async function handleUpload() {
    if (!file) {
      showToast("error", "Seleziona un file PDF");
      return;
    }
    setUploading(true);
    try {
      await BankStatements.upload(file);
      await loadList();
      setModalOpen(false);
      setFile(null);
      showToast("success", "Estratto conto caricato correttamente");
    } catch (e) {
      showToast("error", e.message || "Caricamento fallito");
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(id) {
    setAnalyzingId(id);
    try {
      showToast("info", "Analisi in corso… Potrebbe richiedere qualche secondo.");
      await BankStatements.analyze(id);
      await loadList();
      showToast("success", "Analisi completata!");
      navigate(`/estratti-conto/${id}`);
    } catch (e) {
      showToast("error", e.message || "Errore durante l'analisi");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Eliminare questo estratto conto?")) return;
    try {
      await BankStatements.delete(id);
      await loadList();
      showToast("success", "Estratto conto eliminato.");
    } catch (e) {
      showToast("error", e.message || "Errore eliminazione");
    }
  }

  return (
    <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="text-sm text-[#5b63ff] tracking-wide font-semibold uppercase">Analisi</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Archivio Estratti Conto
          </h1>
          <p className="mt-1 text-slate-500">
            Carica estratti conto bancari in PDF per analizzare l'utilizzo del fido e la movimentazione.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="h-10 px-4 rounded-xl shadow-md bg-gradient-to-r from-[#5b63ff] to-[#7e85ff] text-white text-sm font-semibold hover:opacity-90 transition-transform duration-300 hover:-translate-y-0.5 flex items-center gap-2"
          >
            <UploadIcon className="w-4 h-4" />
            Importa Estratto Conto
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative group">
          <span className="absolute inset-y-0 left-3 grid place-items-center text-slate-400 group-hover:text-[#5b63ff] transition-colors">
            <SearchIcon className="w-4 h-4" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per nome file, banca, IBAN…"
            className="h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-[#5b63ff]/30 focus:border-[#5b63ff] focus:ring focus:ring-[#5b63ff]/20 outline-none transition-all text-sm w-full md:w-[360px]"
          />
        </div>
        <span className="text-sm font-medium text-slate-400">
          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md mr-1">{filtered.length}</span> estratti conto
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <Th>File</Th>
                <Th>Banca</Th>
                <Th>IBAN</Th>
                <Th>Periodo</Th>
                <Th>Fido</Th>
                <Th>Stato</Th>
                <Th>Caricato il</Th>
                <Th className="text-right pr-6">Azioni</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin" />
                      <span className="font-semibold text-sm">Caricamento estratti conto...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50/30">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                          <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
                          <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">Nessun estratto conto</div>
                        <div className="text-slate-400 text-xs mt-0.5">Clicca su "Importa Estratto Conto" per iniziare.</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <Td className="font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <span className="truncate max-w-[200px]" title={r.filename}>{r.filename}</span>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{r.bank_name || "—"}</Td>
                    <Td className="text-slate-500 font-mono text-xs">{r.iban || "—"}</Td>
                    <Td className="text-slate-500 whitespace-nowrap">
                      {r.date_from && r.date_to
                        ? `${formatDate(r.date_from)} → ${formatDate(r.date_to)}`
                        : "—"}
                    </Td>
                    <Td className="tabular-nums font-medium">
                      {r.fido_accordato
                        ? Number(r.fido_accordato).toLocaleString("it-IT", { style: "currency", currency: "EUR" })
                        : <span className="text-slate-400">—</span>}
                    </Td>
                    <Td>{statusBadge(r.status)}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDateTime(r.created_at)}</Td>
                    <Td className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {r.status === "uploaded" && (
                          <button
                            className="h-8 px-3 rounded-lg border border-[#D8D2FF] bg-[#ECE8FF] text-[#5b63ff] font-medium transition duration-200 hover:bg-[#5b63ff] hover:text-white disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
                            onClick={() => handleAnalyze(r.id)}
                            disabled={analyzingId === r.id}
                          >
                            {analyzingId === r.id ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-[#5b63ff]/30 border-t-[#5b63ff] rounded-full animate-spin" />
                                Analisi…
                              </>
                            ) : (
                              "Analizza"
                            )}
                          </button>
                        )}
                        {r.status === "completed" && (
                          <button
                            className="h-8 px-3 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 font-medium transition duration-200 hover:bg-teal-600 hover:text-white"
                            onClick={() => navigate(`/estratti-conto/${r.id}`)}
                          >
                            Visualizza
                          </button>
                        )}
                        {r.status === "error" && (
                          <button
                            className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-medium transition duration-200 hover:bg-amber-600 hover:text-white disabled:opacity-50"
                            onClick={() => handleAnalyze(r.id)}
                            disabled={analyzingId === r.id}
                          >
                            Riprova
                          </button>
                        )}
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                          title="Elimina"
                          onClick={() => handleDelete(r.id)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed z-50 bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-up ${
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10"
            : toast.type === "info"
            ? "bg-blue-50 text-blue-800 border-blue-200 shadow-blue-500/10"
            : "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              toast.type === "success" ? "bg-emerald-500" : toast.type === "info" ? "bg-blue-500" : "bg-rose-500"
            }`} />
            {toast.msg}
          </div>
        </div>
      )}

      {/* MODALE UPLOAD */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-100 transform transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <div className="text-xl font-bold text-slate-800">Importa Estratto Conto</div>
                <p className="text-sm text-slate-500 mt-1">Carica un file PDF dell'estratto conto bancario.</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#5b63ff]/10 to-[#7e85ff]/10 text-[#5b63ff] rounded-full flex items-center justify-center">
                <UploadIcon className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">File Estratto Conto (PDF) *</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".pdf"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#5b63ff]/10 file:text-[#5b63ff] hover:file:bg-[#5b63ff]/20 transition-all cursor-pointer border border-slate-200 rounded-xl"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Il fido e i dati bancari saranno estratti automaticamente dal documento.
                </p>
              </div>

              {/* Info box */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </div>
                  <div className="text-xs text-blue-800 leading-relaxed">
                    <strong>Come funziona:</strong> Dopo il caricamento, clicca su "Analizza" per avviare l'estrazione automatica dei movimenti.
                    Il sistema rileverà automaticamente banca, IBAN, fido e tutti i movimenti, calcolando l'utilizzo del fido e generando alert.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setModalOpen(false); setFile(null); }}
                className="h-10 px-5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                onClick={handleUpload}
                className="h-10 px-6 rounded-xl font-semibold bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={uploading || !file}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Caricamento...
                  </span>
                ) : "Carica Estratto Conto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------- Small UI helpers ------- */
function Th({ children, className = "" }) {
  return <th className={`px-6 py-4 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-6 py-4 align-middle ${className}`}>{children}</td>;
}
