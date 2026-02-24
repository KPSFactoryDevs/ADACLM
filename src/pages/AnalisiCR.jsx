import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ================== MINI API ================== */
const API_BASE = "https://ada-stage.compaynet-b2b.com/api";

function getToken() {
  try { return JSON.parse(localStorage.getItem("sb_auth"))?.token || null; } catch { return null; }
}
function getCompanyId() {
  try { return JSON.parse(localStorage.getItem("sb_company"))?.id || null; } catch { return null; }
}
function getCompanyName() {
  try { return JSON.parse(localStorage.getItem("sb_company"))?.ragione_sociale || ""; } catch { return ""; }
}

async function api(path, { method="GET", body, isForm=false, auth=true } = {}) {
  const headers = {};
  const token = getToken();
  const cid = getCompanyId();

  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;
  if (cid) headers["CurrentCompany"] = cid;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = (data && (data.message || data.errors)) || "Errore di rete";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

const CRApi = {
  list() {
    return api("/getCrDocuments");
  },
  upload(file) {
    const fd = new FormData();
    fd.append("base64", file);
    return api("/importCr", { method: "POST", isForm: true, body: fd });
  },
  remove(id) {
    return api(`/deleteDocument/${id}`, { method: "DELETE" });
  },
  setPredefinito(id) {
    return api(`/cr/${id}/predefinito`, { method: "PUT" });
  },
};

/* ================== SKELETONS ================== */
const SkLine = ({ w="100%", h=12, className="" }) => (
  <div className={`animate-pulse rounded ${className}`} style={{ width:w, height:h, backgroundColor:"#f1f5f9" }} />
);
const SkBtn = ({ w=100, h=36 }) => <SkLine w={w} h={h} className="rounded-xl" />;

function StarIcon({ className, solid }) {
  return (
    <svg className={className} fill={solid ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={solid ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

/* ================== ICONS ================== */
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 19V5m0 0-4 4m4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
);
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
);
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><circle cx="12" cy="12" r="10"/></svg>
);

/* ================== COMPONENTE ================== */
export default function AnalisiCR() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // {id, label}

  const navigate = useNavigate();

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await CRApi.list();
        setRows(mapCRDocs(data));
      } catch (e) {
        showToast("error", e.message || "Errore nel caricamento documenti CR");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.azienda || "").toLowerCase().includes(term) ||
        (r.periodo || "").toLowerCase().includes(term) ||
        (r.formato || "").toLowerCase().includes(term) ||
        (r.tipo || "").toLowerCase().includes(term)
    );
  }, [q, rows]);

  const totalExpo = useMemo(
    () => filtered.reduce((s, r) => s + Number(r.esposizione || 0), 0),
    [filtered]
  );

  async function doUpload() {
    if (!file) {
      showToast("error", "Seleziona un file PDF/XML/ZIP");
      return;
    }
    setUploading(true);
    try {
      await CRApi.upload(file);
      const data = await CRApi.list();
      setRows(mapCRDocs(data));
      setModalOpen(false);
      setFile(null);
      showToast("success", "Documento CR importato correttamente");
    } catch (e) {
      showToast("error", e.message || "Import fallito");
    } finally {
      setUploading(false);
    }
  }

  async function doDelete(id) {
    try {
      await CRApi.remove(id);
      const data = await CRApi.list();
      setRows(mapCRDocs(data));
      showToast("success", "Documento eliminato");
    } catch (e) {
      showToast("error", e.message || "Eliminazione fallita");
    } finally {
      setConfirmDel(null);
    }
  }

  async function toggleDefault(id, current) {
    if (current) return;
    try {
      await CRApi.setPredefinito(id);
      showToast("success", "Centrale Rischi impostata come predefinita.");
      const refreshed = await CRApi.list();
      setRows(mapCRDocs(refreshed));
    } catch(e) {
      showToast("error", e.message || "Errore");
    }
  }

  return (
    <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800 animate-fade-in-up">
      {/* HERO SECTION */}
      <section className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 md:p-8 shadow-sm ring-1 ring-slate-100 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 transition-all">
        <div className="flex-1 w-full text-center md:text-left">
          <div className="text-sm text-[#5b63ff] font-semibold uppercase tracking-widest">AREA RISCHI</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Centrale Rischi – Banca d’Italia
          </h1>
          <p className="mt-3 text-[15px] text-slate-500 max-w-2xl leading-relaxed">
            Gestisci l’archivio e monitora la situazione globale d’indebitamento di ogni azienda. 
            Importa un nuovo flusso XML o estratto PDF e lancia un'analisi per ricavare scoring e report.
          </p>
        </div>
        
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <UploadIcon />
            Importa Flusso CR
          </button>
        </div>
      </section>

      {/* SEARCH E STATS HIGHLIGHT */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-200/60 shadow-sm ring-1 ring-slate-100">
        <div className="relative w-full md:w-[360px]">
          <span className="absolute inset-y-0 left-3 grid place-items-center text-slate-400">
            <SearchIcon />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per azienda, periodo, formato…"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#5b63ff] focus:ring-2 focus:ring-[#5b63ff]/20 outline-none transition-all shadow-inner font-medium text-slate-700 placeholder:text-slate-400"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm whitespace-nowrap">
          <div className="px-4 py-2 bg-white border border-slate-200/80 rounded-lg shadow-sm font-medium text-slate-600">
            <span className="text-[#5b63ff] font-bold mr-1">{filtered.length}</span> documenti
          </div>
          <div className="px-5 py-2 bg-gradient-to-r from-slate-50 to-white border border-slate-200/80 rounded-lg shadow-sm font-medium text-slate-600">
            Totale Accordato: <span className="font-bold text-slate-800 ml-1 tracking-tight">{fmtMoney(totalExpo)}</span>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <section className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <Th>Azienda</Th>
                <Th>Periodo Riferimento</Th>
                <Th>Tipo / Formato</Th>
                <Th>Stato Elaborazione</Th>
                <Th className="text-right">Esposizione / Valore</Th>
                <Th>Caricato il</Th>
                <Th className="text-right pr-6">Azioni Rapide</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({length:5}).map((_,i)=>(
                  <tr key={`sk-cr-${i}`} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4"><SkLine w="70%" /></td>
                    <td className="px-6 py-4"><SkLine w="50%" /></td>
                    <td className="px-6 py-4"><SkLine w="40%" /></td>
                    <td className="px-6 py-4"><SkLine w="40%" /></td>
                    <td className="px-6 py-4 flex justify-end"><SkLine w="40%" /></td>
                    <td className="px-6 py-4"><SkLine w="60%" /></td>
                    <td className="px-6 py-4 flex justify-end gap-2"><SkBtn w={40}/><SkBtn w={40}/></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <SearchIcon className="w-8 h-8 opacity-40"/>
                      </div>
                      <p className="font-medium text-base">Nessun documento trovato.</p>
                      <p className="text-sm opacity-75 mt-1">Carica un file XML o PDF per iniziare.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <Td className="font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {r.azienda}
                        {r.predefinito && (
                          <span title="CR Predefinita" className="text-amber-500">
                            <StarIcon className="w-4 h-4" solid={true} />
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="min-w-[200px] text-slate-600 leading-snug">
                      <div className="max-w-[280px] truncate" title={r.periodo}>{r.periodo}</div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Badge tone="slate">{r.tipo}</Badge>
                        <Badge tone={r.formato === "XML" ? "indigo" : "slate"}>{r.formato}</Badge>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={r.stato === "Completo" ? "emerald" : r.stato === "Da Elaborare" ? "amber" : "slate"}>
                        {r.stato}
                      </Badge>
                    </Td>
                    <Td className="text-right font-semibold text-slate-700 tracking-tight">
                      {fmtMoney(r.esposizione)}
                    </Td>
                    <Td className="text-slate-500 whitespace-nowrap">{r.uploadedAt}</Td>
                    <Td className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        
                        {r.stato === "Completo" && (
                          <button
                            className="h-9 px-3.5 rounded-xl border border-[#D8D2FF] bg-[#ECE8FF] text-[#5b63ff] font-semibold hover:bg-[#5b63ff] hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                            onClick={() => navigate(`/analisi-cr/dettaglio/${r.codiceDocumento}`)}
                            title="Analizza Centrale Rischi"
                          >
                            <PlayIcon /> Analizza
                          </button>
                        )}
                        
                        <button
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-all"
                          onClick={() => window.open(r.raw?.path || "#", "_blank")}
                          title="Visualizza Documento"
                        >
                          <EyeIcon />
                        </button>
                        
                        <button
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-all"
                          onClick={() => window.open(r.raw?.path || "#", "_blank")}
                          title="Scarica File"
                        >
                          <DownloadIcon />
                        </button>

                        <button
                          className={`w-9 h-9 flex items-center justify-center rounded-xl shadow-sm transition-all ${r.predefinito ? "text-amber-500 bg-amber-50 border border-amber-200" : "text-slate-400 bg-white border border-slate-200 hover:text-amber-500 hover:bg-slate-50"}`}
                          title={r.predefinito ? "Predefinito" : "Imposta come Predefinito"}
                          onClick={() => toggleDefault(r.id, r.predefinito)}
                        >
                          <StarIcon className="w-4 h-4" solid={r.predefinito} />
                        </button>

                        <button
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm transition-all"
                          onClick={() => setConfirmDel({ id: r.id, label: `${r.azienda} - ${r.periodo}` })}
                          title="Elimina Documento"
                        >
                          <TrashIcon />
                        </button>

                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* TOAST SYSTEM */}
      {toast && (
        <div className={`fixed z-[100] bottom-6 right-6 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-semibold animate-slide-up ${
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

      {/* MODALE IMPORTA CR */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-100 flex flex-col">
            <h3 className="text-xl font-bold text-slate-900">Importa Centrale Rischi</h3>
            <p className="mt-2 text-sm text-slate-500">
              Assicurati di caricare il file nel formato originale rilasciato da Banca d’Italia (.xml, .pdf o .zip).
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Seleziona File *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.xml,.zip"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-1.5 focus:outline-none focus:ring-2 focus:ring-[#5b63ff]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => { setModalOpen(false); setFile(null); }}
                className="h-10 px-5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                onClick={doUpload}
                className="h-10 px-6 rounded-xl font-semibold bg-[#5b63ff] text-white shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={uploading}
              >
                {uploading ? "Caricamento in corso…" : "Carica File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFERMA ELIMINAZIONE */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-100 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrashIcon />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Elimina documento</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Quest’azione è irreversibile e rimuoverà anche tutte le analisi ad esso correlate.
              Sei sicuro di voler eliminare <span className="font-semibold text-slate-800">{confirmDel.label}</span>?
            </p>
            <div className="mt-7 flex gap-3">
              <button
                className="flex-1 h-11 px-4 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                onClick={() => setConfirmDel(null)}
              >
                Annulla
              </button>
              <button
                className="flex-1 h-11 px-4 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-colors"
                onClick={() => doDelete(confirmDel.id)}
              >
                Si, elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Helpers ===== */
function mapCRDocs(docs) {
  let list = Array.isArray(docs) ? docs : (docs?.data ?? []);
  if (Array.isArray(list) && typeof list.flat === "function") list = list.flat(Infinity);
  else if (Array.isArray(list)) list = list.reduce((a, x) => a.concat(x), []);

  const fallbackName = getCompanyName();

  return (list || [])
    .filter(d => String(d.type || "").toLowerCase() === "centrale rischi")
    .map(d => {
      const ext = (d.filename || "").split(".").pop()?.toLowerCase();
      const formato = ext === "xml" ? "XML" : "PDF";
      const stato = (d.status || "").trim() ? ((d.status === "Completato") ? "Completo" : d.status) : "Da Elaborare";
      const periodo = d.availableMonths || "—";

      return {
        id: d.id,
        codiceDocumento: d.codice_documento,
        azienda: d.nome_azienda || fallbackName || "—",
        periodo,
        tipo: "Mensile", 
        formato,
        fonte: "Upload manuale",
        stato,
        esposizione: 0, 
        uploadedAt: fmtDate(d.created_at),
        size: d.sizeReadable || "—",
        predefinito: d.predefinito || false,
        raw: d,
      };
    });
}

function fmtDate(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(String(dt).replace(" ", "T"));
    return d.toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dt; }
}

function Th({ children, className = "" }) {
  return <th className={`px-6 py-4 text-left ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-6 py-4 align-middle ${className}`}>{children}</td>;
}
function Badge({ children, tone = "slate" }) {
  const tones = {
    indigo: "bg-[#F1EFFF] text-[#5b63ff] border-[#D8D2FF]",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}
function fmtMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

