import React from 'react';

export function Gauge({ value = 0, color = "#111", size = 84, stroke = 10, label = "", subtitle = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Calculate offset for the animation
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex justify-center items-center group">
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`} 
          className="transform transition-transform duration-500 hover:scale-105 drop-shadow-sm"
        >
          {/* Background circle track */}
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={r} 
            stroke="#f1f5f9" /* slate-100 */
            strokeWidth={stroke} 
            fill="none" 
          />
          {/* Foreground colored circle path */}
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={r} 
            stroke={color} 
            strokeWidth={stroke} 
            fill="none"
            strokeDasharray={c} 
            strokeDashoffset={off} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} 
          />
          {/* Central value text */}
          <text 
            x="50%" 
            y="50%" 
            textAnchor="middle" 
            dominantBaseline="central" 
            fontSize="18" 
            fontWeight="bold"
            fill="#1e293b" /* slate-800 */
            className="font-sans"
          >
            {value}
          </text>
        </svg>
      </div>
      {label && (
        <div className="text-sm flex flex-col justify-center">
          <div className="font-semibold text-slate-800">{label}</div>
          <div className="text-slate-500 text-xs mt-0.5">{subtitle || `punteggio ${value}/100`}</div>
        </div>
      )}
    </div>
  );
}
