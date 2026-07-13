// src/pages/CentraleRischiDettaglio.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { CentraleRischi, API_BASE } from "../lib/api";
import { useParams } from 'react-router-dom';
import { useSetPageContext } from "../contexts/PageContext";
/* ----------------- Utils ----------------- */
const fmtMoney = (v) =>
  (Number(v) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const sum = (arr, f) => arr.reduce((a, b) => a + (f ? f(b) : b), 0);
const scoreColor = (v) =>
  v >= 9 ? "#16a34a"
  : v >= 8 ? "#22c55e"
  : v >= 7 ? "#4ade80"
  : v >= 6 ? "#a3a3a3"
  : v >= 5 ? "#f59e0b"
  : v >= 4 ? "#f97316" : "#ef4444";

/** converte stringhe money in formato EU: "499.891,00" -> 499891 */
function toNumberEU(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/\s/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** costruisce una serie recharts da struttura:
 * { dates:[d1,d2,...], series:[{name:"Accordato", data:[...]}, {name:"Utilizzato", data:[...]}] }
 */
function seriesFromApiBlock(block) {
  const dates = Array.isArray(block?.dates) ? block.dates : [];
  const ser   = Array.isArray(block?.series) ? block.series : [];
  const map = dates.map((d, i) => {
    const obj = { t: d };
    ser.forEach(s => {
      const key = s.name?.toLowerCase() === "accordato" ? "accordato"
                : s.name?.toLowerCase() === "utilizzato" ? "utilizzato"
                : s.name || "valore";
      obj[key] = Number(s.data?.[i] || 0);
    });
    return obj;
  });
  return map;
}

/* ----------------- Parser in base al JSON reale ----------------- */
function parseStateFromApi(raw) {
  const root = raw?.newFutureArray ?? {};

  // --- Scoring / Panoramica
  const scPan = root?.Scoring?.Panoramica ?? {};
  const score0_10 = Number(scPan?.FinalScore || 0) * 10;

  // prova a pescare una URL del documento se presente (placeholder per futuro)
  const docUrl =
    [
      raw?.document_url,
      raw?.doc_url,
      root?.Documento?.Url,
      root?.Documento?.URL,
      root?.Documento?.Path,
      root?.Documento,
      root?.documento_url,
    ].find(u => typeof u === "string" && u.length > 0) || null;

  const panoramica = {
    score: score0_10,
    period: `${scPan?.PeriodoRiferimento?.Inizio || ""} – ${scPan?.PeriodoRiferimento?.Fine || ""}`.trim(),
    contestate: Number(scPan?.NumeroPosizioniContestate || 0),
    numIntermediari: Number(scPan?.NumeroIntermediari || 0),
    docUrl,
  };

  // --- Intermediari (deduco dall’elenco banche degli affidamenti, se presente)
  const affGen = root?.AnalisiAffidamenti?.ListaAffidamentiGeneral || [];
  const uniqueBanks = Array.from(new Set(affGen.map(a => a?.nome_banca).filter(Boolean)));
  const intermediari = uniqueBanks.map(n => ({
    name: n,
    code: (n || "").slice(0, 3).toUpperCase(),
  }));

  // --- Anomalie Utilizzi
  const au = root?.Scoring?.AnomalieUtilizzi || {};
  const anomalieUtilizzi = [
    { key: "autoliq",  label: "Tensione Finanziaria Utilizzi Autoliquidanti", ok: au?.TensioneAutoliquidanti === false, icon: "bolt" },
    { key: "revoca",   label: "Tensione Finanziaria Utilizzi A Revoca",       ok: au?.TensioneRevoca === false,        icon: "bolt" },
    { key: "scadenza", label: "Tensione Finanziaria Utilizzi A Scadenza",     ok: au?.TensioneScadenza === false,      icon: "bolt" },
  ];

  // --- Anomalie Lievi
  const al = root?.Scoring?.AnomalieLievi || {};
  const nSconfPerTipo = al?.NumeroSconfiniPerTipo || {};
  const anomalieLievi = [
    { key: "impagati",  label: "Impagati",          ok: al?.Impagati === false, icon: "shield" },
    { key: "sconfini",  label: "Presenza Sconfini", ok: al?.Sconfini === false, icon: "alert"  },
    // numeriche, come neutre
    { key: "autoN", label: "N° Sconfini Autoliquidanti", value: Number(nSconfPerTipo["RISCHI AUTOLIQUIDANTI"] || 0), neutral: true, icon: "hash" },
    { key: "revN",  label: "N° Sconfini a Revoca",       value: Number(nSconfPerTipo["RISCHI A REVOCA"] || 0),         neutral: true, icon: "hash" },
    { key: "scadN", label: "N° Sconfini a Scadenza",     value: Number(nSconfPerTipo["RISCHI A SCADENZA"] || 0),      neutral: true, icon: "hash" },
  ];

  // --- Resoconto Anomalie / Sconfini
  const res = root?.ResocontoAnomalie || {};
  const sconfini = {
    entro90:  (res?.ListaSconfiniEntroNovantaGiorni || []).map(r => ({
      data: r?.data || "—",
      banca: r?.banca || "—",
      categoria: r?.categoria || "—",
      tipo: r?.tipo_attivita || "—",
      importo: toNumberEU(r?.importo_sconfinamento),
      utilizzo: toNumberEU(r?.utilizzo_posizione_sconfinata),
      probErrata: r?.probabile_errata_segnalazione || "—",
    })),
    entro180: (res?.ListaSconfiniEntroCentoOttantaGiorni || []).map(r => ({
      data: r?.data || "—",
      banca: r?.banca || "—",
      categoria: r?.categoria || "—",
      tipo: r?.tipo_attivita || "—",
      importo: toNumberEU(r?.importo_sconfinamento),
      utilizzo: toNumberEU(r?.utilizzo_posizione_sconfinata),
      probErrata: r?.probabile_errata_segnalazione || "—",
    })),
    oltre180: (res?.ListaSconfiniOltreCentoOttantaGiorni || []).map(r => ({
      data: r?.data || "—",
      banca: r?.banca || "—",
      categoria: r?.categoria || "—",
      tipo: r?.tipo_attivita || "—",
      importo: toNumberEU(r?.importo_sconfinamento),
      utilizzo: toNumberEU(r?.utilizzo_posizione_sconfinata),
      probErrata: r?.probabile_errata_segnalazione || "—",
    })),
  };

  // --- Affidamenti
  const affPesati = root?.AnalisiAffidamenti?.ListaAffidamentiConPesiPerBanca || [];
  const pesiByKey = new Map(
    affPesati.map(a => {
      const key = `${a?.nome_banca}|${a?.categoria}`;
      return [key, { pesoAcc: Number(a?.PesoAccordatoOperativo || 0), pesoUtl: Number(a?.PesoUtilizzato || 0) }];
    })
  );

  const affidamenti = (affGen || []).map(a => {
    const accordato = Number(a?.totAccordatoOperativo || 0);
    const utilizzato = Number(a?.totUtilizzato || 0);
    const key = `${a?.nome_banca}|${a?.categoria}`;
    const pesi = pesiByKey.get(key) || { pesoAcc: 0, pesoUtl: 0 };
    return {
      banca: a?.nome_banca || "—",
      categoria: a?.categoria || "—",
      accordato,
      utilizzato,
      pesoAcc: pesi.pesoAcc,
      pesoUtl: pesi.pesoUtl,
    };
  });

  // --- Indebitamento
  const ind = root?.AnalisiIndebitamento || {};
  const SERIE_COMPLESSIVO = seriesFromApiBlock(ind?.IndebitamentoTotale || {});
  const SERIE_SCADENZA    = seriesFromApiBlock(ind?.IndebitamentoPerCategoria?.["RISCHI A SCADENZA"] || {});
  const SERIE_AUTOLIQ     = seriesFromApiBlock(ind?.IndebitamentoPerCategoria?.["RISCHI AUTOLIQUIDANTI"] || {});

  // --- Posizioni Rischio & Garanzie
  const rg   = root?.RischiGaranzie || {};
  const pr   = rg?.PosizioniDiRischio || {};
  const gar  = rg?.Garanzie || {};

  const posizioniRischi = {
    gestibili: {
      scaduti: Number(pr?.Gestibili?.TotaleCreditiScaduti || 0),
      impagati: Number(pr?.Gestibili?.TotaleCreditiScadutiImpagati || 0),
      incidenzaImpagati: Number(String(pr?.Gestibili?.PercentualeIncidenzaImpagati || "0").replace(",", ".")),
      sconfinati90: Number(pr?.QuasiPregiudizievoli?.TotaleScadutiSconfinatiEntroNovantaGiorni || 0), // usato come <90gg
    },
    quasiPregiud: {
      sconfinati90_180: Number(pr?.QuasiPregiudizievoli?.TotaleScadutiSconfinatiEntroCentoOttantaGiorni || 0),
      sconfinati180:    Number(pr?.QuasiPregiudizievoli?.TotaleScadutiSconfinatiOltreCentoOttantaGiorni || 0),
    },
    pregiud: {
      sofferenzeRispetto: Number(pr?.Pregiudizievoli?.TotaleSofferenze || 0),
      sofferenzeAPerd:    Number(pr?.Pregiudizievoli?.TotaleCreditiPassatiPerdita || 0),
      contestati:         Number(pr?.Pregiudizievoli?.TotaleCreditiContestati || 0),
    },
  };

  const garanzie = {
    garantiValore:  Number(gar?.InfoGaranti?.TotaleValore || 0),
    garantiImporto: Number(gar?.InfoGaranti?.TotaleImporto || 0),
    ricevuteValore: Number(gar?.GaranzieRicevute?.TotaleValore || 0),
    ricevuteImporto:Number(gar?.GaranzieRicevute?.TotaleImporto || 0),
  };

  const anagrafica = root?.Anagrafica || null;
  const righeGrezze = root?.RigheGrezze || [];

  return {
    panoramica, intermediari,
    anomalieUtilizzi, anomalieLievi,
    sconfini, affidamenti,
    serie: { complessivo: SERIE_COMPLESSIVO, scadenza: SERIE_SCADENZA, autoliquida: SERIE_AUTOLIQ },
    posizioniRischi, garanzie,
    anagrafica, righeGrezze,
  };
}

/* ----------------- Page ----------------- */
export default function CentraleRischiDettaglio(props) {

  const { id } = useParams();
  const {
period = id,  // se lo passi, override
    dataInizio = undefined,
    dataFine   = undefined,
    inputBanks = undefined,
  } = props;
 
  const effectivePeriod = period || '835642630';

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(() => parseStateFromApi({}));
  const [intermediariOpen, setIntermediariOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("sintesi");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!effectivePeriod) throw new Error("Manca il parametro 'codiceDocumento' (period).");

        const raw = await CentraleRischi.andamentale({
          period: effectivePeriod,
          data_inizio: dataInizio,
          data_fine: dataFine,
          inputBanks,
        });
        if (!mounted) return;
        setData(parseStateFromApi(raw || {}));
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Errore di caricamento");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [effectivePeriod, dataInizio, dataFine, inputBanks]);

  const PANORAMICA = data.panoramica;
  const INTERMEDIARI = data.intermediari;

  // --- Page context for AI ChatWidget ---
  useSetPageContext(
    !loading && PANORAMICA ? {
      page: "Analisi Centrale Rischi",
      summary: `Centrale Rischi - ${PANORAMICA.periodoAnalisi || 'N/D'}`,
      data: {
        periodo: PANORAMICA.periodoAnalisi,
        accordatoTotale: PANORAMICA.accordatoTotale,
        utilizzatoTotale: PANORAMICA.utilizzatoTotale,
        percentualeUtilizzato: PANORAMICA.percentualeUtilizzato,
        sconfinantiTotale: PANORAMICA.sconfinantiTotale,
        scadutoTotale: PANORAMICA.scadutoTotale,
        intermediari: INTERMEDIARI?.length || 0,
      }
    } : null
  );
  const ANOMALIE_UTILIZZI = data.anomalieUtilizzi;
  const ANOMALIE_LIEVI = data.anomalieLievi;
  const SCONF_90   = data.sconfini.entro90;
  const SCONF_180  = data.sconfini.entro180;
  const SCONF_OLTRE= data.sconfini.oltre180;
  const AFFIDAMENTI = data.affidamenti;
  const SERIE_COMPLESSIVO = data.serie.complessivo;
  const SERIE_SCADENZA    = data.serie.scadenza;
  const SERIE_AUTOLIQ     = data.serie.autoliquida;
  const POSIZIONI_RISCHI  = data.posizioniRischi;
  const GARANZIE          = data.garanzie;
  const ANAGRAFICA        = data.anagrafica;
  const RIGHE_GREZZE      = data.righeGrezze;

  const totAcc = useMemo(()=> sum(AFFIDAMENTI, a=>a.accordato), [AFFIDAMENTI]);
  const totUtl = useMemo(()=> sum(AFFIDAMENTI, a=>a.utilizzato), [AFFIDAMENTI]);

  const affiRows = useMemo(()=> {
    return AFFIDAMENTI.map(a=>({
      ...a,
      pesoAcc: a.pesoAcc || ((Number(a?.accordato||0)/(totAcc||1))*100),
      pesoUtl: a.pesoUtl || ((Number(a?.utilizzato||0)/(totUtl||1))*100),
    }));
  }, [AFFIDAMENTI, totAcc, totUtl]);

  // --- Pie per tipologia (categoria): già pieByCategoria
  const pieByCategoria = useMemo(()=>{
    const map = new Map();
    affiRows.forEach(a=>{
      map.set(a.categoria, (map.get(a.categoria)||0) + (Number(a.accordato)||0));
    });
    return Array.from(map.entries()).map(([name, value])=>({ name, value }));
  }, [affiRows]);

  // --- Pie per banca
  const pieByBanca = useMemo(()=>{
    const map = new Map();
    affiRows.forEach(a=>{
      map.set(a.banca, (map.get(a.banca)||0) + (Number(a.accordato)||0));
    });
    return Array.from(map.entries()).map(([name, value])=>({ name, value }));
  }, [affiRows]);

  // --- Stacked: tipologia x banca (valore: accordato)
  const stackedByTipoBanca = useMemo(()=>{
    const catSet = new Set(affiRows.map(a=>a.categoria));
    const cats = Array.from(catSet);
    const bancaMap = new Map();
    affiRows.forEach(a=>{
      if (!bancaMap.has(a.banca)) bancaMap.set(a.banca, { banca: a.banca });
      const row = bancaMap.get(a.banca);
      row[a.categoria] = (row[a.categoria] || 0) + (Number(a.accordato)||0);
    });
    return { rows: Array.from(bancaMap.values()), cats };
  }, [affiRows]);

  // --- Memoized chart data for Posizioni Rischi bar chart
  const posizioniBarData = useMemo(() => [
    {
      label: "Gestibili",
      scaduti: Number(POSIZIONI_RISCHI?.gestibili?.scaduti || 0),
      impagati: Number(POSIZIONI_RISCHI?.gestibili?.impagati || 0),
      sconfinati90: Number(POSIZIONI_RISCHI?.gestibili?.sconfinati90 || 0),
    },
    {
      label: "Quasi pregiud.",
      sconfinati_90_180: Number(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati90_180 || 0),
      sconfinati_180: Number(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati180 || 0),
    },
    {
      label: "Pregiudizievoli",
      sofferenzeRispetto: Number(POSIZIONI_RISCHI?.pregiud?.sofferenzeRispetto || 0),
      sofferenzeAPerd: Number(POSIZIONI_RISCHI?.pregiud?.sofferenzeAPerd || 0),
      contestati: Number(POSIZIONI_RISCHI?.pregiud?.contestati || 0),
    },
  ], [POSIZIONI_RISCHI]);

  // --- Memoized chart data for scaglioni bar chart
  const scaglioniBarData = useMemo(() => [
    { fascia: "<30gg", valore: 12000 },
    { fascia: "30–60", valore: 9000 },
    { fascia: "60–90", valore: 5000 },
    { fascia: ">90", valore: Number(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati90_180 || 0) },
  ], [POSIZIONI_RISCHI]);

  // --- Static chart data (memoized once)
  const trendEsempioData = useMemo(() => [
    { m:"Gen", v: 10 },{ m:"Feb", v: 14 },{ m:"Mar", v: 13 },
    { m:"Apr", v: 16 },{ m:"Mag", v: 15 },{ m:"Giu", v: 17 },
  ], []);

  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadReport = async () => {
    if (!effectivePeriod) return;
    try {
      setPdfLoading(true);
      const auth = (() => { try { return JSON.parse(localStorage.getItem("authUser")); } catch { return null; } })();
      const token = auth?.token || auth?.access_token || auth?.jwt || null;
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const companyId = localStorage.getItem("currentCompany");
      if (companyId) headers["CurrentCompany"] = companyId;
      const res = await fetch(`${API_BASE}/reportCRFormale/${effectivePeriod}`, { headers });
      if (!res.ok) throw new Error("Errore API");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      alert("Errore durante la generazione del PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <FullPageLoader show={loading} />
    );
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-700">
          Errore: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans min-h-screen text-slate-800 animate-fade-in-up">
      {/* Return button */}
      <a href="/analisi-cr" className="inline-flex items-center gap-2 text-sm text-[#5b63ff] hover:text-[#454de0] font-semibold transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-180">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
        Torna a tutti i documenti CR
      </a>

      {/* === HERO PANORAMICA ======================================= */}
      <section className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col xl:flex-row items-center xl:items-stretch gap-6">
        <div className="shrink-0 flex items-center justify-center pt-2 xl:pt-0 xl:pr-6 xl:border-r border-slate-100">
          <ScoreRing value={Number(PANORAMICA.score)||0} />
        </div>
        <div className="flex-1 w-full flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-[#5b63ff] font-semibold uppercase tracking-widest">Rapporto Dettagliato Centrale Rischi</div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                Analisi del Rischio e Indebitamento
              </h1>
              <p className="mt-2 text-[15px] text-slate-500 max-w-xl leading-relaxed">
                Valutazione sintetica ricavata dall'ultimo periodo caricato.
              </p>
              {ANAGRAFICA && (
                <div className="mt-3 text-sm text-slate-700 font-medium">
                  <strong>Intestatario:</strong> Azienda Censurata
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <KpiTile icon={IconCalendar} label="Periodo analizzato" value={PANORAMICA.period || "—"} />
              <IntermediariTile
                items={INTERMEDIARI}
                total={INTERMEDIARI.length || PANORAMICA.numIntermediari || 0}
                onOpen={() => setIntermediariOpen(true)}
              />
              <button
                onClick={downloadReport}
                disabled={pdfLoading}
                className={`h-[46px] px-5 rounded-xl border text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 print:hidden ${pdfLoading ? 'bg-slate-500 border-slate-500 text-white/70 cursor-wait' : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 hover:shadow-lg'}`}
              >
                {pdfLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Stampa Relazione
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("sintesi")}
          className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === "sintesi" ? "text-[#5b63ff]" : "text-slate-500 hover:text-slate-800"}`}
        >
          Sintesi e Cruscotto
          {activeTab === "sintesi" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#5b63ff] rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("righe")}
          className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === "righe" ? "text-[#5b63ff]" : "text-slate-500 hover:text-slate-800"}`}
        >
          Dati Estratti (Righe)
          {activeTab === "righe" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#5b63ff] rounded-t-full"></span>
          )}
        </button>
      </div>

      {activeTab === "sintesi" && (
        <div className="space-y-6">
          <KpiContestazioni value={PANORAMICA.contestate || 0} />

      <AnomalieGrid title="Anomalie Utilizzi" items={ANOMALIE_UTILIZZI} />
      <AnomalieGrid title="Anomalie Lievi"   items={ANOMALIE_LIEVI} />

      <div className="flex items-center gap-4 mt-8 mb-4">
        <div className="h-px bg-slate-200 flex-1"></div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Dettaglio Sconfini</h2>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      {/* Sconfini */}
      <Card title="Sconfini Entro 90 Giorni">
        <Table
          dense
          cols={[
            {key:"data", title:"Data"},
            {key:"banca", title:"Banca"},
            {key:"categoria", title:"Categoria Di Rischio"},
            {key:"tipo", title:"Tipo Attività"},
            {key:"importo", title:"Importo Sconfinamento", render:(v)=>fmtMoney(v)},
            {key:"utilizzo", title:"Utilizzo Posizione Sconfinata", render:(v)=>fmtMoney(v)},
            {key:"probErrata", title:"Prob. Errata"},
          ]}
          rows={SCONF_90}
        />
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
        <Card title="Sconfini Entro 180 Giorni">
          <Table dense cols={[
            {key:"data", title:"Data"},
            {key:"banca", title:"Banca"},
            {key:"categoria", title:"Categoria Di Rischio"},
            {key:"tipo", title:"Tipo Attività"},
            {key:"importo", title:"Importo Sconfinamento", render:(v)=>fmtMoney(v)},
            {key:"utilizzo", title:"Utilizzo Posizione Sconfinata", render:(v)=>fmtMoney(v)},
            {key:"probErrata", title:"Prob. Errata"},
          ]} rows={SCONF_180}/>
        </Card>
        <Card title="Sconfini Oltre 180 Giorni">
          <Table dense cols={[
            {key:"data", title:"Data"},
            {key:"banca", title:"Banca"},
            {key:"categoria", title:"Categoria Di Rischio"},
            {key:"tipo", title:"Tipo Attività"},
            {key:"importo", title:"Importo Sconfinamento", render:(v)=>fmtMoney(v)},
            {key:"utilizzo", title:"Utilizzo Posizione Sconfinata", render:(v)=>fmtMoney(v)},
            {key:"probErrata", title:"Prob. Errata"},
          ]} rows={SCONF_OLTRE}/>
        </Card>
      </div>

      <div className="flex items-center gap-4 mt-8 mb-4">
        <div className="h-px bg-slate-200 flex-1"></div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Affidamenti</h2>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      {/* Affidamenti: tabella + 3 charts richiesti */}
      <Card title="Lista Affidamenti" subtitle="Ultimo mese del periodo considerato">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div>
            <Table
              dense
              cols={[
                {key:"banca", title:"Banca"},
                {key:"categoria", title:"Categoria"},
                {key:"accordato", title:"Accordato Totale", render:(v)=>fmtMoney(v)},
                {key:"pesoAcc", title:"Peso % Acc.", render:(v)=>v.toFixed(2)+" %"},
                {key:"utilizzato", title:"Utilizzato Totale", render:(v)=>fmtMoney(v)},
                {key:"pesoUtl", title:"Peso % Utl.", render:(v)=>v.toFixed(2)+" %"},
              ]}
              rows={affiRows}
            />
            <div className="mt-2 text-xs text-neutral-500">
              Record totali: {affiRows.length}
            </div>
          </div>

          <div className="grid gap-4">
            {/* Donut per tipologia (Accordato) */}
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-2">Affidamenti per Tipologia (Accordato)</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(v)=>fmtMoney(v)} />
                    <Legend />
                    <Pie
                      data={pieByCategoria}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {pieByCategoria.map((_, i) => (
                        <Cell key={i} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut per banca (Accordato) */}
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-2">Affidamenti per Banca (Accordato)</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(v)=>fmtMoney(v)} />
                    <Legend />
                    <Pie
                      data={pieByBanca}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {pieByBanca.map((_, i) => (
                        <Cell key={i} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stacked bar Tipologia x Banca (Accordato) */}
            <div className="border border-neutral-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-2">Accordato per Tipologia e Banca</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedByTipoBanca.rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="banca" />
                    <YAxis />
                    <Tooltip formatter={(v)=>fmtMoney(v)} />
                    <Legend />
                    {stackedByTipoBanca.cats.map((cat, i) => (
                      <Bar key={i} dataKey={cat} stackId="stack" name={cat} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-4 mt-8 mb-4">
        <div className="h-px bg-slate-200 flex-1"></div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Analisi Indebitamento</h2>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      {/* Analisi indebitamento – Recharts */}
      <Card title="Analisi Indebitamento Complessivo">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SERIE_COMPLESSIVO} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" />
              <YAxis />
              <Tooltip formatter={(v)=>fmtMoney(v)} />
              <Legend />
              <Area type="monotone" dataKey="accordato" name="Accordato" />
              <Area type="monotone" dataKey="utilizzato" name="Utilizzato" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Analisi per Rischi a Scadenza">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SERIE_SCADENZA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis />
                <Tooltip formatter={(v)=>fmtMoney(v)} />
                <Legend />
                <Line type="monotone" dataKey="accordato" name="Accordato" dot={false} />
                <Line type="monotone" dataKey="utilizzato" name="Utilizzato" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Analisi per Rischi Autoliquidanti">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SERIE_AUTOLIQ}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis />
                <Tooltip formatter={(v)=>fmtMoney(v)} />
                <Legend />
                <Line type="monotone" dataKey="accordato" name="Accordato" dot={false} />
                <Line type="monotone" dataKey="utilizzato" name="Utilizzato" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ===== Posizioni di Rischio – impaginazione nuova ===== */}
      <div className="flex items-center gap-4 mt-8 mb-4">
        <div className="h-px bg-slate-200 flex-1"></div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Posizioni di Rischio e Garanzie</h2>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      <Card title="Posizioni di Rischio – Sintesi e Grafici" subtitle="Valori medi sul periodo">
        {/* 3 colonne: stacked bar / tabella compatta / donut contestazioni */}
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-5">
          {/* Stacked bar */}
          <div className="h-72 border border-neutral-200 rounded-xl p-3">
            <div className="text-sm font-medium mb-2">Distribuzione per Classe</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={posizioniBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v)=>fmtMoney(v)} />
                <Legend />
                <Bar dataKey="scaduti" stackId="A" name="Scaduti" />
                <Bar dataKey="impagati" stackId="A" name="Impagati" />
                <Bar dataKey="sconfinati90" stackId="A" name="< 90gg" />
                <Bar dataKey="sconfinati_90_180" stackId="B" name="90–180gg" />
                <Bar dataKey="sconfinati_180" stackId="B" name="> 180gg" />
                <Bar dataKey="sofferenzeRispetto" stackId="C" name="Soff. / Garantito" />
                <Bar dataKey="sofferenzeAPerd" stackId="C" name="Soff. a Perdita" />
                <Bar dataKey="contestati" stackId="C" name="Contestati" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabellina più leggibile */}
          <div className="border border-neutral-200 rounded-xl p-3">
            <div className="text-sm font-medium mb-2">Dettaglio valori</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-700">
                  <tr>
                    <th className="px-3 py-2"></th>
                    <th className="px-3 py-2">Scaduti</th>
                    <th className="px-3 py-2">Impagati</th>
                    <th className="px-3 py-2">&lt; 90gg</th>
                    <th className="px-3 py-2">90–180gg</th>
                    <th className="px-3 py-2">&gt; 180gg</th>
                    <th className="px-3 py-2">Soff. / Garantito</th>
                    <th className="px-3 py-2">Soff. a Perdita</th>
                    <th className="px-3 py-2">Contestati</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-neutral-200">
                    <td className="px-3 py-2 font-medium">Valori</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.gestibili?.scaduti || 0)}</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.gestibili?.impagati || 0)}</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.gestibili?.sconfinati90 || 0)}</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati90_180 || 0)}</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati180 || 0)}</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.pregiud?.sofferenzeRispetto || 0)}</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.pregiud?.sofferenzeAPerd || 0)}</td>
                    <td className="px-3 py-2">{fmtMoney(POSIZIONI_RISCHI?.pregiud?.contestati || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* KPI garanzie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <KpiBox label="Tot. Valore Garanzie - Info Sui Garanti" value={fmtMoney(GARANZIE?.garantiValore || 0)} />
              <KpiBox label="Tot. Importo Garanzie - Info Sui Garanti" value={fmtMoney(GARANZIE?.garantiImporto || 0)} />
              <KpiBox label="Tot. Valore Garanzie - Garanzie Ricevute" value={fmtMoney(GARANZIE?.ricevuteValore || 0)} />
              <KpiBox label="Tot. Importo Garantito - Garanzie Ricevute" value={fmtMoney(GARANZIE?.ricevuteImporto || 0)} />
            </div>
          </div>

          {/* Donut “quota criticità” */}
          <div className="h-72 border border-neutral-200 rounded-xl p-3">
            <div className="text-sm font-medium mb-2">Composizione Criticità</div>
            <DonutCriticita POSIZIONI_RISCHI={POSIZIONI_RISCHI} />
          </div>
        </div>

        {/* Trend secondari (esempio) */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Trend sintetico (esempio)">
            <div className="h-48">
               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendEsempioData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="m" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="v" name="Indice composito" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Ripartizione scaglioni scaduto (esempio)">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scaglioniBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fascia" />
                  <YAxis />
                  <Tooltip formatter={(v)=>fmtMoney(v)} />
                  <Legend />
                  <Bar dataKey="valore" name="Importo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </Card>
      </div>
      )}

      {activeTab === "righe" && (
        <Card title="Righe Documento Estratte" subtitle="Mostrate nel preciso ordine in cui compaiono nel documento. Include anche i garanti.">
          <Table 
            dense
            cols={[
              {key: "periodo", title: "Periodo", render: (_, r) => `${r.mese || ""} ${r.anno || ""}`.trim() },
              {key: "nome_banca", title: "Intermediario / Garante", render: (_, r) => r.nome_garante ? `${r.nome_banca} - Garante: ${r.nome_garante}` : (r.nome_banca || "—") },
              {key: "sezione", title: "Sezione" },
              {key: "categoria", title: "Categoria" },
              {key: "accordato", title: "Accordato", render: (v) => v || "—" },
              {key: "utilizzato", title: "Utilizzato", render: (v) => v || "—" },
              {key: "importo", title: "Importo / Garanzia", render: (_, r) => r.importo || r.importo_garantito || r.garantito || r.garanzia || r.valore_garanzia || "—" },
              {key: "saldo_medio", title: "Saldo Medio" },
            ]}
            rows={RIGHE_GREZZE} 
          />
        </Card>
      )}

      {/* loader "extra" come nel file originale */}
      <FullPageLoader show={loading} />

      {/* === MODALE INTERMEDIARI === */}
      {intermediariOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIntermediariOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">Intermediari Trovati</div>
                <div className="text-sm text-slate-500 mt-0.5">{INTERMEDIARI.length} istituti rilevati nel documento</div>
              </div>
              <button onClick={() => setIntermediariOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              {INTERMEDIARI.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">Nessun intermediario rilevato.</div>
              ) : (
                <div className="space-y-2">
                  {INTERMEDIARI.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <BankAvatar name={b.name} code={b.code} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 text-sm truncate">{b.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Codice: {b.code}</div>
                      </div>
                      <div className="text-xs font-bold text-slate-300 uppercase">#{i + 1}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Sub-components ----------------- */
function Card({ title, subtitle, right, children, className="" }) {
  return (
    <section className={`bg-white border border-slate-200/60 rounded-2xl shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#5b63ff] rounded-full"></div>
            {title}
          </h2>
          {subtitle && <p className="text-sm font-medium text-slate-500 mt-1 ml-3.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Table({ cols, rows, empty = "Nessun dato", dense=false }) {
  return (
    <div className="overflow-auto">
      <table className={`w-full ${dense ? "text-[13px]" : "text-sm"}`}>
        <thead className="bg-neutral-50 text-neutral-700">
          <tr>
            {cols.map((c) => <th key={c.key} className="text-left px-3 py-2">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {(!rows || rows.length === 0) && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={cols.length}>{empty}</td>
            </tr>
          )}
          {rows?.map((r, i) => (
            <tr key={i} className="border-t border-neutral-200">
              {cols.map((c) => (
                <td key={c.key} className="px-3 py-2 align-top">
                  {c.render ? c.render(r[c.key], r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiTile({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-5 py-3.5 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-[#5b63ff]">
        <Icon />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest truncate">{label}</div>
        <div className="text-base font-bold text-slate-800 truncate">{value}</div>
      </div>
    </div>
  );
}

function KpiTileTwo({ icon, label }) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-5 py-3.5 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-[#5b63ff]">
        <Icon />
      </div>
      <div className="min-w-0 flex flex-col gap-1 justify-center">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate">{label || "Azioni"}</div>
        <button className="h-7 px-3 inline-flex items-center justify-center rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all whitespace-nowrap">
          Vedi Documento
        </button>
      </div>
    </div>
  );
}



const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M4 19h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IconId = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M14 10h5M14 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

function AvatarsStack({ items }) {
  const show = items.slice(0, 6);
  return (
    <div className="flex -space-x-2">
      {show.map((b, i) => (
        <BankAvatar key={i} name={b.name} code={b.code} logo={b.logo} />
      ))}
    </div>
  );
}
function BankAvatar({ name, code, logo }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className="w-8 h-8 rounded-full ring-2 ring-white object-cover"
        title={name}
      />
    );
  }
  const initials = (code || name || "").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "IN";
  const bg = colorFromString(name || code || "IN");
  return (
    <div
      className="w-8 h-8 rounded-full ring-2 ring-white grid place-items-center text-[11px] font-semibold text-white"
      style={{ background: bg }}
      title={name}
    >
      {initials}
    </div>
  );
}
function colorFromString(s) {
  const palette = ["#111827","#0ea5e9","#16a34a","#f59e0b","#6d28d9","#dc2626","#14b8a6","#a855f7"];
  let h = 0; for (let i=0;i<s.length;i++) { h = (h<<5)-h+s.charCodeAt(i); h|=0; }
  return palette[Math.abs(h) % palette.length];
}

function IntermediariTile({ items, total, onOpen }) {
  const tot = total || items?.length || 0;
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-5 py-3.5 flex items-center justify-between gap-4 shadow-sm">
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest truncate mb-1.5">Intermediari Trovati</div>
        <div className="mt-1 flex items-center gap-3">
          <AvatarsStack items={items} />
          <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 text-xs font-semibold text-slate-600 bg-white shadow-sm">
            {tot} totali
          </span>
        </div>
      </div>
      <div className="flex items-center">
        <button
          onClick={onOpen ?? (() => {})}
          className="h-8 px-3.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-all"
        >
          Vedi tutti
        </button>
      </div>
    </div>
  );
}

function KpiContestazioni({ value = 0 }) {
  const ok = Number(value) === 0;
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}>
        {ok ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Analisi Esposizioni e Rischio</div>
        <div className="font-bold text-slate-800 text-lg leading-tight mt-0.5">N° Posizioni Contestate: {Number(value).toLocaleString("it-IT")}</div>
        <div className={`text-sm mt-1 font-medium ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
          {ok ? "Nessuna anomalia grave rilevata." : "Anomalia rilevata! Verifica il dettaglio."}
        </div>
      </div>
    </div>
  );
}

const Check = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const X = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);

function StatusPill({ state, value }) {
  if (state === "na") {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 shadow-sm">
      {typeof value==="number" ? `· ${value}` : "N/D"}
    </span>;
  }
  if (state === "bad") {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 shadow-sm">
      <X/> Sì
    </span>;
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm">
    <Check/> No
  </span>;
}

const IcoBolt = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);
const IcoShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 3 5 6v6c0 5 7 9 7 9s7-4 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IcoAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 9v5m0 3v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IcoHash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M5 9h14M3 15h14M9 3 7 21M17 3l-2 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

function AnomaliaCard({ item }) {
  const state = item.neutral ? "na" : (item.ok ? "ok" : "bad");
  const bgClass = state === "ok" ? "bg-emerald-50 text-emerald-600" : state === "bad" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500";
  const Icon = item.icon === "bolt" ? IcoBolt
            : item.icon === "shield" ? IcoShield
            : item.icon === "alert" ? IcoAlert
            : IcoHash;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${bgClass}`}>
        <Icon/>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-800 leading-tight mb-1">{item.label}</div>
        <div className="text-xs font-semibold text-slate-500">
          {state==="na" ? "Dato non applicabile" : (state==="ok" ? "Nessuna anomalia rilevata" : "Anomalia rilevata")}
        </div>
      </div>
      <div className="flex shrink-0">
        <StatusPill state={state} value={item.value}/>
      </div>
    </div>
  );
}

function AnomalieGrid({ title, items }) {
  return (
    <section className="mt-8 mb-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-px bg-slate-200 flex-1"></div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">{title}</h2>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it, idx) => <AnomaliaCard key={it.key || idx} item={it}/>)}
      </div>
    </section>
  );
}

/* ====== Gauge ring “pieno” con valore /10 ====== */
function ScoreRing({ value=0, size=140 }) {
  const color = scoreColor(value);
  const pct = Math.max(0, Math.min(100, (value/10)*100));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct/100);
  return (
    <div className="relative" style={{width:size, height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="#eee" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#ringGrad)" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-3xl font-semibold" style={{color}}>
          {Number(value).toLocaleString("it-IT")}
          <span className="text-sm text-neutral-500"> /10</span>
        </div>
      </div>
    </div>
  );
}

/* ====== Donut criticità ====== */
function DonutCriticita({ POSIZIONI_RISCHI }) {
  const data = [
    { name: "Gestibili", value:
      Number(POSIZIONI_RISCHI?.gestibili?.scaduti||0) +
      Number(POSIZIONI_RISCHI?.gestibili?.impagati||0) +
      Number(POSIZIONI_RISCHI?.gestibili?.sconfinati90||0)
    },
    { name: "Quasi pregiud.", value:
      Number(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati90_180||0) +
      Number(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati180||0)
    },
    { name: "Pregiud.", value:
      Number(POSIZIONI_RISCHI?.pregiud?.sofferenzeRispetto||0) +
      Number(POSIZIONI_RISCHI?.pregiud?.sofferenzeAPerd||0) +
      Number(POSIZIONI_RISCHI?.pregiud?.contestati||0)
    },
  ];
  const total = data.reduce((a,b)=>a+b.value,0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip formatter={(v)=>fmtMoney(v)} />
        <Legend />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} />)}
        </Pie>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="600">
          {fmtMoney(total)}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}

function KpiBox({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 flex items-center justify-between">
      <div className="text-neutral-700 font-medium">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function FullPageLoader({ show }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 grid place-items-center animate-fade-in" role="status">
      <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl">
        <div className="h-10 w-10 border-4 border-slate-100 border-t-[#5b63ff] rounded-full animate-spin" style={{ willChange: 'transform' }} />
        <div className="text-sm font-semibold text-slate-700">Caricamento dati Centrale Rischi...</div>
      </div>
    </div>
  );
}
