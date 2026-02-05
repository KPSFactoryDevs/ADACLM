import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ========== MINI API CLIENT LOCALE (puoi spostarlo in src/lib/api.js) ========== */
const API_BASE =  "https://ada-stage.compaynet-b2b.com/api";

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

  // Gestisci “failed to fetch” a monte (CORS/https)
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }

  if (!res.ok) {
    const msg = (data && (data.message || data.errors)) || "Errore di rete";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

const Bilanci = {
  // Restituisce i documenti legati alla company corrente (il backend filtra da header)
  async listDocuments() {
    return api("/getBilanciDocuments", { method: "GET" });
  },
  // Upload iniziale (come nel vecchio js: /recapBilancio)
  async upload({ file, forma_giuridica, tipo_azienda }) {
    const fd = new FormData();
    // attenzione: nel vecchio componente inviavano due volte "base64" (file e nome),
    // qui inviamo "file" + "filename" in modo pulito. Se il backend si aspetta "base64", rimappa qui sotto.
    fd.append("file", file);
    fd.append("filename", file.name);
    fd.append("forma_giuridica", forma_giuridica);
    fd.append("tipo_azienda", tipo_azienda);

    // Se il backend vuole "base64" come chiave (come nel legacy):
     fd.append("base64", file);
     fd.append("base64", file.name);

    return api("/recapBilancio", { method: "POST", isForm: true, body: fd });
  },
  // Settori per il select
  async getSettori() {
    return api("/getSettori", { method: "GET", auth: false }); // se è pubblico; altrimenti true
  },
};

/* ======================= COMPONENTE PRINCIPALE ======================= */

export default function AnalisiBilancio() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]); // lista documenti dal backend
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // {type:'success'|'error', msg:string}
  const [modalOpen, setModalOpen] = useState(false);

  const navigate = useNavigate();

  // Per il modulo nella modale
  const [file, setFile] = useState(null);
  const [formaGiuridica, setFormaGiuridica] = useState("");
  const [tipoAzienda, setTipoAzienda] = useState("");
  const [settori, setSettori] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Carica la lista dei bilanci all’avvio (per la company selezionata)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await Bilanci.listDocuments();
        // data: assumo array di documenti dal backend
        setRows(mapDocumentsToRows(data));
      } catch (e) {
        showToast("error", e.message || "Errore nel recupero dei bilanci");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Preleva i settori quando apro la modale
  useEffect(() => {
    if (!modalOpen) return;
    (async () => {
      try {
        const s = await Bilanci.getSettori();
        setSettori(s);
      } catch (e) {
        // Ignora: mostro il select vuoto o un messaggio
        console.error("getSettori failed:", e);
      }
    })();
  }, [modalOpen]);

  // Ricerca
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

  // Helpers
  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2600);
  }

  function currentCompanyName() {
    try { return JSON.parse(localStorage.getItem("sb_company"))?.ragione_sociale || ""; }
    catch { return ""; }
  }

  function mapDocumentsToRows(docs) {
  // Estrai l'array reale
  let list = Array.isArray(docs) ? docs : (docs?.data ?? []);
  // Appiattisci se annidato (es. [[{...}]])
  if (Array.isArray(list) && typeof list.flat === "function") {
    list = list.flat(Infinity);
  } else if (Array.isArray(list)) {
    // fallback senza flat()
    list = list.reduce((acc, x) => acc.concat(x), []);
  }

  const companyNameFallback = currentCompanyName();

  return list
    .filter(d => String(d.type || "").toLowerCase() === "bilancio") // tieni solo i bilanci
    .map(d => {
      const esercizio = d.anno_fine || d.anno_inizio || "";
      const periodo = d.anno_inizio && d.anno_fine ? `${d.anno_inizio} – ${d.anno_fine}` : "";
      const formato = (d.filename || "").toLowerCase().endsWith(".xbrl") ? "XBRL" : "PDF";

      // status di default
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

    // 🔁 Ricarica elenco dalla API che lista i documenti della company
    const refreshed = await Bilanci.listDocuments();
    setRows(mapDocumentsToRows(refreshed)); // <--- usa la nuova normalizzazione

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[#5b63ff] font-medium">Bilanci</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Tutti i Bilanci</h1>
          <p className="text-sm text-neutral-500">
            Elenco dei bilanci caricati e pronti per l’analisi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Importa bilancio -> apre modale */}
          <button
            onClick={() => setModalOpen(true)}
            className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm hover:opacity-90 flex items-center gap-2"
          >
            <UploadIcon />
            Importa bilancio
          </button>
        </div>
      </div>

      {/* Barra ricerca / filtri leggera */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-2 grid place-items-center">
            <SearchIcon />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per azienda, esercizio, formato…"
            className="h-9 pl-8 pr-3 rounded-lg border border-neutral-300 text-sm w-[320px]"
          />
        </div>
        <span className="text-sm text-neutral-500">
          {filtered.length} bilancio{filtered.length !== 1 ? "i" : ""} trovati
        </span>
      </div>

      {/* Tabella */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-700">
            <tr>
              <Th>Azienda</Th>
              <Th>Esercizio</Th>
              <Th>Periodo</Th>
              <Th>Formato</Th>
              <Th>Fonte</Th>
              <Th>Stato</Th>
              <Th>Caricato il</Th>
              <Th>Dimensione</Th>
              <Th className="text-right pr-4">Azioni</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-neutral-500">Caricamento…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-neutral-500">Nessun bilancio</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-neutral-200">
                  <Td>{r.azienda}</Td>
                  <Td className="whitespace-nowrap">{r.esercizio}</Td>
                  <Td className="whitespace-nowrap">{r.periodo}</Td>
                  <Td>
                    <Badge tone={r.formato === "XBRL" ? "indigo" : "neutral"}>{r.formato}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{r.fonte}</Td>
                  <Td>
                    <Badge tone={r.stato === "Completo" ? "teal" : "amber"}>{r.stato}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{r.uploadedAt}</Td>
                  <Td className="whitespace-nowrap">{r.size}</Td>
                  <Td className="text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="h-8 px-3 rounded-lg bg-[#ECE8FF] text-[#5b63ff] font-medium"
                        onClick={() => navigate(`/analisi-bilancio/${r.id}`)}
                      >
                        Analizza
                      </button>
         
                      <button
                        className="h-8 px-3 rounded-lg bg-neutral-900 text-white hover:opacity-90"
                        onClick={() => window.open(r.raw?.path || "#", "_blank")}
                      >
                        Scarica
                      </button>
                      <button
                        className="h-8 px-3 rounded-lg bg-red-600 text-white hover:opacity-90"
                        onClick={() => alert(`Elimina id ${r.id} (implementa DELETE /bilancio/:id)`)}
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
            <div className="text-lg font-semibold">Importa bilancio</div>
            <p className="text-sm text-neutral-500 mt-1">
              Seleziona il file XBRL/PDF e completa i campi richiesti.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">File bilancio *</label>
                <input
                  type="file"
                  accept=".xbrl,.xml,.pdf,.zip"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Forma giuridica *</label>
                <select
                  className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm"
                  value={formaGiuridica}
                  onChange={(e) => setFormaGiuridica(e.target.value)}
                >
                  <option value="" hidden>Seleziona la forma giuridica</option>
                  <option value="DITTA INDIVIDUALE">DITTA INDIVIDUALE</option>
                  <option value="SOCIETA A RESPONSABILITA LIMITATA SRL">SOCIETA A RESPONSABILITA LIMITATA SRL</option>
                  <option value="SOCIETA IN NOME COLLETTIVO SNC">SOCIETA IN NOME COLLETTIVO SNC</option>
                  <option value="SOCIETA IN ACCOMANDITA SEMPLICE SAS">SOCIETA IN ACCOMANDITA SEMPLICE SAS</option>
                  <option value="SOCIETA PER AZIONI SPA">SOCIETA PER AZIONI SPA</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Tipo azienda *</label>
                <select
                  className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm"
                  value={tipoAzienda}
                  onChange={(e) => setTipoAzienda(e.target.value)}
                >
                  <option value="" hidden>Seleziona il tipo di azienda</option>
                  {/* Industria */}
                  {settori?.Industria && Object.keys(settori.Industria).map((k, i) => (
                    <option key={`ind-${i}`} value={k}>{k}</option>
                  ))}
                  {/* Commercio */}
                  {settori?.Commercio && Object.keys(settori.Commercio).map((k, i) => (
                    <option key={`com-${i}`} value={k}>{k}</option>
                  ))}
                  {/* Servizi */}
                  {settori?.Servizi && Object.keys(settori.Servizi).map((k, i) => (
                    <option key={`srv-${i}`} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setModalOpen(false); setFile(null); setFormaGiuridica(""); setTipoAzienda(""); }}
                className="h-10 px-4 rounded-lg border border-neutral-200"
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                onClick={handleUpload}
                className="h-10 px-4 rounded-lg bg-neutral-900 text-white disabled:opacity-60"
                disabled={uploading}
              >
                {uploading ? "Caricamento…" : "Carica"}
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
