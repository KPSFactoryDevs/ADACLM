import React, { useEffect, useState } from "react";
import { Companies } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function ImpostazioniAzienda() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companyId, setCompanyId] = useState(null);

  const [form, setForm] = useState({
    ragione_sociale: "",
    partita_iva: "",
    indirizzo: "",
    provincia: "",
    citta: "",
    cap: "",
    ateco: "",
    capitale_sociale: "",
    pec: "",
    ultimo_bilancio: "",
    fatturato: "",
    settore: "",
    telefono: ""
  });

  useEffect(() => {
    // Carichiamo la company attuale, se ce l'ha
    const loadCompany = async () => {
      try {
        const list = await Companies.list();
        let current = list[0]; // Usiamo la prima azienda o proviamo a prenderla dal localStorage

        try {
          const stored = JSON.parse(localStorage.getItem("sb_company"));
          if (stored && list.some(c => c.id === stored.id)) {
            current = list.find(c => c.id === stored.id);
          }
        } catch (e) {}

        if (current) {
          setCompanyId(current.id);
          setForm({
            ragione_sociale: current.ragione_sociale || "",
            partita_iva: current.partita_iva || "",
            indirizzo: current.indirizzo || "",
            provincia: current.provincia || "",
            citta: current.citta || "",
            cap: current.cap || "",
            ateco: current.ateco || "",
            capitale_sociale: current.capitale_sociale || "",
            pec: current.pec || "",
            ultimo_bilancio: current.ultimo_bilancio || "",
            fatturato: current.fatturato || "",
            settore: current.settore || "",
            telefono: current.telefono || ""
          });

          // assicuriamoci che il localstorage sia sincronizzato
          localStorage.setItem("sb_company", JSON.stringify(current));
        }
      } catch (err) {
        console.error("Errore caricamento azienda", err);
        setError("Errore nel caricamento dei dati dell'azienda");
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let savedData;
      if (companyId) {
        savedData = await Companies.update(companyId, form);
      } else {
        savedData = await Companies.create(form);
        setCompanyId(savedData.id);
      }
      
      localStorage.setItem("sb_company", JSON.stringify(savedData));
      setSuccess("Dati salvati con successo!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-neutral-500">Caricamento impostazioni...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Impostazioni Azienda</h1>
        <p className="text-sm text-neutral-500 mt-1">Gestisci i dettagli e le informazioni della tua azienda.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Informazioni di Base */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-800 border-b border-neutral-100 pb-2 mb-4">Informazioni di Base (Obbligatorie)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Ragione Sociale *</label>
                <input
                  type="text"
                  name="ragione_sociale"
                  required
                  value={form.ragione_sociale}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. ACME S.p.a."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Partita IVA *</label>
                <input
                  type="text"
                  name="partita_iva"
                  required
                  maxLength="11"
                  value={form.partita_iva}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. 01234567890"
                />
              </div>
            </div>
          </section>

          {/* Dettagli della Sede */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-800 border-b border-neutral-100 pb-2 mb-4">Sede Legale / Operativa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="md:col-span-2 lg:col-span-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Indirizzo Completo</label>
                <input
                  type="text"
                  name="indirizzo"
                  value={form.indirizzo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. Via Roma 1"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Città</label>
                <input
                  type="text"
                  name="citta"
                  value={form.citta}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. Milano"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Provincia</label>
                <input
                  type="text"
                  name="provincia"
                  maxLength="2"
                  value={form.provincia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. MI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">CAP</label>
                <input
                  type="text"
                  name="cap"
                  maxLength="5"
                  value={form.cap}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. 20100"
                />
              </div>
            </div>
          </section>

          {/* Dettagli Aziendali */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-800 border-b border-neutral-100 pb-2 mb-4">Profilo e Contatti</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Codice ATECO</label>
                <input
                  type="text"
                  name="ateco"
                  value={form.ateco}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. 62.01.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Settore Commerciale</label>
                <input
                  type="text"
                  name="settore"
                  value={form.settore}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. IT, Commercio, Edilizia..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Capitale Sociale (€)</label>
                <input
                  type="number"
                  step="0.01"
                  name="capitale_sociale"
                  value={form.capitale_sociale}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. 10000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Fatturato Annuo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  name="fatturato"
                  value={form.fatturato}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. 500000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Indirizzo PEC</label>
                <input
                  type="email"
                  name="pec"
                  value={form.pec}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="email@pec.it"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b63ff] focus:border-transparent transition"
                  placeholder="Es. +39 02 1234567"
                />
              </div>
            </div>
          </section>

        </div>

        {/* Footer actions */}
        <div className="p-6 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#5b63ff] hover:bg-[#4a51e6] text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Salvataggio...</span>
              </>
            ) : (
              "Salva Impostazioni"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
