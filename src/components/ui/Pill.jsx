import React from 'react';

export function Pill({ text, color, className = "" }) {
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-transform duration-300 hover:scale-105 ${className}`}
      style={{ 
        color, 
        backgroundColor: `${color}15`, // 15% opacity wrapper
        borderColor: `${color}30`      // 30% border opacity
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" 
        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} 
      />
      {text}
    </span>
  );
}
