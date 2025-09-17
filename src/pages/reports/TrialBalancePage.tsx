import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Download, Eye, EyeOff, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// Translation object
const t = {
  english: {
    dateFrom: 'தேதி இருந்து',
    dateTo: 'தேதி வரை',
    search: 'தேடு',
    reset: 'மீட்டமை',
    download: 'பதிவிறக்க',
    refresh: 'புதுப்பி',
    account: 'கணக்கு',
    category: 'வகை',
    inflow: 'உள்வரவு',
    outflow: 'வெளிசெலவு',
    balance: 'இருப்பு',
    debit: 'பற்று',
    credit: 'வரவு',
    total: 'மொத்தம்',
    loading: 'ஏற்றுகிறது...',
    errorLoading: 'தரவு ஏற்றப்படும் போது பிழை',
    noData: 'தரவு இல்லை',
    show: 'காண்பி',
    hide: 'மறை',
    today: 'இன்று',
    thisMonth: 'இந்த மாதம்',
    trialBalance: 'டிரயல் பாலன்ஸ்',
    grandTotal: 'மொத்தம்',
    debitGreaterThanCredit: 'பற்று > வரவு',
    creditGreaterThanDebit: 'வரவு > பற்று',
    collapseAll: 'அனைத்தையும் சுருக்கு',
    expandAll: 'அனைத்தையும் விரித்து காட்டு',
    print: 'அச்சிடு',
    retry: 'மீண்டும் முயற்சி',
    categories: 'வகைகள்',
    accounts: 'கணக்குகள்',
    from: 'இருந்து',
    to: 'வரை',
    trialBalanceData: 'டிரயல் பாலன்ஸ் தரவு',
    noDataFoundForCurrentFilters: 'தற்போதைய வடிப்பான்களுக்கு தரவு இல்லை.',
    showColumns: 'நெடுவரிசைகள்:',
    columnVisibility: 'நெடுவரிசை தொடர்பு',
    categoryExportNotImplementedYet: 'வகை ஏற்றுமதி இன்னும் செயல்படுத்தப்படவில்லை',
    financialYear: 'நிதியாண்டு',
  },
  tamil: {
    dateFrom: 'Date From',
    dateTo: 'Date To',
    search: 'Search',
    reset: 'Reset',
    download: 'Download',
    refresh: 'Refresh',
    account: 'Account',
    category: 'Category',
    inflow: 'Inflow',
    outflow: 'Outflow',
    balance: 'Balance',
    debit: 'Debit',
    credit: 'Credit',
    total: 'Total',
    loading: 'Loading...',
    errorLoading: 'Error loading data',
    noData: 'No data',
    show: 'Show',
    hide: 'Hide',
    today: 'Today',
    thisMonth: 'This Month',
    trialBalance: 'Trial Balance',
    grandTotal: 'Grand Total',
    debitGreaterThanCredit: 'Debit > Credit',
    creditGreaterThanDebit: 'Credit > Debit',
    collapseAll: 'Collapse All',
    expandAll: 'Expand All',
    print: 'Print',
    retry: 'Retry',
    categories: 'Categories',
    accounts: 'Accounts',
    from: 'From',
    to: 'To',
    trialBalanceData: 'Trial Balance Data',
    noDataFoundForCurrentFilters: 'No data found for the current filters.',
    showColumns: 'Show columns:',
    columnVisibility: 'Column visibility',
    categoryExportNotImplementedYet: 'Category export not implemented yet',
    financialYear: 'Financial Year',
  }
} as const;

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
  const { language } = useLanguage();
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
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.inflow += row.inflow;
        acc.outflow += row.outflow;
        acc.debit += row.debit;
        acc.credit += row.credit;
        acc.balance += row.balance;
        return acc;
      },
      { inflow: 0, outflow: 0, debit: 0, credit: 0, balance: 0 }
    );
  }, [rows]);

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

  // Update column definitions to use translations
  const columns = useMemo(() => [
    {
      accessorKey: 'account',
      header: t[language].account,
      cell: ({ row }) => row.original.account
    },
    visible.inflow && {
      accessorKey: 'inflow',
      header: t[language].inflow,
      cell: ({ row }) => row.original.inflow.toLocaleString()
    },
    visible.outflow && {
      accessorKey: 'outflow',
      header: t[language].outflow,
      cell: ({ row }) => row.original.outflow.toLocaleString()
    },
    visible.debit && {
      accessorKey: 'debit',
      header: t[language].debit,
      cell: ({ row }) => row.original.debit.toLocaleString()
    },
    visible.credit && {
      accessorKey: 'credit',
      header: t[language].credit,
      cell: ({ row }) => row.original.credit.toLocaleString()
    },
    visible.balance && {
      accessorKey: 'balance',
      header: t[language].balance,
      cell: ({ row }) => row.original.balance.toLocaleString()
    }
  ].filter(Boolean), [visible, language]);

  // Update column visibility toggle buttons
  const columnToggleButtons = [
    { key: 'inflow', label: t[language].inflow },
    { key: 'outflow', label: t[language].outflow },
    { key: 'debit', label: t[language].debit },
    { key: 'credit', label: t[language].credit },
    { key: 'balance', label: t[language].balance }
  ].map(({ key, label }) => (
    <Button
      key={key}
      variant="ghost"
      size="sm"
      onClick={() => setVisible(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
    >
      {visible[key as keyof typeof visible] ? (
        <>
          <EyeOff className="mr-2 h-4 w-4" />
          {t[language].hide} {label}
        </>
      ) : (
        <>
          <Eye className="mr-2 h-4 w-4" />
          {t[language].show} {label}
        </>
      )}
    </Button>
  ));

  // Update totals display
  const totalsRow = (
    <div className="font-bold">
      <div>{t[language].total}</div>
      {visible.inflow && <div>{totals.inflow.toLocaleString()}</div>}
      {visible.outflow && <div>{totals.outflow.toLocaleString()}</div>}
      {visible.debit && <div>{totals.debit.toLocaleString()}</div>}
      {visible.credit && <div>{totals.credit.toLocaleString()}</div>}
      {visible.balance && <div>{totals.balance.toLocaleString()}</div>}
    </div>
  );

  // Update sorting indicators
  const getSortIndicator = (key: string) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  // Update sort handlers
  const handleSort = useCallback((key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  // Update category toggle display
  const renderCategoryToggle = (category: string) => (
    <button
      onClick={() => toggleCategory(category)}
      className="flex items-center gap-2 font-medium"
    >
      {expandedCategories[category] ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
      {category}
    </button>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>{t[language].trialBalance}</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={load}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t[language].refresh}
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!sortedRows.length}>
                <Download className="mr-2 h-4 w-4" />
                {t[language].download}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="start-date">{t[language].dateFrom}</Label>
              <Input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="end-date">{t[language].dateTo}</Label>
              <Input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="categorySearch" className="text-xs whitespace-nowrap">{t[language].category}:</Label>
                <Input 
                  id="categorySearch" 
                  placeholder={t[language].search} 
                  className="h-8 text-sm flex-1"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="accountSearch" className="text-xs whitespace-nowrap">{t[language].account}:</Label>
                <Input 
                  id="accountSearch" 
                  placeholder={t[language].search} 
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
                  {hasExpandedCategories ? t[language].collapseAll : t[language].expandAll}
                </Button>
                <span className="text-gray-600">
                  {!isLoading && `${Object.keys(filteredCategories).length} ${t[language].categories}, ${allFilteredRows.length} ${t[language].accounts}`}
                </span>
              </div>

              {/* Column Visibility Toggle */}
              <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                <span className="font-medium">{t[language].showColumns}:</span>
                {columnToggleButtons}
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
              {t[language].errorLoading}: {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={load} 
                disabled={isLoading}
              >
                {t[language].retry}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {sortedRows.length === 0 ? (
                <div className="text-center py-4 text-gray-500">{t[language].noDataFoundForCurrentFilters}</div>
              ) : (
                <table className="w-full text-xs" aria-label={t[language].trialBalanceData}>
                  <caption>{t[language].trialBalance} ({query.startDate} {t[language].from} {query.endDate} {t[language].to})</caption>
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th
                        className="text-left px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('account')}
                        aria-sort={sortKey === 'account' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <div className="flex items-center justify-between">
                          <span>{t[language].account}</span>
                          {getSortIndicator('account')}
                        </div>
                      </th>
                      
                      {visible.inflow && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('inflow')}
                          aria-sort={sortKey === 'inflow' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t[language].inflow}</span>
                            {getSortIndicator('inflow')}
                          </div>
                        </th>
                      )}
                      
                      {visible.outflow && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('outflow')}
                          aria-sort={sortKey === 'outflow' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t[language].outflow}</span>
                            {getSortIndicator('outflow')}
                          </div>
                        </th>
                      )}
                      
                      {visible.debit && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('debit')}
                          aria-sort={sortKey === 'debit' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t[language].debit}</span>
                            {getSortIndicator('debit')}
                          </div>
                        </th>
                      )}
                      
                      {visible.credit && (
                        <th
                          className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('credit')}
                          aria-sort={sortKey === 'credit' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t[language].credit}</span>
                            {getSortIndicator('credit')}
                          </div>
                        </th>
                      )}
                      
                      {visible.balance && (
                        <th
                          className="text-right px-3 py-2 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('balance')}
                          aria-sort={sortKey === 'balance' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end">
                            <span>{t[language].balance}</span>
                            {getSortIndicator('balance')}
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
                                    ({filteredRows.length} {filteredRows.length === 1 ? t[language].account : t[language].accounts})
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
                                    toast.info(t[language].categoryExportNotImplementedYet);
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
                                <td className="px-6 py-1.5 text-sm">{t[language].total} {category}</td>
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
                            <span>{t[language].grandTotal}</span>
                            {totals.debit !== totals.credit && (
                              <span className="text-xs text-red-600 font-normal">
                                {totals.debit > totals.credit ? t[language].debitGreaterThanCredit : t[language].creditGreaterThanDebit}
                              </span>
                            )}
                          </div>
                        </td>
                        {visible.inflow && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                              {nf.format(totals.inflow)}
                            </span>
                          </td>
                        )}
                        {visible.outflow && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                              {nf.format(totals.outflow)}
                            </span>
                          </td>
                        )}
                        {visible.debit && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                              {nf.format(totals.debit)}
                            </span>
                          </td>
                        )}
                        {visible.credit && (
                          <td className="text-right px-3 py-2 font-semibold">
                            <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                              {nf.format(totals.credit)}
                            </span>
                          </td>
                        )}
                        {visible.balance && (
                          <td className="text-right px-3 py-2 font-semibold">
                            {nf.format(totals.balance)}
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