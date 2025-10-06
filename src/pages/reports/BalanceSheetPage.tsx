'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw, IndianRupee } from 'lucide-react';
import { useLanguage } from '@/lib/language'; // 👈 Import useLanguage
import { formFieldStyles, cn, pageContainerStyles } from '@/styles/formStyles';

interface Item {
  account: string;
  balance: number;
}

export default function BalanceSheetPage() {
  const { language } = useLanguage();
 // const t = (en: string, ta: string) => (language === 'english' ? ta : en);
  
  type Labels = {
    title: string;
    from: string;
    to: string;
    refresh: string;
    csv: string;
    print: string;
    noData: string;
    credits: string;
    liabilities: string;
    assets: string;
    debits: string;
    amount: string;
    openingDiff: string;
    netProfit: string;
    netLoss: string;
    totalCredits: string;
    totalAssets: string;
    totalDebits: string;
    today: string;
    thisMonth: string;
    fiscalYear: string;
    loading: string;
    errorLoading: string;
    balanceSheet: string;
  };

  const t: Record<'english' | 'tamil', Labels> = {
    tamil: {
      title: 'Balance Sheet',
      from: 'From',
      to: 'To',
      refresh: 'Refresh',
      csv: 'CSV',
      print: 'Print',
      noData: 'No data',
      credits: 'Credits (Liabilities & Equity)',
      liabilities: 'Liabilities',
      assets: 'Assets',
      debits: 'Debits (Expenses & Losses)',
      amount: 'Amount',
      openingDiff: 'Opening Balance Diff',
      netProfit: 'Net Profit',
      netLoss: 'Net Loss',
      totalCredits: 'Total Credits',
      totalAssets: 'Total Assets',
      totalDebits: 'Total Debits',
      today: 'Today',
      thisMonth: 'This Month',
      fiscalYear: 'Fiscal Year',
      loading: 'Loading...',
      errorLoading: 'Failed to load',
      balanceSheet: 'Balance Sheet',
    },
    english: {
      balanceSheet: 'இருப்புநிலை',
      title: 'சமநிலை அறிக்கை',
      from: 'இருந்து',
      to: 'வரை',
      refresh: 'புதுப்பி',
      csv: 'CSV',
      print: 'அச்சிடு',
      noData: 'தரவு இல்லை',
      credits: 'கடன் (பற்றுகள் & நிதி சமநிலை)',
      liabilities: 'பற்றுகள்',
      assets: 'சொத்துகள்',
      debits: 'பற்று (செலவுகள் & நஷ்டங்கள்)',
      amount: 'தொகை',
      openingDiff: 'தொடக்க மீதி வித்தியாசம்',
      netProfit: 'நிகர லாபம்',
      netLoss: 'நிகர நஷ்டம்',
      totalCredits: 'மொத்த கடன்',
      totalAssets: 'மொத்த சொத்துகள்',
      totalDebits: 'மொத்த பற்று',
      today: 'இன்று',
      thisMonth: 'இந்த மாதம்',
      fiscalYear: 'பொருளாதார ஆண்டு',
      loading: 'ஏற்றுகிறது...',
      errorLoading: 'அறிக்கை ஏற்ற முடியவில்லை',
    },
  } as const;

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
      const balanceResp = await fetch(`https://tmsapi.xesstechlink.com/api/journal/balance-sheet?from=${query.startDate}&to=${query.endDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!balanceResp.ok) throw new Error(t[language].errorLoading);
      const balanceData = await balanceResp.json();

      // Fetch debit transactions from ledger entries (already typed credit/debit)
      const debitResp = await fetch(`https://tmsapi.xesstechlink.com/api/ledger/entries?startDate=${query.startDate}&endDate=${query.endDate}&type=debit&limit=1000&page=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let debitItems: Item[] = [];
      if (debitResp.ok) {
        const result = await debitResp.json();
        const rows: any[] = result?.data || [];
        // Group by category/under or name and sum amounts
        const map = new Map<string, number>();
        for (const r of rows) {
          const key = r.under || r.name || 'Unknown';
          const amt = Number(r.amount || 0);
          map.set(key, (map.get(key) || 0) + (isNaN(amt) ? 0 : amt));
        }
        debitItems = Array.from(map.entries()).map(([account, balance]) => ({ account, balance }));
      }

      // Use server-provided assets/liabilities as-is
      const assetsList: Item[] = balanceData?.data?.assets || [];
      const liabilitiesList: Item[] = balanceData?.data?.liabilities || [];

      setAssets(assetsList);
      setLiabilities(liabilitiesList);
      setDebits(debitItems);

      const totalDebits = debitItems.reduce((sum, item) => sum + (item.balance || 0), 0);
      const totalAssets = assetsList.reduce((sum, item) => sum + (item.balance || 0), 0);
      const totalLiabilities = liabilitiesList.reduce((sum, item) => sum + (item.balance || 0), 0);
      setTotals({ assets: totalAssets, liabilities: totalLiabilities, debits: totalDebits });

      const od = (balanceData?.data?.openingDiff ?? balanceData?.data?.opening_balance_diff ?? 0) as number;
      setOpeningDiff(Number.isFinite(od) ? od : 0);
    } catch (e: any) {
      setError(e?.message || t[language].errorLoading);
      setAssets([]);
      setLiabilities([]);
      setDebits([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query.startDate, query.endDate, language]); // 👈 Re-run when language changes

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
    const headers = [
      t[language].credits,
      t[language].amount,
      t[language].assets,
      t[language].amount,
      t[language].debits,
      t[language].amount,
    ];
    const maxRows = Math.max(sortedLiabilities.length, sortedAssets.length, sortedDebits.length);

    const lines = [
      headers.join(','),
      ...Array.from({ length: maxRows }).map((_, i) => {
        const l = sortedLiabilities[i];
        const a = sortedAssets[i];
        const d = sortedDebits[i];
        return [
          l?.account ?? '',
          l ? l.balance : '',
          a?.account ?? '',
          a ? a.balance : '',
          d?.account ?? '',
          d ? d.balance : '',
        ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',');
      }),
      [
        t[language].openingDiff,
        obCredit > 0 ? obCredit : '',
        t[language].openingDiff,
        obDebit > 0 ? obDebit : '',
        '',
        '',
      ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(','),
      [
        t[language].netProfit,
        profit > 0 ? profit : '',
        '',
        '',
        t[language].netLoss,
        loss > 0 ? loss : '',
      ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(','),
      [
        t[language].totalCredits,
        totalsRow.liabilities + profit + obCredit,
        t[language].totalAssets,
        totalsRow.assets + obDebit,
        t[language].totalDebits,
        totalsRow.debits + loss,
      ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(','),
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
            <th className="bg-purple-700 text-white px-3 py-2 text-left border-b border-gray-300">{t[language].credits}</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-right border-b border-gray-300">{t[language].amount}</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-left border-b border-gray-300">{t[language].assets}</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-right border-b border-gray-300">{t[language].amount}</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-left border-b border-gray-300">{t[language].debits}</th>
            <th className="bg-purple-700 text-white px-3 py-2 text-right border-b border-gray-300">{t[language].amount}</th>
          </tr>
        </thead>
        <tbody>
          {!isLoading && maxRows === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-3 text-center text-gray-500 border">{t[language].noData}</td>
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
                <td className="px-3 py-2 border text-left font-medium">{t[language].openingDiff}</td>
                <td className="px-3 py-2 border text-right">{obCredit > 0 ? nf.format(obCredit) : ''}</td>
                <td className="px-3 py-2 border text-left font-medium">{t[language].openingDiff}</td>
                <td className="px-3 py-2 border text-right">{obDebit > 0 ? nf.format(obDebit) : ''}</td>
                <td className="px-3 py-2 border text-left"></td>
                <td className="px-3 py-2 border text-right"></td>
              </tr>

              {/* Net Loss / Profit */}
              <tr>
                <td className="px-3 py-2 border text-left font-medium text-green-600">{t[language].netProfit}</td>
                <td className="px-3 py-2 border text-right text-green-600">{profit > 0 ? nf.format(profit) : ''}</td>
                <td className="px-3 py-2 border text-left"></td>
                <td className="px-3 py-2 border text-right"></td>
                <td className="px-3 py-2 border text-left font-medium text-red-600">{t[language].netLoss}</td>
                <td className="px-3 py-2 border text-right text-red-600">{loss > 0 ? nf.format(loss) : ''}</td>
              </tr>

              {/* Total Amount */}
              <tr className="font-bold bg-purple-100">
                <td className="px-3 py-2 border text-left">{t[language].totalCredits}</td>
                <td className="px-3 py-2 border text-right">{nf.format(totalsRow.liabilities + profit + obCredit)}</td>
                <td className="px-3 py-2 border text-left">{t[language].totalAssets}</td>
                <td className="px-3 py-2 border text-right">{nf.format(totalsRow.assets + obDebit)}</td>
                <td className="px-3 py-2 border text-left">{t[language].totalDebits}</td>
                <td className="px-3 py-2 border text-right">{nf.format(totalsRow.debits + loss)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={pageContainerStyles.container}>
       <Card className={pageContainerStyles.content}>
         <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 text-center", formFieldStyles.card.header)}>
           <CardTitle className="text-lg font-bold w-full">
           {t[language].balanceSheet}
           </CardTitle>
         </CardHeader>
       
      <Card className="shadow-lg">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-start items-left">
            
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3 items-end">
            <div>
              <Label htmlFor="from" className="text-xs">{t[language].from}</Label>
              <Input id="from" type="date" className="h-8 text-sm" value={startDate} onChange={(e) => onFilterChange('from', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">{t[language].to}</Label>
              <Input id="to" type="date" className="h-8 text-sm" value={endDate} onChange={(e) => onFilterChange('to', e.target.value)} />
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

          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="text-xs text-gray-600">
              {isLoading ? t[language].loading : error ? <span className="text-red-600">{error}</span> : ''}
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span>{t[language].assets}: {nf.format(totals.assets)}</span>
              <span>{t[language].liabilities}: {nf.format(totals.liabilities)}</span>
              <span>{t[language].debits}: {nf.format(totals.debits)}</span>
            </div>
          </div>

          <div className="mt-2">
            {combinedTable()}
          </div>
        </CardContent>
      </Card>
    </Card>
    </div>
  );
}