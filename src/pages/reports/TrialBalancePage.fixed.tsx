'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { useLanguage } from '@/lib/language'; // 👈 Import useLanguage
const { language } = useLanguage();
const t = (en: string, ta: string) => (language === 'english' ? ta : en);
// Error boundary fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="p-4 bg-red-50 rounded-md m-4">
      <p className="text-red-700 font-medium">Something went wrong:</p>
      <pre className="text-red-600 text-sm mt-2 mb-4">{error.message}</pre>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

// Loading skeleton component
const LoadingSkeleton = ({ visibleColumns }: { visibleColumns: number }) => (
  <div className="space-y-2 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-2">
        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
        {Array.from({ length: visibleColumns }).map((_, j) => (
          <div key={j} className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
        ))}
      </div>
    ))}
  </div>
);

interface TrialRow {
  account: string;
  category?: string;
  inflow: number;
  outflow: number;
  balance: number;
  debit: number;
  credit: number;
}

interface CategoryGroup {
  [key: string]: TrialRow[];
}

interface CategoryTotals {
  [key: string]: {
    debit: number;
    credit: number;
  };
}

// Main component with error boundary
export default function TrialBalancePage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <TrialBalanceContent />
    </ErrorBoundary>
  );
}

function TrialBalanceContent() {
  const { language } = useLanguage(); // 👈 Get current language

  // 👇 TYPED TRANSLATIONS OBJECT — ENGLISH & TAMIL
  const t = {
    english: {
      title: 'Trial Balance',
      from: 'From',
      to: 'To',
      refresh: 'Refresh',
      csv: 'CSV',
      pdf: 'PDF',
      print: 'Print',
      category: 'Category:',
      account: 'Account:',
      filterPlaceholder: 'Filter categories...',
      accountPlaceholder: 'Filter accounts...',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      loading: 'Loading...',
      errorLoading: 'Failed to load trial balance',
      inflow: 'Inflow',
      outflow: 'Outflow',
      debit: 'Debit',
      credit: 'Credit',
      balance: 'Balance',
      grandTotal: 'GRAND TOTAL',
      total: 'Total',
      noData: 'No data',
      exportCategory: 'Export category to CSV',
      debitGreaterThanCredit: 'Debit > Credit',
      creditGreaterThanDebit: 'Credit > Debit',
      today: 'Today',
      thisMonth: 'This Month',
      fiscalYear: 'Fiscal Year',
      categories: 'categories',
      accounts: 'accounts',
    },
    tamil: {
      title: 'முன்னோக்கு நிலை',
      from: 'இருந்து',
      to: 'வரை',
      refresh: 'புதுப்பி',
      csv: 'CSV',
      pdf: 'PDF',
      print: 'அச்சிடு',
      category: 'வகை:',
      account: 'கணக்கு:',
      filterPlaceholder: 'வகைகளை வடிகட்டு',
      accountPlaceholder: 'கணக்குகளை வடிகட்டு',
      expandAll: 'அனைத்தையும் விரிவுபடுத்து',
      collapseAll: 'அனைத்தையும் மறை',
      loading: 'ஏற்றுகிறது...',
      errorLoading: 'முன்னோக்கு நிலை ஏற்ற முடியவில்லை',
      inflow: 'உள்ளீடு',
      outflow: 'வெளியீடு',
      debit: 'பற்று',
      credit: 'கடன்',
      balance: 'மீதி',
      grandTotal: 'மொத்த மொத்தம்',
      total: 'மொத்தம்',
      noData: 'தரவு இல்லை',
      exportCategory: 'வகையை CSV ஆக ஏற்று',
      debitGreaterThanCredit: 'பற்று > கடன்',
      creditGreaterThanDebit: 'கடன் > பற்று',
      today: 'இன்று',
      thisMonth: 'இந்த மாதம்',
      fiscalYear: 'பொருளாதார ஆண்டு',
      categories: 'வகைகள்',
      accounts: 'கணக்குகள்',
    },
  } as const;

  const [params, setParams] = useSearchParams();
  const startDate = params.get('from') || new Date().toISOString().slice(0, 10);
  const endDate = params.get('to') || new Date().toISOString().slice(0, 10);
  const query = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  const [rows, setRows] = useState<TrialRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof TrialRow>('account');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [accountQuery, setAccountQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState({
    inflow: true,
    outflow: true,
    debit: true,
    credit: true,
    balance: true,
  });

  const navigate = useNavigate();

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();

      const res = await fetch(`https://tmsapi.xesstechlink.com/api/journal/trial-balance?from=${query.startDate}&to=${query.endDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(t[language].errorLoading);
      const data = await res.json();

      setRows(data.data || []);
    } catch (e: any) {
      setError(e?.message || t[language].errorLoading);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query.startDate, query.endDate, language]); // 👈 Re-run on language change

  const onFilterChange = (key: 'from' | 'to', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const setRange = (range: 'today' | 'thisMonth' | 'fy') => {
    const now = new Date();
    let from: string;
    let to: string;

    if (range === 'today') {
      const d = now.toISOString().slice(0, 10);
      from = d;
      to = d;
    } else if (range === 'thisMonth') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      from = `${y}-${m}-01`;
      const last = new Date(y, now.getMonth() + 1, 0).toISOString().slice(0, 10);
      to = last;
    } else {
      const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      from = `${y}-04-01`;
      to = `${y + 1}-03-31`;
    }

    const next = new URLSearchParams(params);
    next.set('from', from);
    next.set('to', to);
    setParams(next, { replace: true });
  };

  const nf = useMemo(() => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);

  const sortList = (list: TrialRow[]) => {
    const copy = [...list];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return copy;
  };

  const sortedRows = useMemo(() => sortList(rows), [rows, sortKey, sortDir]);

  const onSort = (key: keyof TrialRow) => {
    setSortKey(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const categories = useMemo<CategoryGroup>(() => {
    const catMap: CategoryGroup = {};
    sortedRows.forEach(row => {
      const cat = row.category || 'Uncategorized';
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(row);
    });
    return catMap;
  }, [sortedRows]);

  const categoryTotals = useMemo<CategoryTotals>(() => {
    const totals: CategoryTotals = {};
    Object.entries(categories).forEach(([cat, rows]) => {
      totals[cat] = {
        debit: rows.reduce((sum, r) => sum + (r.debit || 0), 0),
        credit: rows.reduce((sum, r) => sum + (r.credit || 0), 0),
      };
    });
    return totals;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    return Object.fromEntries(
      Object.entries(categories).filter(([cat]) =>
        !q || cat.toLowerCase().includes(q)
      )
    );
  }, [categories, categoryQuery]);

  const hasExpandedCategories = useMemo(
    () => Object.keys(expandedCategories).length > 0 &&
      Object.values(expandedCategories).every(v => v === true),
    [expandedCategories]
  );

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !(prev[category] ?? true),
    }));
  }, []);

  const toggleAllCategories = useCallback((expand: boolean) => {
    const newState: Record<string, boolean> = {};
    Object.keys(filteredCategories).forEach(cat => {
      newState[cat] = expand;
    });
    setExpandedCategories(newState);
  }, [filteredCategories]);

  const visibleColumnsCount = Object.values(visible).filter(Boolean).length;

  const totals = useMemo(() => {
    return {
      debit: sortedRows.reduce((sum, r) => sum + (r.debit || 0), 0),
      credit: sortedRows.reduce((sum, r) => sum + (r.credit || 0), 0),
    };
  }, [sortedRows]);

  const exportCSV = () => {
    const headers = [
      t[language].account,
      ...(visible.inflow ? [t[language].inflow] : []),
      ...(visible.outflow ? [t[language].outflow] : []),
      ...(visible.debit ? [t[language].debit] : []),
      ...(visible.credit ? [t[language].credit] : []),
      ...(visible.balance ? [t[language].balance] : []),
    ];

    const lines = [
      headers.join(','),
      ...sortedRows.map(row => [
        row.account,
        ...(visible.inflow ? [row.inflow || ''] : []),
        ...(visible.outflow ? [row.outflow || ''] : []),
        ...(visible.debit ? [row.debit || ''] : []),
        ...(visible.credit ? [row.credit || ''] : []),
        ...(visible.balance ? [row.balance || ''] : []),
      ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')),
      [
        t[language].grandTotal,
        ...(visible.inflow ? [sortedRows.reduce((s, r) => s + (r.inflow || 0), 0)] : []),
        ...(visible.outflow ? [sortedRows.reduce((s, r) => s + (r.outflow || 0), 0)] : []),
        ...(visible.debit ? [totals.debit] : []),
        ...(visible.credit ? [totals.credit] : []),
        ...(visible.balance ? [sortedRows.reduce((s, r) => s + (r.balance || 0), 0)] : []),
      ]
        .map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v)
        .join(','),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance_${query.startDate}_${query.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    toast.info(t[language].pdf); // Placeholder — implement actual PDF logic
  };

  const exportCategoryToCSV = (category: string, categoryRows: TrialRow[]) => {
    const headers = [
      t[language].account,
      ...(visible.inflow ? [t[language].inflow] : []),
      ...(visible.outflow ? [t[language].outflow] : []),
      ...(visible.debit ? [t[language].debit] : []),
      ...(visible.credit ? [t[language].credit] : []),
      ...(visible.balance ? [t[language].balance] : []),
    ];

    const lines = [
      headers.join(','),
      ...categoryRows.map(row => [
        row.account,
        ...(visible.inflow ? [row.inflow || ''] : []),
        ...(visible.outflow ? [row.outflow || ''] : []),
        ...(visible.debit ? [row.debit || ''] : []),
        ...(visible.credit ? [row.credit || ''] : []),
        ...(visible.balance ? [row.balance || ''] : []),
      ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${category}_${query.startDate}_${query.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-2">
      <Card className="shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">{t[language].title}</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!sortedRows.length}>
                {t[language].csv}
              </Button>
              <Button variant="secondary" size="sm" onClick={exportPDF} disabled={!sortedRows.length}>
                {t[language].pdf}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!sortedRows.length}>
                {t[language].print}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {/* Date range and filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3 items-end">
            <div>
              <Label htmlFor="from" className="text-xs">{t[language].from}</Label>
              <Input
                id="from"
                type="date"
                className="h-8 text-sm"
                value={startDate}
                onChange={(e) => onFilterChange('from', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">{t[language].to}</Label>
              <Input
                id="to"
                type="date"
                className="h-8 text-sm"
                value={endDate}
                onChange={(e) => onFilterChange('to', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Button size="sm" onClick={load} disabled={isLoading} className="flex items-center gap-1">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only md:not-sr-only">{t[language].refresh}</span>
              </Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('today')} className="w-full">
                {t[language].today}
              </Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('thisMonth')} className="w-full">
                {t[language].thisMonth}
              </Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('fy')} className="w-full">
                {t[language].fiscalYear}
              </Button>
            </div>
          </div>

          {/* Search and filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="categorySearch" className="text-xs whitespace-nowrap">{t[language].category}</Label>
                <Input
                  id="categorySearch"
                  placeholder={t[language].filterPlaceholder}
                  className="h-8 text-sm flex-1"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="accountSearch" className="text-xs whitespace-nowrap">{t[language].account}</Label>
                <Input
                  id="accountSearch"
                  placeholder={t[language].accountPlaceholder}
                  className="h-8 text-sm flex-1"
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleAllCategories(!hasExpandedCategories)}
                >
                  {hasExpandedCategories ? t[language].collapseAll : t[language].expandAll}
                </Button>
                <span className="text-gray-600">
                  {isLoading ? t[language].loading : `${Object.keys(categories).length} ${t[language].categories}, ${rows.length} ${t[language].accounts}`}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs mt-2">
                {error && <span className="text-red-600">{error}</span>}
                <div className="ml-auto flex items-center gap-4">
                  <span className="font-medium">
                    {t[language].debit}: <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                      {nf.format(totals.debit)}
                    </span>
                  </span>
                  <span className="font-medium">
                    {t[language].credit}: <span className={totals.credit !== totals.debit ? 'text-red-600' : ''}>
                      {nf.format(totals.credit)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column visibility toggles */}
          <div className="flex flex-wrap items-center gap-3 mb-3 pb-2 border-b">
            <div className="flex items-center gap-1 text-xs">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.inflow} onChange={(e) => setVisible(v => ({ ...v, inflow: e.target.checked }))} className="h-4 w-4" />
                <span>{t[language].inflow}</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.outflow} onChange={(e) => setVisible(v => ({ ...v, outflow: e.target.checked }))} className="h-4 w-4" />
                <span>{t[language].outflow}</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.debit} onChange={(e) => setVisible(v => ({ ...v, debit: e.target.checked }))} className="h-4 w-4" />
                <span>{t[language].debit}</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.credit} onChange={(e) => setVisible(v => ({ ...v, credit: e.target.checked }))} className="h-4 w-4" />
                <span>{t[language].credit}</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.balance} onChange={(e) => setVisible(v => ({ ...v, balance: e.target.checked }))} className="h-4 w-4" />
                <span>{t[language].balance}</span>
              </label>
            </div>
          </div>

          {/* Main table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th
                    className="text-left px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onSort('account')}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t[language].account}</span>
                      {sortKey === 'account' && (
                        <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {visible.inflow && (
                    <th
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('inflow')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'inflow' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>{t[language].inflow}</span>
                      </div>
                    </th>
                  )}
                  {visible.outflow && (
                    <th
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('outflow')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'outflow' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>{t[language].outflow}</span>
                      </div>
                    </th>
                  )}
                  {visible.debit && (
                    <th
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('debit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'debit' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>{t[language].debit}</span>
                      </div>
                    </th>
                  )}
                  {visible.credit && (
                    <th
                      className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('credit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'credit' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>{t[language].credit}</span>
                      </div>
                    </th>
                  )}
                  {visible.balance && (
                    <th
                      className="text-right px-3 py-2 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('balance')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {sortKey === 'balance' && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        <span>{t[language].balance}</span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={1 + Object.values(visible).filter(Boolean).length}>
                      <LoadingSkeleton visibleColumns={Object.values(visible).filter(Boolean).length} />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={1 + Object.values(visible).filter(Boolean).length} className="text-center py-4 text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : Object.keys(filteredCategories).length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={1 + Object.values(visible).filter(Boolean).length} className="text-center py-4 text-gray-500">
                      {t[language].noData}
                    </td>
                  </tr>
                ) : (
                  <>
                    {Object.entries(filteredCategories).map(([category, categoryRows]) => {
                      const isExpanded = expandedCategories[category] ?? true;
                      const categoryTotal = categoryTotals[category] || { debit: 0, credit: 0 };
                      const isBalanced = Math.abs((categoryTotal.debit || 0) - (categoryTotal.credit || 0)) < 0.01;

                      // Filter rows by account query
                      const filteredRows = categoryRows.filter(row =>
                        !accountQuery || row.account.toLowerCase().includes(accountQuery.toLowerCase())
                      );

                      if (filteredRows.length === 0) return null;

                      return (
                        <React.Fragment key={category}>
                          {/* Category Header */}
                          <tr
                            className="bg-gray-50 cursor-pointer hover:bg-gray-100"
                            onClick={() => toggleCategory(category)}
                          >
                            <td className="px-3 py-2 font-medium" colSpan={1 + Object.values(visible).filter(Boolean).length}>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span>{category}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportCategoryToCSV(category, filteredRows);
                                  }}
                                  title={t[language].exportCategory}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Category Rows */}
                          {isExpanded && filteredRows.map((row) => (
                            <tr key={row.account} className="hover:bg-gray-50 border-b">
                              <td className="px-8 py-1.5">
                                <button
                                  className="text-blue-700 hover:underline text-xs text-left w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/dashboard/reports/journal-log?account=${encodeURIComponent(row.account)}` +
                                      `&startDate=${encodeURIComponent(query.startDate)}` +
                                      `&endDate=${encodeURIComponent(query.endDate)}`
                                    );
                                  }}
                                >
                                  {row.account}
                                </button>
                              </td>
                              {visible.inflow && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.inflow ? nf.format(row.inflow) : '-'}
                                </td>
                              )}
                              {visible.outflow && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.outflow ? nf.format(row.outflow) : '-'}
                                </td>
                              )}
                              {visible.debit && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.debit ? nf.format(row.debit) : '-'}
                                </td>
                              )}
                              {visible.credit && (
                                <td className="px-2 py-1.5 text-right">
                                  {row.credit ? nf.format(row.credit) : '-'}
                                </td>
                              )}
                              {visible.balance && (
                                <td className="px-2 py-1.5 text-right">
                                  <span className={row.balance < 0 ? 'text-red-600' : ''}>
                                    {row.balance ? nf.format(row.balance) : '0.00'}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))}

                          {/* Category Summary */}
                          {isExpanded && (
                            <tr className={`${isBalanced ? 'bg-green-50' : 'bg-amber-50'} border-b`}>
                              <td className="px-6 py-1 text-right font-medium" colSpan={1}>
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-gray-500">{t[language].total} {category}:</span>
                                  {!isBalanced && (
                                    <span className="text-xs text-amber-600">
                                      {categoryTotal.debit > categoryTotal.credit ? t[language].debitGreaterThanCredit : t[language].creditGreaterThanDebit}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {visible.inflow && (
                                <td className="px-2 py-1 text-right font-medium">
                                  {nf.format(filteredRows.reduce((sum, r) => sum + (r.inflow || 0), 0))}
                                </td>
                              )}
                              {visible.outflow && (
                                <td className="px-2 py-1 text-right font-medium">
                                  {nf.format(filteredRows.reduce((sum, r) => sum + (r.outflow || 0), 0))}
                                </td>
                              )}
                              {visible.debit && (
                                <td className="px-2 py-1 text-right font-medium">
                                  <span className={!isBalanced ? 'text-amber-700' : ''}>
                                    {nf.format(categoryTotal.debit || 0)}
                                  </span>
                                </td>
                              )}
                              {visible.credit && (
                                <td className="px-2 py-1 text-right font-medium">
                                  <span className={!isBalanced ? 'text-amber-700' : ''}>
                                    {nf.format(categoryTotal.credit || 0)}
                                  </span>
                                </td>
                              )}
                              {visible.balance && (
                                <td className="px-2 py-1 text-right font-medium">
                                  <span className={filteredRows.reduce((sum, r) => sum + (r.balance || 0), 0) < 0 ? 'text-red-600' : ''}>
                                    {nf.format(filteredRows.reduce((sum, r) => sum + (r.balance || 0), 0))}
                                  </span>
                                </td>
                              )}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Grand Total */}
                    {sortedRows.length > 0 && (
                      <tr className="bg-gray-100 font-medium border-t-2 border-gray-200">
                        <td className="px-3 py-2 font-semibold">
                          <div className="flex items-center justify-between">
                            <span>{t[language].grandTotal}</span>
                            {totals.debit !== totals.credit && (
                              <span className="text-xs text-red-600 font-normal">
                                {totals.debit > totals.credit ? t[language].debitGreaterThanCredit : t[language].creditGreaterThanDebit}
                              </span>
                            )}
                          </div>
                        </td>
                        {visible.inflow && (
                          <td className="px-2 py-2 text-right font-semibold">
                            {nf.format(sortedRows.reduce((sum, r) => sum + (r.inflow || 0), 0))}
                          </td>
                        )}
                        {visible.outflow && (
                          <td className="px-2 py-2 text-right font-semibold">
                            {nf.format(sortedRows.reduce((sum, r) => sum + (r.outflow || 0), 0))}
                          </td>
                        )}
                        {visible.debit && (
                          <td className="px-2 py-2 text-right font-semibold">
                            <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                              {nf.format(totals.debit)}
                            </span>
                          </td>
                        )}
                        {visible.credit && (
                          <td className="px-2 py-2 text-right font-semibold">
                            <span className={totals.credit !== totals.debit ? 'text-red-600' : ''}>
                              {nf.format(totals.credit)}
                            </span>
                          </td>
                        )}
                        {visible.balance && (
                          <td className="px-2 py-2 text-right font-semibold">
                            <span className={sortedRows.reduce((sum, r) => sum + (r.balance || 0), 0) < 0 ? 'text-red-600' : ''}>
                              {nf.format(sortedRows.reduce((sum, r) => sum + (r.balance || 0), 0))}
                            </span>
                          </td>
                        )}
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}