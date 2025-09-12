import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw, IndianRupee } from 'lucide-react';

interface Item {
  account: string;
  balance: number;
}

export default function BalanceSheetPage() {
  const [params, setParams] = useSearchParams();
  const startDate = params.get('from') || new Date().toISOString().slice(0, 10);
  const endDate = params.get('to') || new Date().toISOString().slice(0, 10);
  const query = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);

  const [assets, setAssets] = useState<Item[]>([]);
  const [liabilities, setLiabilities] = useState<Item[]>([]);
  const [debits, setDebits] = useState<Item[]>([]);
  const [totals, setTotals] = useState<{ assets: number; liabilities: number; debits: number }>({ assets: 0, liabilities: 0, debits: 0 });
  const [openingDiff, setOpeningDiff] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Item>('account');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      
      // Fetch balance sheet data
      const balanceResp = await fetch(`/api/journal/balance-sheet?from=${query.startDate}&to=${query.endDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!balanceResp.ok) throw new Error('Failed to load balance sheet');
      const balanceData = await balanceResp.json();
      
      // Fetch debit transactions from ledger
      const debitResp = await fetch(`/api/ledger?from=${query.startDate}&to=${query.endDate}&type=debit`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let debitData = [];
      if (debitResp.ok) {
        const debitResult = await debitResp.json();
        debitData = debitResult?.data || [];
      }
      
      setAssets(balanceData?.data?.assets || []);
      setLiabilities(balanceData?.data?.liabilities || []);
      
      // Process debit data - group by account and sum amounts
      const debitMap = new Map();
      debitData.forEach((entry: any) => {
        const account = entry.category || entry.name || 'Unknown';
        const amount = entry.debit || 0;
        if (debitMap.has(account)) {
          debitMap.set(account, debitMap.get(account) + amount);
        } else {
          debitMap.set(account, amount);
        }
      });
      
      const debitItems = Array.from(debitMap.entries()).map(([account, balance]) => ({
        account,
        balance: Number(balance)
      }));
      setDebits(debitItems);
      
      const totalDebits = debitItems.reduce((sum, item) => sum + item.balance, 0);
      setTotals({
        assets: balanceData?.data?.totals?.assets || 0,
        liabilities: balanceData?.data?.totals?.liabilities || 0,
        debits: totalDebits
      });
      
      const od = (balanceData?.data?.openingDiff ?? balanceData?.data?.opening_balance_diff ?? 0) as number;
      setOpeningDiff(Number.isFinite(od) ? od : 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setAssets([]);
      setLiabilities([]);
      setDebits([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query.startDate, query.endDate]);

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

  const sortList = (list: Item[]) => {
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

  const sortedAssets = useMemo(() => sortList(assets), [assets, sortKey, sortDir]);
  const sortedLiabilities = useMemo(() => sortList(liabilities), [liabilities, sortKey, sortDir]);
  const sortedDebits = useMemo(() => sortList(debits), [debits, sortKey, sortDir]);

  const onSort = (key: keyof Item) => {
    setSortKey(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const totalsRow = useMemo(() => {
    const ta = sortedAssets.reduce((s, r) => s + (r.balance || 0), 0);
    const tl = sortedLiabilities.reduce((s, r) => s + (r.balance || 0), 0);
    const td = sortedDebits.reduce((s, r) => s + (r.balance || 0), 0);
    return { assets: ta, liabilities: tl, debits: td };
  }, [sortedAssets, sortedLiabilities, sortedDebits]);

  const exportCSV = () => {
    const headers = ['Credits (Liabilities & Equity)', 'Credit Amount', 'Assets', 'Asset Amount', 'Debits (Expenses & Losses)', 'Debit Amount'];
    const lines = [
      headers.join(','),
      ...Array.from({ length: maxRows }).map((_, i) => {
        const l = sortedLiabilities[i];
        const a = sortedAssets[i];
        return [
          l?.account ?? '',
          l ? l.balance : '',
          a?.account ?? '',
          a ? a.balance : '',
          '',
          ''
        ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',');
      }),
      ['Opening Balance Diff', obCredit > 0 ? obCredit : '', 'Opening Balance Diff', obDebit > 0 ? obDebit : '', '', ''].join(','),
      ['Net Profit', profit > 0 ? profit : '', '', '', 'Net Loss', loss > 0 ? loss : ''].join(','),
      ['Total Credits', totalsRow.liabilities + profit + obCredit, 'Total Assets', totalsRow.assets + obDebit, 'Total Debits', totalsRow.debits + loss].join(','),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet_${query.startDate}_${query.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxRows = useMemo(() => Math.max(sortedLiabilities.length, sortedAssets.length, sortedDebits.length), [sortedLiabilities, sortedAssets, sortedDebits]);
  const netResult = useMemo(() => (totalsRow.assets - totalsRow.liabilities) || 0, [totalsRow.assets, totalsRow.liabilities]);
  const profit = useMemo(() => Math.max(0, -netResult), [netResult]); // liabilities > assets
  const loss = useMemo(() => Math.max(0, netResult), [netResult]);     // assets > liabilities
  const obCredit = useMemo(() => Math.max(0, openingDiff), [openingDiff]);
  const obDebit = useMemo(() => Math.max(0, -openingDiff), [openingDiff]);

  const combinedTable = () => (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse border">
        <thead>
          <tr>
            <th className="bg-purple-700 text-white px-3 py-2 text-left border-b border-gray-300">Credits (Liabilities & Equity)</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-right border-b border-gray-300">Amount</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-left border-b border-gray-300">Assets</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-right border-b border-gray-300">Amount</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-left border-b border-gray-300">Debits (Expenses & Losses)</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-right border-b border-gray-300">Amount</th>
          </tr>
        </thead>
        <tbody>
          {!isLoading && maxRows === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-3 text-center text-gray-500 border">No data</td>
            </tr>
          )}
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <tr key={`sk-${i}`}>
              <td className="px-3 py-2 border"><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></td>
              <td className="px-3 py-2 border"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"></div></td>
              <td className="px-3 py-2 border"><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></td>
              <td className="px-3 py-2 border"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"></div></td>
              <td className="px-3 py-2 border"><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></td>
              <td className="px-3 py-2 border"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"></div></td>
            </tr>
          ))}
          {!isLoading &&
            Array.from({ length: maxRows }).map((_, i) => {
              const l = sortedLiabilities[i];
              const a = sortedAssets[i];
              const d = sortedDebits[i];
              return (
                <tr
                  key={`row-${i}`}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-3 py-2 border text-left">{l?.account ?? ''}</td>
                  <td className="px-3 py-2 border text-right">{l ? nf.format(l.balance) : ''}</td>
                  <td className="px-3 py-2 border text-left">{a?.account ?? ''}</td>
                  <td className="px-3 py-2 border text-right">{a ? nf.format(a.balance) : ''}</td>
                  <td className="px-3 py-2 border text-left">{d?.account ?? ''}</td>
                  <td className="px-3 py-2 border text-right">{d ? nf.format(d.balance) : ''}</td>
                </tr>
              );
            })}
          {(sortedLiabilities.length > 0 || sortedAssets.length > 0) && (
            <>
              {/* Opening Balance Diff */}
              <tr className="bg-gray-50">
                <td className="px-3 py-2 border text-left font-medium">Opening Balance Diff</td>
                <td className="px-3 py-2 border text-right">{obCredit > 0 ? nf.format(obCredit) : ''}</td>
                <td className="px-3 py-2 border text-left font-medium">Opening Balance Diff</td>
                <td className="px-3 py-2 border text-right">{obDebit > 0 ? nf.format(obDebit) : ''}</td>
                <td className="px-3 py-2 border text-left"></td>
                <td className="px-3 py-2 border text-right"></td>
              </tr>

              {/* Net Loss / Profit */}
              <tr>
                <td className="px-3 py-2 border text-left font-medium text-green-600">Net Profit</td>
                <td className="px-3 py-2 border text-right text-green-600">{profit > 0 ? nf.format(profit) : ''}</td>
                <td className="px-3 py-2 border text-left"></td>
                <td className="px-3 py-2 border text-right"></td>
                <td className="px-3 py-2 border text-left font-medium text-red-600">Net Loss</td>
                <td className="px-3 py-2 border text-right text-red-600">{loss > 0 ? nf.format(loss) : ''}</td>
              </tr>

              {/* Total Amount */}
              <tr className="font-bold bg-purple-100">
                <td className="px-3 py-2 border text-left">Total Credits</td>
                <td className="px-3 py-2 border text-right">{nf.format(totalsRow.liabilities + profit + obCredit)}</td>
                <td className="px-3 py-2 border text-left">Total Assets</td>
                <td className="px-3 py-2 border text-right">{nf.format(totalsRow.assets + obDebit)}</td>
                <td className="px-3 py-2 border text-left">Total Debits</td>
                <td className="px-3 py-2 border text-right">{nf.format(totalsRow.debits + loss)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-2">
      <Card className="shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!assets.length && !liabilities.length}>
                CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!assets.length && !liabilities.length}>
                Print
              </Button>
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
              <Button variant="outline" size="sm" onClick={() => setRange('today')} className="w-full">
                Today
              </Button>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setRange('thisMonth')} className="w-full">
                This Month
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="text-xs text-gray-600">
              {isLoading ? 'Loading...' : error ? <span className="text-red-600">{error}</span> : ''}
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span>Assets: {nf.format(totals.assets)}</span>
              <span>Liabilities: {nf.format(totals.liabilities)}</span>
              <span>Debits: {nf.format(totals.debits)}</span>
            </div>
          </div>

          <div className="mt-2">
            {combinedTable()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}