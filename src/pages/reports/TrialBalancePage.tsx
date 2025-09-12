import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';

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

export default function TrialBalancePage() {
  return <TrialBalanceContent />;
}

function TrialBalanceContent() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const persisted = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('trialBalanceRange') || '{}') as { from?: string; to?: string };
    } catch { return {}; }
  }, []); // Memoize once to avoid re-parsing on every render

  // Date state variables (controlled inputs)
  const [startDate, setStartDate] = useState(persisted.from || params.get('from') || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(persisted.to || params.get('to') || new Date().toISOString().slice(0, 10));

  // Validate and ensure start date doesn't exceed end date
  useEffect(() => {
    if (!startDate || !endDate) return;
    const dateFrom = new Date(startDate);
    const dateTo = new Date(endDate);
    if (dateFrom > dateTo) {
      setEndDate(startDate); // Adjust end date to match start date if invalid
    }
  }, [startDate, endDate]);

  // Sync state with URL params
  useEffect(() => {
    const nextParams = new URLSearchParams(params);
    if (startDate) nextParams.set('from', startDate);
    else nextParams.delete('from');
    if (endDate) nextParams.set('to', endDate);
    else nextParams.delete('to');
    setParams(nextParams, { replace: true });
  }, [startDate, endDate, params, setParams]);

  // Save to localStorage when dates change
  useEffect(() => {
    localStorage.setItem('trialBalanceRange', JSON.stringify({ from: startDate, to: endDate }));
  }, [startDate, endDate]);

  const query = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  // Data state
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [categories, setCategories] = useState<CategoryGroup>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sorting state
  const [sortKey, setSortKey] = useState<'account' | 'inflow' | 'outflow' | 'debit' | 'credit' | 'balance'>('account');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Column visibility state
  const [visible, setVisible] = useState({ 
    inflow: true, 
    outflow: true, 
    debit: true, 
    credit: true, 
    balance: true 
  });
  const visibleColumnsCount = useMemo(() => 
    Object.values(visible).filter(Boolean).length 
  , [visible]);

  // Category expansion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const hasExpandedCategories = useMemo(() => 
    Object.values(expandedCategories).some(Boolean) 
  , [expandedCategories]);

  // Number formatters
  const nf = useMemo(() => 
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  , []);
  const csvNF = useMemo(() => 
    new Intl.NumberFormat('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: false 
    })
  , []);

  // Memoized load function to prevent infinite loops
  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      const resp = await fetch(`/api/journal/trial-balance?from=${query.startDate}&to=${query.endDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load trial balance data');
      }

      const data = await resp.json();

      // Handle new format (categories grouped) vs old format (flat list)
      let grouped: CategoryGroup = {};
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        grouped = data.data;
        setRows(data.allRows || []);
      } else {
        const list = (data?.data || []) as TrialRow[];
        setRows(list);
        grouped = list.reduce<CategoryGroup>((acc, row) => {
          const category = row.category || 'Uncategorized';
          (acc[category] = acc[category] || []).push(row);
          return acc;
        }, {});
      }

      setCategories(grouped);

      // Expand all categories initially
      setExpandedCategories(Object.keys(grouped).reduce<Record<string, boolean>>((acc, cat) => {
        acc[cat] = true;
        return acc;
      }, {}));

    } catch (e: any) {
      console.error('Error loading trial balance:', e);
      setError(e?.message || 'Failed to load trial balance data');
      toast.error(e?.message || 'Failed to load trial balance data');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [query.startDate, query.endDate, getAuthToken]);

  // Toggle individual category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  // Toggle all categories expansion
  const toggleAllCategories = useCallback((expand: boolean) => {
    setExpandedCategories(Object.keys(categories).reduce<Record<string, boolean>>((acc, cat) => {
      acc[cat] = expand;
      return acc;
    }, {}));
  }, [categories]);

  // Search state with debouncing
  const [accountQuery, setAccountQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');

  // Filter categories (debounced)
  const filteredCategories = useMemo(() => {
    if (!categoryQuery) return categories;
    const q = categoryQuery.toLowerCase();
    return Object.entries(categories).reduce<CategoryGroup>((acc, [category, rows]) => {
      const hasMatch = rows.some(row => {
        const accountMatch = String(row.account || '').toLowerCase().includes(q);
        const rowCategory = (row.category ? String(row.category) : '').toLowerCase();
        const rowCategoryMatch = rowCategory.includes(q);
        const groupCategoryMatch = String(category || '').toLowerCase().includes(q);
        return accountMatch || rowCategoryMatch || groupCategoryMatch;
      });
      if (hasMatch) acc[category] = rows;
      return acc;
    }, {});
  }, [categories, categoryQuery]);

  // Get all rows from filtered categories
  const allFilteredRows = useMemo(() => 
    Object.values(filteredCategories).flatMap(categoryRows => categoryRows)
  , [filteredCategories]);

  // Filter rows by account query
  const filteredRowsByAccount = useMemo(() => 
    allFilteredRows.filter(row => 
      !accountQuery || row.account.toLowerCase().includes(accountQuery.toLowerCase())
    )
  , [allFilteredRows, accountQuery]);

  // Sort rows based on current sort state
  const sortedRows = useMemo(() => {
    if (filteredRowsByAccount.length === 0) return [];
    return [...filteredRowsByAccount].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }

      // Handle string comparison with category fallback
      const strVa = String(va);
      const strVb = String(vb);
      
      return sortDir === 'asc' 
        ? strVa.localeCompare(strVb) 
        : strVb.localeCompare(strVa);
    });
  }, [filteredRowsByAccount, sortKey, sortDir]);

  // Calculate totals for visible rows
  const totalsRow = useMemo(() => {
    if (sortedRows.length === 0) return { account: 'TOTAL', inflow: 0, outflow: 0, debit: 0, credit: 0, balance: 0 };
    return sortedRows.reduce((acc, r) => ({
      account: 'TOTAL',
      inflow: acc.inflow + r.inflow,
      outflow: acc.outflow + r.outflow,
      debit: acc.debit + r.debit,
      credit: acc.credit + r.credit,
      balance: acc.balance + r.balance,
    }), { account: 'TOTAL', inflow: 0, outflow: 0, debit: 0, credit: 0, balance: 0 });
  }, [sortedRows]);

  // Date range presets handler
  const setPresetRange = useCallback((range: 'today' | 'thisMonth' | 'fy') => {
    const now = new Date();
    let newFrom: string, newTo: string;
    
    if (range === 'today') {
      const date = now.toISOString().slice(0, 10);
      newFrom = newTo = date;
    } else if (range === 'thisMonth') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      newFrom = `${year}-${month}-01`;
      newTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else { // Financial year (Apr-Oct)
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      newFrom = `${year}-04-01`;
      newTo = `${year + 1}-03-31`;
    }

    setStartDate(newFrom);
    setEndDate(newTo);
  }, [setStartDate, setEndDate]);

  // CSV export handler
  const exportToCSV = useCallback(() => {
    if (sortedRows.length === 0) return;
    const headers = ['Account', 'Inflow', 'Outflow', 'Debit', 'Credit', 'Balance'];
    const rowsCSV = sortedRows.map(row => [
      `"${row.account.replace(/"/g, '""')}"`,
      csvNF.format(row.inflow),
      csvNF.format(row.outflow),
      csvNF.format(row.debit),
      csvNF.format(row.credit),
      csvNF.format(row.balance)
    ].join(','));

    const blob = new Blob([headers.join(',') + '\n' + rowsCSV.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance_${query.startDate}_${query.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported trial balance data');
  }, [sortedRows, query.startDate, query.endDate, csvNF]);

  // PDF export handler
  const exportToPDF = useCallback(() => {
    if (sortedRows.length === 0) return;
    const token = getAuthToken();
    const url = `/api/journal/trial-balance.pdf?from=${query.startDate}&to=${query.endDate}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  }, [sortedRows, query.startDate, query.endDate, getAuthToken]);

  // Initial data load
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-7xl mx-auto p-2">
      <Card className="shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">{t('Trial Balance', 'டிரயல் பாலன்ஸ்')}</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={load} disabled={isLoading} className="flex items-center gap-1">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only md:not-sr-only">{t('Refresh', 'புதுப்பி')}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={exportToCSV} disabled={!sortedRows.length}>CSV</Button>
              <Button variant="secondary" size="sm" onClick={exportToPDF} disabled={!sortedRows.length}>PDF</Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!sortedRows.length}>{t('Print', 'அச்சிடு')}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3 items-end">
            {/* From Date Input */}
            <div>
              <Label htmlFor="from" className="text-xs">{t('From', 'இருந்து')}</Label>
              <Input 
                id="from" 
                type="date" 
                className="h-8 text-sm" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            {/* To Date Input */}
            <div>
              <Label htmlFor="to" className="text-xs">{t('To', 'வரை')}</Label>
              <Input 
                id="to" 
                type="date" 
                className="h-8 text-sm" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Preset Buttons */}
            <div className="md:col-span-2"></div> {/* Spacer */}
            <div>
              <Button variant="outline" size="sm" onClick={() => setPresetRange('today')} className="w-full">{t('Today', 'இன்று')}</Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setPresetRange('thisMonth')} className="w-full">{t('This Month', 'இந்த மாதம்')}</Button>
            </div>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="categorySearch" className="text-xs whitespace-nowrap">{t('Category:', 'வகை:')}</Label>
                <Input 
                  id="categorySearch" 
                  placeholder={t('Filter categories...', 'வகைகளை வடிகட்டு...')} 
                  className="h-8 text-sm flex-1"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="accountSearch" className="text-xs whitespace-nowrap">{t('Account:', 'கணக்கு:')}</Label>
                <Input 
                  id="accountSearch" 
                  placeholder={t('Filter accounts...', 'கணக்குகளை வடிகட்டு...')} 
                  className="h-8 text-sm flex-1"
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category Controls */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllCategories(!hasExpandedCategories)}
                >
                  {hasExpandedCategories ? t('Collapse All', 'அனைத்தையும் சுருக்கு') : t('Expand All', 'அனைத்தையும் விரித்து காட்டு')}
                </Button>
                <span className="text-gray-600">
                  {!isLoading && `${Object.keys(filteredCategories).length} ${t('categories', 'வகைகள்')}, ${allFilteredRows.length} ${t('accounts', 'கணக்குகள்')}`}
                </span>
              </div>

              {/* Column Visibility Toggle */}
              <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                <span className="font-medium">{t('Show columns:', 'நெடுவரிசைகள்:')}</span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.inflow}
                    onChange={() => setVisible(prev => ({ ...prev, inflow: !prev.inflow }))}
                  />
                  {t('Inflow', 'உள்வரவு')}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.outflow}
                    onChange={() => setVisible(prev => ({ ...prev, outflow: !prev.outflow }))}
                  />
                  {t('Outflow', 'புறவரவு')}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.debit}
                    onChange={() => setVisible(prev => ({ ...prev, debit: !prev.debit }))}
                  />
                  {t('Debit', 'பற்று')}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.credit}
                    onChange={() => setVisible(prev => ({ ...prev, credit: !prev.credit }))}
                  />
                  {t('Credit', 'கடன்')}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.balance}
                    onChange={() => setVisible(prev => ({ ...prev, balance: !prev.balance }))}
                  />
                  {t('Balance', 'மீதம்')}
                </label>
              </div>
            </div>
          </div>

          {/* Loading/Error States */}
          {isLoading ? (
            <div className="text-center py-4">
              <LoadingSkeleton visibleColumns={visibleColumnsCount} />
            </div>
          ) : error ? (
            <div className="text-red-600 py-4 text-center">
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={load} 
                disabled={isLoading}
              >
                {t('Retry', 'மீண்டும் முயற்சி')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {sortedRows.length === 0 ? (
                <div className="text-center py-4 text-gray-500">{t('No data found for the current filters.', 'தற்போதைய வடிப்பான்களுக்கு தரவு இல்லை.')}</div>
              ) : (
                <table className="w-full text-xs" aria-label="Trial balance data">
                  <caption>{t('Trial Balance', 'டிரயல் பாலன்ஸ்')} ({query.startDate} {t('to', ' முதல் ')} {query.endDate} {t('', ' வரை')})</caption>
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th
                        className="text-left px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortKey(prev => prev === 'account' ? prev : 'account')}
                        aria-sort={sortKey === 'account' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <div className="flex items-center justify-between">
                          <span>{t('Account', 'கணக்கு')}</span>
                          {sortKey === 'account' && (
                            <span className="ml-1" aria-hidden="true">
                              {sortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      
                      {visible.inflow && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSortKey(prev => prev === 'inflow' ? prev : 'inflow')}
                          aria-sort={sortKey === 'inflow' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t('Inflow', 'உள்வரவு')}</span>
                            {sortKey === 'inflow' && (
                              <span className="ml-1" aria-hidden="true">
                                {sortDir === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      )}
                      
                      {visible.outflow && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSortKey(prev => prev === 'outflow' ? prev : 'outflow')}
                          aria-sort={sortKey === 'outflow' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t('Outflow', 'புறவரவு')}</span>
                            {sortKey === 'outflow' && (
                              <span className="ml-1" aria-hidden="true">
                                {sortDir === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      )}
                      
                      {visible.debit && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSortKey(prev => prev === 'debit' ? prev : 'debit')}
                          aria-sort={sortKey === 'debit' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t('Debit', 'பற்று')}</span>
                            {sortKey === 'debit' && (
                              <span className="ml-1" aria-hidden="true">
                                {sortDir === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      )}
                      
                      {visible.credit && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSortKey(prev => prev === 'credit' ? prev : 'credit')}
                          aria-sort={sortKey === 'credit' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t('Credit', 'கடன்')}</span>
                            {sortKey === 'credit' && (
                              <span className="ml-1" aria-hidden="true">
                                {sortDir === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      )}
                      
                      {visible.balance && (
                        <th
                          className="text-right px-3 py-2 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSortKey(prev => prev === 'balance' ? prev : 'balance')}
                          aria-sort={sortKey === 'balance' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t('Balance', 'மீதம்')}</span>
                            {sortKey === 'balance' && (
                              <span className="ml-1" aria-hidden="true">
                                {sortDir === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render Categories */}
                    {Object.entries(filteredCategories).map(([category, categoryRows]) => {
                      const filteredRows = categoryRows.filter(row => 
                        !accountQuery || row.account.toLowerCase().includes(accountQuery.toLowerCase())
                      );
                      if (filteredRows.length === 0) return null;

                      // Calculate category totals
                      const categoryTotals = filteredRows.reduce((acc, row) => ({
                        inflow: acc.inflow + row.inflow,
                        outflow: acc.outflow + row.outflow,
                        debit: acc.debit + row.debit,
                        credit: acc.credit + row.credit,
                        balance: acc.balance + row.balance,
                      }), { inflow: 0, outflow: 0, debit: 0, credit: 0, balance: 0 });

                      return (
                        <React.Fragment key={category}>
                          {/* Category Header */}
                          <tr
                            className="bg-gray-50 hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleCategory(category)}
                          >
                            <td colSpan={visibleColumnsCount + 1} className="px-3 py-1.5 font-medium">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {expandedCategories[category] ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <span>{category}</span>
                                  <span className="text-gray-500 text-xs">
                                    ({filteredRows.length} {filteredRows.length === 1 ? t('account', 'கணக்கு') : t('accounts', 'கணக்குகள்')})
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Export category-specific CSV (if needed)
                                    // (You'd need to replicate similar CSV logic here)
                                    toast.info('Category export not implemented yet');
                                  }}
                                >
                                 
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Category Rows */}
                          {expandedCategories[category] && (
                            <>
                              {filteredRows.map(row => (
                                <tr key={`${category}-${row.account}`} className="hover:bg-gray-50 border-b">
                                  <td className="px-6 py-2">{row.account}</td>
                                  {visible.inflow && (
                                    <td className="text-right px-3 py-2">
                                      {row.inflow ? nf.format(row.inflow) : '-'}
                                    </td>
                                  )}
                                  {visible.outflow && (
                                    <td className="text-right px-3 py-2">
                                      {row.outflow ? nf.format(row.outflow) : '-'}
                                    </td>
                                  )}
                                  {visible.debit && (
                                    <td className="text-right px-3 py-2">
                                      {row.debit ? nf.format(row.debit) : '-'}
                                    </td>
                                  )}
                                  {visible.credit && (
                                    <td className="text-right px-3 py-2">
                                      {row.credit ? nf.format(row.credit) : '-'}
                                    </td>
                                  )}
                                  {visible.balance && (
                                    <td className="text-right px-3 py-2 font-medium">
                                      {nf.format(row.balance)}
                                    </td>
                                  )}
                                </tr>
                              ))}

                              {/* Category Total Row */}
                              <tr className="bg-gray-50 font-medium border-t">
                                <td className="px-6 py-1.5 text-sm">{t('Total', 'மொத்தம்')} {category}</td>
                                {visible.inflow && (
                                  <td className="text-right px-3 py-1.5">
                                    {nf.format(categoryTotals.inflow)}
                                  </td>
                                )}
                                {visible.outflow && (
                                  <td className="text-right px-3 py-1.5">
                                    {nf.format(categoryTotals.outflow)}
                                  </td>
                                )}
                                {visible.debit && (
                                  <td className="text-right px-3 py-1.5">
                                    {nf.format(categoryTotals.debit)}
                                  </td>
                                )}
                                {visible.credit && (
                                  <td className="text-right px-3 py-1.5">
                                    {nf.format(categoryTotals.credit)}
                                  </td>
                                )}
                                {visible.balance && (
                                  <td className="text-right px-3 py-1.5">
                                    {nf.format(categoryTotals.balance)}
                                  </td>
                                )}
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Grand Total Row */}
                    {sortedRows.length > 0 && (
                      <tr className="bg-gray-100 font-medium border-t-2 border-gray-200">
                        <td className="px-3 py-2 font-semibold">
                          <div className="flex items-center justify-between">
                            <span>{t('GRAND TOTAL', 'மொத்தம்')}</span>
                            {totalsRow.debit !== totalsRow.credit && (
                              <span className="text-xs text-red-600 font-normal">
                                {totalsRow.debit > totalsRow.credit ? t('Debit > Credit', 'பற்று > கடன்') : t('Credit > Debit', 'கடன் > பற்று')}
                              </span>
                            )}
                          </div>
                        </td>
                        {visible.inflow && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totalsRow.debit !== totalsRow.credit ? 'text-red-600' : ''}>
                              {nf.format(totalsRow.inflow)}
                            </span>
                          </td>
                        )}
                        {visible.outflow && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totalsRow.debit !== totalsRow.credit ? 'text-red-600' : ''}>
                              {nf.format(totalsRow.outflow)}
                            </span>
                          </td>
                        )}
                        {visible.debit && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totalsRow.debit !== totalsRow.credit ? 'text-red-600' : ''}>
                              {nf.format(totalsRow.debit)}
                            </span>
                          </td>
                        )}
                        {visible.credit && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totalsRow.debit !== totalsRow.credit ? 'text-red-600' : ''}>
                              {nf.format(totalsRow.credit)}
                            </span>
                          </td>
                        )}
                        {visible.balance && (
                          <td className="text-right px-3 py-2 font-semibold">
                            {nf.format(totalsRow.balance)}
                          </td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}