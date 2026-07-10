// src/pages/FactoringFatture.jsx  (sezione "Credito")
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Factoring } from "../lib/api";

/* ===================== UTILS ===================== */
const euro = v => (Number(v)||0).toLocaleString("it-IT",{style:"currency", currency:"EUR"});
const fmtDate = s => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"}); }
  catch { return s; }
};
const isPdf = f => /\.pdf$/i.test(f.name);
const isXml = f => /\.(xml|p7m)$/i.test(f.name);
const ACCEPTED_EXT = ['.xml', '.XML', '.p7m', '.pdf', '.PDF'];

/* ===================== GESTIONALI MOCK ===================== */
const GESTIONALI = [
  { id: "fic",       name: "Fatture in Cloud",   icon: "☁️",  color: "#3B82F6" },
  { id: "aruba",     name: "Aruba PEC",          icon: "📧",  color: "#F97316" },
  { id: "teamsystem",name: "TeamSystem",          icon: "🏢",  color: "#6366F1" },
  { id: "zucchetti", name: "Zucchetti",           icon: "🔧",  color: "#10B981" },
  { id: "sap",       name: "SAP Business One",    icon: "💼",  color: "#1E40AF" },
  { id: "danea",     name: "Danea Easyfatt",      icon: "📊",  color: "#EF4444" },
  { id: "passepartout",name: "Passepartout Mexal", icon: "🎫", color: "#8B5CF6" },
  { id: "wolters",   name: "Wolters Kluwer Arca", icon: "📗",  color: "#059669" },
];

