import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

interface MarriageItem {
  id: number;
  register_no: string | null;
  date: string | null;
  time: string | null;
  event: string | null;
  groom_name: string | null;
  bride_name: string | null;
  address: string | null;
  village: string | null;
  guardian_name: string | null;
  witness_one: string | null;
  witness_two: string | null;
  remarks: string | null;
}

export default function MarriageListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<MarriageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`/api/marriages?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data?.success) setItems(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onExport = async () => {
    try {
      const res = await fetch('/api/marriages/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'marriages.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const onPrint = () => {
    window.print();
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{t('Marriage Register List', 'திருமண பதிவு பட்டியல்')}</h1>

      <div className="flex flex-col md:flex-row gap-2 md:items-end mb-4">
        <div>
          <label className="block text-sm mb-1">{t('Search', 'தேடுக')}</label>
          <input value={q} onChange={e=>setQ(e.target.value)} className="border rounded p-2" placeholder={t('Name/Register/Village', 'பெயர்/பதிவு/கிராமம்')} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('From', 'இருந்து')}</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('To', 'வரை')}</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded p-2" />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="bg-slate-700 text-white px-4 py-2 rounded">{t('Filter', 'வடிக')}</button>
          <button onClick={onExport} className="border px-4 py-2 rounded">{t('Export CSV', 'CSV ஏற்றுமதி')}</button>
          <button onClick={onPrint} className="border px-4 py-2 rounded">{t('Print', 'அச்சிட')}</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">{t('Reg No', 'பதிவு எண்')}</th>
              <th className="p-2 text-left">{t('Date', 'தேதி')}</th>
              <th className="p-2 text-left">{t('Groom', 'வரன்')}</th>
              <th className="p-2 text-left">{t('Bride', 'மணமகள்')}</th>
              <th className="p-2 text-left">{t('Village', 'கிராமம்')}</th>
              <th className="p-2 text-left">{t('Event', 'நிகழ்வு')}</th>
              <th className="p-2 text-left">{t('Remarks', 'குறிப்புகள்')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-2" colSpan={8}>{t('Loading...', 'ஏற்றுகிறது...')}</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td className="p-2" colSpan={8}>{t('No data', 'தரவு இல்லை')}</td></tr>
            )}
            {!loading && items.map((r, idx) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">{r.register_no || ''}</td>
                <td className="p-2">{r.date || ''} {r.time || ''}</td>
                <td className="p-2">{r.groom_name || ''}</td>
                <td className="p-2">{r.bride_name || ''}</td>
                <td className="p-2">{r.village || ''}</td>
                <td className="p-2">{r.event || ''}</td>
                <td className="p-2">{r.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
