import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { formFieldStyles, pageContainerStyles } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

import {
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ChevronUp,
  Calendar,
  Search,
  Filter,
  AlertCircle,
  Building2,
  Scale,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Translation object
const t = {
  tamil: {
    dateFrom: 'Date From',
    dateTo: 'Date To',
    search: 'Search',
    reset: 'Reset',
    download: 'Download',
    refresh: 'Refresh',
    account: 'Account',
    category: 'Category',
     inflow: 'inflow',
    outflow: 'outflow',
  
    balance: 'Balance',
    debit: 'Debit',
    credit: 'Credit',
    total: 'Total',
    ledgerName: 'Ledger Name',
    reconciliation: 'Reconciliation',
    summaryForPeriod: 'Summary for selected period',
    period: 'Period',
    totalDebit: 'Total Debit',
    totalCredit: 'Total Credit',
    difference: 'Difference',
    booksBalanced: 'Books are Balanced',
    debitCreditMatch: 'Debit and Credit totals match',
    netProfit: 'Net Profit',
    totalAmount: 'Total Amount',
    records: 'Records',
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
    noDataFoundForCurrentFilters: 'No data found for the current filters.',
    tryAdjustingFilters: 'Try adjusting your filters',
    showColumns: 'Show columns:',
    trialBalanceData: 'Trial Balance Data',
    columnVisibility: 'Column visibility',
    categoryExportNotImplementedYet: 'Category export not implemented yet',
    financialYear: 'Financial Year',
    applyFilters: 'Apply Filters',
    clearFilters: 'Clear Filters',
    dateRange: 'Date Range',
    quickFilters: 'Quick Filters',
    filters: 'Filters',
    exportAs: 'Export As',
    csv: 'CSV',
    pdf: 'PDF',
    toggleColumns: 'Toggle Columns',
    accountSearchPlaceholder: 'Search accounts...',
    categorySearchPlaceholder: 'Search categories...',
    balanceMismatch: 'Balance mismatch detected!',
    exportSuccess: 'Exported trial balance data',
    loadingData: 'Loading trial balance data...',
    filterBy: 'Filter by',
    sortBy: 'Sort by',
    ascending: 'Ascending',
    descending: 'Descending',
  },
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
    outflow: 'வெளிச்செலவு',
    balance: 'இருப்பு',
    debit: 'பற்று',
    credit: 'வரவு',
    total: 'மொத்தம்',
    ledgerName: 'லெட்ஜர் பெயர்',
    reconciliation: 'சமன்பாடு',
    summaryForPeriod: 'தேர்ந்தெடுக்கப்பட்ட காலத்திற்கான சுருக்கம்',
    period: 'காலம்',
    totalDebit: 'மொத்த பற்று',
    totalCredit: 'மொத்த வரவு',
    difference: 'வித்தியாசம்',
    booksBalanced: 'கணக்குகள் சமநிலையில் உள்ளன',
    debitCreditMatch: 'பற்று மற்றும் வரவு மொத்தங்கள் பொருந்துகின்றன',
    netProfit: 'நிகர லாபம்',
    totalAmount: 'மொத்த தொகை',
    records: 'பதிவுகள்',
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
    noDataFoundForCurrentFilters: 'தற்போதைய வடிப்பான்களுக்கு தரவு இல்லை.',
    tryAdjustingFilters: 'வடிப்பான்களை சரிசெய்ய முயற்சிக்கவும்',
    showColumns: 'நெடுவரிசைகள்:',
    trialBalanceData: 'டிரயல் பாலன்ஸ் தரவு',
    columnVisibility: 'நெடுவரிசை தொடர்பு',
    categoryExportNotImplementedYet: 'வகை ஏற்றுமதி இன்னும் செயல்படுத்தப்படவில்லை',
    financialYear: 'நிதியாண்டு',
    applyFilters: 'வடிப்பான்களைப் பயன்படுத்து',
    clearFilters: 'வடிப்பான்களை அழி',
    dateRange: 'தேதி வரம்பு',
    quickFilters: 'விரைவான வடிப்பான்கள்',
    filters: 'வடிப்பான்கள்',
    exportAs: 'ஏற்றுமதி செய்',
    csv: 'CSV',
    pdf: 'PDF',
    toggleColumns: 'நெடுவரிசைகளை மாற்று',
    accountSearchPlaceholder: 'கணக்குகளைத் தேடு...',
    categorySearchPlaceholder: 'வகைகளைத் தேடு...',
    balanceMismatch: 'சமநிலை பொருந்தாமை கண்டறியப்பட்டது!',
    exportSuccess: 'டிரயல் பாலன்ஸ் தரவு ஏற்றுமதி செய்யப்பட்டது',
    loadingData: 'டிரயல் பாலன்ஸ் தரவு ஏற்றப்படுகிறது...',
    filterBy: 'இதன் மூலம் வடிகட்டவும்',
    sortBy: 'இதன் மூலம் வரிசைப்படுத்தவும்',
    ascending: 'ஏறுவரிசை',
    descending: 'இறங்கு வரிசை',
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
  transactions?: any[];
}

interface CategoryGroup {
  [key: string]: TrialRow[];
}

// Loading skeleton component
const LoadingSkeleton = ({ visibleColumns }: { visibleColumns: number }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
        {Array.from({ length: visibleColumns }).map((_, j) => (
          <div key={j} className="h-5 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
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
  }, []);

  // Date state variables (controlled inputs)
  const [startDate, setStartDate] = useState(persisted.from || params.get('from') || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(persisted.to || params.get('to') || new Date().toISOString().slice(0, 10));
  const [isDateRangeValid, setIsDateRangeValid] = useState(true);

  // Validate and ensure start date doesn't exceed end date
  useEffect(() => {
    if (!startDate || !endDate) return;
    const dateFrom = new Date(startDate);
    const dateTo = new Date(endDate);
    setIsDateRangeValid(dateFrom <= dateTo);
    if (dateFrom > dateTo) {
      setEndDate(startDate);
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
    inflow: false,
    outflow: false,
    debit: true,
    credit: true,
    balance: false
  });
  const visibleColumnsCount = useMemo(() =>
    Object.values(visible).filter(Boolean).length
    , [visible]);

  // Category expansion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Account expansion state (for transaction details)
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const toggleAccount = (acc: string) => {
    setExpandedAccounts(prev => ({ ...prev, [acc]: !prev[acc] }));
  };
  const hasExpandedCategories = useMemo(() =>
    Object.values(expandedCategories).some(Boolean)
    , [expandedCategories]);

  // Search state
  const [accountQuery, setAccountQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Refs for focus management
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

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

  // Memoized load function
  const load = useCallback(async () => {
    if (!isDateRangeValid) {
      toast.error(t[language].errorLoading);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      const resp = await fetch(`https://templeapi.agniplay.com/api/journal/trial-balance?from=${query.startDate}&to=${query.endDate}`, {
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
      toast.error(e?.message || t[language].errorLoading);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [query.startDate, query.endDate, getAuthToken, isDateRangeValid, language]);

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

  // Filter categories
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
    // Focus on start date after preset selection
    setTimeout(() => startDateRef.current?.focus(), 0);
  }, []);

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
    toast.success(t[language].exportSuccess);
  }, [sortedRows, query.startDate, query.endDate, csvNF, language]);

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

  // Clear all filters
  const clearFilters = useCallback(() => {
    setAccountQuery('');
    setCategoryQuery('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
  }, []);

  // Update sort handlers
  const handleSort = useCallback((key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  // Get sort indicator
  const getSortIndicator = (key: string) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  // Render category toggle
  const renderCategoryToggle = (category: string) => (
    <button
      onClick={() => toggleCategory(category)}
      className="flex items-center gap-1.5 font-medium text-sm"
      aria-expanded={expandedCategories[category]}
    >
      {expandedCategories[category] ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5" />
      )}
      {category}
    </button>
  );

  // Column toggle buttons
  const columnToggleButtons = [
    { key: 'inflow', label: t[language].inflow },
    { key: 'outflow', label: t[language].outflow },
    { key: 'debit', label: t[language].debit },
    { key: 'credit', label: t[language].credit },
    { key: 'balance', label: t[language].balance }
  ].map(({ key, label }) => (
    <Button
      key={key}
      variant={visible[key as keyof typeof visible] ? "default" : "outline"}
      size="sm"
      onClick={() => setVisible(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
      className={visible[key as keyof typeof visible] ? "text-xs h-7 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" : "text-xs h-7"}
    >
      {visible[key as keyof typeof visible] ? (
        <Eye className="mr-1 h-3 w-3" />
      ) : (
        <EyeOff className="mr-1 h-3 w-3" />
      )}
      {label}
    </Button>
  ));

  // Calculate net profit (Credit - Debit)
  const netProfit = useMemo(() => totals.credit - totals.debit, [totals]);
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header Bar - Using Theme Colors */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            <h1 className="font-semibold text-lg">{t[language].trialBalance}</h1>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
              {sortedRows.length} {t[language].records}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Clickable Date Picker in Header - White Style */}
            <div className="flex items-center gap-1">
              <input
                ref={startDateRef}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="bg-white text-gray-800 text-xs px-2 py-1 rounded border-0 outline-none focus:ring-2 focus:ring-white cursor-pointer"
              />
              <span className="text-white text-xs">-</span>
              <input
                ref={endDateRef}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="bg-white text-gray-800 text-xs px-2 py-1 rounded border-0 outline-none focus:ring-2 focus:ring-white cursor-pointer"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={load}
              disabled={isLoading}
              className="gap-2 bg-white/10 hover:bg-white/20 text-white border-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t[language].refresh}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {isFiltersOpen && (
        <div className="bg-white border-b px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t[language].dateFrom}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t[language].dateTo}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t[language].category}</Label>
              <Input
                placeholder={t[language].categorySearchPlaceholder}
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t[language].account}</Label>
              <Input
                placeholder={t[language].accountSearchPlaceholder}
                value={accountQuery}
                onChange={(e) => setAccountQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => setPresetRange('today')} className="bg-gradient-to-r from-orange-500 to-orange-600">
              {t[language].today}
            </Button>
            <Button size="sm" onClick={() => setPresetRange('thisMonth')} className="bg-gradient-to-r from-orange-500 to-orange-600">
              {t[language].thisMonth}
            </Button>
            <Button size="sm" onClick={() => setPresetRange('fy')} className="bg-gradient-to-r from-orange-500 to-orange-600">
              {t[language].financialYear}
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t[language].clearFilters}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column - Main Table */}
          <div className="lg:col-span-3">

            {/* Results Section */}
            <Card>
              <CardContent className="pt-6">
                {/* Loading/Error States */}
                {isLoading ? (
                  <div className="py-8">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">{t[language].loadingData}</p>
                    </div>
                    <div className="mt-6">
                      <LoadingSkeleton visibleColumns={visibleColumnsCount} />
                    </div>
                  </div>
                ) : error ? (
                  <div className="py-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                    <p className="text-red-600 mb-4">{t[language].errorLoading}: {error}</p>
                    <Button
                      variant="default"
                      onClick={load}
                      disabled={isLoading}
                      className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t[language].retry}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {sortedRows.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="text-muted-foreground mb-2">
                          <Search className="h-12 w-12 mx-auto opacity-50" />
                        </div>
                        <p className="text-lg font-medium">{t[language].noDataFoundForCurrentFilters}</p>
                        <p className="text-muted-foreground mt-1">
                          {t[language].tryAdjustingFilters}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <table className="w-full text-sm" aria-label={t[language].trialBalanceData}>
                          <caption className="sr-only">{t[language].trialBalance} ({query.startDate} {t[language].from} {query.endDate} {t[language].to})</caption>
                          <thead className="bg-muted/50">
                            <tr>
                              <th
                                className="text-left px-4 py-3 font-medium border-r"
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
                                  className="text-right px-4 py-3 font-medium border-r"
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
                                  className="text-right px-4 py-3 font-medium border-r"
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
                                  className="text-right px-4 py-3 font-medium border-r"
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
                                  className="text-right px-4 py-3 font-medium border-r"
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
                                  className="text-right px-4 py-3 font-medium"
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
                            {/* Render Flat List of Rows */}
                            {sortedRows.map((row, idx) => (
                              <React.Fragment key={`${row.account}-${idx}`}>
                                <tr
                                  className="hover:bg-muted/20 border-b cursor-pointer"
                                  onClick={() => toggleAccount(row.account)}
                                >
                                  <td className="px-6 py-3 font-medium">
                                    <div className="flex items-center gap-2">
                                      {expandedAccounts[row.account] ? (
                                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      {row.account}
                                    </div>
                                  </td>
                                  {visible.inflow && (
                                    <td className="text-right px-4 py-3">
                                      {row.inflow ? nf.format(row.inflow) : '-'}
                                    </td>
                                  )}
                                  {visible.outflow && (
                                    <td className="text-right px-4 py-3">
                                      {row.outflow ? nf.format(row.outflow) : '-'}
                                    </td>
                                  )}
                                  {visible.debit && (
                                    <td className="text-right px-4 py-3">
                                      {row.debit ? nf.format(row.debit) : '-'}
                                    </td>
                                  )}
                                  {visible.credit && (
                                    <td className="text-right px-4 py-3">
                                      {row.credit ? nf.format(row.credit) : '-'}
                                    </td>
                                  )}
                                  {visible.balance && (
                                    <td className="text-right px-4 py-3 font-medium">
                                      {nf.format(row.balance)}
                                    </td>
                                  )}
                                </tr>
                                {expandedAccounts[row.account] && row.transactions && row.transactions.length > 0 && (
                                  <tr className="bg-muted/5">
                                    <td colSpan={visibleColumnsCount + 1} className="px-8 py-2">
                                      <div className="space-y-1">
                                        {row.transactions.map((tr: any, tIdx: number) => (
                                          <div key={tIdx} className="flex items-center justify-between text-xs py-1.5 border-b border-muted last:border-0">
                                            <div className="flex items-center gap-4">
                                              <span className="text-muted-foreground w-16">{new Date(tr.date).toLocaleDateString()}</span>
                                              <div className="flex flex-col">
                                                <span className="font-medium text-blue-700">{tr.description}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                                tr.type === 'inflow' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                              )}>
                                                {t[language][tr.type as keyof typeof t.english] || tr.type}
                                              </span>
                                              <span className="font-semibold">{nf.format(tr.amount)}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}

                            {/* Grand Total Row */}
                            {sortedRows.length > 0 && (
                              <tr className="bg-primary/10 font-semibold border-t-2 border-primary/20">
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-between">
                                    <span>{t[language].grandTotal}</span>
                                    {totals.debit !== totals.credit && (
                                     <></>
                                    )}
                                  </div>
                                </td>
                                {visible.inflow && (
                                  <td className="text-right px-4 py-3">
                                    <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                                      {nf.format(totals.inflow)}
                                    </span>
                                  </td>
                                )}
                                {visible.outflow && (
                                  <td className="text-right px-4 py-3">
                                    <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                                      {nf.format(totals.outflow)}
                                    </span>
                                  </td>
                                )}
                                {visible.debit && (
                                  <td className="text-right px-4 py-3">
                                    <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                                      {nf.format(totals.debit)}
                                    </span>
                                  </td>
                                )}
                                {visible.credit && (
                                  <td className="text-right px-4 py-3">
                                    <span className={totals.debit !== totals.credit ? 'text-red-600' : ''}>
                                      {nf.format(totals.credit)}
                                    </span>
                                  </td>
                                )}
                                {visible.balance && (
                                  <td className="text-right px-4 py-3">
                                    {nf.format(totals.balance)}
                                  </td>
                                )}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Reconciliation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">{t[language].reconciliation}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{t[language].summaryForPeriod}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Period */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-900">{t[language].period}</span>
                  </div>
                  <p className="text-sm font-semibold text-blue-700">
                    {formatDate(endDate)}
                  </p>
                </div>

                {/* Total Debit */}
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-medium text-red-900">{t[language].totalDebit}</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-red-600 mt-1">{nf.format(totals.debit)}</p>
                </div>

                {/* Total Credit */}
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-900">{t[language].totalCredit}</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600 mt-1">{nf.format(totals.credit)}</p>
                </div>

                {/* Difference */}
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-900">{t[language].difference}</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600">{nf.format(Math.abs(totals.debit - totals.credit))}</p>
                </div>

                {/* Balance Status */}
                {isBalanced && (
                  <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">{t[language].booksBalanced}</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">{t[language].debitCreditMatch}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}