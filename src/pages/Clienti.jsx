// src/pages/Clienti.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

/* ===================== MINI API ===================== */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
function getToken(){ try{ return JSON.parse(localStorage.getItem("sb_auth"))?.token || null; }catch{ return null; } }
function getCompanyId(){ try{ return JSON.parse(localStorage.getItem("sb_company"))?.id || null; }catch{ return null; } }

async function api(path,{method="GET",body,isForm=false,auth=true}={}){
  const headers={};
  const t=getToken(); const cid=getCompanyId();
  if(!isForm) headers["Content-Type"]="application/json";
  if(auth && t) headers["Authorization"]=`Bearer ${t}`;
  if(cid) headers["CurrentCompany"]=cid;
  const res=await fetch(`${API_BASE}${path}`,{method,headers,body:body?(isForm?body:JSON.stringify(body)):undefined});
  let data=null; try{ data=await res.json(); }catch{}
  if(!res.ok) throw new Error((data&&data.message)||"Errore richiesta");
  return data;
}
const ClientsApi = {
  list: (role="customer")=> api(`/clients?role=${encodeURIComponent(role)}`),
  create: (payload)=> api("/clients",{method:"POST",body:payload}),
  sendForEvaluation: (payload)=> new Promise(resolve=>setTimeout(()=>resolve({ok:true}), 900)),
};

/* ===================== UTILS ===================== */
const euro = v => (Number(v)||0).toLocaleString("it-IT",{style:"currency", currency:"EUR"});
const abbr = (name="") => {
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0]||"") + (parts[1]?.[0]||"");
};
const MONTHS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

