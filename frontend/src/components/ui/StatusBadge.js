import React from 'react';

const statusColors = {
  // Vehicle & Driver Statuses
  Available:  'bg-green-100 text-green-700 border border-green-200',
  'On Trip':  'bg-blue-100 text-blue-700 border border-blue-200',
  'In Shop':  'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Retired:    'bg-red-100 text-red-700 border border-red-200',
  Suspended:  'bg-red-100 text-red-700 border border-red-200',
  'Off Duty': 'bg-gray-100 text-gray-600 border border-gray-200',
  // Trip Statuses
  Draft:      'bg-gray-100 text-gray-600 border border-gray-200',
  Dispatched: 'bg-blue-100 text-blue-700 border border-blue-200',
  Completed:  'bg-green-100 text-green-700 border border-green-200',
  Cancelled:  'bg-red-100 text-red-700 border border-red-200',
  // Maintenance Log Statuses
  open:       'bg-yellow-100 text-yellow-700 border border-yellow-200',
  closed:     'bg-green-100 text-green-700 border border-green-200'
};

export default function StatusBadge({ status }) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-600 border border-gray-200';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colorClass}`}>
      {status}
    </span>
  );
}
