'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { Loader2, RefreshCw, IndianRupee, FileDown, Calendar, Building2, Scale, ArrowUpCircle, ArrowDownCircle, TrendingUp, AlertCircle, LayoutGrid, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '@/lib/language'; 
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme, tableClasses } from '@/styles/theme';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
    english: {
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
    tamil: {
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
      const balanceResp = await fetch(`http://localhost:4000/api/journal/balance-sheet?from=${query.startDate}&to=${query.endDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!balanceResp.ok) throw new Error(t[language].errorLoading);
      const balanceData = await balanceResp.json();

      // Fetch debit transactions from ledger entries (already typed credit/debit)
      const debitResp = await fetch(`http://localhost:4000/api/ledger/entries?startDate=${query.startDate}&endDate=${query.endDate}&type=debit&limit=1000&page=1`, {
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

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(249, 115, 22); // Orange color
    doc.text(t[language].balanceSheet, pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Date range
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${t[language].from}: ${startDate} ${t[language].to}: ${endDate}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    // Calculate max rows for table
    const maxRows = Math.max(sortedLiabilities.length, sortedAssets.length);
    const tableData: any[] = [];
    
    for (let i = 0; i < maxRows; i++) {
      const l = sortedLiabilities[i];
      const a = sortedAssets[i];
      tableData.push([
        l?.account ?? '',
        l ? nf.format(l.balance) : '',
        a?.account ?? '',
        a ? nf.format(a.balance) : ''
      ]);
    }
    
    // Add retained earnings rows
    if (profit > 0 || obCredit > 0) {
      if (obCredit > 0) {
        tableData.push([t[language].openingDiff, nf.format(obCredit), '', '']);
      }
      if (profit > 0) {
        tableData.push([t[language].netProfit, nf.format(profit), '', '']);
      }
    }
    
    // Main table
    autoTable(doc, {
      startY: y,
      head: [[
        { content: t[language].liabilities, styles: { fillColor: [254, 242, 242], textColor: [185, 28, 28] } },
        { content: t[language].amount, styles: { fillColor: [254, 242, 242], textColor: [185, 28, 28] } },
        { content: t[language].assets, styles: { fillColor: [240, 253, 244], textColor: [21, 128, 61] } },
        { content: t[language].amount, styles: { fillColor: [240, 253, 244], textColor: [21, 128, 61] } }
      ]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 55 },
        3: { cellWidth: 30, halign: 'right' }
      },
      headStyles: { fontStyle: 'bold' },
      tableWidth: 'wrap'
    });
    
    // Get final Y position
    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
    
    // Summary section
    doc.setFontSize(12);
    doc.setTextColor(249, 115, 22);
    doc.text('Summary', margin, finalY + 15);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total Assets: ${nf.format(totalAssetsValue)}`, margin, finalY + 25);
    doc.text(`Total Liabilities + Equity: ${nf.format(totalLiabilitiesAndEquity)}`, margin, finalY + 32);
    doc.text(`Net Profit: ${nf.format(Math.max(0, profit))}`, margin, finalY + 39);
    doc.text(`Balance: ${nf.format(Math.abs(balance))}`, margin, finalY + 46);
    
    // Save PDF
    doc.save(`balance-sheet_${query.startDate}_${query.endDate}.pdf`);
  };

  const maxRows = useMemo(() => Math.max(sortedLiabilities.length, sortedAssets.length, sortedDebits.length), [sortedLiabilities, sortedAssets, sortedDebits]);
  const netResult = useMemo(() => (totalsRow.assets - totalsRow.liabilities) || 0, [totalsRow.assets, totalsRow.liabilities]);
  const profit = useMemo(() => Math.max(0, -netResult), [netResult]); // liabilities > assets
  const loss = useMemo(() => Math.max(0, netResult), [netResult]);     // assets > liabilities
  const obCredit = useMemo(() => Math.max(0, openingDiff), [openingDiff]);
  const obDebit = useMemo(() => Math.max(0, -openingDiff), [openingDiff]);
  
  // Calculate derived values for summary (used in both UI and PDF)
  const totalLiabilitiesAndEquity = totalsRow.liabilities + profit + obCredit;
  const totalAssetsValue = totalsRow.assets + obDebit;
  const balance = totalLiabilitiesAndEquity - totalAssetsValue;
  const grandTotal = totalLiabilitiesAndEquity + totalAssetsValue;

  const combinedTable = () => (
    <Table className={tableClasses.container}>
      <TableHeader className={tableClasses.header}>
        <TableRow className={tableClasses.row}>
          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t[language].credits}</TableHead>
          <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t[language].amount}</TableHead>
          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t[language].assets}</TableHead>
          <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t[language].amount}</TableHead>
          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t[language].debits}</TableHead>
          <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t[language].amount}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!isLoading && maxRows === 0 && (
          <TableRow>
            <TableCell colSpan={6} className={tableClasses.emptyState}>{t[language].noData}</TableCell>
          </TableRow>
        )}
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={`sk-${i}`} className={tableClasses.row}>
            <TableCell className={tableClasses.cell}><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></TableCell>
            <TableCell className={tableClasses.cell}><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"></div></TableCell>
            <TableCell className={tableClasses.cell}><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></TableCell>
            <TableCell className={tableClasses.cell}><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"></div></TableCell>
            <TableCell className={tableClasses.cell}><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></TableCell>
            <TableCell className={tableClasses.cell}><div className="h-3 w-16 bg-gray-200 animate-pulse rounded ml-auto"></div></TableCell>
          </TableRow>
        ))}
        {!isLoading &&
          Array.from({ length: maxRows }).map((_, i) => {
            const l = sortedLiabilities[i];
            const a = sortedAssets[i];
            const d = sortedDebits[i];
            return (
              <TableRow
                key={`row-${i}`}
                className={tableClasses.row}
              >
                <TableCell className={tableClasses.cell}>{l?.account ?? ''}</TableCell>
                <TableCell className={cn(tableClasses.cell, "text-right")}>{l ? nf.format(l.balance) : ''}</TableCell>
                <TableCell className={tableClasses.cell}>{a?.account ?? ''}</TableCell>
                <TableCell className={cn(tableClasses.cell, "text-right")}>{a ? nf.format(a.balance) : ''}</TableCell>
                <TableCell className={tableClasses.cell}>{d?.account ?? ''}</TableCell>
                <TableCell className={cn(tableClasses.cell, "text-right")}>{d ? nf.format(d.balance) : ''}</TableCell>
              </TableRow>
            );
          })}
        {(sortedLiabilities.length > 0 || sortedAssets.length > 0) && (
          <>
            {/* Opening Balance Diff */}
            <TableRow className={tableClasses.row}>
              <TableCell className={cn(tableClasses.cell, "font-medium")}>{t[language].openingDiff}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}>{obCredit > 0 ? nf.format(obCredit) : ''}</TableCell>
              <TableCell className={cn(tableClasses.cell, "font-medium")}>{t[language].openingDiff}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}>{obDebit > 0 ? nf.format(obDebit) : ''}</TableCell>
              <TableCell className={tableClasses.cell}></TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}></TableCell>
            </TableRow>

            {/* Net Loss / Profit */}
            <TableRow className={tableClasses.row}>
              <TableCell className={cn(tableClasses.cell, "font-medium text-green-600")}>{t[language].netProfit}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right text-green-600")}>{profit > 0 ? nf.format(profit) : ''}</TableCell>
              <TableCell className={tableClasses.cell}></TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}></TableCell>
              <TableCell className={cn(tableClasses.cell, "font-medium text-red-600")}>{t[language].netLoss}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right text-red-600")}>{loss > 0 ? nf.format(loss) : ''}</TableCell>
            </TableRow>

            {/* Total Amount */}
            <TableRow className={cn(tableClasses.row, "font-bold bg-purple-100")}>
              <TableCell className={tableClasses.cell}>{t[language].totalCredits}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}>{nf.format(totalsRow.liabilities + profit + obCredit)}</TableCell>
              <TableCell className={tableClasses.cell}>{t[language].totalAssets}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}>{nf.format(totalsRow.assets + obDebit)}</TableCell>
              <TableCell className={tableClasses.cell}>{t[language].totalDebits}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}>{nf.format(totalsRow.debits + loss)}</TableCell>
            </TableRow>
          </>
        )}
      </TableBody>
    </Table>
  );

  const isBalanced = Math.abs(totalsRow.assets - totalsRow.liabilities) < 0.01;
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
            <div className="bg-white/20 p-2 rounded-lg">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">{t[language].balanceSheet}</h1>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-white/20 px-2 py-0.5 rounded">
                  {formatDate(endDate)}
                </span>
                {!isBalanced && (
                  <span className="bg-red-500/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not Balanced
                  </span>
                )}
                {isBalanced && (
                  <span className="bg-green-500/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    Balanced
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Date Pickers */}
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onFilterChange('from', e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="bg-white text-gray-800 text-xs px-2 py-1 rounded border-0 outline-none cursor-pointer"
              />
              <span className="text-white text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onFilterChange('to', e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="bg-white text-gray-800 text-xs px-2 py-1 rounded border-0 outline-none cursor-pointer"
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
            
            <Button
              variant="secondary"
              size="sm"
              onClick={exportPDF}
              disabled={isLoading || maxRows === 0}
              className="gap-2 bg-white text-orange-600 hover:bg-white/90 border-0"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column - Tables */}
          <div className="lg:col-span-3 space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">{t[language].loading}</p>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={load} disabled={isLoading} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t[language].refresh}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Liabilities & Assets Table */}
                <Card>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2">
                      {/* Liabilities Side */}
                      <div className="border-r">
                        <div className="bg-red-50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-red-700">{t[language].liabilities}</h3>
                            <span className="text-xs text-red-600">{t[language].amount}</span>
                          </div>
                        </div>
                        <div className="divide-y">
                          {/* Current Liabilities Section */}
                          <div className="px-4 py-2 bg-red-50/50">
                            <span className="text-sm font-medium text-red-600">Current Liabilities</span>
                          </div>
                          {sortedLiabilities.map((item, idx) => (
                            <div key={`liab-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-gray-50">
                              <span className="text-sm text-gray-700">{item.account}</span>
                              <span className="text-sm font-medium text-red-600">₹{nf.format(item.balance)}</span>
                            </div>
                          ))}
                          
                          {/* Retained Earnings Section */}
                          {(profit > 0 || obCredit > 0) && (
                            <>
                              <div className="px-4 py-2 bg-red-50/50 mt-2">
                                <span className="text-sm font-medium text-red-600">Retained Earnings</span>
                              </div>
                              {obCredit > 0 && (
                                <div className="px-4 py-2 flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{t[language].openingDiff}</span>
                                  <span className="text-sm font-medium text-red-600">₹{nf.format(obCredit)}</span>
                                </div>
                              )}
                              {profit > 0 && (
                                <div className="px-4 py-2 flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{t[language].netProfit}</span>
                                  <span className="text-sm font-medium text-red-600">₹{nf.format(profit)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Assets Side */}
                      <div>
                        <div className="bg-green-50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-green-700">{t[language].assets}</h3>
                            <span className="text-xs text-green-600">{t[language].amount}</span>
                          </div>
                        </div>
                        <div className="divide-y">
                          {/* Current Assets Section */}
                          <div className="px-4 py-2 bg-green-50/50">
                            <span className="text-sm font-medium text-green-600">Current Assets</span>
                          </div>
                          {sortedAssets.map((item, idx) => (
                            <div key={`asset-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-gray-50">
                              <span className="text-sm text-gray-700">{item.account}</span>
                              <span className="text-sm font-medium text-green-600">₹{nf.format(item.balance)}</span>
                            </div>
                          ))}
                          
                          {/* Other Assets/Debits */}
                          {sortedDebits.length > 0 && (
                            <>
                              <div className="px-4 py-2 bg-green-50/50 mt-2">
                                <span className="text-sm font-medium text-green-600">Other Assets</span>
                              </div>
                              {sortedDebits.map((item, idx) => (
                                <div key={`debit-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-gray-50">
                                  <span className="text-sm text-gray-700">{item.account}</span>
                                  <span className="text-sm font-medium text-green-600">₹{nf.format(item.balance)}</span>
                                </div>
                              ))}
                            </>
                          )}
                          
                          {obDebit > 0 && (
                            <div className="px-4 py-2 flex justify-between items-center">
                              <span className="text-sm text-gray-700">{t[language].openingDiff}</span>
                              <span className="text-sm font-medium text-green-600">₹{nf.format(obDebit)}</span>
                            </div>
                          )}
                          {loss > 0 && (
                            <div className="px-4 py-2 flex justify-between items-center">
                              <span className="text-sm text-gray-700">{t[language].netLoss}</span>
                              <span className="text-sm font-medium text-green-600">₹{nf.format(loss)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base">Summary</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">As of selected date</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Total Assets */}
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-900">Total Assets</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600">₹{nf.format(totalAssetsValue)}</p>
                </div>

                {/* Total Liabilities + Equity */}
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-900">Total Liabilities + Equity</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600">₹{nf.format(totalLiabilitiesAndEquity)}</p>
                </div>

                {/* Net Profit */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-900">Net Profit</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">₹{nf.format(Math.max(0, profit))}</p>
                </div>

                {/* Balance */}
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-900">Balance</span>
                  </div>
                  <p className={`text-lg font-bold ${balance >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                    ₹{nf.format(Math.abs(balance))}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t pt-3 mt-3">
                  {/* Grand Total */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="h-4 w-4 text-white" />
                      <span className="text-xs font-medium text-white/90">GRAND TOTAL</span>
                    </div>
                    <p className="text-xl font-bold text-white">₹{nf.format(grandTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}