// src/pages/Allerta.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

/** ---------- AS IS: gruppi + domande reali ---------- */
const ASIS_GROUPS = [
  {
    title: "Anomalie Dei Pagamenti Verso Controparti Commerciali",
    items: [
      { key: "1-1", text: "Sono presenti fatture e avvisi di pagamento di cui non si è rispettata la scadenza?" },
      { key: "1-2", text: "Ci sono ritardi nei pagamenti ai fornitori superiori a 90 giorni per un ammontare superiore a quello dei debiti non scaduti?" },
      { key: "1-3", text: "I fornitori hanno modificato le condizioni di pagamento delle forniture (ad es. pagamento dilazionato a pagamento anticipato)?" },
      { key: "1-4", text: "Avete inoltrato richieste di rimodulazione delle scadenze nei pagamenti richiedendo di aumentare la dilazione?" },
      { key: "1-5", text: "Sono state modificate le condizioni di incasso da parte dei clienti con un conseguente allungamento dei tempi di incasso?" },
      { key: "1-6", text: "Sono stati registrati mancati incassi per importi considerevoli superiori a 90gg?" },
      { key: "1-7", text: "Sono presenti contenziosi in atto con clienti o fornitori?" },
      { key: "1-8", text: "Sono presenti criticità con clienti derivanti da non conformità o ritardi?" },
    ],
  },
  {
    title: "Anomalie Gestionali",
    items: [
      { key: "2-1", text: "Sono state registrate perdite di fette di mercato, commesse o clienti importanti?" },
      { key: "2-2", text: "Si sono verificate perdite di membri della direzione o di figure di responsabilità strategiche senza una loro sostituzione?" },
      { key: "2-3", text: "Sono presenti problemi con la gestione del personale?" },
      { key: "2-4", text: "Ci sono ritardi nei pagamenti relativi alle retribuzioni superiori a 60gg per un ammontare maggiore della metà dell'ammontare mensile della retribuzione?" },
      { key: "2-5", text: "Sono presenti nel mercato nuove aziende concorrenti che possono mettere in difficoltà la nostra azienda?" },
      { key: "2-6", text: "Sono state richieste dilazioni alle banche su finanziamenti in essere?" },
      { key: "2-7", text: "Vi è la possibilità di incorrere in problemi inerenti l'approvvigionamento di prodotti fondamentali o in aumenti drastici dei prezzi di acquisto delle materie prime?" },
      { key: "2-8", text: "Sono state registrate variazioni nell'assetto societario?" },
      { key: "2-9", text: "Le scelte gestionali portate avanti dall'amministratore (o consiglio di amministrazione) risultano in contrasto con la mission aziendale e con la vision della direzione?" },
      { key: "2-10", text: "Vi è possibilità che si verifichino eventi catastrofici per i quali non si dispone di una adeguata copertura assicurativa?" },
    ],
  },
  {
    title: "Minacce Erariali e Rischi Caratteristici",
    items: [
      { key: "3-1", text: "Sono presenti mancati pagamenti verso Agenzia delle Entrate ed Enti di riscossione per oltre 6 mesi?" },
      { key: "3-2", text: "Sono presenti mancati pagamenti verso INPS e INAIL per oltre 6 mesi?" },
      { key: "3-3", text: "Vi sono procedimenti legali o regolamentari in corso la cui sorte negativa potrebbe comportare richieste di risarcimento alle quali l'impresa potrebbe non far fronte?" },
      { key: "3-4", text: "Sono entrate in atto modifiche di leggi o regolamenti o politiche governative che potrebbero influenzare negativamente l'impresa?" },
    ],
  },
  {
    title: "Minacce Da Eventi Pregiudizievoli",
    items: [
      { key: "4-1", text: "Sono presenti iscrizioni di ipoteche giudiziarie, pegni e forme tecniche di prelazioni sui beni aziendali?" },
      { key: "4-2", text: "Sono stati ricevuti decreti ingiuntivi ed atti ricognitivi di avvio di azioni per il recupero di crediti?" },
      { key: "4-3", text: "L'azienda ha subito il protesto di assegni e cambiali?" },
      { key: "4-4", text: "Sono in atto azioni volte alla liquidazione dell'azienda o alla cessazione dell'attività?" },
      { key: "4-5", text: "Vi sono istanze di fallimento avanzate dai creditori aziendali?" },
      { key: "4-6", text: "Si è verificato il default o il fallimento di garanti e default o fallimento dei garanti legati all'azienda (rischio infragruppo)?" },
    ],
  },
];
const ASIS_QUESTIONS = ASIS_GROUPS.flatMap(g => g.items);

