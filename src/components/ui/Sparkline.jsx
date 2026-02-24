import React from 'react';

export function Sparkline({ data = [], color = "#111", width = '100%', height = 60, strokeWidth = 2.5 }) {
  if (!data.length) return null;
  const computedWidth = 260; // For internal viewBox calculation
  const max = Math.max(...data);
  const min = Math.min(...data);
  const padY = 5; 
  const dx = computedWidth / (data.length - 1 || 1);
  const graphHeight = height - (padY * 2);

  const sy = (v) => max === min 
    ? height / 2 
    : padY + graphHeight - ((v - min) / (max - min)) * graphHeight;
    
  let pathD = ""; 
  let areaD = "";
  
  data.forEach((v, i) => { 
    const x = i * dx; 
    const y = sy(v); 
    pathD += (i === 0 ? "M" : "L") + x + " " + y + " "; 
    areaD += (i === 0 ? "M" : "L") + x + " " + y + " ";
  });
  
  if (data.length > 0) {
    areaD += `L${computedWidth} ${height} L0 ${height} Z`;
  }

  return (
    <div className="w-full relative overflow-hidden flex justify-center group">
      <svg width={width} height={height} viewBox={`0 0 ${computedWidth} ${height}`} className="w-full h-full drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.02]">
        <defs>
          <linearGradient id={`gradient-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#gradient-${color.replace('#','')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Render a dot at the end for emphasis */}
        {data.length > 0 && (
          <circle cx={computedWidth} cy={sy(data[data.length - 1])} r="3" fill="#fff" stroke={color} strokeWidth="2" />
        )}
      </svg>
    </div>
  );
}
