import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type TaxRegistration = {
  id: number;
  name: string;
  mobile_number?: string;
  aadhaar_number?: string | null;
  reference_number?: string;
  village?: string;
  created_at?: string;
};

export default function TaxUserListPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<TaxRegistration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
      const res = await fetch(`/api/tax-registrations?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      // noop basic
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, pageSize]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const res = await fetch(`/api/tax-registrations/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        // try to read error json
        try {
          const j = await res.json();
          throw new Error(j?.error || 'Failed to export PDF');
        } catch {
          throw new Error('Failed to export PDF');
        }
      }
      const blob = await res.blob();
      downloadBlob(blob, `tax-registration-${id}.pdf`);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const handleExportAllPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/tax-registrations/export/pdf?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        try {
          const j = await res.json();
          throw new Error(j?.error || 'Failed to export PDF');
        } catch {
          throw new Error('Failed to export PDF');
        }
      }
      const blob = await res.blob();
      downloadBlob(blob, 'tax-registrations.pdf');
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Tax Registrations User (List)</h1>
      <div className="flex gap-2 items-center">
        <input className="border rounded px-3 py-2" placeholder="Search name/mobile/aadhaar/ref no"
               value={search} onChange={e => setSearch(e.target.value)} />
        <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => { setPage(1); load(); }}>Search</button>
        <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={handleExportAllPdf}>
          Export All (PDF)
        </button>
      </div>
      <div className="overflow-x-auto bg-white rounded border">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2">Aadhaar</th>
              <th className="px-3 py-2">Ref No</th>
              <th className="px-3 py-2">Village</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="px-3 py-3 text-sm text-gray-600" colSpan={7}>{loading ? 'Loading...' : 'No records'}</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.mobile_number || '-'}</td>
                <td className="px-3 py-2">{r.aadhaar_number || '-'}</td>
                <td className="px-3 py-2">{r.reference_number || '-'}</td>
                <td className="px-3 py-2">{r.village || '-'}</td>
                <td className="px-3 py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-2">
                  <button className="px-2 py-1 text-sm bg-blue-600 text-white rounded" onClick={() => handleDownloadPdf(r.id)}>PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
        <span className="text-sm">Page {page} of {totalPages}</span>
        <button className="px-3 py-1 border rounded" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next</button>
        <select className="ml-4 border rounded px-2 py-1" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