/** ---------- TO BE: 12 domande reali + opzioni ---------- */
const TO_BE_QUESTIONS = [
  {
    id: "forwardLooking1",
    text: "Per i prossimi 6 mesi l'azienda prevede un fatturato... rispetto al semestre precedente:",
    options: [
      { value: 1, label: "Costante" },
      { value: 2, label: "In aumento" },
      { value: 3, label: "In diminuzione" },
    ],
  },
  {
    id: "forwardLooking2",
    text: "L'azienda prevede di chiedere nuovi finanziamenti nei prossimi 6 mesi?",
    options: [
      { value: 1, label: "Sì, per nuovi investimenti" },
      { value: 2, label: "Sì, perché serve liquidità" },
      { value: 3, label: "No" },
    ],
  },
  {
    id: "forwardLooking3",
    text: "L'azienda prevede costi di gestione (fissi e variabili) per i prossimi 6 mesi rispetto al semestre precedente:",
    options: [
      { value: 1, label: "Costante" },
      { value: 2, label: "In aumento" },
      { value: 3, label: "In diminuzione" },
    ],
  },
  {
    id: "forwardLooking4",
    text: "Su quanti clienti è concentrato il fatturato dei prossimi 6 mesi?",
    options: [
      { value: 1, label: "Fra 10 e 30" },
      { value: 2, label: "Più di 30" },
      { value: 3, label: "Meno di 10" },
    ],
  },
  {
    id: "forwardLooking5",
    text: "L'azienda utilizza un sistema di pianificazione e controllo di gestione?",
    options: [
      { value: 1, label: "Su base pluriennale" },
      { value: 2, label: "Su base annuale" },
      { value: 3, label: "No" },
    ],
  },
  {
    id: "forwardLooking6",
    text: "L'azienda prevede costi straordinari per i prossimi 6 mesi? (es. manutenzioni straordinarie, minusvalenze da conferimenti aziendali, da ristrutturazione, da espropri, da cessione di beni o contenziosi, oneri per multe, ecc.)",
    options: [
      { value: 1, label: "Sì, ma non rilevanti" },
      { value: 2, label: "Sì" },
      { value: 3, label: "No" },
    ],
  },
  {
    id: "forwardLooking7",
    text: "L'azienda prevede di utilizzare al limite (o oltre) le disponibilità per liquidità di cassa nei prossimi 6 mesi?",
    options: [
      { value: 1, label: "Sì, per aumento previsto di utilizzi" },
      { value: 2, label: "Sì, le usiamo sempre al limite" },
      { value: 3, label: "No" },
    ],
  },
  {
    id: "forwardLooking8",
    text: "L'azienda prevede flussi di cassa della gestione operativa sufficienti a coprire gli impegni finanziari dei prossimi 6 mesi (DSCR)?",
    options: [
      { value: 1, label: "Sì" },
      { value: 2, label: "Forse sì, ma potrebbero esserci difficoltà" },
      { value: 3, label: "No, serve sicuramente liquidità" },
    ],
  },
  {
    id: "forwardLooking9",
    text: "L'azienda prevede che disponibilità di cassa attuali e entrate dei prossimi 6 mesi copriranno tutte le uscite dei prossimi 6 mesi (margine di tesoreria positivo)?",
    options: [
      { value: 1, label: "Sì" },
      { value: 2, label: "No" },
      { value: 3, label: "Probabilmente sì" },
    ],
  },
  {
    id: "forwardLooking10",
    text: "L'azienda prevede tempi medi di pagamento ai fornitori inferiori ai tempi medi di incasso dai clienti?",
    options: [
      { value: 1, label: "Sì, i tempi di pagamento sono più corti" },
      { value: 2, label: "No" },
    ],
  },
  {
    id: "forwardLooking11",
    text: "L'azienda prevede reiterati e significativi ritardi nei pagamenti verso terzi (fornitori, dipendenti, erario, enti previdenziali, finanziamenti) nei prossimi 6 mesi?",
    options: [
      { value: 1, label: "Sì" },
      { value: 2, label: "Sì, ma evitabili" },
      { value: 3, label: "No" },
    ],
  },
  {
    id: "forwardLooking12",
    text: "L'azienda prevede di utilizzare al limite (o oltre) le disponibilità del castelletto anticipi nei prossimi 6 mesi?",
    options: [
      { value: 1, label: "Sì, usiamo sempre al limite le disponibilità" },
      { value: 2, label: "Sì, prevediamo maggior utilizzo" },
      { value: 3, label: "No" },
    ],
  },
];

