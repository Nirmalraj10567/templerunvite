import React from 'react';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Top heading + language */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Hi User</h2>
      </div>

      {/* Stat gradient cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500">
          <div className="text-sm opacity-90">Total Members</div>
          <div className="text-3xl font-bold mt-2">1,247</div>
          <div className="text-xs mt-2 opacity-90">+12% from last month</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-rose-500 via-red-600 to-rose-600">
          <div className="text-sm opacity-90">Paid Members</div>
          <div className="text-3xl font-bold mt-2">892</div>
          <div className="text-xs mt-2 opacity-90">+7% from last month</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-rose-600 via-rose-700 to-red-700">
          <div className="text-sm opacity-90">Unpaid Members</div>
          <div className="text-3xl font-bold mt-2">355</div>
          <div className="text-xs mt-2 opacity-90">-5% from last month</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600">
          <div className="text-sm opacity-90">Upcoming Events</div>
          <div className="text-3xl font-bold mt-2">8</div>
          <div className="text-xs mt-2 opacity-90">This week</div>
        </div>
      </div>

      {/* Two columns: Recent Members and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="rounded-2xl bg-white border border-slate-200/60 backdrop-blur-sm shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Members</h3>
          <div className="space-y-3">
            {[
              { name: 'Rajesh Kumar', time: '2 hours ago', status: 'Active', color: 'text-emerald-600' },
              { name: 'Priya Sharma', time: '4 hours ago', status: 'Active', color: 'text-emerald-600' },
              { name: 'Amit Patel', time: '1 day ago', status: 'Pending', color: 'text-amber-600' },
              { name: 'Sita Devi', time: '2 days ago', status: 'Active', color: 'text-emerald-600' },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center justify-center">👤</div>
                  <div>
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.time}</div>
                  </div>
                </div>
                <span className={`text-sm font-medium ${m.color}`}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl bg-white border border-slate-200/60 backdrop-blur-sm shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className="rounded-2xl p-6 text-left text-white bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 shadow hover:brightness-105 transition">
              <div className="text-lg font-semibold">Add Member</div>
            </button>
            <button className="rounded-2xl p-6 text-left text-white bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 shadow hover:brightness-105 transition">
              <div className="text-lg font-semibold">View Reports</div>
            </button>
            <button className="rounded-2xl p-6 text-left text-white bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow hover:brightness-105 transition">
              <div className="text-lg font-semibold">Collect Payment</div>
            </button>
            <button className="rounded-2xl p-6 text-left text-white bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 shadow hover:brightness-105 transition">
              <div className="text-lg font-semibold">Schedule Event</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
