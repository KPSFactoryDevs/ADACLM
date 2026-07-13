// src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Agent } from "../lib/api";
import { usePageContext } from "../contexts/PageContext";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageContext = usePageContext();

  const companyId = (() => {
    try { return JSON.parse(localStorage.getItem("sb_company"))?.id || 1; }
    catch { return 1; }
  })();

  /* close on Esc */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* focus input when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  /* auto-scroll */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /* send message */
  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    // Build enriched question with page context
    let enrichedQuestion = q;
    if (pageContext) {
      const ctxStr = typeof pageContext.data === 'object'
        ? JSON.stringify(pageContext.data, null, 0)
        : String(pageContext.data || '');
      enrichedQuestion = `[Contesto pagina: ${pageContext.page || pathname}${pageContext.summary ? ' - ' + pageContext.summary : ''}]
${ctxStr ? 'Dati visibili: ' + ctxStr.slice(0, 3000) + '\n' : ''}Domanda utente: ${q}`;
    }

    try {
      const res = await Agent.chat(enrichedQuestion, companyId, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer || "Nessuna risposta.", sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Errore. Riprova." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, companyId, pageContext, pathname]);

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 w-96 max-w-[92vw] bg-white border border-slate-200/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up flex flex-col"
          style={{ maxHeight: "min(70vh, 560px)" }}
        >
          {/* Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#F7F6FF] to-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="white" strokeWidth="2"/><circle cx="9" cy="12" r="1.3" fill="white"/><circle cx="15" cy="12" r="1.3" fill="white"/></svg>
              </div>
              <span className="font-bold text-sm text-slate-800">ADA AI</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setOpen(false); navigate("/aichat"); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#5b63ff] hover:bg-slate-100 transition-colors"
                title="Apri in pagina intera"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Chiudi"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && !loading && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="white" strokeWidth="1.6"/><path d="M12 2v4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="12" r="1.3" fill="white"/><circle cx="15" cy="12" r="1.3" fill="white"/></svg>
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Ciao! Chiedimi qualcosa</p>
                <p className="text-xs text-slate-400">Bilanci, CR, fatture o guida ADA</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-1.5`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="white" strokeWidth="2.5"/></svg>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#5b63ff] text-white rounded-br-sm"
                    : "bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-sm"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources?.length > 0 && (
                    <div className="mt-1.5 pt-1 border-t border-slate-200/50 flex flex-wrap gap-1">
                      {msg.sources.slice(0, 3).map((s, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          📄 {s.filename || s.document_id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* typing */}
            {loading && (
              <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="white" strokeWidth="2.5"/></svg>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl rounded-bl-sm px-3 py-2 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5b63ff] animate-bounce" style={{ animationDelay: "0s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5b63ff] animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5b63ff] animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 px-3 py-2.5 bg-slate-50/50 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Scrivi una domanda..."
                disabled={loading}
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#5b63ff]/30 focus:border-[#5b63ff] transition disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-lg bg-[#5b63ff] text-white grid place-items-center shrink-0 hover:bg-[#4a52ee] transition disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9 22 2Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen((s) => !s)}
        className="fixed bottom-6 right-6 w-13 h-13 rounded-full shadow-lg bg-[#5b63ff] text-white grid place-items-center hover:opacity-90 z-50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#5b63ff]/25"
        aria-label="Apri chat AI"
        style={{ width: 52, height: 52 }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-5 5V6Z" stroke="white" strokeWidth="1.8" />
            <circle cx="10" cy="9.5" r="1" fill="white"/>
            <circle cx="14" cy="9.5" r="1" fill="white"/>
            <circle cx="18" cy="9.5" r="1" fill="white"/>
          </svg>
        )}
        {/* notification dot */}
        {!open && messages.length === 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        )}
      </button>
    </>
  );
}
