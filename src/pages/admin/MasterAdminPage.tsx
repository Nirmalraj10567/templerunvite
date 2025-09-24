import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/ui/data-table';

interface Tenant {
  id: number;
  name: string;
  db_path: string;
  status: string;
  created_at?: string;
}

export default function MasterAdminPage() {
  const { token, isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // CRUD form state
  const [form, setForm] = useState<{ id?: number; name: string; db_path: string; status: 'active' | 'inactive' }>({ name: '', db_path: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<any | null>(null);
  const [yearEnd, setYearEnd] = useState<{ enforced: boolean; locked: boolean } | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch('https://tmsapi.xesstechlink.com/api/superadmin/tenants', { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json())
      .then(d => setTenants(d?.data || []))
      .catch(() => {});
    fetch('https://tmsapi.xesstechlink.com/api/system/year-end-status', { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json())
      .then(d => setYearEnd(d?.data || { enforced: false, locked: false }))
      .catch(() => setYearEnd({ enforced: false, locked: false }));
  }, [isSuperAdmin, token]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://tmsapi.xesstechlink.com/api/superadmin/tenants/stats', { headers: { Authorization: `Bearer ${token}` }});
      const data = await res.json();
      setStats(data?.data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const setYearEndStatus = async (patch: Partial<{ enforced: boolean; locked: boolean }>) => {
    await fetch('https://tmsapi.xesstechlink.com/api/system/year-end-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    const r = await fetch('https://tmsapi.xesstechlink.com/api/system/year-end-status', { headers: { Authorization: `Bearer ${token}` }});
    const d = await r.json();
    setYearEnd(d?.data || { enforced: false, locked: false });
  };

  const refreshTenants = async () => {
    const r = await fetch('https://tmsapi.xesstechlink.com/api/superadmin/tenants', { headers: { Authorization: `Bearer ${token}` }});
    const d = await r.json();
    setTenants(d?.data || []);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.db_path) return;
    setSaving(true);
    try {
      await fetch('https://tmsapi.xesstechlink.com/api/superadmin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      setForm({ name: '', db_path: '', status: 'active' });
      await refreshTenants();
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (t: Tenant) => {
    setForm({ id: t.id, name: t.name, db_path: t.db_path, status: (t.status as any) || 'active' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (t: Tenant) => {
    if (!confirm(`Delete tenant "${t.name}"?`)) return;
    await fetch(`https://tmsapi.xesstechlink.com/api/superadmin/tenants/${t.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }});
    await refreshTenants();
  };

  const checkHealth = async (t: Tenant) => {
    const r = await fetch(`https://tmsapi.xesstechlink.com/api/superadmin/tenants/${t.id}/health`, { headers: { Authorization: `Bearer ${token}` }});
    const d = await r.json();
    setHealth(d?.data || null);
  };

  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Temple' },
    { accessorKey: 'db_path', header: 'Database Path' },
    { accessorKey: 'status', header: 'Status' },
  ], []);

  const statColumns = useMemo(() => [
    { accessorKey: 'name', header: 'Temple' },
    { accessorKey: 'totalMembers', header: 'Members' },
    { accessorKey: 'moneyDonations', header: 'Money Donations' },
    { accessorKey: 'poojaCount', header: 'Pooja Count' },
    { accessorKey: 'activeSessions', header: 'Active Sessions' },
    { accessorKey: 'latestReceiptDate', header: 'Latest Receipt' },
    { accessorKey: 'dbSizeBytes', header: 'DB Size (bytes)' },
  ], []);

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-red-600">Access denied</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow p-6 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Master Admin</h1>
        <p className="text-slate-600 mt-2">Monitor all registered temple databases and aggregate key metrics.</p>
      </div>

      {/* CRUD form */}
      <div className="rounded-xl bg-white shadow p-6 border border-slate-200">
        <h2 className="text-lg font-semibold mb-4">{form.id ? 'Edit Tenant' : 'Add Tenant'}</h2>
        <form onSubmit={submitForm} className="grid gap-4 md:grid-cols-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm text-slate-600">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Temple name" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-600">Database Path</label>
            <input value={form.db_path} onChange={e => setForm({ ...form, db_path: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="/absolute/path/to/db.sqlite3" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm text-slate-600">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full border rounded px-3 py-2">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button disabled={saving || !form.name || !form.db_path} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60" type="submit">
              {saving ? 'Saving…' : (form.id ? 'Update' : 'Create')}
            </button>
            {form.id && (
              <button type="button" className="px-4 py-2 rounded border" onClick={() => setForm({ name: '', db_path: '', status: 'active' })}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl bg-white shadow p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Registered Temple Databases</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">DB Path</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="py-2 pr-4">{t.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs break-all">{t.db_path}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                  <td className="py-2 pr-4 flex gap-2">
                    <button className="px-2 py-1 text-blue-700 hover:underline" onClick={() => onEdit(t)}>Edit</button>
                    <button className="px-2 py-1 text-red-700 hover:underline" onClick={() => onDelete(t)}>Delete</button>
                    <button className="px-2 py-1 text-emerald-700 hover:underline" onClick={() => checkHealth(t)}>Health</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Aggregated Stats</h2>
          <button onClick={loadStats} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                {statColumns.map((c: any) => (
                  <th key={c.accessorKey} className="py-2 pr-4">{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((row, idx) => (
                <tr key={idx} className="border-t">
                  {statColumns.map((c: any) => (
                    <td key={c.accessorKey} className="py-2 pr-4">{String(row[c.accessorKey] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {health && (
        <div className="rounded-xl bg-white shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Health - {health.name}</h2>
            <button className="px-3 py-1 rounded border" onClick={() => setHealth(null)}>Close</button>
          </div>
          <div className="mt-3 text-sm text-slate-700">
            <div>OK: <span className={health.ok ? 'text-emerald-600' : 'text-red-600'}>{String(health.ok)}</span></div>
            {health.lastReceiptDate && <div>Last Receipt: {health.lastReceiptDate}</div>}
            {health.lastSessionActivity && <div>Last Session Activity: {health.lastSessionActivity}</div>}
            <div className="mt-2 font-medium">Tables</div>
            <ul className="list-disc list-inside">
              {health.checks?.map((c: any, i: number) => (
                <li key={i}>{c.table}: {c.exists ? 'exists' : 'missing'} {c.error ? `- ${c.error}` : ''}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
