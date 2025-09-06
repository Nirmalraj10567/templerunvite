import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState('Temple Trust');
  const [email, setEmail] = useState('info@templetrust.org');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-orange-900">Admin Settings</h2>
      <div className="rounded-xl border border-orange-100 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Organization Name</label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-lg border border-orange-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Contact Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-orange-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div className="text-sm text-gray-500">Only admins can access this page. You are: <span className="font-semibold capitalize">{user?.role}</span></div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600">Save</button>
          <button className="px-4 py-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}
