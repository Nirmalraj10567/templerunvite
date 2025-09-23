import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SummaryItem {
  category: string;
  total_credit: number;
  total_debit: number;
  net: number;
  entry_count: number;
}

interface DetailEntry {
  id: number;
  date: string;
  name: string;
  under: string | null;
  type: 'credit' | 'debit';
  amount: number;
  note?: string | null;
}

interface ApiResponse {
  success: boolean;
  range: { startDate: string | null; endDate: string | null };
  totals: { total_credit: number; total_debit: number; net: number };
  summary: SummaryItem[];
  details: Record<string, DetailEntry[]> | null;
}

export default function CashflowByCategoryPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  const [startDate, setStartDate] = useState<string>(monthStart);
  const [endDate, setEndDate] = useState<string>(today);
  const [includeEntries, setIncludeEntries] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, { credit: boolean; debit: boolean }>>({});

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (includeEntries) params.set('includeEntries', '1');
      if (selectedCategory) params.set('under', selectedCategory);
      const res = await fetch(`http://localhost:4000/api/ledger/cashflow/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load cashflow summary');
      const json: ApiResponse = await res.json();
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load categories (used in entries) for the filter
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
      } catch {}
    };
    run();
  }, [token]);

  const toggle = (cat: string) => setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  const toggleSection = (cat: string, section: 'credit' | 'debit') =>
    setExpandedSections((prev) => ({
      ...prev,
      [cat]: { credit: prev[cat]?.credit ?? false, debit: prev[cat]?.debit ?? false, [section]: !(prev[cat]?.[section] ?? false) },
    }));

  return (
    <div className="max-w-7xl mx-auto bg-white rounded shadow p-4">
      <h1 className="text-2xl font-semibold mb-4">{t('Cashflow by Category', 'வகை வாரியாக பணஓட்டு')}</h1>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">{t('From', 'இருந்து')}</label>
          <input type="date" className="border p-2 rounded" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('To', 'வரை')}</label>
          <input type="date" className="border p-2 rounded" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Category', 'வகை')}</label>
          <select className="border p-2 rounded min-w-[220px]" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">{t('All Categories', 'அனைத்து வகைகள்')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={includeEntries} onChange={(e) => setIncludeEntries(e.target.checked)} />
          <span>{t('Show Details', 'விவரங்களை காட்டு')}</span>
        </label>
        <button onClick={load} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded">{t('Load', 'ஏற்று')}</button>
      </div>

      {loading && <div className="p-3">{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded mb-3">{error}</div>}

      {data && (
        <div>
          <div className="mb-4 p-3 bg-slate-50 rounded border">
            <div className="flex justify-between"><span>{t('Total Credit', 'மொத்த கடன்')}</span><span>₹ {data.totals.total_credit.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>{t('Total Debit', 'மொத்த பற்று')}</span><span>₹ {data.totals.total_debit.toLocaleString()}</span></div>
            <div className={`flex justify-between font-semibold ${data.totals.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              <span>{t('Net', 'நிகர')}</span><span>₹ {data.totals.net.toLocaleString()}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">{t('Category', 'வகை')}</th>
                  <th className="p-2 text-right">{t('Credit', 'கடன்')}</th>
                  <th className="p-2 text-right">{t('Debit', 'பற்று')}</th>
                  <th className="p-2 text-right">{t('Net', 'நிகர')}</th>
                  <th className="p-2 text-center">{t('Count', 'எண்ணிக்கை')}</th>
                  {includeEntries && <th className="p-2 text-center">{t('Details', 'விவரங்கள்')}</th>}
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row) => (
                  <React.Fragment key={row.category}>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="p-2 font-medium">{row.category}</td>
                      <td className="p-2 text-right">₹ {row.total_credit.toLocaleString()}</td>
                      <td className="p-2 text-right">₹ {row.total_debit.toLocaleString()}</td>
                      <td className={`p-2 text-right ${row.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹ {row.net.toLocaleString()}</td>
                      <td className="p-2 text-center">{row.entry_count}</td>
                      {includeEntries && (
                        <td className="p-2 text-center">
                          <button className="text-orange-700 underline" onClick={() => toggle(row.category)}>
                            {expanded[row.category] ? t('Hide', 'மறை') : t('Show', 'காட்டு')}
                          </button>
                        </td>
                      )}
                    </tr>
                    {includeEntries && expanded[row.category] && data.details && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50">
                          <div className="p-2">
                            {(() => {
                              const all = data.details![row.category] || [];
                              const credits = all.filter((d) => d.type === 'credit');
                              const debits = all.filter((d) => d.type === 'debit');
                              const sec = expandedSections[row.category] || { credit: false, debit: false };
                              const creditSum = credits.reduce((a, b) => a + (Number(b.amount) || 0), 0);
                              const debitSum = debits.reduce((a, b) => a + (Number(b.amount) || 0), 0);
                              return (
                                <div className="space-y-4">
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <h4 className="font-semibold">{t('Credits', 'கடன்')} (₹ {creditSum.toLocaleString()})</h4>
                                      <button className="text-orange-700 underline" onClick={() => toggleSection(row.category, 'credit')}>
                                        {sec.credit ? t('Hide', 'மறை') : t('Show', 'காட்டு')}
                                      </button>
                                    </div>
                                    {sec.credit && (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-left">
                                            <th className="p-1">{t('Date', 'தேதி')}</th>
                                            <th className="p-1">{t('Name', 'பெயர்')}</th>
                                            <th className="p-1 text-right">{t('Amount', 'தொகை')}</th>
                                            <th className="p-1">{t('Note', 'குறிப்பு')}</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {credits.map((d) => (
                                            <tr key={`c-${d.id}`} className="border-t">
                                              <td className="p-1">{d.date}</td>
                                              <td className="p-1">{d.name}</td>
                                              <td className="p-1 text-right">₹ {Number(d.amount || 0).toLocaleString()}</td>
                                              <td className="p-1">{d.note || ''}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <h4 className="font-semibold">{t('Debits', 'பற்று')} (₹ {debitSum.toLocaleString()})</h4>
                                      <button className="text-orange-700 underline" onClick={() => toggleSection(row.category, 'debit')}>
                                        {sec.debit ? t('Hide', 'மறை') : t('Show', 'காட்டு')}
                                      </button>
                                    </div>
                                    {sec.debit && (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-left">
                                            <th className="p-1">{t('Date', 'தேதி')}</th>
                                            <th className="p-1">{t('Name', 'பெயர்')}</th>
                                            <th className="p-1 text-right">{t('Amount', 'தொகை')}</th>
                                            <th className="p-1">{t('Note', 'குறிப்பு')}</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {debits.map((d) => (
                                            <tr key={`d-${d.id}`} className="border-t">
                                              <td className="p-1">{d.date}</td>
                                              <td className="p-1">{d.name}</td>
                                              <td className="p-1 text-right">₹ {Number(d.amount || 0).toLocaleString()}</td>
                                              <td className="p-1">{d.note || ''}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
