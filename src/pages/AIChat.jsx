// src/pages/AIChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ===== Helpers storage ===== */
const load = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/** ===== Config & API ===== */
const API_BASE = (import.meta.env.VITE_API_BASE ?? "https://ada-stage.compaynet-b2b.com").replace(/\/$/, "");

// Legge auth e headers standard (Authorization + CurrentCompany se presenti)
function commonHeaders() {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };

  // token (compatibile con i tuoi storage attuali)
  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.token || parsed?.access_token || parsed?.jwt;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}

  // azienda corrente
  const currentCompany =
    localStorage.getItem("currentCompany") ||
    JSON.parse(localStorage.getItem("sb_company") || "null")?.id ||
    null;
  if (currentCompany) headers["CurrentCompany"] = currentCompany;

  return headers;
}

async function askAssistant(question) {
  const res = await fetch(`${API_BASE}/api/assistant`, {
    method: "POST",
    headers: commonHeaders(),
    body: JSON.stringify({ question }),
  });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data; // { ok, question, sql, explanation, summary, data, limit }
}

/** ====== Component ====== */
export default function AIChat() {
  const [messages, setMessages] = useState(() => load("sb_ai_chat", []));
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { save("sb_ai_chat", messages); }, [messages]);

  // autoscroll fluido
  useEffect(() => {
    const el = bottomRef.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const examples = [
    "Quali sono i clienti del 2024?",
    "Qual è il fatturato del 2024?",
    "Fatturato per mese nel 2023 (top 5 clienti)",
  ];

  const newChat = () => setMessages([]);

  const send = async () => {
    const q = text.trim();
    if (!q || loading) return;

    const userMsg = { id: Date.now(), role: "user", content: q, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setText("");
    setLoading(true);

    try {
      const data = await askAssistant(q);
      // Costruiamo un messaggio assistant strutturato
      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data?.summary || "Ecco i risultati richiesti.",
        ts: new Date().toISOString(),
        meta: {
          sql: data?.sql || null,
          explanation: data?.explanation || null,
          rows: Array.isArray(data?.data) ? data.data : [],
          limit: data?.limit ?? null,
        },
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errMsg = {
        id: Date.now() + 2,
        role: "assistant",
        content: `Errore: ${e.message || "richiesta fallita"}`,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const EmptyState = () => (
    <div className="p-10 grid place-items-center">
      <div className="text-center max-w-xl">
        <div className="mx-auto w-16 h-16 rounded-full bg-neutral-900 text-white grid place-items-center shadow mb-3">
          <BotIcon />
        </div>
        <h2 className="text-xl font-semibold">Assistente AI</h2>
        <p className="text-sm text-neutral-500">
          Fai domande libere. Esempi:
        </p>

        <div className="mt-5 grid gap-2">
          {examples.map((e, i) => (
            <button
              key={i}
              onClick={() => setText(e)}
              className="text-left px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-sm"
              title="Usa esempio"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-6">
      {/* HERO */}
      <section className="rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[#5b63ff] font-medium">AI · Chat</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Assistente AI</h1>
            <p className="text-sm text-neutral-500">
              Fai domande sul tuo database (es. clienti e fatturato per anno). Le query vengono dedotte automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={newChat} className="h-9 px-3 rounded-lg border border-neutral-300 text-sm">
              Nuova conversazione
            </button>
          </div>
        </div>
      </section>

      {/* CHAT BODY */}
      <section className="flex-1 bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Lista messaggi */}
        <div ref={listRef} className="flex-1 overflow-auto p-4">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} msg={m} />
                ) : (
                  <AssistantBubble key={m.id} msg={m} />
                )
              )}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-neutral-900 text-white grid place-items-center shrink-0">
                    <BotIcon small />
                  </div>
                  <div className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-neutral-200 p-3 bg-white">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Scrivi un messaggio… Es: Qual è il fatturato del 2024?"
                className="w-full max-h-32 h-10 rounded-lg border border-neutral-300 px-3 py-2 text-sm resize-none"
              />
              <div className="absolute right-2 bottom-2 text-xs text-neutral-400">Invio ↩︎</div>
            </div>
            <button
              onClick={send}
              disabled={!text.trim() || loading}
              className={
                "h-10 px-3 rounded-lg text-sm text-white " +
                (!text.trim() || loading ? "bg-neutral-300" : "bg-neutral-900 hover:opacity-90")
              }
            >
              Invia
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/** ====== Bubbles ====== */
function UserBubble({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl bg-neutral-900 text-white px-3 py-2 text-sm">
        {msg.content}
        <div className="mt-1 text-[11px] opacity-75 text-right">
          {fmtTime(msg.ts)}
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({ msg }) {
  const [showAll, setShowAll] = useState(false);
  const rows = msg?.meta?.rows || [];
  const limit = msg?.meta?.limit || null;
  const preview = useMemo(() => (showAll ? rows : rows.slice(0, 30)), [rows, showAll]);

  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-neutral-900 text-white grid place-items-center shrink-0">
        <BotIcon small />
      </div>
      <div className="max-w-[75%] rounded-2xl border border-neutral-200 px-3 py-2 text-sm">
        <div className="whitespace-pre-wrap">{msg.content}</div>

        {/* Extra info (SQL / dati / explanation) */}
        {msg.meta && (
          <div className="mt-2 text-xs text-neutral-700 space-y-3">
            {msg.meta.explanation && (
              <div className="px-2 py-1 rounded bg-neutral-50 border border-neutral-200">
                {msg.meta.explanation}
              </div>
            )}

            {msg.meta.sql && (
              <details className="group">
                <summary className="cursor-pointer flex items-center gap-2">
                  Mostra SQL
                  <CopyButton text={msg.meta.sql} />
                </summary>
                <pre className="mt-1 p-2 bg-neutral-50 border border-neutral-200 rounded text-xs overflow-auto">
{msg.meta.sql}
                </pre>
              </details>
            )}

            {Array.isArray(rows) && rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] border-neutral-300 bg-neutral-50">
                    {showAll ? rows.length : Math.min(rows.length, 30)} righe{limit ? ` (max ${limit})` : ""}
                  </span>
                  {rows.length > 30 && (
                    <button
                      onClick={() => setShowAll(s => !s)}
                      className="px-2 py-1 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50"
                    >
                      {showAll ? "Mostra prime 30" : "Mostra tutto"}
                    </button>
                  )}
                </div>
                <DataTable rows={preview} />
              </div>
            )}
          </div>
        )}

        <div className="mt-1 text-[11px] text-neutral-500">
          {fmtTime(msg.ts)}
        </div>
      </div>
    </div>
  );
}

/** ====== Data Table ====== */
function DataTable({ rows }) {
  const cols = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    // unione chiavi sui primi 50 record per sicurezza
    const keysSet = new Set();
    rows.slice(0, 50).forEach(r => Object.keys(r || {}).forEach(k => keysSet.add(k)));
    return Array.from(keysSet);
  }, [rows]);

  if (!rows || rows.length === 0) {
    return <div className="text-neutral-500">Nessun dato.</div>;
  }

  return (
    <div className="overflow-auto border border-neutral-200 rounded-md">
      <table className="min-w-full text-xs">
        <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-700">
          <tr>
            {cols.map(c => (
              <th key={c} className="px-2 py-2 text-left whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i ? "border-t border-neutral-100" : ""}>
              {cols.map(c => (
                <td key={c} className="px-2 py-1 align-top whitespace-nowrap">
                  {formatCell(r?.[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v) {
  if (v == null) return "—";
  if (typeof v === "number") {
    // prova a formattare come numero/valuta se sembra grande
    const abs = Math.abs(v);
    if (abs >= 1000) return v.toLocaleString("it-IT");
    return String(v);
  }
  const s = String(v);

  // ISO date / datetime
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isNaN(d) ? s : d.toLocaleDateString("it-IT");
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleString("it-IT");
  }

  // tronca stringhe lunghe ma con tooltip
  if (s.length > 60) {
    return (
      <span title={s}>
        {s.slice(0, 57)}…
      </span>
    );
  }
  return s;
}

/** ====== tiny helpers & UI ====== */
function fmtTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}
function BotIcon({ small=false }) {
  return (
    <svg width={small?14:18} height={small?14:18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M12 2v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="9" cy="12" r="1.3" fill="currentColor"/>
      <circle cx="15" cy="12" r="1.3" fill="currentColor"/>
      <path d="M8 16h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <Dot/><Dot delay="150ms"/><Dot delay="300ms"/>
    </span>
  );
}
function Dot({ delay="0ms" }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(text ?? "");
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className="text-[11px] px-2 py-0.5 rounded border border-neutral-300 bg-white hover:bg-neutral-50"
      title="Copia SQL"
    >
      {copied ? "Copiato ✓" : "Copia SQL"}
    </button>
  );
}
