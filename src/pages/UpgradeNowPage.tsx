import React from 'react';

export default function UpgradeNowPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow p-6 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Upgrade Now</h1>
        <p className="text-slate-600 mt-2">
          This is a special year-end page available during March and on April 1st. Use this page to
          perform any required closing or upgrade actions for the new financial year.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 border border-blue-100">
          <h2 className="font-semibold text-slate-800">Why you are seeing this</h2>
          <p className="text-slate-600 mt-1">
            Our system automatically highlights important year-end actions in March and on April 1st to
            help you transition smoothly to the next year.
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 border border-amber-100">
          <h2 className="font-semibold text-slate-800">Next steps</h2>
          <ul className="list-disc list-inside text-slate-700 mt-2 space-y-1">
            <li>Review your reports and backups</li>
            <li>Verify ledger balances</li>
            <li>Apply configuration updates for the new year</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
