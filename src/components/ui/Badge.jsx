import React from 'react';

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    indigo: "bg-[#F1EFFF] text-[#5b63ff] border-[#D8D2FF] ring-[#5b63ff]/10",
    teal: "bg-teal-50 text-teal-700 border-teal-200/60 ring-teal-500/10",
    amber: "bg-amber-50 text-amber-700 border-amber-200/60 ring-amber-500/10",
    neutral: "bg-slate-50 text-slate-600 border-slate-200/60 ring-slate-900/5",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-500/10",
    rose: "bg-rose-50 text-rose-700 border-rose-200/60 ring-rose-500/10"
  };

  const dots = {
    indigo: "bg-[#5b63ff] shadow-[0_0_4px_#5b63ff]",
    teal: "bg-teal-500 shadow-[0_0_4px_#14b8a6]",
    amber: "bg-amber-500 shadow-[0_0_4px_#f59e0b]",
    neutral: "bg-slate-400",
    emerald: "bg-emerald-500 shadow-[0_0_4px_#10b981]",
    rose: "bg-rose-500 shadow-[0_0_4px_#f43f5e]"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-transform duration-300 hover:scale-105 border ring-1 ${tones[tone]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}
