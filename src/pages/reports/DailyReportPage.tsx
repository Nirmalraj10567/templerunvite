'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from "@/lib/language";
import { toast } from '@/hooks/use-toast';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FileDown, Trash2, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

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

  const t = {
    english: {
      title: 'தினசரி அறிக்கை',
      date: 'தேதி',
      type: 'வகை',
      all: 'அனைத்து',
      income: 'வரவு',
      expense: 'செலவு',
      search: 'தேடல்',
      searchPlaceholder: 'கணக்கு/குறிப்பு தேடு',
      load: 'ஏற்று',
      loading: 'ஏற்றுகிறது...',
      errorLoading: 'அறிக்கை ஏற்ற முடியவில்லை',
      totalIncome: 'மொத்த வரவு',
      totalExpenses: 'மொத்த செலவு',
      net: 'நிகர',
      exportCsv: 'CSV ஏற்றுமதி',
      print: 'அச்சிடு',
      sNo: 'எண்',
      debit: 'பற்று',
      credit: 'கடன்',
      note: 'குறிப்பு',
      totals: 'மொத்தம்',
      previous: 'முந்தைய',
      next: 'அடுத்தது',
      page: 'பக்கம்',
      of: 'இல்',
      dayEndCalculator: 'நாள் முடிவு',
      cashCount: 'பண எண்ணிக்கை',
      extraIncome: 'கூடுதல் வரவு',
      extraExpense: 'கூடுதல் செலவு',
      systemNet: 'கணினி நிகர',
      manualNet: 'கையேடு நிகர',
      difference: 'வித்தியாசம்',
      incomeBreakdown: 'வரவு',
      expensesBreakdown: 'செலவு',
      resetReport: 'மீட்டமை',
      resetConfirm: 'மீட்டமைக்கவா?',
      resetMessage: 'அனைத்து தரவும் அழிக்கப்படும்.',
      reset: 'மீட்டமை',
      cancel: 'ரத்து',
      resetSuccess: 'மீட்டமைக்கப்பட்டது',
      resetFailed: 'மீட்டமை தோல்வி',
    },
    tamil: {
      title: 'Daily Report',
      date: 'Date',
      type: 'Type',
      all: 'All',
      income: 'Income',
      expense: 'Expense',
      search: 'Search',
      searchPlaceholder: 'Search account/note',
      load: 'Load',
      loading: 'Loading...',
      errorLoading: 'Failed to load report',
      totalIncome: 'Total Income',
      totalExpenses: 'Total Expenses',
      net: 'Net',
      exportCsv: 'Export CSV',
      print: 'Print',
      sNo: 'S.No',
      debit: 'Debit',
      credit: 'Credit',
      note: 'Note',
      totals: 'Totals',
      previous: 'Previous',
      next: 'Next',
      page: 'Page',
      of: 'of',
      dayEndCalculator: 'Day-end',
      cashCount: 'Cash Count',
      extraIncome: 'Extra Income',
      extraExpense: 'Extra Expense',
      systemNet: 'System Net',
      manualNet: 'Manual Net',
      difference: 'Difference',
      incomeBreakdown: 'Income',
      expensesBreakdown: 'Expenses',
      resetReport: 'Reset',
      resetConfirm: 'Reset Report?',
      resetMessage: 'All data will be deleted.',
      reset: 'Reset',
      cancel: 'Cancel',
      resetSuccess: 'Reset successful',
      resetFailed: 'Reset failed',
    }
  } as const;

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
  const [filterText, setFilterText] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showResetModal, setShowResetModal] = useState(false);

  const fetchReport = async (d: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://tmsapi.xesstechlink.com/api/reports/daily?date=${encodeURIComponent(d)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load report');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load report');
      setData(json.data);
    } catch (e: any) {
      setError(e.message || t[language].errorLoading);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const resetReport = async () => {
    if (!token || !date) return;
    try {
      const res = await fetch(`https://tmsapi.xesstechlink.com/api/reports/daily?date=${encodeURIComponent(date)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to reset report');
      setData(null);
      toast({ title: t[language].resetSuccess });
      fetchReport(date);
    } catch (err) {
      toast({
        title: t[language].error,
        description: t[language].resetFailed,
        variant: 'destructive',
      });
    } finally {
      setShowResetModal(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const d = params.get('date') || date;
    if (d !== date) setDate(d);
    fetchReport(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.search]);

  const totalIncome = useMemo(() => data?.totals.grand_total_income || 0, [data]);
  const totalExpense = useMemo(() => data?.totals.grand_total_expense || 0, [data]);
  const net = useMemo(() => data?.totals.net || 0, [data]);

  type JournalRow = {
    id: number;
    account: string;
    type: 'income' | 'expense';
    debit: number;
    credit: number;
    note?: string;
  };

  const rows: JournalRow[] = useMemo(() => {
    if (!data) return [];
    const list: JournalRow[] = [];
    let i = 1;
    Object.entries(data.breakdown.expenses).forEach(([k, v]) => {
      if (!v) return;
      list.push({ id: i++, account: k.replaceAll('_', ' '), type: 'expense', debit: v, credit: 0 });
    });
    Object.entries(data.breakdown.income).forEach(([k, v]) => {
      if (!v) return;
      list.push({ id: i++, account: k.replaceAll('_', ' '), type: 'income', debit: 0, credit: v });
    });

    const ft = filterText.trim().toLowerCase();
    const t = filterType;
    return list.filter((r) => {
      const typeOk = t === 'all' ? true : r.type === t;
      const textOk = !ft ||
        r.account.toLowerCase().includes(ft) ||
        (r.note || '').toLowerCase().includes(ft);
      return typeOk && textOk;
    });
  }, [data, filterText, filterType]);

  const debitTotal = useMemo(() => rows.reduce((s, r) => s + r.debit, 0), [rows]);
  const creditTotal = useMemo(() => rows.reduce((s, r) => s + r.credit, 0), [rows]);

  const toCurrency = (n: number) => `₹ ${n.toLocaleString()}`;

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12; // Increased to reduce pages
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = rows.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [date, data, filterText, filterType]);

  const onExportCSV = () => {
    const headers = [
      t[language].sNo,
      t[language].date,
      'Type',
      t[language].account,
      t[language].debit,
      t[language].credit,
      t[language].note,
    ];
    const lines = rows.map((r) => [
      r.id,
      date,
      r.type === 'income' ? t[language].income : t[language].expense,
      r.account,
      r.debit,
      r.credit,
      r.note || '',
    ]);
    const all = [...lines, ['', '', t[language].totals, '', debitTotal, creditTotal, '']];
    const csv = [headers, ...all]
      .map(row => row.map(x => typeof x === 'string' ? `"${x.replaceAll('"', '""')}"` : x).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPrint = () => window.print();

  const manualIncome = (parseFloat(extraIncome) || 0) + (parseFloat(cashCount) || 0);
  const manualExpense = parseFloat(extraExpense) || 0;
  const manualNet = manualIncome - manualExpense;
  const difference = manualNet - net;

  return (
   <div className={pageContainerStyles.container}>
          <Card className={pageContainerStyles.content}>
            <CardHeader className={theme.header.container}>
              <div className={theme.header.contentSpacing}>
                <CardTitle className={theme.header.main}>
                {t[language].title}
                </CardTitle>
              </div>
            </CardHeader>
          
  

      {/* Filters Row — Tight */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">{t[language].date}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(theme.input.base, theme.input.size.sm)}
          />
        </div>

        <div className="flex-1 min-w-[100px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">{t[language].type}</label>
          <select
            className={cn(theme.select.base, theme.select.size.sm)}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">{t[language].all}</option>
            <option value="income">{t[language].income}</option>
            <option value="expense">{t[language].expense}</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">{t[language].search}</label>
          <input
            placeholder={t[language].searchPlaceholder}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className={cn(theme.input.base, theme.input.size.sm)}
          />
        </div>

        <button
          onClick={() => fetchReport(date)}
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-sm transition-colors"
        >
          {t[language].load}
        </button>

        <button
          onClick={() => setShowResetModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-sm ml-1 transition-colors"
          disabled={!data}
        >
          {t[language].resetReport}
        </button>
      </div>

      {/* Loading/Error */}
      {loading && (
        <div className="py-3 text-center text-sm text-gray-600">{t[language].loading}</div>
      )}

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-sm text-red-700 text-xs mb-4">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {/* Summary Cards — Compact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="p-2 bg-green-50 border border-green-100 rounded-sm text-center">
              <p className="text-xs text-green-700 font-medium">{t[language].totalIncome}</p>
              <p className="text-sm font-bold text-green-800">{toCurrency(totalIncome)}</p>
            </div>
            <div className="p-2 bg-red-50 border border-red-100 rounded-sm text-center">
              <p className="text-xs text-red-700 font-medium">{t[language].totalExpenses}</p>
              <p className="text-sm font-bold text-red-800">{toCurrency(totalExpense)}</p>
            </div>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-sm text-center">
              <p className="text-xs text-blue-700 font-medium">{t[language].net}</p>
              <p className="text-sm font-bold text-blue-800">{toCurrency(net)}</p>
            </div>
          </div>

          {/* Action Buttons — Tiny */}
          <div className="flex flex-wrap gap-1 mb-3">
            <button
              onClick={onExportCSV}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-sm"
            >
              {t[language].exportCsv}
            </button>
            <button
              onClick={onPrint}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-sm"
            >
              {t[language].print}
            </button>
          </div>

          {/* Table — Ultra-Compact */}
          <div className="overflow-x-auto border border-gray-200 rounded-sm">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 w-10">{t[language].sNo}</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 w-20">{t[language].date}</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 w-24">Type</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 flex-1">{t[language].account}</th>
                  <th className="px-1 py-1 text-right font-medium text-gray-700 w-24">{t[language].debit}</th>
                  <th className="px-1 py-1 text-right font-medium text-gray-700 w-24">{t[language].credit}</th>
                  <th className="px-1 py-1 text-left font-medium text-gray-700 w-40">{t[language].note}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map((r, idx) => (
                  <tr key={`${r.id}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-1 py-1 text-gray-700">{startIndex + idx + 1}</td>
                    <td className="px-1 py-1 text-gray-700">{date}</td>
                    <td className="px-1 py-1">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${
                        r.type === 'income' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.type === 'income' ? t[language].income : t[language].expense}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-gray-700 capitalize">{r.account}</td>
                    <td className="px-1 py-1 text-right text-gray-700">{r.debit ? toCurrency(r.debit) : '-'}</td>
                    <td className="px-1 py-1 text-right text-gray-700">{r.credit ? toCurrency(r.credit) : '-'}</td>
                    <td className="px-1 py-1 text-gray-600 text-xs">{r.note || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-1 py-1 font-medium text-gray-800 text-left">{t[language].totals}</td>
                  <td className="px-1 py-1 font-medium text-gray-800 text-right">{toCurrency(debitTotal)}</td>
                  <td className="px-1 py-1 font-medium text-gray-800 text-right">{toCurrency(creditTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination — Tiny */}
          <div className="flex items-center justify-between py-1 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={cn(theme.input.base, theme.input.size.sm, "px-2 py-1 rounded-sm text-gray-700 disabled:opacity-50")}
            >
              {t[language].previous}
            </button>
            <span className="text-gray-600">
              {t[language].page} {currentPage} {t[language].of} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={cn(theme.input.base, theme.input.size.sm, "px-2 py-1 rounded-sm text-gray-700 disabled:opacity-50")}
            >
              {t[language].next}
            </button>
          </div>

          {/* Calculator + Breakdown — Single Column, Ultra-Tight */}
          <div className="grid grid-cols-1 gap-2 mt-3 print:grid-cols-1">
            {/* Calculator */}
            <div className="border border-gray-200 rounded-sm p-2 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-800 mb-2">{t[language].dayEndCalculator}</h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  <label className="block">{t[language].cashCount}</label>
                  <input
                    className={cn(theme.input.base, theme.input.size.sm, "w-full")}
                    value={cashCount}
                    onChange={(e) => setCashCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block">{t[language].extraIncome}</label>
                  <input
                    className={cn(theme.input.base, theme.input.size.sm, "w-full")}
                    value={extraIncome}
                    onChange={(e) => setExtraIncome(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block">{t[language].extraExpense}</label>
                  <input
                    className={cn(theme.input.base, theme.input.size.sm, "w-full")}
                    value={extraExpense}
                    onChange={(e) => setExtraExpense(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-1 text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span>{t[language].systemNet}</span>
                  <span>{toCurrency(net)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t[language].manualNet}</span>
                  <span>{toCurrency(manualNet)}</span>
                </div>
                <div className={`flex justify-between font-medium ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                  <span>{t[language].difference}</span>
                  <span>{toCurrency(difference)}</span>
                </div>
              </div>
            </div>

            {/* Breakdown — Inline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="border border-gray-200 rounded-sm p-2 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-800 mb-1">{t[language].incomeBreakdown}</h3>
                {Object.entries(data.breakdown.income).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="capitalize">{k.replaceAll('_', ' ')}</span>
                    <span className="text-green-700">{toCurrency(v)}</span>
                  </div>
                ))}
              </div>
              <div className="border border-gray-200 rounded-sm p-2 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-800 mb-1">{t[language].expensesBreakdown}</h3>
                {Object.entries(data.breakdown.expenses).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="capitalize">{k.replaceAll('_', ' ')}</span>
                    <span className="text-red-700">{toCurrency(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal — Compact */}
      {showResetModal && (
        <Modal
          title={t[language].resetConfirm}
          onClose={() => setShowResetModal(false)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">{t[language].resetMessage}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className={cn(theme.input.base, theme.input.size.sm, "px-3 py-1 text-xs rounded-sm text-gray-700 hover:bg-gray-50")}
                onClick={() => setShowResetModal(false)}
              >
                {t[language].cancel}
              </button>
              <button
                className="px-3 py-1 text-xs bg-red-600 text-white rounded-sm hover:bg-red-700"
                onClick={resetReport}
              >
                {t[language].reset}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
    </div>
  );
}