/* ===================== PAGE ===================== */
export default function FactoringFatture() {
  const navigate = useNavigate();

  // Drag & Drop
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const dropRef = useRef(null);

  // Mock gestionale
  const [gestionaleOpen, setGestionaleOpen] = useState(false);
  const [selectedGestionale, setSelectedGestionale] = useState(null);
  const [connectingMock, setConnectingMock] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => { setToast({type,msg}); setTimeout(()=>setToast(null), 3000); };

  /* ---- Drag & Drop handlers ---- */
  const handleDragEnter = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }, []);
  const handleDragOver  = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      ACCEPTED_EXT.some(ext => f.name.endsWith(ext))
    );

    if (droppedFiles.length === 0) {
      showToast("error", "Accettiamo solo file XML o PDF");
      return;
    }

    setFiles(prev => [...prev, ...droppedFiles]);
    setUploadResult(null);
  }, []);

  const handleFileInput = useCallback((e) => {
    const selected = Array.from(e.target.files).filter(f =>
      ACCEPTED_EXT.some(ext => f.name.endsWith(ext))
    );
    if (selected.length) {
      setFiles(prev => [...prev, ...selected]);
      setUploadResult(null);
    }
    e.target.value = ""; // reset
  }, []);

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  /* ---- Upload ---- */
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      // Separa file per tipo
      const xmlFiles = files.filter(isXml);
      const pdfFiles = files.filter(isPdf);

      // Upload parallelo per tipo
      const promises = [];
      if (xmlFiles.length > 0) promises.push(Factoring.uploadXml(xmlFiles));
      if (pdfFiles.length > 0) promises.push(Factoring.uploadPdf(pdfFiles));

      const results = await Promise.all(promises);

      // Merge risultati
      const merged = results.reduce((acc, r) => ({
        success:  (acc.success || 0) + (r.success || 0),
        errors:   (acc.errors || 0) + (r.errors || 0),
        results:  [...(acc.results || []), ...(r.results || [])],
        failures: [...(acc.failures || []), ...(r.failures || [])],
      }), { success: 0, errors: 0, results: [], failures: [] });

      setUploadResult(merged);
      setFiles([]);
      showToast("success", `${merged.success} fattur${merged.success !== 1 ? "e" : "a"} importat${merged.success !== 1 ? "e" : "a"} con successo`);
    } catch (err) {
      showToast("error", err.message || "Errore durante il caricamento");
    } finally {
      setUploading(false);
    }
  };

  /* ---- Mock gestionale connect ---- */
  const handleConnectGestionale = async (g) => {
    setSelectedGestionale(g);
    setConnectingMock(true);
    // Simula connessione
    await new Promise(r => setTimeout(r, 1500));
    setConnectingMock(false);
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="rounded-2xl overflow-hidden" style={{
        background: "linear-gradient(135deg, #0c4a6e 0%, #075985 40%, #0369a1 100%)",
        position: "relative",
      }}>
        <div style={{position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(56,189,248,0.12)", filter:"blur(40px)"}}/>
        <div style={{position:"absolute", bottom:-30, left:80, width:140, height:140, borderRadius:"50%", background:"rgba(14,165,233,0.1)", filter:"blur(50px)"}}/>

        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{background:"rgba(255,255,255,0.12)", color:"#bae6fd"}}>
                <InvoiceIcon/> Caricamento Fatture
              </div>
              <h1 className="mt-4 text-3xl font-bold text-white tracking-tight">Importa Fatture</h1>
              <p className="mt-2 text-sky-200 max-w-lg text-sm leading-relaxed">
                Carica le fatture elettroniche in formato XML o PDF per estrarre automaticamente i dati
                e creare l'anagrafica dei tuoi clienti. I PDF vengono analizzati con AI.
              </p>
            </div>
            <button
              onClick={() => navigate("/credito/clienti")}
              className="h-10 px-5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200"
              style={{background:"rgba(255,255,255,0.15)", color:"#e0f2fe", border:"1px solid rgba(255,255,255,0.2)"}}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            >
              <UsersIcon/> Vedi Clienti
            </button>
          </div>
        </div>
      </section>

      {/* DUE COLONNE: Drag&Drop + Gestionale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLONNA 1: DRAG & DROP */}
        <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg grid place-items-center" style={{background:"linear-gradient(135deg,#0ea5e9,#0284c7)"}}>
                <UploadIcon className="text-white"/>
              </div>
              <div>
                <div className="font-semibold text-neutral-900">Carica Fatture</div>
                <div className="text-xs text-neutral-500">XML o PDF — Drag & drop o seleziona file</div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed transition-all duration-300 ${
                dragActive
                  ? "border-sky-400 bg-sky-50 scale-[1.01]"
                  : "border-neutral-300 hover:border-sky-300 bg-neutral-50/50"
              }`}
              style={{minHeight: 200}}
            >
              <label className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer h-full">
                <input
                  type="file"
                  multiple
                  accept=".xml,.XML,.p7m,.pdf,.PDF"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <div className={`w-16 h-16 rounded-2xl grid place-items-center transition-all duration-300 ${
                  dragActive ? "bg-sky-100 scale-110" : "bg-neutral-100"
                }`}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={`transition ${dragActive ? "text-sky-600" : "text-neutral-400"}`}>
                    <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17v2a3 3 0 003 3h14a3 3 0 003-3v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-center">
                  <div className={`font-medium transition ${dragActive ? "text-sky-700" : "text-neutral-700"}`}>
                    {dragActive ? "Rilascia i file qui" : "Trascina qui i file XML o PDF"}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    oppure <span className="text-sky-600 underline">clicca per selezionare</span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-2">
                    Formati accettati: .xml (FatturaPA), .p7m, .pdf
                  </div>
                </div>
              </label>

              {/* Animated border on drag */}
              {dragActive && (
                <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
                  background: "linear-gradient(90deg, transparent 33%, rgba(14,165,233,0.1) 50%, transparent 67%)",
                  backgroundSize: "300% 100%",
                  animation: "shimmer 1.5s infinite linear",
                }}/>
              )}
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">File selezionati ({files.length})</div>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
                    {isPdf(f) ? <PdfIcon/> : <XmlIcon/>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-800 truncate">{f.name}</span>
                        {isPdf(f) && <AiBadge/>}
                      </div>
                      <div className="text-xs text-neutral-400">{(f.size/1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={() => removeFile(i)} className="w-6 h-6 rounded hover:bg-neutral-200 grid place-items-center text-neutral-400 hover:text-red-500 transition">
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 mt-3"
                  style={{background:"linear-gradient(135deg,#0284c7,#0ea5e9)"}}
                >
                  {uploading ? (
                    <><Spinner/> Elaborazione in corso…</>
                  ) : (
                    <><UploadIcon/> Carica {files.length} file</>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* COLONNA 2: COLLEGA GESTIONALE (MOCK) */}
        <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg grid place-items-center" style={{background:"linear-gradient(135deg,#6366f1,#4f46e5)"}}>
                <LinkIcon className="text-white"/>
              </div>
              <div>
                <div className="font-semibold text-neutral-900">Collega Gestionale</div>
                <div className="text-xs text-neutral-500">Importa automaticamente le fatture</div>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {GESTIONALI.map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGestionale(g);
                    setGestionaleOpen(true);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl grid place-items-center text-lg flex-shrink-0 transition-transform group-hover:scale-110" style={{background: g.color + "15"}}>
                    {g.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-neutral-800 truncate">{g.name}</div>
                    <div className="text-xs text-neutral-400">Connetti</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* RISULTATO UPLOAD */}
      {uploadResult && (
        <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden" style={{animation:"slideUp .3s ease"}}>
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="font-semibold text-neutral-900">Risultato Importazione</div>
            <div className="flex items-center gap-3">
              {uploadResult.success > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ {uploadResult.success} importat{uploadResult.success !== 1 ? "e" : "a"}
                </span>
              )}
              {uploadResult.errors > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                  ✕ {uploadResult.errors} error{uploadResult.errors !== 1 ? "i" : "e"}
                </span>
              )}
            </div>
          </div>

          {/* Tabella risultati */}
          {uploadResult.results?.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Fonte</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Cliente Estratto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">P.IVA</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Cedente</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Fatture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {uploadResult.results.map((r, i) => (
                    <tr key={i} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {r.source === 'AI' ? <PdfIcon/> : <XmlIcon/>}
                          <span className="text-neutral-700 font-medium truncate max-w-[180px]">{r.file}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.source === 'AI' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                            <AiSparkle/> AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            XML
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{r.client}</td>
                      <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{r.client_piva}</td>
                      <td className="px-4 py-3 text-neutral-500">{r.cedente || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-sky-50 text-sky-700 border border-sky-200">
                          {r.invoices_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Errori */}
          {uploadResult.failures?.length > 0 && (
            <div className="px-5 py-4 border-t border-neutral-100">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Errori</div>
              {uploadResult.failures.map((f, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 mb-2 text-sm">
                  <span className="text-red-500 flex-shrink-0 mt-0.5">⚠</span>
                  <div>
                    <div className="font-medium text-red-800">{f.file}</div>
                    <div className="text-red-600 text-xs">{f.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50/50">
            <button
              onClick={() => navigate("/credito/clienti")}
              className="h-10 px-5 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition"
              style={{background:"linear-gradient(135deg,#4338ca,#6366f1)"}}
            >
              <UsersIcon/> Vai ai Clienti per Valutazione
            </button>
          </div>
        </section>
      )}

      {/* MODALE GESTIONALE MOCK */}
      {gestionaleOpen && selectedGestionale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4" onClick={()=>!connectingMock && setGestionaleOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()} style={{animation:"scaleIn .2s ease"}}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto grid place-items-center text-3xl mb-4" style={{background: selectedGestionale.color + "15"}}>
                {selectedGestionale.icon}
              </div>
              <div className="text-xl font-semibold text-neutral-900">{selectedGestionale.name}</div>

              {connectingMock ? (
                <div className="mt-6 space-y-3">
                  <div className="w-10 h-10 border-3 border-neutral-200 rounded-full mx-auto animate-spin" style={{borderTopColor: selectedGestionale.color}}/>
                  <div className="text-sm text-neutral-500">Connessione in corso…</div>
                </div>
              ) : selectedGestionale._connected ? (
                <div className="mt-6 space-y-3">
                  <div className="text-4xl">✅</div>
                  <div className="text-sm text-emerald-600 font-medium">Collegato con successo!</div>
                  <div className="text-xs text-neutral-500">Le fatture verranno importate automaticamente.</div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Collega il tuo account <strong>{selectedGestionale.name}</strong> per importare
                    automaticamente le fatture emesse e ricevute.
                  </p>

                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 text-lg">🚧</span>
                      <div>
                        <div className="text-sm font-semibold text-amber-800">Funzionalità in arrivo</div>
                        <div className="text-xs text-amber-700 mt-0.5">
                          L'integrazione con {selectedGestionale.name} sarà disponibile prossimamente.
                          Per ora puoi caricare i file XML manualmente.
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await handleConnectGestionale(selectedGestionale);
                      // Show "coming soon" state
                    }}
                    disabled
                    className="w-full h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                    style={{background: selectedGestionale.color}}
                  >
                    Collega {selectedGestionale.name}
                  </button>
                </div>
              )}

              <button
                onClick={() => setGestionaleOpen(false)}
                className="mt-4 h-9 px-4 rounded-lg border border-neutral-200 text-sm hover:bg-neutral-50 transition"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg text-sm text-white z-50 ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
        }`} style={{animation:"slideUp .3s ease"}}>{toast.msg}</div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { to { background-position: -300% 0; } }
      `}</style>
    </div>
  );
}

/* ===================== ICONS ===================== */
function UploadIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m0 0L8 7m4-4l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function InvoiceIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 3v6h6M8 13h8M8 17h8M8 9h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function UsersIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M2 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function LinkIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function XmlIcon(){return(<div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 grid place-items-center flex-shrink-0"><span className="text-[10px] font-bold text-sky-600">XML</span></div>);}
function PdfIcon(){return(<div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 grid place-items-center flex-shrink-0"><span className="text-[10px] font-bold text-red-500">PDF</span></div>);}
function AiBadge(){return(<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 flex-shrink-0"><AiSparkle/> AI</span>);}
function AiSparkle(){return(<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l1.5 5.5L16 8l-6.5 2.5L8 16l-1.5-5.5L0 8l6.5-2.5z"/></svg>);}
function Spinner(){return(<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>);}
