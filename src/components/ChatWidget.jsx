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

  // Keep a ref so the send() callback always sees the latest context
  const pageContextRef = useRef(pageContext);
  useEffect(() => {
    pageContextRef.current = pageContext;
    window.__ADA_PAGE_CONTEXT__ = pageContext;
  }, [pageContext]);

  const companyId = (() => {
    try { return JSON.parse(localStorage.getItem("sb_company"))?.id || 1; }
    catch { return 1; }
  })();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

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

    // Read context from ref (always fresh) or window fallback
    const ctx = pageContextRef.current || window.__ADA_PAGE_CONTEXT__ || null;

    let enrichedQuestion = q;
    if (ctx) {
      const ctxStr = typeof ctx.data === 'object'
        ? JSON.stringify(ctx.data, null, 0)
        : String(ctx.data || '');
      enrichedQuestion = `[Contesto pagina: ${ctx.page || pathname}${ctx.summary ? ' - ' + ctx.summary : ''}]\n${ctxStr ? 'Dati visibili: ' + ctxStr.slice(0, 4000) + '\n' : ''}Domanda utente: ${q}`;
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
  }, [input, loading, messages, companyId, pathname]);

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((s) => !s)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9998,
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(99,102,241,.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform .2s",
          transform: open ? "scale(0)" : "scale(1)",
        }}
        aria-label="Apri chat AI"
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 5.58 2 10c0 2.24 1.12 4.26 2.92 5.68L4 20l4.73-2.09C9.77 18.29 10.86 18.5 12 18.5c5.52 0 10-3.58 10-8S17.52 2 12 2z" fill="#fff"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 380, height: 520, borderRadius: 20,
          background: "#fff", border: "1px solid #e2e8f0",
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "chatSlideUp .25s ease-out",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#fff",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>ADA AI Agent</div>
              <div style={{ fontSize: 11, opacity: .8 }}>
                {pageContextRef.current
                  ? `📍 ${pageContextRef.current.page || 'Pagina'}`
                  : "Assistente intelligente"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8,
                width: 28, height: 28, cursor: "pointer", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: "auto", padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10,
            background: "#f8fafc",
          }}>
            {messages.length === 0 && !loading && (
              <div style={{
                textAlign: "center", color: "#94a3b8", fontSize: 13,
                marginTop: 60, lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                Chiedimi qualsiasi cosa su{" "}
                {pageContextRef.current?.page
                  ? <strong>{pageContextRef.current.page}</strong>
                  : "ADA"}
                !
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}>
                <div style={{
                  padding: "10px 14px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.55,
                  ...(m.role === "user"
                    ? { background: "#6366f1", color: "#fff", borderBottomRightRadius: 4 }
                    : { background: "#fff", color: "#1e293b", border: "1px solid #e2e8f0", borderBottomLeftRadius: 4 }),
                  whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </div>
                {m.sources?.length > 0 && (
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {m.sources.map((s, j) => (
                      <span key={j} style={{
                        fontSize: 10, background: "#f1f5f9", border: "1px solid #e2e8f0",
                        borderRadius: 6, padding: "2px 6px", color: "#64748b",
                      }}>
                        📄 {s.filename || s.document_id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
                <div style={{
                  padding: "10px 14px", borderRadius: 14, fontSize: 13,
                  background: "#fff", border: "1px solid #e2e8f0",
                  display: "flex", alignItems: "center", gap: 6, color: "#94a3b8",
                }}>
                  <span className="dot-pulse" />
                  Sto pensando…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px", borderTop: "1px solid #e2e8f0",
            display: "flex", gap: 8, background: "#fff",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Scrivi un messaggio…"
              style={{
                flex: 1, height: 38, borderRadius: 10, border: "1px solid #e2e8f0",
                padding: "0 12px", fontSize: 13.5, outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: loading || !input.trim() ? "#e2e8f0" : "#6366f1",
                border: "none", cursor: loading || !input.trim() ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .2s",
              }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" fill={loading || !input.trim() ? "#94a3b8" : "#fff"} />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dot-pulse {
          display: inline-block; width: 6px; height: 6px; border-radius: 50%;
          background: #94a3b8; animation: dotPulse 1.2s infinite;
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: .3; transform: scale(.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}
