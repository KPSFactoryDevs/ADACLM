import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, UploadIcon, DownloadIcon, TrashIcon } from "../components/ui/Icons";
import { Badge } from "../components/ui/Badge";

/* ========== MINI API CLIENT LOCALE ========== */
const API_BASE = "http://127.0.0.1:8000/api";

function getToken() {
  try { return JSON.parse(localStorage.getItem("sb_auth"))?.token || null; }
  catch { return null; }
}
function getCurrentCompanyId() {
  try { return JSON.parse(localStorage.getItem("sb_company"))?.id || null; }
  catch { return null; }
}

async function api(path, { method = "GET", body, auth = true, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  const companyId = getCurrentCompanyId();

  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;
  if (companyId) headers["CurrentCompany"] = companyId; // backend leggerà questo header

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }

  if (!res.ok) {
    const msg = (data && (data.message || data.errors)) || "Errore di rete";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

const Bilanci = {
  async listDocuments() {
    return api("/getBilanciDocuments", { method: "GET" });
  },
  async upload({ file, forma_giuridica, tipo_azienda }) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("filename", file.name);
    fd.append("forma_giuridica", forma_giuridica);
    fd.append("tipo_azienda", tipo_azienda);

    // Legacy backup keys
     fd.append("base64", file);
     fd.append("base64", file.name);

    return api("/recapBilancio", { method: "POST", isForm: true, body: fd });
  },
  async getSettori() {
    return api("/getSettori", { method: "GET", auth: false });
  },
};

/* ======================= COMPONENTE PRINCIPALE ======================= */

export default function AnalisiBilancio() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); 
  const [modalOpen, setModalOpen] = useState(false);

  const navigate = useNavigate();

  // Modal State
  const [file, setFile] = useState(null);
  const [formaGiuridica, setFormaGiuridica] = useState("");
  const [tipoAzienda, setTipoAzienda] = useState("");
  const [settori, setSettori] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await Bilanci.listDocuments();
        setRows(mapDocumentsToRows(data));
      } catch (e) {
        showToast("error", e.message || "Errore nel recupero dei bilanci");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    (async () => {
      try {
        const s = await Bilanci.getSettori();
        setSettori(s);
      } catch (e) {
        console.error("getSettori failed:", e);
      }
    })();
  }, [modalOpen]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.azienda || "").toLowerCase().includes(term) ||
        (r.esercizio || "").toLowerCase().includes(term) ||
        (r.formato || "").toLowerCase().includes(term) ||
        (r.fonte || "").toLowerCase().includes(term)
    );
  }, [q, rows]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2600);
  }

  function currentCompanyName() {
    try { return JSON.parse(localStorage.getItem("sb_company"))?.ragione_sociale || ""; }
    catch { return ""; }
  }

  function mapDocumentsToRows(docs) {
    let list = Array.isArray(docs) ? docs : (docs?.data ?? []);
    if (Array.isArray(list) && typeof list.flat === "function") {
      list = list.flat(Infinity);
    } else if (Array.isArray(list)) {
      list = list.reduce((acc, x) => acc.concat(x), []);
    }

    const companyNameFallback = currentCompanyName();

    return list
      .filter(d => String(d.type || "").toLowerCase() === "bilancio")
      .map(d => {
        const esercizio = d.anno_fine || d.anno_inizio || "";
        const periodo = d.anno_inizio && d.anno_fine ? `${d.anno_inizio} – ${d.anno_fine}` : "";
        const formato = (d.filename || "").toLowerCase().endsWith(".xbrl") ? "XBRL" : "PDF";

        const rawStatus = (d.status || "").trim();
        const stato = rawStatus
          ? (rawStatus === "Completato" ? "Completo" : rawStatus)
          : "Da Verificare";

        return {
          id: d.id,
          azienda: d.nome_azienda || companyNameFallback || "—",
          esercizio: esercizio ? String(esercizio) : "—",
          periodo,
          formato,
          fonte: "Upload manuale",
          stato,
          uploadedAt: formatDateTime(d.created_at),
          size: d.sizeReadable || "—",
          raw: d,
        };
      });
  }

  function formatDateTime(dt) {
    if (!dt) return "—";
    try {
      const d = new Date(dt.replace(" ", "T"));
      return d.toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dt;
    }
  }

  async function handleUpload() {
    if (!file || !formaGiuridica || !tipoAzienda) {
      showToast("error", "Compila tutti i campi richiesti");
      return;
    }
    setUploading(true);
    try {
      await Bilanci.upload({ file, forma_giuridica: formaGiuridica, tipo_azienda: tipoAzienda });
      const refreshed = await Bilanci.listDocuments();
      setRows(mapDocumentsToRows(refreshed));

      setModalOpen(false);
      setFile(null);
      setFormaGiuridica("");
      setTipoAzienda("");
      showToast("success", "Bilancio caricato correttamente");
    } catch (e) {
      showToast("error", e.message || "Caricamento fallito");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="text-sm text-[#5b63ff] tracking-wide font-semibold uppercase">Analisi</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Archivio Bilanci</h1>
          <p className="mt-1 text-slate-500">
            Visualizza e analizza i bilanci depositati. Caricane di nuovi tramite file XBRL/XML o PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="h-10 px-4 rounded-xl shadow-md bg-gradient-to-r from-[#5b63ff] to-[#7e85ff] text-white text-sm font-semibold hover:opacity-90 transition-transform duration-300 hover:-translate-y-0.5 flex items-center gap-2"
          >
            <UploadIcon className="w-4 h-4" />
            Importa bilancio
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
            placeholder="Cerca per azienda, esercizio, formato…"
            className="h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-[#5b63ff]/30 focus:border-[#5b63ff] focus:ring focus:ring-[#5b63ff]/20 outline-none transition-all text-sm w-full md:w-[360px]"
          />
        </div>
        <span className="text-sm font-medium text-slate-400">
          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md mr-1">{filtered.length}</span> bilanci trovati
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-md shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <Th>Azienda</Th>
                <Th>Esercizio</Th>
                <Th>Formato</Th>
                <Th>Stato</Th>
                <Th>Caricato il</Th>
                <Th>Size</Th>
                <Th className="text-right pr-6">Azioni</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                       <div className="w-8 h-8 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin"></div>
                       <span className="font-semibold text-sm">Caricamento bilanci...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50/30">
                     Nessun bilancio trovato. Clicca su "Importa bilancio" per iniziare.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <Td className="font-semibold text-slate-800">{r.azienda}</Td>
                    <Td className="whitespace-nowrap font-medium text-slate-600">
                      {r.esercizio}
                      {r.periodo && r.periodo !== String(r.esercizio) && (
                         <div className="text-xs text-slate-400 font-normal mt-0.5">{r.periodo}</div>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={r.formato === "XBRL" ? "indigo" : "neutral"} className="shadow-none">{r.formato}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={r.stato === "Completo" ? "teal" : "amber"} className="shadow-none">{r.stato}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-500">{r.uploadedAt}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{r.size}</Td>
                    <Td className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="h-8 px-3 rounded-lg border border-[#D8D2FF] bg-[#ECE8FF] text-[#5b63ff] font-medium transition duration-200 hover:bg-[#5b63ff] hover:text-white"
                          onClick={() => navigate(`/analisi-bilancio/${r.id}`)}
                        >
                          Analizza
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title="Scarica"
                          onClick={() => window.open(r.raw?.path || "#", "_blank")}
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                          title="Elimina"
                          onClick={() => alert(`Elimina id ${r.id} (implementa DELETE /bilancio/:id)`)}
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

      {/* TOAST SYSTEM (Sarebbe ideale spostarlo globalmente) */}
      {toast && (
        <div className={`fixed z-50 bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-up ${
          toast.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10" 
            : "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10"
        }`}>
          <div className="flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
             {toast.msg}
          </div>
        </div>
      )}

      {/* MODALE IMPORT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-100 transform transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
               <div>
                 <div className="text-xl font-bold text-slate-800">Importa bilancio</div>
                 <p className="text-sm text-slate-500 mt-1">Carica un file nel formato XBRL, XML o PDF.</p>
               </div>
               <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                  <UploadIcon className="w-6 h-6" />
               </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">File bilancio *</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".xbrl,.xml,.pdf,.zip"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#5b63ff]/10 file:text-[#5b63ff] hover:file:bg-[#5b63ff]/20 transition-all cursor-pointer border border-slate-200 rounded-xl"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Forma giuridica *</label>
                <select
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#5b63ff] focus:bg-white focus:ring-2 focus:ring-[#5b63ff]/20 transition-all cursor-pointer"
                  value={formaGiuridica}
                  onChange={(e) => setFormaGiuridica(e.target.value)}
                >
                  <option value="" hidden disabled>Seleziona la forma giuridica...</option>
                  <option value="DITTA INDIVIDUALE">Ditta Individuale</option>
                  <option value="SOCIETA A RESPONSABILITA LIMITATA SRL">SRL - Società a Responsabilità Limitata</option>
                  <option value="SOCIETA IN NOME COLLETTIVO SNC">SNC - Società in Nome Collettivo</option>
                  <option value="SOCIETA IN ACCOMANDITA SEMPLICE SAS">SAS - Società in Accomandita Semplice</option>
                  <option value="SOCIETA PER AZIONI SPA">SPA - Società per Azioni</option>
                  <option value="SOCIETA A RESPONSABILITA LIMITATA SEMPLIFICATA SRLS">SRLS - Società a Resp. Limitata Semplificata</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Settore Operativo *</label>
                <select
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#5b63ff] focus:bg-white focus:ring-2 focus:ring-[#5b63ff]/20 transition-all cursor-pointer"
                  value={tipoAzienda}
                  onChange={(e) => setTipoAzienda(e.target.value)}
                >
                  <option value="" hidden disabled>Seleziona il tipo di azienda...</option>
                  {settori?.Industria && <optgroup label="Industria" className="font-semibold text-slate-400">
                    {Object.keys(settori.Industria).map((k, i) => <option key={`ind-${i}`} value={k} className="font-medium text-slate-700">{k}</option>)}
                  </optgroup>}
                  {settori?.Commercio && <optgroup label="Commercio" className="font-semibold text-slate-400">
                    {Object.keys(settori.Commercio).map((k, i) => <option key={`com-${i}`} value={k} className="font-medium text-slate-700">{k}</option>)}
                  </optgroup>}
                  {settori?.Servizi && <optgroup label="Servizi" className="font-semibold text-slate-400">
                    {Object.keys(settori.Servizi).map((k, i) => <option key={`srv-${i}`} value={k} className="font-medium text-slate-700">{k}</option>)}
                  </optgroup>}
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setModalOpen(false); setFile(null); setFormaGiuridica(""); setTipoAzienda(""); }}
                className="h-10 px-5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                onClick={handleUpload}
                className="h-10 px-6 rounded-xl font-semibold bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={uploading}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     Caricamento...
                  </span>
                ) : "Carica Bilancio"}
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
