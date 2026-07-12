import React from 'react';

export default function PayloadGauge({ value, max }) {
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const isOverloaded = percentage > 100 || value > max;

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-1">
        <span>Load: {value} / {max} kg</span>
        <span className={isOverloaded ? 'text-red-500 font-extrabold' : 'text-blue-500 font-bold'}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            isOverloaded ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {isOverloaded && (
        <p className="text-[10px] text-red-500 font-bold uppercase mt-1 animate-pulse">
          ⚠️ Overloaded! Exceeds vehicle load capacity
        </p>
      )}
    </div>
  );
}
