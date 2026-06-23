// src/components/ChatWidget.jsx
import React, { useState, useEffect } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Premium Lock Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 max-w-[92vw] bg-white border border-slate-200/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
          {/* Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#F7F6FF] to-white">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] grid place-items-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <span className="font-bold text-sm text-slate-800">Chat AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Chiudi"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 text-center">
            {/* Lock icon */}
            <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] text-white grid place-items-center shadow-md shadow-[#5b63ff]/15 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1.5">Funzionalità Premium</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              La Chat AI è riservata agli utenti con piano <strong className="text-[#5b63ff]">Premium</strong>. 
              Attiva l'abbonamento per interrogare i tuoi dati finanziari con domande in linguaggio naturale.
            </p>

            {/* Mini features */}
            <div className="space-y-1.5 text-left mb-5">
              {[
                "Domande libere sui tuoi dati",
                "Analisi intelligente bilanci e CR",
                "Report generati dall'AI",
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-4 h-4 rounded-full bg-[#5b63ff]/10 text-[#5b63ff] grid place-items-center shrink-0">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4 4 10-10"/></svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>

            <button
              onClick={() => alert("Contatta il supporto per attivare il piano Premium.")}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-[#5b63ff] to-[#7e85ff] text-white text-xs font-bold shadow-md shadow-[#5b63ff]/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Attiva Piano Premium
            </button>
            <p className="text-[10px] text-slate-400 mt-2">Contatta il tuo referente commerciale</p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen((s) => !s)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg bg-[#5b63ff] text-white grid place-items-center hover:opacity-90 z-50 transition-transform hover:scale-105"
        aria-label="Apri chat AI"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-5 5V6Z" stroke="white" strokeWidth="1.8" />
          <circle cx="10" cy="9.5" r="1" fill="white"/>
          <circle cx="14" cy="9.5" r="1" fill="white"/>
          <circle cx="18" cy="9.5" r="1" fill="white"/>
        </svg>
      </button>
    </>
  );
}
