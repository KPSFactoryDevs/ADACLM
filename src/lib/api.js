// src/lib/api.js
export const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://127.0.0.1:8000/api" 
    : "https://ada-stage.compaynet-b2b.com/api");

export const API_URL  = API_BASE;

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
  update(id, payload) {
    return api(`/company/${id}`, { method: "POST", body: payload });
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

/* ----------------- Factoring (Cessione del Credito) ----------------- */
function authHeaders() {
  const h = {};
  const t = getToken();
  const cid = getCompanyId();
  if (t)   h["Authorization"]  = `Bearer ${t}`;
  if (cid) h["CurrentCompany"] = cid;
  return h;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.errors || "Errore di rete";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

export const Factoring = {
  listClients() {
    return api("/credito/clients");
  },

  deleteClient(clientId) {
    return api(`/credito/clients/${clientId}`, { method: "DELETE" });
  },

  async uploadXml(files) {
    const fd = new FormData();
    files.forEach((f) => fd.append("files[]", f));
    const res = await fetch(`${API_BASE}/credito/invoices/upload-xml`, {
      method: "POST",
      headers: { ...authHeaders(), Accept: "application/json" },
      body: fd,
    });
    return handleResponse(res);
  },

  async uploadDocument(clientId, file, type) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const res = await fetch(`${API_BASE}/credito/clients/${clientId}/documents`, {
      method: "POST",
      headers: { ...authHeaders(), Accept: "application/json" },
      body: fd,
    });
    return handleResponse(res);
  },

  sendForEvaluation(clientId, notes = "") {
    return api(`/credito/clients/${clientId}/evaluate`, {
      method: "POST",
      body: { notes },
    });
  },
};


/* ----------------- Estratti Conto (Bank Statements) ----------------- */
export const BankStatements = {
  list() {
    return api("/bank-statements");
  },

  async upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/bank-statements/upload`, {
      method: "POST",
      headers: { ...authHeaders(), Accept: "application/json" },
      body: fd,
    });
    return handleResponse(res);
  },

  analyze(id) {
    return api(`/bank-statements/${id}/analyze`, { method: "POST" });
  },

  show(id) {
    return api(`/bank-statements/${id}`);
  },

  update(id, data) {
    return api(`/bank-statements/${id}`, { method: "PUT", body: data });
  },

  delete(id) {
    return api(`/bank-statements/${id}`, { method: "DELETE" });
  },
};
