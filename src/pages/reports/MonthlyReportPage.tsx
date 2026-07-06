import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { useLanguage } from "@/lib/language"
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme, tableClasses } from '@/styles/theme';
import { CardTitle, CardHeader, Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const canExportCsv = useFeature('data_export_csv');
  const canExportPdf = useFeature('data_export_excel');
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

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
      const res = await fetch(`https://templeapi.agniplay.com/api/reports/monthly?${params.toString()}`, {
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

  const exportToCSV = () => {
    if (!data) return;

    const rows = [
      ['Type', 'Category', 'Amount'],
      ...Object.entries(data.breakdown.income).map(([k, v]) => ['Income', k.replace(/_/g, ' '), v]),
      ...Object.entries(data.breakdown.expenses).map(([k, v]) => ['Expense', k.replace(/_/g, ' '), v]),
      ['Total Income', '', totalIncome],
      ['Total Expenses', '', totalExpense],
      ['Net', '', net],
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `monthly-report-${year}-${month}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={cn(pageContainerStyles.content, "max-w-6xl")}>
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {t('Monthly Report', 'மாதாந்திர அறிக்கை')}
              </CardTitle>
            </div>
          </CardHeader>

          {/* Table Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-end justify-between mb-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-sm mb-1 font-medium text-gray-700">{t('Year', 'ஆண்டு')}</label>
                    <select
                      className={cn(theme.select.base, theme.select.size.sm, "!py-0 !pl-3 !pr-1 !leading-none rounded w-28 appearance-auto")}
                      value={year}
                      onChange={(e) => { setYear(parseInt(e.target.value, 10)); fetchReport(parseInt(e.target.value, 10), month); }}
                    >
                      {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 font-medium text-gray-700">{t('Month', 'மாதம்')}</label>
                    <select
                      className={cn(theme.select.base, theme.select.size.sm, "!py-0 !pl-3 !pr-1 !leading-none rounded w-24 appearance-auto")}
                      value={month}
                      onChange={(e) => { setMonth(parseInt(e.target.value, 10)); fetchReport(year, parseInt(e.target.value, 10)); }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canExportCsv && (
                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportToCSV} disabled={loading || !data}>
                      <FileDown className="h-3 w-3 mr-1" />
                      {t('Export CSV', 'CSV ஏற்றுமதி')}
                    </Button>
                  )}
                  {canExportPdf && (
                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportToPDF} disabled={loading || !data}>
                      <FileDown className="h-3 w-3 mr-1" />
                      {t('Export PDF', 'PDF ஏற்றுமதி')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && <div className="p-4">{t('Loading...', 'ஏற்றுகிறது...')}</div>}
          {error && <div className="p-3 bg-red-50 text-red-700 rounded mb-3">{error}</div>}

          {data && (
            <Card className="mb-6">
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>
          )}
        </Card>
      </div>
    </div>
  );
}
