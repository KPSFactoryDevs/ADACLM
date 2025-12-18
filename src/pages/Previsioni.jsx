import React from "react";

export default function Previsioni() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 shadow-sm overflow-hidden bg-gradient-to-r from-[#F7F6FF] to-white">
        <div className="p-5">
          <div className="text-sm text-[#5b63ff] font-medium">Pianificazione</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Previsioni</h1>
          <p className="text-sm text-neutral-500">Scenario planning e forecasting dei flussi (coming soon).</p>
        </div>
      </section>

      <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-10 grid place-items-center">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-neutral-900 text-white grid place-items-center mb-3">
            <TrendIcon />
          </div>
          <h3 className="font-medium">Area in costruzione</h3>
          <p className="text-sm text-neutral-500">Qui vedrai le previsioni di cassa e i relativi scenari.</p>
        </div>
      </section>
    </div>
  );
}

function TrendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 17l6-6 4 4 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 21H3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
