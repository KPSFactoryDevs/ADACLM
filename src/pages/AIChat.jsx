// src/pages/AIChat.jsx
import React from "react";

export default function AIChat() {
  return (
    <div className="h-full flex flex-col gap-6 font-sans text-slate-800 animate-fade-in-up">
      {/* HERO */}
      <section className="rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[#5b63ff] font-semibold uppercase tracking-widest">AI · Chat</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Assistente AI
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Interroga i tuoi dati finanziari con domande in linguaggio naturale.
            </p>
          </div>
        </div>
      </section>

      {/* LOCKED STATE */}
      <section className="flex-1 bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col items-center justify-center p-10 relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235b63ff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative text-center max-w-md">
          {/* Lock icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5b63ff] to-[#7e85ff] text-white grid place-items-center shadow-lg shadow-[#5b63ff]/20 mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Funzionalità Premium</h2>
          <p className="text-slate-500 leading-relaxed mb-6">
            L'Assistente AI è disponibile esclusivamente per gli utenti con piano <strong className="text-[#5b63ff]">Premium</strong>.
            Attiva il tuo abbonamento per accedere a questa funzionalità avanzata e interrogare i tuoi dati finanziari con domande in linguaggio naturale.
          </p>

          {/* Features list */}
          <div className="grid gap-3 text-left mb-8">
            {[
              { icon: "💬", text: "Domande in linguaggio naturale sui tuoi dati" },
              { icon: "📊", text: "Analisi intelligente di bilanci e centrale rischi" },
              { icon: "🔍", text: "Query automatiche sul database aziendale" },
              { icon: "📈", text: "Report e insights generati dall'AI" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm text-slate-600 font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          <button
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#5b63ff] to-[#7e85ff] text-white text-sm font-bold shadow-lg shadow-[#5b63ff]/25 hover:shadow-xl hover:shadow-[#5b63ff]/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
            onClick={() => alert("Contatta il supporto per attivare il piano Premium.")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Attiva Piano Premium
          </button>

          <p className="text-xs text-slate-400 mt-4">
            Per maggiori informazioni contatta il tuo referente commerciale.
          </p>
        </div>
      </section>
    </div>
  );
}
