import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type StatementEntry = {
  id: number;
  date: string;
  name: string;
  type: 'credit' | 'debit';
  amount: number;
  note?: string | null;
  credit: number;
  debit: number;
  running_balance: number;
};

type StatementResponse = {
  success: boolean;
  category: string;
  range: { startDate: string | null; endDate: string | null };
  opening_balance: number;
  totals: { credit: number; debit: number };
  closing_balance: number;
  entries: StatementEntry[];
};

export default function CategoryStatementPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  const [categories, setCategories] = useState<string[]>([]);
  const [under, setUnder] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(monthStart);
  const [endDate, setEndDate] = useState<string>(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatementResponse | null>(null);

  const load = async () => {
    if (!token || !under) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ under });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`http://localhost:4000/api/ledger/cashflow/statement?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load statement');
      const json: StatementResponse = await res.json();
      if (!json.success) throw new Error('API returned error');
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:4000/api/ledger/categories-used', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const arr: string[] = json?.data || [];
        setCategories(arr);
        if (arr.length && !under) setUnder(arr[0]);
      } catch {}
    };
    run();
  }, [token]);

  return (
    <div className="max-w-6xl mx-auto bg-white rounded shadow p-4">
      <h1 className="text-2xl font-semibold mb-4">{t('Category Statement (Bank Style)', 'வகை கணக்கு அறிக்கை')}</h1>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">{t('Category', 'வகை')}</label>
          <select className="border p-2 rounded min-w-[220px]" value={under} onChange={(e) => setUnder(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">{t('From', 'இருந்து')}</label>
          <input type="date" className="border p-2 rounded" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('To', 'வரை')}</label>
          <input type="date" className="border p-2 rounded" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={load} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded">{t('Load', 'ஏற்று')}</button>
      </div>

      {loading && <div className="p-3">{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded mb-3">{error}</div>}

      {data && (
        <div>
          <div className="mb-3 p-3 bg-slate-50 rounded border">
            <div className="flex justify-between"><span>{t('Opening Balance', 'திறப்பு இருப்பு')}</span><span>₹ {data.opening_balance.toLocaleString()}</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">{t('Date', 'தேதி')}</th>
                  <th className="p-2">{t('Particulars', 'விவரம்')}</th>
                  <th className="p-2 text-right">{t('Credit', 'கடன்')}</th>
                  <th className="p-2 text-right">{t('Debit', 'பற்று')}</th>
                  <th className="p-2 text-right">{t('Running Balance', 'இருப்பு')}</th>
                  <th className="p-2">{t('Note', 'குறிப்பு')}</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-slate-50">
                    <td className="p-2">{e.date}</td>
                    <td className="p-2">{e.name}</td>
                    <td className="p-2 text-right">{e.credit ? `₹ ${e.credit.toLocaleString()}` : ''}</td>
                    <td className="p-2 text-right">{e.debit ? `₹ ${e.debit.toLocaleString()}` : ''}</td>
                    <td className={`p-2 text-right ${e.running_balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹ {e.running_balance.toLocaleString()}</td>
                    <td className="p-2">{e.note || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="p-2" colSpan={2}>{t('Totals', 'மொத்தம்')}</td>
                  <td className="p-2 text-right">₹ {data.totals.credit.toLocaleString()}</td>
                  <td className="p-2 text-right">₹ {data.totals.debit.toLocaleString()}</td>
                  <td className="p-2 text-right">₹ {data.closing_balance.toLocaleString()}</td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
