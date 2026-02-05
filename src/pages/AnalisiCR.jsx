import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ================== MINI API ================== */
const API_BASE =  "https://ada-stage.compaynet-b2b.com/api";

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
    // routes.php: Route::get('/getCrDocuments', CentraleRischiController@getDocuments)
    return api("/getCrDocuments");
  },
  upload(file) {
    // routes.php: Route::post('/importCr', CentraleRischiController@store)
    const fd = new FormData();
    // legacy key attesa dal backend:
    fd.append("base64", file);
    return api("/importCr", { method: "POST", isForm: true, body: fd });
  },
  remove(id) {
    // routes.php: Route::delete('/deleteDocument/{idDocument}', ...)
    return api(`/deleteDocument/${id}`, { method: "DELETE" });
  },
};

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
    setTimeout(() => setToast(null), 2600);
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
      // refresh
      const data = await CRApi.list();
      setRows(mapCRDocs(data));
      // reset ui
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[#5b63ff] font-medium">Centrale Rischi</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Documenti Centrale Rischi – Banca d’Italia
          </h1>
          <p className="text-sm text-neutral-500">
            Elenco dei documenti Centrale Rischi caricati. Importa un nuovo file e avvia l’analisi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm hover:opacity-90 flex items-center gap-2"
          >
            <UploadIcon />
            Importa Centrale Rischi
          </button>
        </div>
      </div>

      {/* Ricerca + KPI esposizione totale */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-2 grid place-items-center">
            <SearchIcon />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per azienda, periodo, formato…"
            className="h-9 pl-8 pr-3 rounded-lg border border-neutral-300 text-sm w-[320px]"
          />
        </div>
        <span className="text-sm text-neutral-500">
          {filtered.length} document{filtered.length !== 1 ? "i" : "o"} • Esposizione totale{" "}
          <b>{fmtMoney(totalExpo)}</b>
        </span>
      </div>

      {/* Tabella */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
<table className="w-full max-w-4xl text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <Th>Azienda</Th>
              <Th>Periodo</Th>
              <Th>Tipo</Th>
              <Th>Formato</Th>
              <Th>Fonte</Th>
              <Th>Stato</Th>
              <Th className="text-right">Esposizione Totale</Th>
              <Th>Caricato il</Th>
              <Th>Dimensione</Th>
              <Th className="text-right pr-4">Azioni</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-neutral-500">Caricamento…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-neutral-500">Nessun documento</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-neutral-200">
                  <Td>{r.azienda}</Td>
         <Td className="w-24 min-w-[250px] leading-tight py-2">
  {r.periodo}
</Td>
                  <Td className="whitespace-nowrap"><Badge tone="neutral">{r.tipo}</Badge></Td>
                  <Td className="whitespace-nowrap">
                    <Badge tone={r.formato === "XML" ? "indigo" : "neutral"}>{r.formato}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{r.fonte}</Td>
                  <Td><Badge tone={r.stato === "Completo" ? "teal" : "amber"}>{r.stato}</Badge></Td>
                  <Td className="text-right tabular-nums font-medium">{fmtMoney(r.esposizione)}</Td>
                  <Td className="whitespace-nowrap">{r.uploadedAt}</Td>
                  <Td className="whitespace-nowrap">{r.size}</Td>
                  <Td className="text-right pr-4">
                    <div className="flex items-center justify-end gap-2">

                    {r.stato === "Completo" ? (
  <button
    className="h-8 px-3 rounded-lg bg-[#ECE8FF] text-[#5b63ff] font-medium"
    onClick={() => navigate(`/analisi-cr/dettaglio/${r.codiceDocumento}`)}
  >
    Analizza
  </button>
) : null}

                      <button
                        className="h-8 px-3 rounded-lg border border-neutral-300 hover:bg-neutral-50"
                        onClick={() => window.open(r.raw?.path || "#", "_blank")}
                      >
                        Visualizza
                      </button>
                      <button
                        className="h-8 px-3 rounded-lg bg-neutral-900 text-white hover:opacity-90"
                        onClick={() => window.open(r.raw?.path || "#", "_blank")}
                      >
                        Scarica
                      </button>
                      <button
                        className="h-8 px-3 rounded-lg bg-red-600 text-white hover:opacity-90"
                        onClick={() => setConfirmDel({ id: r.id, label: `${r.azienda} ${r.periodo}` })}
                      >
                        Elimina
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-md text-sm text-white ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* MODALE IMPORT */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg">
            <div className="text-lg font-semibold">Importa Centrale Rischi</div>
            <p className="text-sm text-neutral-500 mt-1">
              Seleziona il file PDF/XML/ZIP della Centrale Rischi di Banca d’Italia.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">File *</label>
                <input
                  type="file"
                  accept=".pdf,.xml,.zip"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setModalOpen(false); setFile(null); }}
                className="h-10 px-4 rounded-lg border border-neutral-200"
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                onClick={doUpload}
                className="h-10 px-4 rounded-lg bg-neutral-900 text-white disabled:opacity-60"
                disabled={uploading}
              >
                {uploading ? "Caricamento…" : "Carica"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFERMA ELIMINAZIONE */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <div className="text-lg font-semibold">Elimina documento</div>
            <p className="text-sm text-neutral-600 mt-2">
              Sei sicuro di voler eliminare <b>{confirmDel.label}</b>?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="h-10 px-4 rounded-lg border border-neutral-200"
                onClick={() => setConfirmDel(null)}
              >
                Annulla
              </button>
              <button
                className="h-10 px-4 rounded-lg bg-red-600 text-white"
                onClick={() => doDelete(confirmDel.id)}
              >
                Elimina
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
  // srotola risposte annidate tipo [[{...}]] o {data:[...]}
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
      // il controller popola availableMonths come stringa "Nov 2024, Dic 2024, ..."
      const periodo = d.availableMonths || "—";

      return {
        id: d.id,
        codiceDocumento: d.codice_documento,
        azienda: d.nome_azienda || fallbackName || "—",
        periodo,
        tipo: "Mensile",                 // se ti serve un campo reale, aggiungilo server-side
        formato,
        fonte: "Upload manuale",         // o "Banca d'Italia" se distingui la fonte
        stato,
        esposizione: 0,                  // valorizzala se hai un campo aggregato
        uploadedAt: fmtDate(d.created_at),
        size: d.sizeReadable || "—",
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
  return <th className={`px-3 py-3 text-left ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-3 align-top ${className}`}>{children}</td>;
}
function Badge({ children, tone = "neutral" }) {
  const tones = {
    indigo: "bg-[#F1EFFF] text-[#5b63ff] border-[#D8D2FF]",
    teal: "bg-teal-100 text-teal-800 border-teal-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${tones[tone]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5m0 0-4 4m4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function fmtMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