/** ---------- Local storage ---------- */
const LS_ASIS = "sb_allerta_as_is";                 // risposte: { [key]: "Si"|"No" }
const LS_ASIS_DETAILS = "sb_allerta_as_is_details"; // dettagli: { [key]: "..." }
const LS_TOBE = "sb_allerta_to_be";                 // risposte: { [id]: 1|2|3 }
const LS_SAVED_AT = "sb_allerta_saved_at";



/** ---------- Pagina ---------- */
export default function Allerta(){
  // stato locale
  const [asIs, setAsIs] = useState({});                 // "Si"/"No"
  const [asIsDetails, setAsIsDetails] = useState({});
  const [toBe, setToBe] = useState({});                 // 1/2/3
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null); // {type:'ok'|'err', msg}

  const show = (type,msg)=>{ setNotice({type,msg}); setTimeout(()=>setNotice(null), 2400); };

  useEffect(() => {
    const fetchQ = async () => {
       try {
         const data = await api("/questionari");
         if (data && !data.error) {
           let newAsIs = {};
           let newAsIsDet = {};
           if (data.asIs) {
             for (const key in data.asIs) {
               if (data.asIs[key].Result) newAsIs[key] = data.asIs[key].Result;
               if (data.asIs[key].Details) newAsIsDet[key] = data.asIs[key].Details;
             }
           }
           setAsIs(newAsIs);
           setAsIsDetails(newAsIsDet);
           
           let newToBe = {};
           if (data.toBe) {
             for (const key in data.toBe) {
               if (data.toBe[key]) newToBe[key] = data.toBe[key];
             }
           }
           setToBe(newToBe);
         }
       } catch (e) {
         console.error("Errore fetch questionari", e);
       } finally {
         setLoading(false);
       }
    };
    fetchQ();
  }, []);

  const asIsCount = useMemo(()=> ASIS_QUESTIONS.reduce((n,q)=>n + (asIs[q.key]==="Si" || asIs[q.key]==="No" ? 1:0), 0), [asIs]);
  const toBeCount = useMemo(()=> TO_BE_QUESTIONS.reduce((n,q)=>n + (toBe[q.id] ? 1:0), 0), [toBe]);

  const sendAsIs = async ()=>{
    try{
      setSaving(true);
      const questionario = {};
      for (const q of ASIS_QUESTIONS){
        questionario[q.key] = {
          response: asIs[q.key] ?? "",
          details: asIsDetails[q.key] ?? "",
        };
      }
      await api("/questionarioAsis", { method: "POST", body: { questionario } });
      show("ok","Questionario AS IS inviato e salvato a DB.");
    }catch(e){
      show("err", e.message || "Errore invio AS IS.");
    }finally{ setSaving(false); }
  };

  // invio TO BE
  const sendToBe = async ()=>{
    try{
      setSaving(true);
      const forwardlooking = {};
      for(const q of TO_BE_QUESTIONS){
        forwardlooking[q.id] = toBe[q.id] ?? null;
      }
      await api("/forwardlooking", { method: "POST", body: { forwardlooking } });
      show("ok","Questionario TO BE inviato e salvato a DB.");
    }catch(e){
      show("err", e.message || "Errore invio TO BE.");
    }finally{ setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[#5b63ff] font-medium">Allerta</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Questionari</h1>
          <p className="text-sm text-neutral-500">
            Compila i questionari <b>AS IS</b> e <b>TO BE</b> per il tuo utente.
          </p>
          {notice && (
            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
              notice.type==="ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {notice.type==="ok" ? "✓" : "!"} {notice.msg}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button onClick={sendAsIs} disabled={saving} className="h-9 px-3 rounded-lg text-sm border border-neutral-300 hover:bg-neutral-50">Salva AS IS a DB</button>
          <button onClick={sendToBe} disabled={saving} className="h-9 px-3 rounded-lg text-sm border border-neutral-300 hover:bg-neutral-50">Salva TO BE a DB</button>
        </div>
      </div>

      {/* Layout: 2 colonne */}
      {loading ? (
        <div className="text-sm text-neutral-500 py-10 text-center">Caricamento questionari...</div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
        {/* AS IS */}
        <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <HeaderBox title="Questionario AS IS" subtitle="Risposte: Sì / No" counter={`${asIsCount}/${ASIS_QUESTIONS.length}`}>
            <div className="flex items-center gap-1.5">
              <QuickBtn size="sm" onClick={()=>bulkAsIs(setAsIs,"Si")}>Tutto Sì</QuickBtn>
              <QuickBtn size="sm" onClick={()=>bulkAsIs(setAsIs,"No")}>Tutto No</QuickBtn>
              <QuickBtn size="sm" ghost onClick={()=>{ setAsIs({}); setAsIsDetails({}); }}>Reset</QuickBtn>
            </div>
          </HeaderBox>

          <div className="overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr className="border-b border-neutral-200">
                  <Th className="w-12">#</Th>
                  <Th>Domanda</Th>
                  <Th className="w-[220px]">Risposta</Th>
                  <Th className="w-[260px]">Dettagli</Th>
                </tr>
              </thead>
              <tbody>
                {ASIS_GROUPS.map((g, gi)=>(
                  <React.Fragment key={g.title}>
                    <tr className="bg-neutral-50/60 border-t border-neutral-200">
                      <td colSpan={4} className="px-2 py-2 font-medium">{g.title}</td>
                    </tr>
                    {g.items.map((q, qi)=>{
                      const idx = ASIS_GROUPS.slice(0,gi).reduce((n,grp)=>n+grp.items.length,0) + qi + 1;
                      return (
                        <tr key={q.key} className="border-t border-neutral-100">
                          <Td className="font-medium tabular-nums">{idx}</Td>
                          <Td>{q.text}</Td>
                          <Td>
                            <RadioGroup
                              name={`asis_${q.key}`}
                              value={asIs[q.key] ?? ""}
                              options={[{value:"Si",label:"Sì"},{value:"No",label:"No"}]}
                              onChange={(v)=>setAsIs(p=>({...p,[q.key]:v}))}
                              compact
                            />
                          </Td>
                          <Td>
                            <input
                              value={asIsDetails[q.key] ?? ""}
                              onChange={e=>setAsIsDetails(p=>({...p,[q.key]:e.target.value}))}
                              placeholder="Aggiungi note/dettagli (opzionale)"
                              className="w-full h-9 rounded-lg border border-neutral-300 px-2 text-sm"
                            />
                          </Td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TO BE */}
        <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <HeaderBox title="Questionario TO BE" subtitle="Seleziona l'opzione appropriata" counter={`${toBeCount}/${TO_BE_QUESTIONS.length}`}>
            <div className="flex items-center gap-1.5">
              <QuickBtn size="sm" onClick={()=>bulkToBe(setToBe,1)}>Imposta tutte a 1</QuickBtn>
              <QuickBtn size="sm" onClick={()=>bulkToBe(setToBe,2)}>Imposta tutte a 2</QuickBtn>
              <QuickBtn size="sm" onClick={()=>bulkToBe(setToBe,3)}>Imposta tutte a 3</QuickBtn>
              <QuickBtn size="sm" ghost onClick={()=>setToBe({})}>Reset</QuickBtn>
            </div>
          </HeaderBox>

          <div className="overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr className="border-b border-neutral-200">
                  <Th className="w-12">#</Th>
                  <Th>Domanda</Th>
                  <Th className="w-[420px]">Risposta</Th>
                </tr>
              </thead>
              <tbody>
                {TO_BE_QUESTIONS.map((q, idx)=>(
                  <tr key={q.id} className="border-t border-neutral-100">
                    <Td className="font-medium tabular-nums">{idx+1}</Td>
                    <Td>{q.text}</Td>
                    <Td>
                      <RadioGroup
                        name={q.id}
                        value={toBe[q.id] ?? ""}
                        options={q.options}
                        onChange={(v)=>setToBe(p=>({...p,[q.id]:v}))}
                        compact
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}
    </div>
  );
}

/** ---------- UI primitives ---------- */
function HeaderBox({ title, subtitle, counter, children }) {
  return (
    <div className="px-4 py-2.5 border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
      <div className="leading-tight">
        <h2 className="font-semibold text-[15px]">{title}</h2>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">Completate: <b>{counter}</b></span>
        {children}
      </div>
    </div>
  );
}
function Th({ children, className="" }){ return <th className={`px-2 py-2 text-left ${className}`}>{children}</th>; }
function Td({ children, className="" }){ return <td className={`px-2 py-2 align-top ${className}`}>{children}</td>; }

function RadioGroup({ name, value, options, onChange, compact=false }) {
  const sizeCls = compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm";
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt, i) => {
        const id = `${name}_${i}`;
        const checked = String(value) === String(opt.value);
        return (
          <label key={id} htmlFor={id}
            className={`inline-flex items-center gap-2 ${sizeCls} rounded-lg border cursor-pointer ${
              checked ? "bg-[#ECE8FF] text-[#5b63ff] border-[#D8D2FF]" : "bg-white border-neutral-300 hover:bg-neutral-50"
            }`}>
            <input
              id={id}
              type="radio"
              name={name}
              className="hidden"
              checked={checked}
              onChange={()=>onChange(opt.value)}
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

function QuickBtn({ children, onClick, ghost=false, size="md" }) {
  const sizes = { sm: "h-8 px-2 text-xs", md: "h-9 px-3 text-sm" };
  return (
    <button onClick={onClick}
      className={`${sizes[size]} rounded-lg ${ghost ? "border border-neutral-300 bg-white hover:bg-neutral-50" : "bg-[#ECE8FF] text-[#5b63ff] border border-[#D8D2FF] hover:bg-[#E6E2FF]"}`}>
      {children}
    </button>
  );
}
function SaveIcon(){ return (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 7h10l4 4v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 7v4h6V7" stroke="currentColor" strokeWidth="1.6"/></svg>
); }

/** ---------- Bulk helpers ---------- */
function bulkAsIs(setter, val){
  setter(prev=>{
    const next = { ...prev };
    for(const q of ASIS_QUESTIONS){ next[q.key] = val; }
    return next;
  });
}
function bulkToBe(setter, val){
  setter(prev=>{
    const next = { ...prev };
    for(const q of TO_BE_QUESTIONS){ next[q.id] = val; }
    return next;
  });
}
