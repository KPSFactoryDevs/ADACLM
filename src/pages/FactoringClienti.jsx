// src/pages/FactoringClienti.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Factoring } from "../lib/api";

/* ===================== UTILS ===================== */
const euro = v => (Number(v)||0).toLocaleString("it-IT",{style:"currency", currency:"EUR"});
const abbr = (name="") => {
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0]||"") + (parts[1]?.[0]||"");
};

/* ===================== PAGE ===================== */
export default function FactoringClienti() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modali
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalClient, setEvalClient] = useState(null);
  const [evalNotes, setEvalNotes] = useState("");
  const [evalSending, setEvalSending] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState(null);

  // Upload documento per un client (bilancio/cr)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClient, setUploadClient] = useState(null);
  const [uploadType, setUploadType] = useState("bilancio");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Filtri
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("nome");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const showToast = (type, msg) => { setToast({type,msg}); setTimeout(()=>setToast(null), 3000); };

  // Fetch
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await Factoring.listClients();
        setRows(Array.isArray(data) ? data : (data?.data || []));
      } catch (e) {
        showToast("error", e.message || "Impossibile caricare clienti");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtro e sort
  const filtered = useMemo(() => {
    let arr = rows.filter(c => {
      const s = search.trim().toLowerCase();
      return !s || [c.nome, c.piva, c.regione, c.citta, c.email].some(f => String(f||"").toLowerCase().includes(s));
    });
    arr.sort((a,b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = String(a[sortKey]||"").toLowerCase();
      const vb = String(b[sortKey]||"").toLowerCase();
      return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
    });
    return arr;
  }, [rows, search, sortKey, sortDir]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(page, pageCount);
  const slice = filtered.slice((pageSafe-1)*perPage, pageSafe*perPage);

  useEffect(() => { setPage(1); }, [search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Invio per valutazione
  async function submitEvaluation(e) {
    e.preventDefault();
    setEvalSending(true);
    try {
      await Factoring.sendForEvaluation(evalClient?.id, evalNotes);
      setEvalOpen(false);
      // Aggiorna stato locale
      setRows(prev => prev.map(c => c.id === evalClient.id ? {...c, evaluation_status: "pending", evaluation_sent_at: new Date().toISOString()} : c));
      showToast("success", `Valutazione inviata per ${evalClient?.nome}`);
    } catch (err) {
      showToast("error", err.message || "Errore invio valutazione");
    } finally {
      setEvalSending(false);
    }
  }

  // Upload documento
  async function submitUpload(e) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      await Factoring.uploadDocument(uploadClient.id, uploadFile, uploadType);
      setUploadOpen(false);
      setUploadFile(null);
      // Refresh
      const data = await Factoring.listClients();
      setRows(Array.isArray(data) ? data : (data?.data || []));
      showToast("success", `${uploadType === "bilancio" ? "Bilancio" : "Centrale Rischi"} caricato`);
    } catch (err) {
      showToast("error", err.message || "Errore caricamento documento");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="rounded-2xl overflow-hidden" style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)",
        position: "relative",
      }}>
        {/* Decorative elements */}
        <div style={{position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(99,102,241,0.15)", filter:"blur(40px)"}}/>
        <div style={{position:"absolute", bottom:-30, left:60, width:160, height:160, borderRadius:"50%", background:"rgba(129,140,248,0.12)", filter:"blur(50px)"}}/>

        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{background:"rgba(255,255,255,0.12)", color:"#c7d2fe"}}>
                <FactoringIcon/> Cessione del Credito
              </div>
              <h1 className="mt-4 text-3xl font-bold text-white tracking-tight">Clienti per Valutazione</h1>
              <p className="mt-2 text-indigo-200 max-w-lg text-sm leading-relaxed">
                Vuoi vendere le tue fatture? Invia i tuoi clienti per valutazione al fondo:
                se approvati, puoi inviare le loro fatture per la vendita <strong className="text-white">entro 48 ore</strong>.
              </p>
            </div>
            <button
              onClick={() => navigate("/factoring/fatture")}
              className="h-10 px-5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200"
              style={{background:"rgba(255,255,255,0.15)", color:"#e0e7ff", border:"1px solid rgba(255,255,255,0.2)", backdropFilter:"blur(8px)"}}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            >
              <InvoiceIcon/> Carica Fatture XML
            </button>
          </div>

          {/* Mini stats */}
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[
              {label: "Totale Clienti", value: rows.length, icon: "👥"},
              {label: "Con Fatture", value: rows.filter(c=>c.has_invoices).length, icon: "📄"},
              {label: "In Valutazione", value: rows.filter(c=>c.evaluation_status==="pending").length, icon: "⏳"},
              {label: "Approvati", value: rows.filter(c=>c.evaluation_status==="approved").length, icon: "✅"},
            ].map((s,i) => (
              <div key={i} className="rounded-xl p-3" style={{background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)"}}>
                <div className="text-lg">{s.icon}</div>
                <div className="text-2xl font-bold text-white mt-1">{s.value}</div>
                <div className="text-xs text-indigo-300 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTRI */}
      <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per nome, P.IVA, città…"
              className="h-10 w-full rounded-lg border border-neutral-200 pl-9 pr-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon/></div>
          </div>

          <div className="ml-auto text-sm text-neutral-500">
            {total} client{total !== 1 ? "i" : "e"} trovati
          </div>
        </div>
      </section>

      {/* TABELLA */}
      <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
              <tr>
                <SortTh k="nome" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Cliente</SortTh>
                <SortTh k="piva" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>P. IVA</SortTh>
                <SortTh k="citta" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Città</SortTh>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                Array.from({length:6}).map((_,i)=>(
                  <tr key={i}>
                    <td className="px-4 py-3"><SkLine w={140}/></td>
                    <td className="px-4 py-3"><SkLine w={100}/></td>
                    <td className="px-4 py-3"><SkLine w={80}/></td>
                    <td className="px-4 py-3"><SkLine w={120}/></td>
                    <td className="px-4 py-3"><SkLine w={90}/></td>
                    <td className="px-4 py-3"><SkLine w={100}/></td>
                  </tr>
                ))
              ) : slice.length ? slice.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/60 transition-colors">
                  {/* Nome */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 grid place-items-center text-xs font-semibold text-white" style={{background:"linear-gradient(135deg,#4f46e5,#6366f1)"}}>
                        {abbr(c.nome)}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-900">{c.nome}</div>
                        {c.email && <div className="text-xs text-neutral-400">{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  {/* PIVA */}
                  <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{c.piva}</td>
                  {/* Città */}
                  <td className="px-4 py-3 text-neutral-600">
                    {c.citta || "—"}
                    {c.regione && <span className="text-neutral-400 text-xs"> ({c.regione})</span>}
                  </td>
                  {/* Score tricolore */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ScoreIcon
                        label="Fatture"
                        icon="📄"
                        status={c.has_invoices ? "green" : "gray"}
                        tooltip={c.has_invoices ? `${c.invoices_count || 0} fatture caricate` : "Nessuna fattura"}
                      />
                      <ScoreIcon
                        label="Bilancio"
                        icon="📊"
                        status={c.has_bilancio ? (Number(c.bilancio_score) >= 8 ? "green" : "red") : "gray"}
                        tooltip={c.has_bilancio ? `Score: ${c.bilancio_score}/10` : "Non caricato"}
                      />
                      <ScoreIcon
                        label="CR"
                        icon="📈"
                        status={c.has_cr ? (Number(c.cr_score) >= 8 ? "green" : "red") : "gray"}
                        tooltip={c.has_cr ? `Score: ${c.cr_score}/10` : "Non caricata"}
                      />
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <EvalPill status={c.evaluation_status}/>
                  </td>
                  {/* Azioni */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setUploadClient(c);
                          setUploadType("bilancio");
                          setUploadFile(null);
                          setUploadOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg border border-neutral-200 text-xs hover:bg-neutral-50 transition flex items-center gap-1"
                        title="Carica documento"
                      >
                        <UploadIcon/> Documenti
                      </button>
                      <button
                        onClick={() => {
                          setDetailClient(c);
                          setDetailOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg border border-neutral-200 text-xs hover:bg-neutral-50 transition"
                      >
                        Dettagli
                      </button>
                      {c.evaluation_status !== "pending" && (
                        <button
                          onClick={() => {
                            setEvalClient(c);
                            setEvalNotes("");
                            setEvalOpen(true);
                          }}
                          className="h-8 px-3 rounded-lg text-xs text-white flex items-center gap-1.5 transition-all duration-200"
                          style={{background:"linear-gradient(135deg,#4f46e5,#6366f1)"}}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                          <SendIcon/> Invia per valutazione
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-neutral-400">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="font-medium">Nessun cliente trovato</div>
                    <div className="text-sm mt-1">Carica delle fatture XML per creare automaticamente i clienti</div>
                    <button
                      onClick={() => navigate("/factoring/fatture")}
                      className="mt-4 h-9 px-4 rounded-lg text-sm text-white"
                      style={{background:"linear-gradient(135deg,#4f46e5,#6366f1)"}}
                    >
                      Carica Fatture
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > perPage && (
          <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between text-sm">
            <div className="text-neutral-500">
              {(pageSafe-1)*perPage+1}–{Math.min(pageSafe*perPage, total)} di {total}
            </div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50 transition" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={pageSafe===1}>
                ‹ Prec
              </button>
              <span className="text-neutral-600">Pag. {pageSafe}/{pageCount}</span>
              <button className="h-8 px-3 rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50 transition" onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={pageSafe===pageCount}>
                Succ ›
              </button>
            </div>
          </div>
        )}
      </section>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg text-sm text-white z-50 transition-all duration-300 ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
        }`} style={{animation:"slideUp .3s ease"}}>{toast.msg}</div>
      )}

      {/* MODALE INVIO VALUTAZIONE */}
      {evalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4" onClick={()=>!evalSending && setEvalOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()} style={{animation:"scaleIn .2s ease"}}>
            <div className="p-6" style={{background:"linear-gradient(135deg,#4338ca,#6366f1)"}}>
              <div className="text-white text-lg font-semibold">Invia per Valutazione</div>
              <div className="text-indigo-200 text-sm mt-1">
                Cliente: <strong className="text-white">{evalClient?.nome}</strong>
              </div>
            </div>
            <form onSubmit={submitEvaluation} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700">Note per il valutatore</label>
                <textarea
                  className="mt-1.5 w-full min-h-[100px] rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none"
                  placeholder="Inserisci eventuali dettagli utili per la valutazione…"
                  value={evalNotes}
                  onChange={e => setEvalNotes(e.target.value)}
                />
              </div>

              {/* Riepilogo documenti allegati */}
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Documenti che verranno allegati</div>
                <div className="space-y-1.5">
                  <DocRow label="Fatture" present={evalClient?.has_invoices} count={evalClient?.invoices_count}/>
                  <DocRow label="Bilancio" present={evalClient?.has_bilancio} score={evalClient?.bilancio_score}/>
                  <DocRow label="Centrale Rischi" present={evalClient?.has_cr} score={evalClient?.cr_score}/>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" disabled={evalSending} onClick={()=>setEvalOpen(false)}
                  className="h-10 px-4 rounded-lg border border-neutral-200 text-sm hover:bg-neutral-50 transition">
                  Annulla
                </button>
                <button disabled={evalSending}
                  className="h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-all duration-200 disabled:opacity-60"
                  style={{background:"linear-gradient(135deg,#4338ca,#6366f1)"}}>
                  {evalSending ? (
                    <><Spinner/> Invio in corso…</>
                  ) : (
                    <><SendIcon/> Invia Email</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DETTAGLI */}
      {detailOpen && detailClient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4" onClick={()=>setDetailOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()} style={{animation:"scaleIn .2s ease"}}>
            <div className="p-6 flex items-center justify-between border-b border-neutral-100">
              <div>
                <div className="text-lg font-semibold">{detailClient.nome}</div>
                <div className="text-sm text-neutral-500">{detailClient.piva}</div>
              </div>
              <button onClick={()=>setDetailOpen(false)} className="w-8 h-8 rounded-lg hover:bg-neutral-100 grid place-items-center transition">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5">
              <InfoCard label="Regione" value={detailClient.regione}/>
              <InfoCard label="Città" value={detailClient.citta}/>
              <InfoCard label="Email" value={detailClient.email}/>
              <InfoCard label="Fatturato" value={detailClient.fatturato ? euro(detailClient.fatturato) : null}/>
              <div className="col-span-2">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Score Documenti</div>
                <div className="flex gap-3">
                  <ScoreBadgeLarge icon="📄" label="Fatture" present={detailClient.has_invoices} count={detailClient.invoices_count}/>
                  <ScoreBadgeLarge icon="📊" label="Bilancio" present={detailClient.has_bilancio} score={detailClient.bilancio_score}/>
                  <ScoreBadgeLarge icon="📈" label="CR" present={detailClient.has_cr} score={detailClient.cr_score}/>
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Stato Valutazione</div>
                <EvalPill status={detailClient.evaluation_status} large/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE UPLOAD DOCUMENTO */}
      {uploadOpen && uploadClient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4" onClick={()=>!uploading && setUploadOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()} style={{animation:"scaleIn .2s ease"}}>
            <div className="p-5 border-b border-neutral-100">
              <div className="text-lg font-semibold">Carica Documento</div>
              <div className="text-sm text-neutral-500 mt-0.5">Per: <strong>{uploadClient.nome}</strong></div>
            </div>
            <form onSubmit={submitUpload} className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700">Tipo documento</label>
                <div className="mt-2 flex gap-2">
                  {[{v:"bilancio",l:"📊 Bilancio"},{v:"cr",l:"📈 Centrale Rischi"}].map(t => (
                    <button key={t.v} type="button"
                      onClick={() => setUploadType(t.v)}
                      className={`flex-1 h-10 rounded-lg border text-sm font-medium transition ${
                        uploadType === t.v
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >{t.l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700">File</label>
                <div className="mt-1.5">
                  <label className="flex items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-neutral-300 hover:border-indigo-400 cursor-pointer transition bg-neutral-50 hover:bg-indigo-50/30">
                    <input type="file" className="hidden" accept=".pdf,.xbrl,.xml,.xlsx" onChange={e => setUploadFile(e.target.files[0])}/>
                    {uploadFile ? (
                      <div className="text-sm text-neutral-700 flex items-center gap-2">
                        <FileIcon/> {uploadFile.name}
                        <span className="text-neutral-400">({(uploadFile.size/1024).toFixed(0)} KB)</span>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400 flex items-center gap-2">
                        <UploadIcon/> Clicca per selezionare il file
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" disabled={uploading} onClick={()=>setUploadOpen(false)}
                  className="h-10 px-4 rounded-lg border border-neutral-200 text-sm hover:bg-neutral-50 transition">
                  Annulla
                </button>
                <button disabled={uploading || !uploadFile}
                  className="h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
                  style={{background:"linear-gradient(135deg,#4338ca,#6366f1)"}}>
                  {uploading ? <><Spinner/> Caricamento…</> : "Carica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global styles for animations */}
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ===================== COMPONENTS ===================== */

function ScoreIcon({ label, icon, status, tooltip }) {
  const colors = {
    green: { bg: "#dcfce7", border: "#86efac", dot: "#16a34a" },
    red:   { bg: "#fee2e2", border: "#fca5a5", dot: "#dc2626" },
    gray:  { bg: "#f1f5f9", border: "#e2e8f0", dot: "#94a3b8" },
  };
  const c = colors[status] || colors.gray;

  return (
    <div title={`${label}: ${tooltip}`}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-default transition-transform hover:scale-105"
      style={{background: c.bg, border: `1px solid ${c.border}`}}>
      <span>{icon}</span>
      <span className="w-2 h-2 rounded-full" style={{background: c.dot}}/>
    </div>
  );
}

function ScoreBadgeLarge({ icon, label, present, score, count }) {
  let status = "gray", detail = "Non caricato";
  if (present) {
    if (score !== undefined && score !== null) {
      status = Number(score) >= 8 ? "green" : "red";
      detail = `Score: ${score}/10`;
    } else if (count !== undefined) {
      status = "green";
      detail = `${count} caricate`;
    } else {
      status = "green";
      detail = "Caricato";
    }
  }

  const colors = {
    green: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
    red:   { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
    gray:  { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" },
  };
  const c = colors[status];

  return (
    <div className="flex-1 rounded-xl p-3 text-center" style={{background: c.bg, border: `1px solid ${c.border}`}}>
      <div className="text-xl">{icon}</div>
      <div className="text-sm font-semibold mt-1" style={{color: c.text}}>{label}</div>
      <div className="text-xs mt-0.5" style={{color: c.text, opacity: 0.8}}>{detail}</div>
    </div>
  );
}

function EvalPill({ status, large = false }) {
  const map = {
    pending:  { bg: "#fef3c7", text: "#92400e", border: "#fcd34d", label: "In Valutazione", icon: "⏳" },
    approved: { bg: "#dcfce7", text: "#166534", border: "#86efac", label: "Approvato", icon: "✅" },
    rejected: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5", label: "Rifiutato", icon: "❌" },
  };
  const s = map[status] || { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0", label: "Non inviato", icon: "—" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${large ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"}`}
      style={{background: s.bg, color: s.text, borderColor: s.border}}>
      <span>{s.icon}</span> {s.label}
    </span>
  );
}

function DocRow({ label, present, score, count }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${present ? "bg-emerald-500" : "bg-neutral-300"}`}/>
      <span className="text-neutral-700">{label}</span>
      {present ? (
        <span className="ml-auto text-xs text-emerald-600 font-medium">
          {score != null ? `Score ${score}/10` : count != null ? `${count} documenti` : "Presente"}
        </span>
      ) : (
        <span className="ml-auto text-xs text-neutral-400">Non caricato</span>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div>
      <div className="text-xs text-neutral-400 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-sm font-medium text-neutral-900">{value || "—"}</div>
    </div>
  );
}

function SortTh({ children, k, activeKey, dir, onSort }) {
  const active = activeKey === k;
  return (
    <th onClick={()=>onSort(k)} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider select-none cursor-pointer hover:text-neutral-900 transition">
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`transition ${active ? "opacity-100" : "opacity-30"}`}>
          {dir === "asc" ? <ChevronUpIcon/> : <ChevronDownIcon/>}
        </span>
      </span>
    </th>
  );
}

function SkLine({ w = 100 }) {
  return <div className="animate-pulse rounded" style={{width: w, height: 14, background: "#e5e7eb"}}/>;
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>;
}

/* ===================== ICONS ===================== */
function SearchIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7"/><path d="M21 21l-3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function SendIcon(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8-8 18-2-7-8-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function ChevronUpIcon(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function ChevronDownIcon(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function UploadIcon(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m0 0L8 7m4-4l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function FileIcon(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5"/></svg>);}
function InvoiceIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 3v6h6M8 13h8M8 17h8M8 9h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);}
function FactoringIcon(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 14.5L12 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
