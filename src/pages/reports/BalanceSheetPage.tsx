import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw } from 'lucide-react';

interface Item { account: string; balance: number; }

export default function BalanceSheetPage() {
  const [params, setParams] = useSearchParams();
  const startDate = params.get('from') || new Date().toISOString().slice(0,10);
  const endDate = params.get('to') || new Date().toISOString().slice(0,10);
  const query = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  const [assets, setAssets] = useState<Item[]>([]);
  const [liabilities, setLiabilities] = useState<Item[]>([]);
  const [totals, setTotals] = useState<{ assets: number; liabilities: number }>({ assets: 0, liabilities: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Item>('account');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      const resp = await fetch(`/api/journal/balance-sheet?from=${query.startDate}&to=${query.endDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error('Failed to load');
      const data = await resp.json();
      setAssets(data?.data?.assets || []);
      setLiabilities(data?.data?.liabilities || []);
      setTotals(data?.data?.totals || { assets: 0, liabilities: 0 });
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setAssets([]);
      setLiabilities([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [query.startDate, query.endDate]);

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

  const sortList = (list: Item[]) => {
    const copy = [...list];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return copy;
  };

  const sortedAssets = useMemo(() => sortList(assets), [assets, sortKey, sortDir]);
  const sortedLiabilities = useMemo(() => sortList(liabilities), [liabilities, sortKey, sortDir]);

  const onSort = (key: keyof Item) => {
    setSortKey(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const totalsRow = useMemo(() => {
    const ta = sortedAssets.reduce((s, r) => s + (r.balance || 0), 0);
    const tl = sortedLiabilities.reduce((s, r) => s + (r.balance || 0), 0);
    return { assets: ta, liabilities: tl };
  }, [sortedAssets, sortedLiabilities]);

  const exportCSV = () => {
    const headers = ['Section','Account','Amount'];
    const lines = [headers.join(',')]
      .concat(sortedAssets.map(r => ['Assets', r.account, r.balance].map(v => typeof v === 'string' ? `"${v.replace(/"/g,'""')}"` : v).join(',')))
      .concat(sortedLiabilities.map(r => ['Liabilities', r.account, r.balance].map(v => typeof v === 'string' ? `"${v.replace(/"/g,'""')}"` : v).join(',')))
      .concat([['Totals','Assets', totalsRow.assets].join(','), ['Totals','Liabilities', totalsRow.liabilities].join(',')]);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet_${query.startDate}_${query.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const table = (title: string, rows: Item[]) => (
    <div className="w-full">
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1 border-b cursor-pointer" onClick={() => onSort('account')}>Account</th>
              <th className="text-right px-2 py-1 border-b cursor-pointer" onClick={() => onSort('balance')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading && (
              <tr><td colSpan={2} className="px-2 py-2 text-center text-gray-500 text-xs">No data</td></tr>
            )}
            {isLoading && (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td className="px-2 py-1 border-b"><div className="h-3 w-24 bg-gray-200 animate-pulse rounded"/></td>
                  <td className="px-2 py-1 border-b"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"/></td>
                </tr>
              ))
            )}
            {!isLoading && sortList(rows).map((r) => (
              <tr key={r.account} className="hover:bg-gray-50">
                <td className="px-2 py-1 border-b">{r.account}</td>
                <td className="px-2 py-1 border-b text-right">{nf.format(r.balance)}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-gray-100 font-medium">
                <td className="px-2 py-1 border-t font-semibold">Total</td>
                <td className="px-2 py-1 border-t text-right font-semibold">{nf.format(rows.reduce((s, r) => s + (r.balance || 0), 0))}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-2">
      <Card className="shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Balance Sheet</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!assets.length && !liabilities.length}>CSV</Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!assets.length && !liabilities.length}>Print</Button>
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
          
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="text-xs text-gray-600">
              {isLoading ? 'Loading...' : error ? <span className="text-red-600">{error}</span> : ''}
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span>Assets: {nf.format(totals.assets)}</span>
              <span>Liabilities: {nf.format(totals.liabilities)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {table('Assets', sortedAssets)}
            {table('Liabilities', sortedLiabilities)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}