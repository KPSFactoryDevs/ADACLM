// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 w-80 max-w-[92vw] bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden z-50"
        >
          <div className="h-11 px-4 flex items-center justify-between border-b border-neutral-200">
            <div className="font-medium">Assistenza</div>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-500 hover:text-neutral-900"
              aria-label="Chiudi chat"
            >
              ×
            </button>
          </div>
          <div className="h-64 p-3 space-y-2 overflow-auto text-sm">
            <div className="bg-neutral-100 rounded-xl px-3 py-2 w-fit max-w-[85%]">
              Ciao! Come posso aiutarti?
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setText("");
            }}
            className="p-3 border-t border-neutral-200 flex items-center gap-2"
          >
            <input
              className="flex-1 h-10 rounded-xl border border-neutral-200 px-3 outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Scrivi un messaggio…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="submit"
              className="h-10 px-3 rounded-xl bg-neutral-900 text-white text-sm"
            >
              Invia
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen((s) => !s)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg bg-[#5b63ff] text-white grid place-items-center hover:opacity-90 z-50"
        aria-label="Apri chat di supporto"
      >
        {/* chat icon */}
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
