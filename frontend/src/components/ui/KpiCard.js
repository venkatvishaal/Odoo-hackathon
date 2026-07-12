import React from 'react';

export default function KpiCard({ title, count, icon: Icon, color = 'blue' }) {
  const bgColors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  const iconBg = bgColors[color] || 'bg-blue-50 text-blue-600';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition">
      <div className={`${iconBg} p-3 rounded-lg`}>
        {Icon && <Icon className="text-2xl" />}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-extrabold text-gray-800 mt-1">{count}</p>
      </div>
    </div>
  );
}
