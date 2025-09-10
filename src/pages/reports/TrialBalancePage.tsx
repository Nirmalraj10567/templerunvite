import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw } from 'lucide-react';

interface TrialRow {
  account: string;
  inflow: number;
  outflow: number;
  balance: number;
  debit: number;
  credit: number;
}

export default function TrialBalancePage() {
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
  const [totals, setTotals] = useState<{ debit: number; credit: number }>({ debit: 0, credit: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof TrialRow>('account');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [accountQuery, setAccountQuery] = useState('');
  const [visible, setVisible] = useState({ inflow: true, outflow: true, debit: true, credit: true, balance: true });

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      const resp = await fetch(`/api/journal/trial-balance?from=${query.startDate}&to=${query.endDate}` , {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error('Failed to load');
      const data = await resp.json();
      const list: TrialRow[] = (data?.data || []) as TrialRow[];
      setRows(list);
      setTotals(data?.totals || { debit: 0, credit: 0 });
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

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
          
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="accountSearch" className="text-xs whitespace-nowrap">Account Search:</Label>
              <Input 
                id="accountSearch" 
                placeholder="Search..." 
                className="h-8 w-48 text-sm" 
                value={accountQuery} 
                onChange={(e) => setAccountQuery(e.target.value)} 
              />
            </div>
            
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-600">{isLoading ? 'Loading...' : `Accounts: ${rows.length}`}</span>
              {error && <span className="text-red-600 ml-2">{error}</span>}
              <span className="font-medium ml-4">Debit: {nf.format(totals.debit)}</span>
              <span className="font-medium">Credit: {nf.format(totals.credit)}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mb-3 pb-2 border-b">
            <div className="flex items-center gap-1 text-xs">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.inflow} onChange={(e) => setVisible(v => ({...v, inflow: e.target.checked}))} className="h-4 w-4" />
                <span>Inflow</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.outflow} onChange={(e) => setVisible(v => ({...v, outflow: e.target.checked}))} className="h-4 w-4" />
                <span>Outflow</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.debit} onChange={(e) => setVisible(v => ({...v, debit: e.target.checked}))} className="h-4 w-4" />
                <span>Debit</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.credit} onChange={(e) => setVisible(v => ({...v, credit: e.target.checked}))} className="h-4 w-4" />
                <span>Credit</span>
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={visible.balance} onChange={(e) => setVisible(v => ({...v, balance: e.target.checked}))} className="h-4 w-4" />
                <span>Balance</span>
              </label>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1 border-b cursor-pointer" onClick={() => onSort('account')}>Account</th>
                  {visible.inflow && <th className="text-right px-2 py-1 border-b cursor-pointer" onClick={() => onSort('inflow')}>Inflow</th>}
                  {visible.outflow && <th className="text-right px-2 py-1 border-b cursor-pointer" onClick={() => onSort('outflow')}>Outflow</th>}
                  {visible.debit && <th className="text-right px-2 py-1 border-b cursor-pointer" onClick={() => onSort('debit')}>Debit</th>}
                  {visible.credit && <th className="text-right px-2 py-1 border-b cursor-pointer" onClick={() => onSort('credit')}>Credit</th>}
                  {visible.balance && <th className="text-right px-2 py-1 border-b cursor-pointer" onClick={() => onSort('balance')}>Balance</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !isLoading && (
                  <tr><td colSpan={6} className="px-2 py-4 text-center text-gray-500">No data available</td></tr>
                )}
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td className="px-2 py-1 border-b"><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"/></td>
                      {visible.inflow && <td className="px-2 py-1 border-b"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"/></td>}
                      {visible.outflow && <td className="px-2 py-1 border-b"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"/></td>}
                      {visible.debit && <td className="px-2 py-1 border-b"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"/></td>}
                      {visible.credit && <td className="px-2 py-1 border-b"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"/></td>}
                      {visible.balance && <td className="px-2 py-1 border-b"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"/></td>}
                    </tr>
                  ))
                )}
                {!isLoading && sortedRows.map((r) => (
                  <tr key={r.account} className="hover:bg-gray-50">
                    <td className="px-2 py-1 border-b">
                      <button 
                        className="text-blue-700 hover:underline text-xs" 
                        onClick={() => navigate(`/dashboard/reports/journal-log?account=${encodeURIComponent(r.account)}&startDate=${encodeURIComponent(query.startDate)}&endDate=${encodeURIComponent(query.endDate)}`)}
                      >
                        {r.account}
                      </button>
                    </td>
                    {visible.inflow && <td className="px-2 py-1 border-b text-right">{nf.format(r.inflow)}</td>}
                    {visible.outflow && <td className="px-2 py-1 border-b text-right">{nf.format(r.outflow)}</td>}
                    {visible.debit && <td className="px-2 py-1 border-b text-right">{nf.format(r.debit)}</td>}
                    {visible.credit && <td className="px-2 py-1 border-b text-right">{nf.format(r.credit)}</td>}
                    {visible.balance && <td className="px-2 py-1 border-b text-right">{nf.format(r.balance)}</td>}
                  </tr>
                ))}
                {sortedRows.length > 0 && (
                  <tr className="bg-gray-100 font-medium">
                    <td className="px-2 py-1 border-t font-semibold">TOTAL</td>
                    {visible.inflow && <td className="px-2 py-1 border-t text-right font-semibold">{nf.format(totalsRow.inflow)}</td>}
                    {visible.outflow && <td className="px-2 py-1 border-t text-right font-semibold">{nf.format(totalsRow.outflow)}</td>}
                    {visible.debit && <td className="px-2 py-1 border-t text-right font-semibold">{nf.format(totalsRow.debit)}</td>}
                    {visible.credit && <td className="px-2 py-1 border-t text-right font-semibold">{nf.format(totalsRow.credit)}</td>}
                    {visible.balance && <td className="px-2 py-1 border-t text-right font-semibold">{nf.format(totalsRow.balance)}</td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}