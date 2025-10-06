import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from  "@/lib/language"
import { formFieldStyles, cn, pageContainerStyles } from '@/styles/formStyles';
import { CardTitle, CardHeader, Card } from '@/components/ui/card';
type MonthlyReport = {
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

export default function MonthlyReportPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyReport | null>(null);

  const fetchReport = async (y: number, m: number) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(y), month: String(m) });
      const res = await fetch(`https://tmsapi.xesstechlink.com/api/reports/monthly?${params.toString()}`, {
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
    fetchReport(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totalIncome = useMemo(() => data?.totals.grand_total_income || 0, [data]);
  const totalExpense = useMemo(() => data?.totals.grand_total_expense || 0, [data]);
  const net = useMemo(() => data?.totals.net || 0, [data]);

  return (
    <div className={pageContainerStyles.container}>
       <Card className={pageContainerStyles.content}>
         <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 text-center", formFieldStyles.card.header)}>
           <CardTitle className="text-lg font-bold w-full">
           {t('Monthly Report', 'மாதாந்திர அறிக்கை')}
           </CardTitle>
         </CardHeader>
       
      

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-sm mb-1">{t('Year', 'ஆண்டு')}</label>
          <select className="border rounded p-2" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
            {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Month', 'மாதம்')}</label>
          <select className="border rounded p-2" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchReport(year, month)}
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

          {/* Summary */}
          <div>
            <h2 className="text-lg font-semibold mb-2">{t('Summary', 'சுருக்கம்')}</h2>
            <div className="space-y-1">
              <div className="flex justify-between"><span>{t('Income', 'வரவு')}</span><span>₹ {totalIncome.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>{t('Expenses', 'செலவு')}</span><span>₹ {totalExpense.toLocaleString()}</span></div>
              <div className={`flex justify-between font-semibold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                <span>{t('Net', 'நிகர')}</span><span>₹ {net.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
    </div>
  );
}
