// src/lib/banks.js
import { api } from "./api"; // <-- usa il wrapper che aggiunge Bearer + CurrentCompany

export const Banks = {
  listAccounts: (companyId) => {
    const qs = new URLSearchParams();
    if (companyId) qs.set("company_id", companyId); // opzionale: il backend usa comunque CurrentCompany
    const q = qs.toString();
    return api(`/bank-accounts${q ? `?${q}` : ""}`);
  },

  getAccount: (id) => api(`/bank-accounts/${id}`),

  listTransactions: (accountId, params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      )
    ).toString();
    return api(`/bank-accounts/${accountId}/transactions${qs ? `?${qs}` : ""}`);
  },
};
