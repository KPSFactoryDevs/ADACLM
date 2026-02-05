// src/pages/CentraleRischiDettaglio.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { CentraleRischi } from "../lib/api";
import { useParams } from 'react-router-dom';
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

  return {
    panoramica, intermediari,
    anomalieUtilizzi, anomalieLievi,
    sconfini, affidamenti,
    serie: { complessivo: SERIE_COMPLESSIVO, scadenza: SERIE_SCADENZA, autoliquida: SERIE_AUTOLIQ },
    posizioniRischi, garanzie,
  };
}

/* ----------------- Page ----------------- */
export default function CentraleRischiDettaglio(props) {

  const { id } = useParams();
  const {
    codiceDocumento,      // <- DEFAULT period da qui
period = id,  // se lo passi, override
    dataInizio = undefined,
    dataFine   = undefined,
    inputBanks = undefined,
  } = props;
 
  const effectivePeriod = period || '835642630';

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(() => parseStateFromApi({}));
  const [docOpen, setDocOpen] = useState(false); // modale documento

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
    <div className="space-y-6">
      {/* === PANORAMICA ======================================= */}
      <section className="rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5 flex items-center justify-left gap-4">
          <ScoreRing value={Number(PANORAMICA.score)||0} />
          <div className="min-w-0">
            <div className="text-sm text-[#5b63ff] font-medium">Centrale Rischi · Panoramica</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Valutazione Centrale Rischi</h1>
            <p className="text-sm text-neutral-500">Sintesi dell’ultimo periodo caricato.</p>
          </div>
        </div>

        {/* aggiunti placeholder RS e P.IVA */}
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiTile icon={IconCalendar} label="Periodo di riferimento" value={PANORAMICA.period || "—"} />
          <IntermediariTile
            items={INTERMEDIARI}
            total={INTERMEDIARI.length || PANORAMICA.numIntermediari || 0}
            onOpenDoc={() => setDocOpen(true)}
          />

                    <KpiTileTwo icon={IconCalendar} label="Azioni" />
     
        </div>
      </section>

      <KpiContestazioni value={PANORAMICA.contestate || 0} />

      <AnomalieGrid title="Anomalie Utilizzi" items={ANOMALIE_UTILIZZI} />
      <AnomalieGrid title="Anomalie Lievi"   items={ANOMALIE_LIEVI} />

      <div className="px-2 text-center mt-5">
        <h1 className="text-xl font-bold">Dettaglio</h1>
      </div>

      <div className="px-2">
        <h1 className="text-xl font-bold">Sconfini</h1>
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

      <div className="px-2">
        <h1 className="text-xl font-bold">Affidamenti</h1>
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

      <div className="px-2">
        <h1 className="text-xl font-bold">Analisi Indebidamento</h1>
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
      <div className="px-2">
        <h1 className="text-xl font-bold">Posizioni di Rischio</h1>
      </div>

      <Card title="Posizioni di Rischio – Sintesi e Grafici" subtitle="Valori medi sul periodo">
        {/* 3 colonne: stacked bar / tabella compatta / donut contestazioni */}
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-5">
          {/* Stacked bar */}
          <div className="h-72 border border-neutral-200 rounded-xl p-3">
            <div className="text-sm font-medium mb-2">Distribuzione per Classe</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
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
              ]}>
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
                <LineChart data={[
                  { m:"Gen", v: 10 },{ m:"Feb", v: 14 },{ m:"Mar", v: 13 },
                  { m:"Apr", v: 16 },{ m:"Mag", v: 15 },{ m:"Giu", v: 17 },
                ]}>
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
                <BarChart data={[
                  { fascia: "<30gg", valore: 12000 },
                  { fascia: "30–60", valore: 9000 },
                  { fascia: "60–90", valore: 5000 },
                  { fascia: ">90", valore: (Number(POSIZIONI_RISCHI?.quasiPregiud?.sconfinati90_180||0)) },
                ]}>
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

      {/* loader "extra" come nel file originale */}
      <FullPageLoader show={loading} />

      {/* === MODALE DOCUMENTO (placeholder) === */}
      {docOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={()=>setDocOpen(false)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Documento Centrale Rischi</div>
              <button onClick={()=>setDocOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-700">Chiudi</button>
            </div>
            <div className="mt-3 text-sm text-neutral-600">
              Qui verrà visualizzato il documento della Centrale Rischi (placeholder).
            </div>
            {PANORAMICA?.docUrl && (
              <div className="mt-4">
                <a
                  href={PANORAMICA.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-sm"
                >
                  Apri in nuova scheda
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Sub-components ----------------- */
function Card({ title, subtitle, right, children, className="" }) {
  return (
    <section className={`bg-white rounded-xl border border-neutral-200 shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
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

function KpiTile({ icon:Icon, label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/60 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full grid place-items-center bg-neutral-900 text-white">
        <Icon />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-neutral-500 truncate">{label}</div>
        <div className="text-[15px] font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function KpiTileTwo({ icon:Icon, label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/60 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full grid place-items-center bg-neutral-900 text-white">
        <Icon />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-neutral-500 truncate">{label}</div>
        <div className="text-[15px] font-medium truncate">{value}</div>

                <button 
          className="h-8 px-3 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
        >
          Visualizza Documento
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

function IntermediariTile({ items, total, onClick, onOpenDoc }) {
  const tot = total || items?.length || 0;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/60 backdrop-blur px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs text-neutral-500">Intermediari</div>
        <div className="mt-1 flex items-center gap-3">
          <AvatarsStack items={items} />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-neutral-300">
            {tot} totali
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClick ?? (() => alert("Elenco intermediari"))}
          className="h-8 px-3 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
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
    <div className="rounded-xl border border-neutral-200 bg-white p-3 mx-1 my-0 shadow-sm flex items-start gap-3">
      <div className="w-9 h-9 rounded-full grid place-items-center text-white shrink-0 bg-black">
        {ok ? <Check /> : <X />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-tight">N° Posizioni Contestate</div>
        <div className="text-xs text-neutral-500">
          {ok ? "Nessuna anomalia rilevata" : "Anomalia rilevata"}
        </div>
      </div>
      {Number(value).toLocaleString("it-IT")}
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
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 text-xl">
      {typeof value==="number" ? `· ${value}` : ""}
    </span>;
  }
  if (state === "bad") {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs">
      <X/> Sì
    </span>;
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs">
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
  const color = state === "ok" ? "#16a34a" : state === "bad" ? "#dc2626" : "#9ca3af";
  const Icon = item.icon === "bolt" ? IcoBolt
            : item.icon === "shield" ? IcoShield
            : item.icon === "alert" ? IcoAlert
            : IcoHash;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm flex items-start gap-3">
      <div className="w-9 h-9 rounded-full grid place-items-center text-white shrink-0" style={{background:color}}>
        <Icon/>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-tight">{item.label}</div>
        <div className="text-xs text-neutral-500">
          {state==="na" ? "Dato non applicabile" : (state==="ok" ? "Nessuna anomalia rilevata" : "Anomalia rilevata")}
        </div>
      </div>
      <StatusPill state={state} value={item.value}/>
    </div>
  );
}

function AnomalieGrid({ title, items }) {
  return (
    <section className="m-1">
      <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-1 gap-1">
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
    <div
      className="fixed inset-0 z-50 bg-white/70 backdrop-blur-[1px] grid place-items-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full border-4 border-neutral-300 border-t-neutral-900 animate-spin" />
        <div className="text-sm text-neutral-700">Caricamento dati Centrale Rischi</div>
      </div>
    </div>
  );
}
