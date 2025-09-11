import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
 

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

// Main component without external ErrorBoundary (wrapper removed)
export default function TrialBalancePage() {
  return <TrialBalanceContent />;
}

function TrialBalanceContent() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const persisted = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('trialBalanceRange') || '{}') as { from?: string; to?: string };
    } catch { return {}; }
  }, []);
  const startDate = params.get('from') || persisted.from || new Date().toISOString().slice(0,10);
  const endDate = params.get('to') || persisted.to || new Date().toISOString().slice(0,10);
  const query = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  const [rows, setRows] = useState<TrialRow[]>([]);
  const [categories, setCategories] = useState<CategoryGroup>({});
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotals>({});
  const [totals, setTotals] = useState<{ debit: number; credit: number }>({ debit: 0, credit: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof TrialRow>('account');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [accountQuery, setAccountQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [visible, setVisible] = useState({ 
    inflow: true, 
    outflow: true, 
    debit: true, 
    credit: true, 
    balance: true 
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      const resp = await fetch(`/api/journal/trial-balance?from=${query.startDate}&to=${query.endDate}` , {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load trial balance data');
      }
      
      const data = await resp.json();
      
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        // New format with categories
        setCategories(data.data);
        setRows(data.allRows || []);
        setCategoryTotals(data.categoryTotals || {});
        
        // Expand all categories by default
        const expanded: Record<string, boolean> = {};
        Object.keys(data.data).forEach(cat => {
          expanded[cat] = true;
        });
        setExpandedCategories(expanded);
      } else {
        // Old format (fallback)
        const list: TrialRow[] = (data?.data || []) as TrialRow[];
        setRows(list);
        
        // Group by category if available
        const grouped: CategoryGroup = {};
        list.forEach(row => {
          const category = row.category || 'Uncategorized';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(row);
        });
        setCategories(grouped);
        
        // Calculate category totals
        const totals: CategoryTotals = {};
        Object.entries(grouped).forEach(([category, items]) => {
          totals[category] = items.reduce((acc, item) => ({
            debit: acc.debit + (item.debit || 0),
            credit: acc.credit + (item.credit || 0)
          }), { debit: 0, credit: 0 });
        });
        setCategoryTotals(totals);
        
        // Expand all categories by default
        const expanded: Record<string, boolean> = {};
        Object.keys(grouped).forEach(cat => {
          expanded[cat] = true;
        });
        setExpandedCategories(expanded);
      }
      
      setTotals(data?.totals || { debit: 0, credit: 0 });
      
    } catch (e: any) {
      console.error('Error loading trial balance:', e);
      const errorMessage = e?.message || 'Failed to load trial balance data';
      setError(errorMessage);
      toast.error(errorMessage);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  // Expand/collapse all categories
  const toggleAllCategories = useCallback((expand: boolean) => {
    if (categories) {
      const newState: Record<string, boolean> = {};
      Object.keys(categories).forEach(cat => {
        newState[cat] = expand;
      });
      setExpandedCategories(newState);
    }
  }, [categories]);

  // Export category to CSV
  const exportCategoryToCSV = useCallback((category: string, rows: TrialRow[]) => {
    try {
      const headers = ['Account', 'Inflow', 'Outflow', 'Debit', 'Credit', 'Balance'];
      const data = [
        headers.join(','),
        ...rows.map(row => [
          `"${row.account.replace(/"/g, '""')}"`,
          row.inflow,
          row.outflow,
          row.debit,
          row.credit,
          row.balance
        ].join(','))
      ];
      
      const blob = new Blob([data.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trial-balance-${category.toLowerCase().replace(/\s+/g, '-')}-${query.startDate}_${query.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${category} data`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  }, [query.startDate, query.endDate]);

  // Calculate visible columns count for responsive layout
  const visibleColumnsCount = useMemo(() => {
    return Object.values(visible).filter(Boolean).length;
  }, [visible]);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!categoryQuery) return categories;
    const q = categoryQuery.toLowerCase();
    return Object.entries(categories).reduce((acc, [category, rows]) => {
      const matches = rows.some(row =>
        row.account.toLowerCase().includes(q) ||
        (row.category?.toLowerCase().includes(q) ?? false)
      );
      if (matches) {
        acc[category] = rows;
      }
      return acc;
    }, {} as CategoryGroup);
  }, [categories, categoryQuery]);

  // Check if any category is expanded
  const hasExpandedCategories = useMemo(() => {
    return Object.values(expandedCategories).some(Boolean);
  }, [expandedCategories]);

  useEffect(() => { load(); }, [query.startDate, query.endDate]);
  useEffect(() => {
    localStorage.setItem('trialBalanceRange', JSON.stringify({ from: query.startDate, to: query.endDate }));
  }, [query.startDate, query.endDate]);

  const onFilterChange = (key: 'from' | 'to', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const setRange = (range: 'today' | 'thisMonth' | 'fy') => {
    const now = new Date();
    let from: string;
    let to: string;
    if (range === 'today') {
      const d = now.toISOString().slice(0,10);
      from = d; to = d;
    } else if (range === 'thisMonth') {
      const y = now.getFullYear();
      const m = String(now.getMonth()+1).padStart(2, '0');
      from = `${y}-${m}-01`;
      const last = new Date(y, now.getMonth()+1, 0).toISOString().slice(0,10);
      to = last;
    } else {
      const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      from = `${y}-04-01`;
      to = `${y+1}-03-31`;
    }
    const next = new URLSearchParams(params);
    next.set('from', from);
    next.set('to', to);
    setParams(next, { replace: true });
  };

  const nf = useMemo(() => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);

  const sortedRows = useMemo(() => {
    const copy = rows.filter(r => !accountQuery || r.account.toLowerCase().includes(accountQuery.toLowerCase()));
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return copy;
  }, [rows, sortKey, sortDir, accountQuery]);

  const onSort = (key: keyof TrialRow) => {
    setSortKey(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const totalsRow = useMemo(() => {
    return sortedRows.reduce(
      (acc, r) => {
        acc.inflow += r.inflow || 0;
        acc.outflow += r.outflow || 0;
        acc.debit += r.debit || 0;
        acc.credit += r.credit || 0;
        acc.balance += r.balance || 0;
        return acc;
      },
      { account: 'TOTAL', inflow: 0, outflow: 0, debit: 0, credit: 0, balance: 0 }
    );
  }, [sortedRows]);

  const exportCSV = () => {
    const headers = ['Account','Inflow','Outflow','Debit','Credit','Balance'];
    const lines = [headers.join(',')].concat(
      sortedRows.map(r => [r.account, r.inflow, r.outflow, r.debit, r.credit, r.balance].map(v => typeof v === 'string' ? `"${v.replace(/"/g,'""')}"` : v).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance_${query.startDate}_${query.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const token = getAuthToken();
    const url = `/api/journal/trial-balance.pdf?from=${query.startDate}&to=${query.endDate}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto p-2">
      <Card className="shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Trial Balance</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!sortedRows.length}>CSV</Button>
              <Button variant="secondary" size="sm" onClick={exportPDF} disabled={!sortedRows.length}>PDF</Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!sortedRows.length}>Print</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3 items-end">
            <div>
              <Label htmlFor="from" className="text-xs">From</Label>
              <Input id="from" type="date" className="h-8 text-sm" value={startDate} onChange={(e) => onFilterChange('from', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">To</Label>
              <Input id="to" type="date" className="h-8 text-sm" value={endDate} onChange={(e) => onFilterChange('to', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button size="sm" onClick={load} disabled={isLoading} className="flex items-center gap-1">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="sr-only md:not-sr-only">Refresh</span>
              </Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('today')} className="w-full">Today</Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('thisMonth')} className="w-full">This Month</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="categorySearch" className="text-xs whitespace-nowrap">Category:</Label>
                <Input 
                  id="categorySearch" 
                  placeholder="Filter categories..." 
                  className="h-8 text-sm flex-1" 
                  value={categoryQuery} 
                  onChange={(e) => setCategoryQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="accountSearch" className="text-xs whitespace-nowrap">Account:</Label>
                <Input 
                  id="accountSearch" 
                  placeholder="Filter accounts..." 
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
                  {hasExpandedCategories ? 'Collapse All' : 'Expand All'}
                </Button>
                <span className="text-gray-600">
                  {isLoading ? 'Loading...' : `${Object.keys(categories).length} categories, ${rows.length} accounts`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">Show columns:</span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.inflow}
                    onChange={() => setVisible(prev => ({ ...prev, inflow: !prev.inflow }))}
                  />
                  Inflow
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.outflow}
                    onChange={() => setVisible(prev => ({ ...prev, outflow: !prev.outflow }))}
                  />
                  Outflow
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.debit}
                    onChange={() => setVisible(prev => ({ ...prev, debit: !prev.debit }))}
                  />
                  Debit
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.credit}
                    onChange={() => setVisible(prev => ({ ...prev, credit: !prev.credit }))}
                  />
                  Credit
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visible.balance}
                    onChange={() => setVisible(prev => ({ ...prev, balance: !prev.balance }))}
                  />
                  Balance
                </label>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th
                      className="text-left px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onSort('account')}
                    >
                      <div className="flex items-center justify-between">
                        <span>Account</span>
                        {sortKey === 'account' && (
                          <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    {visible.inflow && (
                      <th
                        className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => onSort('inflow')}
                      >
                        <div className="flex items-center justify-end">
                          <span>Inflow</span>
                          {sortKey === 'inflow' && (
                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    )}
                    {visible.outflow && (
                      <th
                        className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => onSort('outflow')}
                      >
                        <div className="flex items-center justify-end">
                          <span>Outflow</span>
                          {sortKey === 'outflow' && (
                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    )}
                    {visible.debit && (
                      <th
                        className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => onSort('debit')}
                      >
                        <div className="flex items-center justify-end">
                          <span>Debit</span>
                          {sortKey === 'debit' && (
                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    )}
                    {visible.credit && (
                      <th
                        className="text-right px-3 py-2 border-b border-r cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => onSort('credit')}
                      >
                        <div className="flex items-center justify-end">
                          <span>Credit</span>
                          {sortKey === 'credit' && (
                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    )}
                    {visible.balance && (
                      <th
                        className="text-right px-3 py-2 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => onSort('balance')}
                      >
                        <div className="flex items-center justify-end">
                          <span>Balance</span>
                          {sortKey === 'balance' && (
                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(filteredCategories).map(([category, categoryRows]) => (
                    <React.Fragment key={category}>
                      <tr
                        className="bg-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleCategory(category)}
                      >
                        <td colSpan={visibleColumnsCount + 1} className="px-3 py-1.5 font-medium">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {expandedCategories[category] ? (
                                <ChevronDown className="h-4 w-4 mr-1" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mr-1" />
                              )}
                              <span>{category}</span>
                              <span className="text-gray-500 text-xs ml-2">
                                ({categoryRows.length} {categoryRows.length === 1 ? 'account' : 'accounts'})
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportCategoryToCSV(category, categoryRows);
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedCategories[category] && categoryRows.map((row, rowIndex) => (
                        <tr key={`${category}-${rowIndex}`} className="hover:bg-gray-50 border-b">
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
                      {expandedCategories[category] && (
                        <tr className="bg-gray-50 font-medium border-t">
                          <td className="px-6 py-1.5 text-sm">Total {category}</td>
                          {visible.inflow && (
                            <td className="text-right px-3 py-1.5">
                              {nf.format(categoryRows.reduce((sum, r) => sum + (r.inflow || 0), 0))}
                            </td>
                          )}
                          {visible.outflow && (
                            <td className="text-right px-3 py-1.5">
                              {nf.format(categoryRows.reduce((sum, r) => sum + (r.outflow || 0), 0))}
                            </td>
                          )}
                          {visible.debit && (
                            <td className="text-right px-3 py-1.5">
                              {nf.format(categoryRows.reduce((sum, r) => sum + (r.debit || 0), 0))}
                            </td>
                          )}
                          {visible.credit && (
                            <td className="text-right px-3 py-1.5">
                              {nf.format(categoryRows.reduce((sum, r) => sum + (r.credit || 0), 0))}
                            </td>
                          )}
                          {visible.balance && (
                            <td className="text-right px-3 py-1.5">
                              {nf.format(
                                categoryRows.reduce((sum, r) => sum + (r.debit || 0), 0) -
                                categoryRows.reduce((sum, r) => sum + (r.credit || 0), 0)
                              )}
                            </td>
                          )}
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {/* Grand Total Row */}
                  <tr className="bg-gray-100 font-medium border-t-2 border-gray-200">
                    <td className="px-3 py-2 font-semibold">
                      <div className="flex items-center justify-between">
                        <span>GRAND TOTAL</span>
                        {totals.debit !== totals.credit && (
                          <span className="text-xs text-red-600 font-normal">
                            {totals.debit > totals.credit ? 'Debit > Credit' : 'Credit > Debit'}
                          </span>
                        )}
                      </div>
                    </td>
                    {visible.inflow && (
                      <td className="text-right px-3 py-2 font-semibold">
                        {nf.format(rows.reduce((sum, r) => sum + (r.inflow || 0), 0))}
                      </td>
                    )}
                    {visible.outflow && (
                      <td className="text-right px-3 py-2 font-semibold">
                        {nf.format(rows.reduce((sum, r) => sum + (r.outflow || 0), 0))}
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
                        <span className={totals.credit !== totals.debit ? 'text-red-600' : ''}>
                          {nf.format(totals.credit)}
                        </span>
                      </td>
                    )}
                    {visible.balance && (
                      <td className="text-right px-3 py-2 font-semibold">
                        {nf.format(
                          rows.reduce((sum, r) => sum + (r.debit || 0), 0) -
                          rows.reduce((sum, r) => sum + (r.credit || 0), 0)
                        )}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}