// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_BASE || "https://ada-stage.compaynet-b2b.com/api";
const API_URL  = import.meta.env.VITE_API_BASE || "https://ada-stage.compaynet-b2b.com/api";

/* ----------------- helpers token/azienda ----------------- */
function getToken() {
  try { return JSON.parse(localStorage.getItem("sb_auth"))?.token || null; }
  catch { return null; }
}
function getAuth() {
  try { return JSON.parse(localStorage.getItem("sb_auth"))?.token; } catch { return null; }
}
function getCompanyId() {
  try { return JSON.parse(localStorage.getItem("sb_company"))?.id; } catch { return null; }
}

/* ----------------- wrapper fetch generico ----------------- */
export async function api(path, { method = "GET", body, auth = true, headers: extraHeaders } = {}) {
  const headers = { "Content-Type": "application/json", ...(extraHeaders || {}) };

  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;

    const companyId = getCompanyId();
    if (companyId) headers["CurrentCompany"] = companyId;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(()=> ({}));
  if (!res.ok) {
    const message = data?.message || data?.errors || "Errore di rete";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

/* ----------------- Auth ----------------- */
export const Auth = {
  async login(email, password) {
    return api("/login", { method: "POST", body: { email, password }, auth: false });
  },
  async logout() {
    return api("/logout", { method: "POST" });
  },
};

/* ----------------- Companies ----------------- */
export const Companies = {
  list() {
    return api("/company");
  },
  create(payload) {
    return api("/company", { method: "POST", body: payload });
  },
};

/* ----------------- Invoices (legacy) ----------------- */
/* Lasciate come nel tuo file; se vuoi puoi rifattorizzarle su api() */
export const Invoices = {
  async list() {
    const token = getAuth();
    const companyId = getCompanyId();
    const r = await fetch(`${API_URL}/invoices`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "CurrentCompany": companyId ?? "",
      },
    });
    if (!r.ok) throw new Error(`Errore lista fatture: ${r.status}`);
    return r.json();
  },

  async importFromCloud({ date_from, date_to } = {}) {
    const token = getAuth();
    const companyId = getCompanyId();
    const qs = new URLSearchParams();
    if (date_from) qs.set("date_from", date_from);
    if (date_to)   qs.set("date_to", date_to);

    const r = await fetch(`${API_URL}/invoices/import?${qs.toString()}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "CurrentCompany": companyId ?? "",
      },
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Import fallita: ${t || r.status}`);
    }
    return r.json();
  },
};

/* ----------------- Centrale Rischi ----------------- */
/**
 * Endpoint Laravel:
 *   Route::get('/crAndamentale/{period}/{data_inizio?}/{data_fine?}/{inputBanks?}', '...@crAndamentale');
 *
 * Uso:
 *   const data = await CentraleRischi.andamentale({
 *     period: "671456837",
 *     data_inizio: "2020-01-01", // opzionale
 *     data_fine:   "2020-12-31", // opzionale
 *     inputBanks:  "ISP,UCG"     // opzionale
 *   });
 */
export const CentraleRischi = {
  async andamentale({ period, data_inizio, data_fine, inputBanks } = {}) {
    if (!period) throw new Error("Parametro 'period' obbligatorio");

    // Costruzione path con segmenti opzionali, come da rotta Laravel
    let path = `/crAndamentale/${encodeURIComponent(period)}`;
    if (data_inizio && data_fine) {
      path += `/${encodeURIComponent(data_inizio)}/${encodeURIComponent(data_fine)}`;
      if (inputBanks) path += `/${encodeURIComponent(inputBanks)}`;
    }

    // Usa il wrapper api(): aggiunge automaticamente Authorization + CurrentCompany
    return api(path, { method: "GET" });
  },
};
