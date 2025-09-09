import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type DailyReport = {
  breakdown: {
    income: Record<string, number>;
    expenses: Record<string, number>;
  };
  totals: {
    grand_total_income: number;
    grand_total_expense: number;
    net: number;
  };
};

export default function DailyReportPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState<string>(today);
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DailyReport | null>(null);

  // Calculator state
  const [cashCount, setCashCount] = useState<string>('');
  const [extraIncome, setExtraIncome] = useState<string>('');
  const [extraExpense, setExtraExpense] = useState<string>('');
  // Client-side filters
  const [filterText, setFilterText] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const fetchReport = async (d: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/daily?date=${encodeURIComponent(d)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load report');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load report');
      setData(json.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If URL has ?date=YYYY-MM-DD use it, else use state
    const params = new URLSearchParams(location.search);
    const d = params.get('date') || date;
    if (d !== date) setDate(d);
    fetchReport(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.search]);

  const totalIncome = useMemo(() => data?.totals.grand_total_income || 0, [data]);
  const totalExpense = useMemo(() => data?.totals.grand_total_expense || 0, [data]);
  const net = useMemo(() => data?.totals.net || 0, [data]);

  // Build a simple day journal (Dr/Cr) view from the breakdown
  type JournalRow = {
    id: number;
    account: string;
    type: 'income' | 'expense';
    debit: number; // Dr
    credit: number; // Cr
    note?: string;
  };

  const rows: JournalRow[] = useMemo(() => {
    if (!data) return [];
    const list: JournalRow[] = [];
    let i = 1;
    // Expenses -> Debit
    Object.entries(data.breakdown.expenses).forEach(([k, v]) => {
      if (!v) return;
      list.push({ id: i++, account: k.replaceAll('_', ' '), type: 'expense', debit: v, credit: 0 });
    });
    // Income -> Credit
    Object.entries(data.breakdown.income).forEach(([k, v]) => {
      if (!v) return;
      list.push({ id: i++, account: k.replaceAll('_', ' '), type: 'income', debit: 0, credit: v });
    });
    // Apply client-side filters
    const ft = filterText.trim().toLowerCase();
    const t = filterType;
    const filtered = list.filter((r) => {
      const typeOk = t === 'all' ? true : r.type === t;
      const textOk = !ft ||
        r.account.toLowerCase().includes(ft) ||
        (r.note || '').toLowerCase().includes(ft);
      return typeOk && textOk;
    });
    return filtered;
  }, [data, filterText, filterType]);

  const debitTotal = useMemo(() => rows.reduce((s, r) => s + r.debit, 0), [rows]);
  const creditTotal = useMemo(() => rows.reduce((s, r) => s + r.credit, 0), [rows]);

  const toCurrency = (n: number) => `₹ ${n.toLocaleString()}`;

  // Pagination for journal rows
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / itemsPerPage)), [rows]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = useMemo(() => rows.slice(startIndex, startIndex + itemsPerPage), [rows, startIndex]);
  useEffect(() => { setCurrentPage(1); }, [date, data]);

  const onExportCSV = () => {
    const headers = [
      t('S.No', 'எண்'),
      t('Date', 'தேதி'),
      'Type',
      t('Account', 'கணக்கு'),
      t('Debit', 'பற்று'),
      t('Credit', 'கடன்'),
      t('Note', 'குறிப்பு'),
    ];
    const lines = rows.map((r) => [
      r.id,
      date,
      r.type === 'income' ? t('Income', 'வரவு') : t('Expense', 'செலவு'),
      r.account,
      r.debit,
      r.credit,
      r.note || '',
    ]);
    const all = [headers, ...lines, ['', '', t('Totals', 'மொத்தம்'), '', debitTotal, creditTotal, '']];
    const csv = all.map((row) => row.map((x) => (typeof x === 'string' ? `"${x.replaceAll('"', '""')}"` : x)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPrint = () => {
    window.print();
  };

  const manualIncome = (parseFloat(extraIncome) || 0) + (parseFloat(cashCount) || 0);
  const manualExpense = parseFloat(extraExpense) || 0;
  const manualNet = manualIncome - manualExpense;
  const difference = manualNet - net;

  return (
    <div className="max-w-7xl mx-auto bg-white p-4 md:p-6 rounded shadow print:p-0">
      <h1 className="text-2xl font-semibold mb-4 text-center">{t('Daily Report', 'தினசரி அறிக்கை')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-sm mb-1">{t('Date', 'தேதி')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Type', 'வகை')}</label>
          <select
            className="border rounded p-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">{t('All', 'அனைத்து')}</option>
            <option value="income">{t('Income', 'வரவு')}</option>
            <option value="expense">{t('Expense', 'செலவு')}</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm mb-1">{t('Search', 'தேடல்')}</label>
          <input
            placeholder={t('Search account or note', 'கணக்கு அல்லது குறிப்பில் தேடவும்')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <button
          onClick={() => fetchReport(date)}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
        >
          {t('Load', 'ஏற்று')}
        </button>
      </div>

      {loading && <div className="p-4">{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded mb-3">{error}</div>}

      {data && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-4 bg-green-50">
              <div className="text-sm text-green-700">{t('Total Income', 'மொத்த வரவு')}</div>
              <div className="text-2xl font-semibold">{toCurrency(totalIncome)}</div>
            </div>
            <div className="border rounded p-4 bg-red-50">
              <div className="text-sm text-red-700">{t('Total Expenses', 'மொத்த செலவு')}</div>
              <div className="text-2xl font-semibold">{toCurrency(totalExpense)}</div>
            </div>
            <div className="border rounded p-4 bg-blue-50">
              <div className="text-sm text-blue-700">{t('Net', 'நிகர')}</div>
              <div className="text-2xl font-semibold">{toCurrency(net)}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={onExportCSV} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded border">
              {t('Export CSV', 'CSV ஏற்றுமதி')}
            </button>
            <button onClick={onPrint} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded border">
              {t('Print', 'அச்சிடு')}
            </button>
          </div>

          {/* Journal table */}
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="px-3 py-2 border-b w-20">{t('S.No', 'எண்')}</th>
                  <th className="px-3 py-2 border-b w-32">{t('Date', 'தேதி')}</th>
                  <th className="px-3 py-2 border-b w-28">Type</th>
                  <th className="px-3 py-2 border-b">{t('Account', 'கணக்கு')}</th>
                  <th className="px-3 py-2 border-b text-right w-36">{t('Debit', 'பற்று')}</th>
                  <th className="px-3 py-2 border-b text-right w-36">{t('Credit', 'கடன்')}</th>
                  <th className="px-3 py-2 border-b w-56">{t('Note', 'குறிப்பு')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r, idx) => (
                  <tr key={`${r.id}-${idx}`} className="odd:bg-white even:bg-slate-50">
                    <td className="px-3 py-2 border-b">{startIndex + idx + 1}</td>
                    <td className="px-3 py-2 border-b">{date}</td>
                    <td className="px-3 py-2 border-b">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {r.type === 'income' ? t('Income', 'வரவு') : t('Expense', 'செலவு')}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-b capitalize">{r.account}</td>
                    <td className="px-3 py-2 border-b text-right">{r.debit ? toCurrency(r.debit) : '-'}</td>
                    <td className="px-3 py-2 border-b text-right">{r.credit ? toCurrency(r.credit) : '-'}</td>
                    <td className="px-3 py-2 border-b">{r.note || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-slate-100">
                  <td className="px-3 py-2 border-t" colSpan={4}>{t('Totals', 'மொத்தம்')}</td>
                  <td className="px-3 py-2 border-t text-right">{toCurrency(debitTotal)}</td>
                  <td className="px-3 py-2 border-t text-right">{toCurrency(creditTotal)}</td>
                  <td className="px-3 py-2 border-t"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-3">
            <button
              className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              {t('Previous', 'முந்தைய')}
            </button>
            <div className="text-sm text-slate-600">
              {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {totalPages}
            </div>
            <button
              className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              {t('Next', 'அடுத்தது')}
            </button>
          </div>

          {/* Calculator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded p-4">
              <h2 className="text-lg font-semibold mb-2">{t('Day-end Calculator', 'நாள் முடிவு கணக்குபடுத்தி')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">{t('Cash Count (total)', 'பண எண்ணிக்கை (மொத்தம்)')}</label>
                  <input className="w-full border p-2 rounded" value={cashCount} onChange={(e) => setCashCount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('Extra Income (if any)', 'கூடுதல் வரவு (இருந்தால்)')}</label>
                  <input className="w-full border p-2 rounded" value={extraIncome} onChange={(e) => setExtraIncome(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('Extra Expenses (if any)', 'கூடுதல் செலவு (இருந்தால்)')}</label>
                  <input className="w-full border p-2 rounded" value={extraExpense} onChange={(e) => setExtraExpense(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between"><span>{t('System Net', 'கணினி நிகர')}</span><span>{toCurrency(net)}</span></div>
                <div className="flex justify-between"><span>{t('Manual Net', 'கையேடு நிகர')}</span><span>{toCurrency(manualNet)}</span></div>
                <div className={`flex justify-between font-semibold ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                  <span>{t('Difference', 'வித்தியாசம்')}</span><span>{toCurrency(difference)}</span>
                </div>
              </div>
            </div>

            {/* Breakdown side card */}
            <div className="grid grid-cols-1 gap-6">
              <div className="border rounded p-4">
                <h2 className="text-lg font-semibold mb-2">{t('Income Breakdown', 'வரவு விவரம்')}</h2>
                <div className="space-y-1 text-sm">
                  {Object.entries(data.breakdown.income).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="capitalize">{k.replaceAll('_', ' ')}</span>
                      <span>{toCurrency(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded p-4">
                <h2 className="text-lg font-semibold mb-2">{t('Expenses Breakdown', 'செலவு விவரம்')}</h2>
                <div className="space-y-1 text-sm">
                  {Object.entries(data.breakdown.expenses).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="capitalize">{k.replaceAll('_', ' ')}</span>
                      <span>{toCurrency(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
