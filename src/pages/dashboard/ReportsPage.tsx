import React from 'react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-orange-900">Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-orange-900 mb-2">Monthly Summary</h3>
          <p className="text-gray-700 text-sm">A quick snapshot of this month's income and expenses.</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-orange-900 mb-2">Top Donors</h3>
          <p className="text-gray-700 text-sm">Recognizing supporters with the highest contributions.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6">
        <h3 className="font-semibold text-orange-900 mb-2">Export</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600">Export CSV</button>
          <button className="px-4 py-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50">Export PDF</button>
        </div>
      </div>
    </div>
  );
}
