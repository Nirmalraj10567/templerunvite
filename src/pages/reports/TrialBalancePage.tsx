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
  Download, 
  Eye, 
  EyeOff, 
  ChevronUp,
  Calendar,
  Search,
  Filter,
  Printer,
  AlertCircle
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
    applyFilters: 'Apply Filters',
    clearFilters: 'Clear Filters',
    dateRange: 'Date Range',
    quickFilters: 'Quick Filters',
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
    columnVisibility: 'நெடுவரிசை தொடர்பு',
    categoryExportNotImplementedYet: 'வகை ஏற்றுமதி இன்னும் செயல்படுத்தப்படவில்லை',
    financialYear: 'நிதியாண்டு',
    applyFilters: 'வடிப்பான்களைப் பயன்படுத்து',
    clearFilters: 'வடிப்பான்களை அழி',
    dateRange: 'தேதி வரம்பு',
    quickFilters: 'விரைவான வடிப்பான்கள்',
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

  // Search state
  const [accountQuery, setAccountQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

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
      const resp = await fetch(`http://localhost:4000/api/journal/trial-balance?from=${query.startDate}&to=${query.endDate}`, {
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
      className="text-xs h-7"
    >
      {visible[key as keyof typeof visible] ? (
        <Eye className="mr-1 h-3 w-3" />
      ) : (
        <EyeOff className="mr-1 h-3 w-3" />
      )}
      {label}
    </Button>
  ));

  return (



    <div className={pageContainerStyles.container}>
       <Card className={pageContainerStyles.content}>
         <CardHeader className={theme.card.header}>
           <CardTitle className="text-lg font-bold w-full">
           {t[language].trialBalance}
           </CardTitle>
         </CardHeader>
       
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold"></h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t[language].trialBalanceData}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={load}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t[language].refresh}
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV} 
              disabled={!sortedRows.length || isLoading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t[language].csv}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPDF} 
              disabled={!sortedRows.length || isLoading}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {t[language].pdf}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="gap-2"
              >
                {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {t[language].dateRange}
              </Button>
              {!isDateRangeValid && (
                <span className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t[language].errorLoading}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {t[language].clearFilters}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isFiltersOpen && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Date Inputs */}
              <div className="space-y-2">
                <Label htmlFor="start-date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t[language].dateFrom}
                </Label>
                <Input
                  ref={startDateRef}
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={cn(theme.input.base, !isDateRangeValid && "border-red-500")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t[language].dateTo}
                </Label>
                <Input
                  ref={endDateRef}
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={cn(theme.input.base, theme.input.error, !isDateRangeValid && "border-red-500")}
                />
              </div>
              
              {/* Quick Filters */}
              <div className="space-y-2">
                <Label>{t[language].quickFilters}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPresetRange('today')}
                    className="text-xs h-8"
                  >
                    {t[language].today}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPresetRange('thisMonth')}
                    className="text-xs h-8"
                  >
                    {t[language].thisMonth}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPresetRange('fy')}
                    className="text-xs h-8"
                  >
                    {t[language].financialYear}
                  </Button>
                </div>
              </div>
              
              {/* Apply Button */}
              <div className="flex items-end">
                <Button 
                  onClick={load}
                  disabled={isLoading || !isDateRangeValid}
                  className="w-full h-9"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {t[language].applyFilters}
                </Button>
              </div>
            </div>
            
            {/* Search Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="categorySearch" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {t[language].category}
                </Label>
                <Input 
                  id="categorySearch" 
                  placeholder={t[language].categorySearchPlaceholder} 
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  className={cn(theme.input.base, "h-9")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountSearch" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {t[language].account}
                </Label>
                <Input 
                  id="accountSearch" 
                  placeholder={t[language].accountSearchPlaceholder} 
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                  className={cn(theme.input.base, "h-9")}
                />
              </div>
            </div>
            
            {/* Column Visibility */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" />
                <Label className="text-sm">{t[language].toggleColumns}</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {columnToggleButtons}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Section */}
      <Card>
        <CardContent className="pt-6">
          {/* Loading/Error States */}
          {isLoading ? (
            <div className="py-8">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                variant="outline" 
                onClick={load} 
                disabled={isLoading}
                className="gap-2"
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
                              className="bg-muted/30 hover:bg-muted/40 cursor-pointer"
                              onClick={() => toggleCategory(category)}
                            >
                              <td colSpan={visibleColumnsCount + 1} className="px-4 py-2.5 font-medium">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {expandedCategories[category] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <span>{category}</span>
                                    <span className="text-muted-foreground text-xs">
                                      ({filteredRows.length} {filteredRows.length === 1 ? t[language].account : t[language].accounts})
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.info(t[language].categoryExportNotImplementedYet);
                                    }}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    {t[language].exportAs}
                                  </Button>
                                </div>
                              </td>
                            </tr>

                            {/* Category Rows */}
                            {expandedCategories[category] && (
                              <>
                                {filteredRows.map(row => (
                                  <tr key={`${category}-${row.account}`} className="hover:bg-muted/20 border-b">
                                    <td className="px-6 py-3">{row.account}</td>
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
                                ))}

                                {/* Category Total Row */}
                                <tr className="bg-muted/20 font-medium border-t">
                                  <td className="px-6 py-2.5 text-sm">{t[language].total} {category}</td>
                                  {visible.inflow && (
                                    <td className="text-right px-4 py-2.5">
                                      {nf.format(categoryTotals.inflow)}
                                    </td>
                                  )}
                                  {visible.outflow && (
                                    <td className="text-right px-4 py-2.5">
                                      {nf.format(categoryTotals.outflow)}
                                    </td>
                                  )}
                                  {visible.debit && (
                                    <td className="text-right px-4 py-2.5">
                                      {nf.format(categoryTotals.debit)}
                                    </td>
                                  )}
                                  {visible.credit && (
                                    <td className="text-right px-4 py-2.5">
                                      {nf.format(categoryTotals.credit)}
                                    </td>
                                  )}
                                  {visible.balance && (
                                    <td className="text-right px-4 py-2.5">
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
                        <tr className="bg-primary/10 font-semibold border-t-2 border-primary/20">
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <span>{t[language].grandTotal}</span>
                              {totals.debit !== totals.credit && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {t[language].balanceMismatch}
                                </span>
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
                  
                  {/* Summary Footer */}
                  <div className="px-4 py-3 bg-muted/30 flex flex-wrap items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-4">
                      <span>
                        {Object.keys(filteredCategories).length} {t[language].categories}, 
                        {' '} {allFilteredRows.length} {t[language].accounts}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllCategories(!hasExpandedCategories)}
                        className="h-8"
                      >
                        {hasExpandedCategories ? t[language].collapseAll : t[language].expandAll}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t[language].sortBy}:</span>
                      <span className="bg-muted px-2 py-1 rounded">
                        {t[language][sortKey]} {sortDir === 'asc' ? t[language].ascending : t[language].descending}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </Card>
    </div>
  );
}