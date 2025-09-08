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

  const manualIncome = (parseFloat(extraIncome) || 0) + (parseFloat(cashCount) || 0);
  const manualExpense = parseFloat(extraExpense) || 0;
  const manualNet = manualIncome - manualExpense;
  const difference = manualNet - net;

  return (
    <div className="max-w-6xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-2xl font-semibold mb-4 text-center">{t('Daily Report', 'தினசரி அறிக்கை')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-sm mb-1">{t('Date', 'தேதி')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded p-2" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Breakdown */}
          <div>
            <h2 className="text-lg font-semibold mb-2">{t('Income', 'வரவு')}</h2>
            <div className="space-y-2">
              {Object.entries(data.breakdown.income).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-1 text-sm">
                  <span className="capitalize">{k.replaceAll('_', ' ')}</span>
                  <span>₹ {v.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold">
                <span>{t('Total Income', 'மொத்த வரவு')}</span>
                <span>₹ {totalIncome.toLocaleString()}</span>
              </div>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-2">{t('Expenses', 'செலவு')}</h2>
            <div className="space-y-2">
              {Object.entries(data.breakdown.expenses).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-1 text-sm">
                  <span className="capitalize">{k.replaceAll('_', ' ')}</span>
                  <span>₹ {v.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold">
                <span>{t('Total Expenses', 'மொத்த செலவு')}</span>
                <span>₹ {totalExpense.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <div>
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
              <div className="flex justify-between"><span>{t('System Net', 'கணினி நிகர')}</span><span>₹ {net.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>{t('Manual Net', 'கையேடு நிகர')}</span><span>₹ {manualNet.toLocaleString()}</span></div>
              <div className={`flex justify-between font-semibold ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                <span>{t('Difference', 'வித்தியாசம்')}</span><span>₹ {difference.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