/* ===================== PAGE ===================== */
export default function Clienti() {
  // toggle ruolo
  const [role, setRole] = useState("customer"); // "customer" | "supplier"
  const roleLabel = role === "supplier" ? "Fornitori" : "Clienti";
  const roleSing  = role === "supplier" ? "Fornitore" : "Cliente";

  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState(null);

  // modale nuovo soggetto
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    nome:"", piva:"", regione:"", citta:"", email:"", telefono:"", rating:"", status:"non_approvato",
  });
  const showToast=(type,msg)=>{ setToast({type,msg}); setTimeout(()=>setToast(null),2600); };

  // modale invio per valutazione
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalClient, setEvalClient] = useState(null);
  const [evalNotes, setEvalNotes] = useState("");
  const [evalSending, setEvalSending] = useState(false);

  // modale dettagli
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState(null);

  // caricamento iniziale + quando cambia ruolo
  useEffect(()=>{ (async()=>{
    setLoading(true);
    try{ const data=await ClientsApi.list(role); setRows(Array.isArray(data)?data:(data?.data||[])); }
    catch(e){ showToast("error", e.message||`Impossibile caricare ${roleLabel.toLowerCase()}`); }
    finally{ setLoading(false); }
  })(); },[role]);

  // filtri / ricerca / sort / paging
  const regioni = useMemo(()=> Array.from(new Set(rows.map(c=>c.regione).filter(Boolean))).sort(), [rows]);
  const [search, setSearch] = useState("");
  const [regione, setRegione] = useState("");
  const [ratingMin, setRatingMin] = useState(0);
  const [sortKey, setSortKey] = useState("nome");
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // reset paging quando cambia ruolo o filtro
  useEffect(()=>{ setPage(1); }, [role, search, regione, ratingMin, sortKey, sortDir, perPage]);

  const filtered = useMemo(()=>{
    let arr = rows.filter(c=>{
      const s = search.trim().toLowerCase();
      const matches = !s || [
        c.nome, c.piva, c.regione, c.citta, c.email
      ].some(f=>String(f||"").toLowerCase().includes(s));
      const okReg = !regione || c.regione === regione;
      const r = c.rating ?? 0;
      const okRat = Number(r) >= ratingMin;
      return matches && okReg && okRat;
    });
    const cmp = (a,b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const get = (k,obj) => (k==="rating") ? Number(obj[k]??-1) : String(obj[k]??"").toLowerCase();
      const va=get(sortKey,a), vb=get(sortKey,b);
      if (sortKey==="rating") return (Number(va)-Number(vb))*dir;
      return (va>vb?1:va<vb?-1:0)*dir;
    };
    arr.sort(cmp);
    return arr;
  }, [rows, search, regione, ratingMin, sortKey, sortDir]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(page, pageCount);
  const slice = filtered.slice((pageSafe-1)*perPage, pageSafe*perPage);

  const perRegione = useMemo(() => {
    const m = new Map();
    filtered.forEach(c => m.set(c.regione || "N/D", (m.get(c.regione || "N/D")||0)+1));
    const pal = ["#93C5FD","#86EFAC","#FDE68A","#FCA5A5","#C4B5FD","#7DD3FC","#FDBA74","#A7F3D0","#F9A8D4","#FCD34D"];
    return Array.from(m.entries()).map(([label, value], i)=>({ label, value, color: pal[i%pal.length] }));
  }, [filtered]);

  const toggleSort = (key) => { if (sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortKey(key); setSortDir("asc"); } };

  const submitNew = async(e)=>{
    e.preventDefault();
    setSaving(true);
    try{
      const payload = {
        role, // 👈 importante
        nome: form.nome.trim(),
        piva: form.piva.trim(),
        regione: form.regione.trim(),
        citta: form.citta.trim(),
        email: form.email.trim(),
        // telefono ignorato lato API se non gestito a DB
        rating: form.rating === "" ? null : Number(form.rating),
        status: form.status,
      };
      await ClientsApi.create(payload);
      const data = await ClientsApi.list(role);
      setRows(Array.isArray(data)?data:(data?.data||[]));
      setOpen(false);
      setForm({ nome:"", piva:"", regione:"", citta:"", email:"", telefono:"", rating:"", status:"non_approvato" });
      showToast("success", `${roleSing} creato`);
    }catch(e){
      showToast("error", e.message || `Errore creazione ${roleSing.toLowerCase()}`);
    }finally{
      setSaving(false);
    }
  };

  function openEvalModal(client){
    setEvalClient(client);
    setEvalNotes("");
    setEvalOpen(true);
  }
  async function submitEvaluation(e){
    e.preventDefault();
    setEvalSending(true);
    try{
      await ClientsApi.sendForEvaluation({ client_id: evalClient?.id, notes: evalNotes });
      setEvalOpen(false);
      showToast("success", `${roleSing} inviato per la valutazione`);
    }catch(err){
      showToast("error", err.message || "Errore invio valutazione");
    }finally{
      setEvalSending(false);
    }
  }

  function buildMockDetails(c){
    return {
      id: c.id,
      nome: c.nome,
      piva: c.piva || "—",
      regione: c.regione || "—",
      citta: c.citta || "—",
      email: c.email || "—",
      telefono: c.telefono || "—",
      rating: c.rating ?? "—",
      status: c.status === "approvato" ? "Approvato" : "Non approvato",
      referente: "Mario Rossi",
      indirizzo: (c.citta || "—") + (c.regione ? ` (${c.regione})` : ""),
      creatoIl: "2025-01-15",
      ultimoAggiornamento: "2025-06-30",
      note: `${roleSing} con potenziale interessante. Richiesto follow-up.`,
    };
  }
  function openDetailModal(client){
    setDetailClient(buildMockDetails(client));
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-[#5b63ff] font-medium">Anagrafica</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{roleLabel}</h1>
            <p className="text-sm text-neutral-500">Elenco {roleLabel.toLowerCase()} con rating, status e panoramiche aggregate.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white border border-neutral-200 rounded-lg p-1 flex">
              <button onClick={()=>setRole("customer")}
                className={`h-9 px-3 rounded-md text-sm ${role==="customer"?"bg-neutral-900 text-white":"hover:bg-neutral-50"}`}>
                Clienti
              </button>
              <button onClick={()=>setRole("supplier")}
                className={`h-9 px-3 rounded-md text-sm ${role==="supplier"?"bg-neutral-900 text-white":"hover:bg-neutral-50"}`}>
                Fornitori
              </button>
            </div>
            <button onClick={()=>setOpen(true)} className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm flex items-center gap-2">
              <Plus/> Nuovo {roleSing.toLowerCase()}
            </button>
          </div>
        </div>
      </section>

      {/* GRAFICI */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Andamento rating {roleLabel.toLowerCase()} (media mensile)</h3>
            <span className="text-xs text-neutral-500">Scala 1–5</span>
          </div>
          <InteractiveLineChart
            points={[3.1,3.2,3.4,3.5,3.6,3.8,3.9,4.0,4.1,4.2,4.3,4.4]}
            labels={MONTHS}
            height={240}
            minY={1}
            maxY={5}
          />
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-2">{roleLabel} per regione</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <InteractiveDonut data={perRegione}/>
            <LegendScrollable items={perRegione}/>
          </div>
        </div>
      </section>

      {/* CONTROLLI TABELLA */}
      <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <input
              value={search}
              onChange={e=>{ setSearch(e.target.value); }}
              placeholder={`Cerca ${roleSing.toLowerCase()}, P.IVA, regione, città, email…`}
              className="h-9 w-[320px] rounded-lg border border-neutral-300 pl-8 pr-3 text-sm"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"><Search/></div>
          </div>

          <select value={regione} onChange={e=>{ setRegione(e.target.value); }} className="h-9 rounded-lg border border-neutral-300 px-3 text-sm">
            <option value="">Tutte le regioni</option>
            {regioni.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select value={ratingMin} onChange={e=>{ setRatingMin(Number(e.target.value)); }} className="h-9 rounded-lg border border-neutral-300 px-3 text-sm">
            <option value={0}>Rating minimo: 0</option>
            {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} ⭐</option>)}
          </select>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-neutral-500">Righe per pagina</span>
            <select
              value={perPage}
              onChange={e=>{ setPerPage(Number(e.target.value)); }}
              className="h-9 rounded-lg border border-neutral-300 px-2 text-sm"
            >
              {[10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* TABELLA */}
        <div className="mt-3 overflow-auto border border-neutral-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <SortTh activeKey={sortKey} dir={sortDir} k="nome"      onSort={toggleSort}>{roleSing}</SortTh>
                <SortTh activeKey={sortKey} dir={sortDir} k="piva"      onSort={toggleSort}>P. IVA</SortTh>
                <SortTh activeKey={sortKey} dir={sortDir} k="regione"   onSort={toggleSort}>Regione</SortTh>
                <SortTh activeKey={sortKey} dir={sortDir} k="citta"     onSort={toggleSort}>Città</SortTh>
                <SortTh activeKey={sortKey} dir={sortDir} k="rating"    onSort={toggleSort} className="text-center">Rating</SortTh>
                <SortTh activeKey={sortKey} dir={sortDir} k="status"    onSort={toggleSort}>Status</SortTh>
                <Th className="w-[1%]">Azioni</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><Td colSpan={7} className="text-center py-10 text-neutral-500">Caricamento…</Td></tr>
              ) : slice.length ? slice.map((c, i)=>(
                <tr key={c.id} className={i? "border-t border-neutral-200" : ""}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white grid place-items-center text-xs">{abbr(c.nome)}</div>
                      <div className="font-medium">{c.nome}</div>
                    </div>
                  </Td>
                  <Td>{c.piva}</Td>
                  <Td>{c.regione}</Td>
                  <Td>{c.citta}</Td>
                  <Td className="text-center">
                    {c.rating == null
                      ? <button onClick={()=>openEvalModal(c)}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                          <SendIcon/> Invia per valutazione
                        </button>
                      : <Stars n={c.rating}/>}
                  </Td>
                  <Td>
                    {c.status === "approvato"
                      ? <Pill ok>Approvato</Pill>
                      : <Pill>Non approvato</Pill>}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={()=>openDetailModal(c)}
                        className="h-8 px-3 rounded-lg border border-neutral-300 text-xs hover:bg-neutral-50"
                      >
                        Vedi scheda
                      </button>
                    </div>
                  </Td>
                </tr>
              )) : (
                <tr><Td colSpan={7} className="text-center py-10 text-neutral-500">Nessun {roleSing.toLowerCase()}</Td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAZIONE */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-neutral-500">
            {total ? `${(pageSafe-1)*perPage+1}–${Math.min(pageSafe*perPage,total)} di ${total}` : "0 risultati"}
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-40" onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={pageSafe===1}>
              ‹ Precedente
            </button>
            <span className="text-neutral-600">Pagina {pageSafe} / {Math.max(1, Math.ceil(total/perPage))}</span>
            <button className="h-8 px-3 rounded-lg border border-neutral-300 disabled:opacity-40" onClick={()=>setPage(p=>Math.min(Math.ceil(total/perPage)||1, p+1))} disabled={pageSafe===Math.ceil(total/perPage)||total===0}>
              Successiva ›
            </button>
          </div>
        </div>
      </section>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-md text-sm text-white ${
          toast.type==="success" ? "bg-emerald-600" : "bg-red-600"
        }`}>{toast.msg}</div>
      )}

      {/* MODALE NUOVO */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-lg">
            <div className="text-lg font-semibold">Nuovo {roleSing.toLowerCase()}</div>
            <form onSubmit={submitNew} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ragione Sociale *</label>
                <input className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3" required
                  value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder={role==="supplier"?"Beta S.r.l.":"ACME S.p.A."}/>
              </div>
              <div>
                <label className="text-sm font-medium">Partita IVA *</label>
                <input className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3" required
                  value={form.piva} onChange={e=>setForm(f=>({...f,piva:e.target.value}))} placeholder="IT01234567890"/>
              </div>
              <div>
                <label className="text-sm font-medium">Regione</label>
                <input className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3"
                  value={form.regione} onChange={e=>setForm(f=>({...f,regione:e.target.value}))} placeholder="Lombardia"/>
              </div>
              <div>
                <label className="text-sm font-medium">Città</label>
                <input className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3"
                  value={form.citta} onChange={e=>setForm(f=>({...f,citta:e.target.value}))} placeholder="Milano"/>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3"
                  value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="admin@azienda.it"/>
              </div>
              <div>
                <label className="text-sm font-medium">Rating (0–5)</label>
                <select className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3"
                  value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))}>
                  <option value="">Nessuno</option>
                  {[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3"
                  value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="approvato">Approvato</option>
                  <option value="non_approvato">Non approvato</option>
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>{ setOpen(false); }} className="h-10 px-4 rounded-lg border border-neutral-200">Annulla</button>
                <button disabled={saving} className="h-10 px-4 rounded-lg bg-neutral-900 text-white">{saving?"Salvataggio…":"Crea"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE INVIO PER VALUTAZIONE */}
      {evalOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-center p-4" onClick={()=>!evalSending && setEvalOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg" onClick={e=>e.stopPropagation()}>
            <div className="text-lg font-semibold">Invia per valutazione</div>
            <div className="mt-1 text-sm text-neutral-600">{roleSing}: <b>{evalClient?.nome}</b></div>
            <form onSubmit={submitEvaluation} className="mt-4 grid gap-3">
              <div>
                <label className="text-sm font-medium">Note per il valutatore</label>
                <textarea
                  className="mt-1 w-full min-h-[110px] rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  placeholder="Inserisci eventuali dettagli utili…"
                  value={evalNotes}
                  onChange={e=>setEvalNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" disabled={evalSending} onClick={()=>setEvalOpen(false)} className="h-10 px-4 rounded-lg border border-neutral-200">
                  Annulla
                </button>
                <button disabled={evalSending} className="h-10 px-4 rounded-lg bg-neutral-900 text-white flex items-center gap-2">
                  {evalSending ? "Invio…" : (<><SendIcon/> Invia</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DETTAGLI */}
      {detailOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-center p-4" onClick={()=>setDetailOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Scheda {roleSing.toLowerCase()}</div>
              <button onClick={()=>setDetailOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-700">Chiudi</button>
            </div>

            {detailClient ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Info label="Ragione Sociale" value={detailClient.nome}/>
                <Info label="Partita IVA" value={detailClient.piva}/>
                <Info label="Città" value={detailClient.citta}/>
                <Info label="Regione" value={detailClient.regione}/>
                <Info label="Email" value={detailClient.email}/>
                <Info label="Telefono" value={detailClient.telefono}/>
                <Info label="Rating" value={String(detailClient.rating)}/>
                <Info label="Status" value={detailClient.status}/>
                <Info label="Referente" value={detailClient.referente}/>
                <Info label="Indirizzo" value={detailClient.indirizzo}/>
                <Info label="Creato il" value={detailClient.creatoIl}/>
                <Info label="Ultimo aggiornamento" value={detailClient.ultimoAggiornamento}/>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-500">Note</div>
                  <div className="mt-1 p-3 rounded-lg border border-neutral-200 bg-neutral-50">{detailClient.note}</div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-neutral-500">Caricamento…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== COMPONENTS / CHARTS / ICONS ===================== */
function Th({children, className=""}){ return <th className={`px-3 py-2 text-left ${className}`}>{children}</th>; }
function Td({children, className="", colSpan}){ return <td colSpan={colSpan} className={`px-3 py-2 ${className}`}>{children}</td>; }
function Info({label, value}){ return (
  <div>
    <div className="text-xs text-neutral-500">{label}</div>
    <div className="mt-1 font-medium">{value || "—"}</div>
  </div>
);}

function SortTh({ children, k, activeKey, dir, onSort, className="" }) {
  const active = activeKey === k;
  return (
    <th onClick={()=>onSort(k)} className={`px-3 py-2 text-left select-none cursor-pointer ${className}`} title="Ordina">
      <span className="inline-flex items-center gap-1">{children}
        <span className={`transition ${active ? "opacity-100" : "opacity-30 text-neutral-400"}`}>
          {dir === "asc" ? <ChevronUp/> : <ChevronDown/>}
        </span>
      </span>
    </th>
  );
}
function Stars({ n=0 }) {
  return <div className="inline-flex">{[1,2,3,4,5].map(i => <Star key={i} filled={i<=n} />)}</div>;
}
function Star({ filled }) {
  const fill = filled ? "#f59e0b" : "none"; const stroke = filled ? "#f59e0b" : "#9ca3af";
  return (<svg width="18" height="18" viewBox="0 0 24 24" className="mx-[1px]">
    <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 19.8l1-6.1L3.2 9.4l6.1-.9L12 3Z" fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>);
}
function Pill({ children, ok=false }) {
  return (
    <span className={
      "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs border " +
      (ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-100 text-neutral-700 border-neutral-300")
    }>
      {ok ? <Check/> : <ClockIcon/>} {children}
    </span>
  );
}

/* === Interactive Line (tooltip + hover) === */
function InteractiveLineChart({ points=[], labels=[], height=240, minY, maxY }) {
  const width = 1100, padX = 28, padY = 26;
  const min = minY ?? Math.min(...points, 0);
  const max = maxY ?? Math.max(...points, 1);
  const n = Math.max(points.length, 2);
  const dx = (width - padX*2) / (n - 1);
  const mapX = i => padX + i * dx;
  const mapY = v => height - padY - ((v - min) / (max - min || 1)) * (height - padY*2);

  const d = points.map((v,i)=>`${i?"L":"M"} ${mapX(i)} ${mapY(v)}`).join(" ");
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  function mouseMove(e){
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padX;
    const idx = Math.round(x / dx);
    if (idx >= 0 && idx < points.length) setHoverIdx(idx);
    else setHoverIdx(null);
  }
  function leave(){ setHoverIdx(null); }

  const activeX = hoverIdx!=null ? mapX(hoverIdx) : null;
  const activeY = hoverIdx!=null ? mapY(points[hoverIdx]) : null;

  return (
    <div className="relative">
      <svg ref={svgRef} className="w-full" viewBox={`0 0 ${width} ${height}`}
           onMouseMove={mouseMove} onMouseLeave={leave}>
        <line x1="0" y1={height-padY} x2={width} y2={height-padY} stroke="#e5e7eb"/>
        <defs>
          <linearGradient id="gradLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="1"/>
            <stop offset="100%" stopColor="#10B981" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={`${d} L ${mapX(points.length-1)} ${height-padY} L ${mapX(0)} ${height-padY} Z`} fill="url(#gradArea)"/>
        <path d={d} fill="none" stroke="url(#gradLine)" strokeWidth="2.6"/>
        {points.map((v,i)=>(
          <circle key={i} cx={mapX(i)} cy={mapY(v)} r={i===hoverIdx?4.6:3}
                  fill={i===hoverIdx?"#0ea5e9":"#10B981"} />
        ))}
        {labels.slice(0,points.length).map((lab,i)=>(
          <text key={i} x={mapX(i)} y={height-6} fontSize="10" textAnchor="middle" fill="#6b7280">{lab}</text>
        ))}
        {hoverIdx!=null && (
          <>
            <line x1={activeX} y1={padY} x2={activeX} y2={height-padY} stroke="#e5e7eb" />
            <circle cx={activeX} cy={activeY} r="6" fill="white" stroke="#0ea5e9" strokeWidth="2"/>
          </>
        )}
      </svg>

      {hoverIdx!=null && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full px-2 py-1 rounded border bg-white text-xs shadow"
          style={{
            left: `${(padX + hoverIdx*dx) / width * 100}%`,
            top:  `${(mapY(points[hoverIdx])) / height * 100}%`,
          }}
        >
          <div className="font-medium">{labels[hoverIdx] ?? `M${hoverIdx+1}`}</div>
          <div className="text-neutral-600">media: <b>{points[hoverIdx]?.toFixed(2)}</b></div>
        </div>
      )}
    </div>
  );
}

/* === Interactive Donut === */
function InteractiveDonut({ data=[] }) {
  const size = 220, baseStroke = 24, r = (size - baseStroke)/2;
  const c = 2*Math.PI*r;
  const total = data.reduce((a,b)=>a + (Number(b.value)||0), 0) || 1;

  const [hover, setHover] = useState(null);

  let offset = 0;
  return (
    <div className="relative" style={{width:size, height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size/2} ${size/2})`}>
          {data.map((s,i)=>{
            const v = Number(s.value)||0;
            const dash = (v/total)*c;
            const sw = hover===i ? baseStroke+4 : baseStroke;
            const rr = hover===i ? r+1.5 : r;
            const seg = (
              <circle key={i}
                cx={size/2} cy={size/2} r={rr}
                fill="none" stroke={s.color} strokeWidth={sw}
                strokeDasharray={`${dash} ${c-dash}`}
                strokeDashoffset={-offset}
                style={{ transition: "all .18s ease" }}
                onMouseEnter={()=>setHover(i)}
                onMouseLeave={()=>setHover(null)}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <circle cx={size/2} cy={size/2} r={r - baseStroke/1.35} fill="white"/>
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center px-2">
        {hover==null ? (
          <>
            <div className="text-xs text-neutral-500">Totale</div>
            <div className="text-base font-semibold">{total}</div>
            <div className="text-[11px] text-neutral-500">voci</div>
          </>
        ) : (
          <>
            <div className="text-xs text-neutral-500">{data[hover]?.label || "—"}</div>
            <div className="text-base font-semibold">{data[hover]?.value ?? 0}</div>
            <div className="text-[11px] text-neutral-500">
              {(((Number(data[hover]?.value)||0)/total)*100).toLocaleString("it-IT",{maximumFractionDigits:1})}%
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* === Legend scrollable === */
function LegendScrollable({ items }) {
  return (
    <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
      {items.map((s,i)=>(
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded" style={{background:s.color}} />
          <span className="flex-1 truncate">{s.label || "N/D"}</span>
          <span className="text-neutral-500">{s.value}</span>
        </div>
      ))}
      {(!items || items.length===0) && (
        <div className="text-sm text-neutral-500">Nessun dato.</div>
      )}
    </div>
  );
}

function Plus(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function Search(){return(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7"/><path d="M21 21l-3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function ChevronUp(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function ChevronDown(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function Check(){return(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function ClockIcon(){return(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>);}
function SendIcon(){return(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8-8 18-2-7-8-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
