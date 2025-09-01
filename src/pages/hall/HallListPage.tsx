import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

interface HallBooking {
  id: number;
  register_no: string | null;
  date: string | null;
  time: string | null;
  event: string | null;
  subdivision: string | null;
  name: string | null;
  address: string | null;
  village: string | null;
  mobile: string | null;
  advance_amount: string | null;
  total_amount: string | null;
  balance_amount: string | null;
  remarks: string | null;
}

export default function HallListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<HallBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [q, setQ] = useState('');

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const columns = useMemo(() => [
    { key: 'register_no', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'time', label: t('Time', 'நேரம்') },
    { key: 'event', label: t('Function', 'நிகழ்வு') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'mobile', label: t('Phone', 'தொலைபேசி') },
    { key: 'total_amount', label: t('Total', 'மொத்தம்') },
  ], [language]);

  const fetchData = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const url = '/api/hall-bookings' + (q ? `?q=${encodeURIComponent(q)}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRows(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, []);

  const onExport = async () => {
    try {
      const res = await fetch('/api/hall-bookings/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hall_bookings.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{t('Marriage Hall Bookings', 'திருமண மண்டப பதிவுகள்')}</h1>

      <div className="flex gap-2 mb-3">
        <input
          className="border p-2 rounded flex-1"
          placeholder={t('Search by name/receipt/village/phone', 'பெயர்/ரசீது/கிராமம்/தொலைபேசி மூலம் தேடுக')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="border px-3 py-2 rounded" onClick={fetchData}>{t('Search', 'தேடுக')}</button>
        <button className="border px-3 py-2 rounded" onClick={onExport}>{t('Export CSV', 'CSV ஏற்று')}</button>
      </div>

      {loading && <div className="text-sm">{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((c) => (
                <th key={c.key} className="text-left p-2 border-b">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border-b">{r.register_no || ''}</td>
                <td className="p-2 border-b">{r.date || ''}</td>
                <td className="p-2 border-b">{r.time || ''}</td>
                <td className="p-2 border-b">{r.event || ''}</td>
                <td className="p-2 border-b">{r.name || ''}</td>
                <td className="p-2 border-b">{r.village || ''}</td>
                <td className="p-2 border-b">{r.mobile || ''}</td>
                <td className="p-2 border-b">{r.total_amount || ''}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td className="p-2" colSpan={columns.length}>{t('No records', 'பதிவுகள் இல்லை')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
