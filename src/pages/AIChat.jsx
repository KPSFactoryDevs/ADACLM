// src/pages/AIChat.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Agent } from "../lib/api";

/* ─── helper: parse semplice markdown → JSX ─── */
function MiniMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="prose-sm leading-relaxed">
      {lines.map((line, i) => {
        // bold
        let node = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        // bullet
        if (/^[-•]\s/.test(node))
          node = `<li style="margin-left:1rem">${node.replace(/^[-•]\s/, "")}</li>`;
        // numbered
        if (/^\d+\.\s/.test(node))
          node = `<li style="margin-left:1rem">${node.replace(/^\d+\.\s/, "")}</li>`;
        return <p key={i} dangerouslySetInnerHTML={{ __html: node }} className="mb-1" />;
      })}
    </div>
  );
}

/* ─── constants ─── */
const SUGGESTIONS = [
  "Come funziona il modulo bilanci?",
  "Cosa indica il DSCR?",
  "Quali sono gli indicatori della Centrale Rischi?",
  "A cosa serve il sistema di allerta?",
];

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const companyId = (() => {
    try { return JSON.parse(localStorage.getItem("sb_company"))?.id || 1; }
    catch { return 1; }
  })();

  /* auto-scroll */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /* focus input on mount */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* ─── send ─── */
  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    setInput("");
    setError("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: q, ts: Date.now() }]);
    setLoading(true);

    try {
      const res = await Agent.chat(q, companyId, history);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer || "Nessuna risposta.",
          sources: res.sources || [],
          ts: Date.now(),
        },
      ]);
    } catch (err) {
      setError(err.message || "Errore di comunicazione con l'agente AI.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Si è verificato un errore. Riprova.", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages, companyId]);

  /* enter to send */
  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="h-full flex flex-col gap-4 font-sans text-slate-800 animate-fade-in-up">
      {/* HERO */}
      <section className="rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[#5b63ff] font-semibold uppercase tracking-widest">AI · Agent</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Assistente ADA
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Fai domande sui tuoi documenti finanziari o su come usare la piattaforma.
            </p>
          </div>
          {/* status dot */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Online</span>
          </div>
        </div>
      </section>

      {/* CHAT */}
      <section className="flex-1 min-h-0 bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-12">
              {/* bot avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center shadow-lg shadow-[#5b63ff]/20">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="4" y="6" width="16" height="12" rx="3" stroke="white" strokeWidth="1.6" />
                  <path d="M12 2v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="9" cy="12" r="1.3" fill="white" />
                  <circle cx="15" cy="12" r="1.3" fill="white" />
                  <path d="M8 16h8" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Ciao! Sono ADA AI</h2>
                <p className="text-sm text-slate-500 max-w-md">
                  Posso rispondere a domande sui tuoi bilanci, la centrale rischi, le fatture e su come usare la piattaforma.
                </p>
              </div>
              {/* suggestions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-[#F7F6FF] hover:border-[#5b63ff]/30 hover:text-[#5b63ff] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2.5`}>
              {/* assistant avatar */}
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="white" strokeWidth="2"/><circle cx="9" cy="12" r="1.3" fill="white"/><circle cx="15" cy="12" r="1.3" fill="white"/></svg>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-[#5b63ff] text-white rounded-br-md"
                    : "bg-slate-50 text-slate-800 border border-slate-100 rounded-bl-md"
                }`}
              >
                {msg.role === "user" ? (
                  <p>{msg.content}</p>
                ) : (
                  <MiniMarkdown text={msg.content} />
                )}
                {/* sources */}
                {msg.sources?.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Fonti</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.sources.map((s, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-500 font-medium">
                          📄 {s.filename || s.document_id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* user avatar */}
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-800 grid place-items-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-white">TU</span>
                </div>
              )}
            </div>
          ))}

          {/* typing indicator */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="white" strokeWidth="2"/><circle cx="9" cy="12" r="1.3" fill="white"/><circle cx="15" cy="12" r="1.3" fill="white"/></svg>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#5b63ff] animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="w-2 h-2 rounded-full bg-[#5b63ff] animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="w-2 h-2 rounded-full bg-[#5b63ff] animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
        </div>

        {/* error */}
        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* input area */}
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Scrivi una domanda..."
              disabled={loading}
              className="flex-1 min-h-[42px] max-h-32 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5b63ff]/30 focus:border-[#5b63ff] transition disabled:opacity-50 placeholder:text-slate-400"
              style={{ fieldSizing: "content" }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="h-[42px] w-[42px] rounded-xl bg-[#5b63ff] text-white grid place-items-center shrink-0 hover:bg-[#4a52ee] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9 22 2Z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            ADA AI risponde in base ai documenti caricati. Verifica sempre i dati finanziari.
          </p>
        </div>
      </section>
    </div>
  );
}
