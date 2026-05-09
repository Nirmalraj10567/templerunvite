'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAuthToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
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
    currentLiabilities: string;
    retainedEarnings: string;
    currentAssets: string;
    lossesAndDiffs: string;
    profitAndLossDetails: string;
    totalIncome: string;
    totalExpense: string;
    netResult: string;
    incomeSources: string;
    expenseCategories: string;
    noIncomeRecords: string;
    noExpenseRecords: string;
    summary: string;
    asOfSelectedDate: string;
    grandTotal: string;
    exportPdf: string;
    totalLiabilities: string;
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
      currentLiabilities: 'Current Liabilities',
      retainedEarnings: 'Retained Earnings',
      currentAssets: 'Current Assets',
      lossesAndDiffs: 'Losses & Diffs',
      profitAndLossDetails: 'Profit & Loss Details',
      totalIncome: 'Total Income',
      totalExpense: 'Total Expense',
      netResult: 'Net Result',
      incomeSources: 'Income Sources',
      expenseCategories: 'Expense Categories',
      noIncomeRecords: 'No income records',
      noExpenseRecords: 'No expense records',
      summary: 'Summary',
      asOfSelectedDate: 'As of selected date',
       grandTotal: 'Grand Total',
       exportPdf: 'Export PDF',
       totalLiabilities: 'Total Liabilities',
       generated: 'Generated',
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
      currentLiabilities: 'நடப்பு பொறுப்புகள்',
      retainedEarnings: 'தக்கவைக்கப்பட்ட வருவாய்',
      currentAssets: 'நடப்பு சொத்துக்கள்',
      lossesAndDiffs: 'இழப்புகள் மற்றும் வித்தியாசங்கள்',
      profitAndLossDetails: 'லாபம் மற்றும் நஷ்டம் விவரங்கள்',
      totalIncome: 'மொத்த வருமானம்',
      totalExpense: 'மொத்த செலவு',
      netResult: 'நிகர முடிவு',
      incomeSources: 'வருமான ஆதாரங்கள்',
      expenseCategories: 'செலவு வகைகள்',
      noIncomeRecords: 'வருமான பதிவுகள் இல்லை',
      noExpenseRecords: 'செலவு பதிவுகள் இல்லை',
      summary: 'சுருக்கம்',
      asOfSelectedDate: 'தேர்ந்தெடுக்கப்பட்ட தேதியின்படி',
      grandTotal: 'பெரு மொத்தம்',
       exportPdf: 'PDF ஏற்றுமதி',
       totalLiabilities: 'மொத்த பொறுப்புகள்',
       generated: 'உருவாக்கப்பட்டது',
     },
   } as const;

  const [params, setParams] = useSearchParams();
  const startDate = params.get('from') || new Date().toISOString().slice(0, 10);
  const endDate = params.get('to') || new Date().toISOString().slice(0, 10);
  const query = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);
  const { user, temple } = useAuth();

  const [assets, setAssets] = useState<Item[]>([]);
  const [liabilities, setLiabilities] = useState<Item[]>([]);
  const [incomeItems, setIncomeItems] = useState<Item[]>([]);
  const [expenseItems, setExpenseItems] = useState<Item[]>([]);
  const [netProfit, setNetProfit] = useState<number>(0);
  const [totals, setTotals] = useState<{ assets: number; liabilities: number; income: number; expense: number }>({ assets: 0, liabilities: 0, income: 0, expense: 0 });
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
      const balanceResp = await fetch(`https://templeapi.agniplay.com/api/journal/balance-sheet?from=${query.startDate}&to=${query.endDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!balanceResp.ok) throw new Error(t[language].errorLoading);
      const balanceData = await balanceResp.json();

      // Use server-provided data
      const data = balanceData?.data || {};
      const assetsList: Item[] = data.assets || [];
      const liabilitiesList: Item[] = data.liabilities || [];
      const incItems: Item[] = data.incomeItems || [];
      const expItems: Item[] = data.expenseItems || [];
      const profitVal: number = data.netProfit || 0;

      setAssets(assetsList);
      setLiabilities(liabilitiesList);
      setIncomeItems(incItems);
      setExpenseItems(expItems);
      setNetProfit(profitVal);

      setTotals({ 
        assets: data.totals?.assets || 0, 
        liabilities: data.totals?.liabilities || 0, 
        income: data.totals?.income || 0,
        expense: data.totals?.expense || 0
      });

      const od = (data.openingDiff ?? data.opening_balance_diff ?? 0) as number;
      setOpeningDiff(Number.isFinite(od) ? od : 0);
    } catch (e: any) {
      setError(e?.message || t[language].errorLoading);
      setAssets([]);
      setLiabilities([]);
      setIncomeItems([]);
      setExpenseItems([]);

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
  const sortedIncome = useMemo(() => sortList(incomeItems), [incomeItems, sortKey, sortDir]);
  const sortedExpense = useMemo(() => sortList(expenseItems), [expenseItems, sortKey, sortDir]);

  const onSort = (key: keyof Item) => {
    setSortKey(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const totalsRow = useMemo(() => {
    const ta = sortedAssets.reduce((s, r) => s + (r.balance || 0), 0);
    const tl = sortedLiabilities.reduce((s, r) => s + (r.balance || 0), 0);
    return { assets: ta, liabilities: tl };
  }, [sortedAssets, sortedLiabilities]);
  const maxRows = useMemo(() => Math.max(sortedLiabilities.length, sortedAssets.length), [sortedLiabilities, sortedAssets]);
  const obCredit = useMemo(() => Math.max(0, openingDiff), [openingDiff]);
  const obDebit = useMemo(() => Math.max(0, -openingDiff), [openingDiff]);

  const totalLiabilitiesAndEquity = totalsRow.liabilities + (netProfit > 0 ? netProfit : 0) + obCredit;
  const totalAssetsValue = totalsRow.assets + (netProfit < 0 ? Math.abs(netProfit) : 0) + obDebit;

  const grandTotal = Math.abs(netProfit);



  const exportCSV = () => {
    const headers = [
      t[language].credits,
      t[language].amount,
      t[language].assets,
      t[language].amount,
      t[language].debits,
      t[language].amount,
    ];
    const maxRows = Math.max(sortedLiabilities.length, sortedAssets.length);


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
          '',
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
        netProfit > 0 ? netProfit : '',
        '',
        '',
        t[language].netLoss,
        netProfit < 0 ? Math.abs(netProfit) : '',
      ].map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(','),
      [
        t[language].totalCredits,
        totalLiabilitiesAndEquity,
        t[language].totalAssets,
        totalAssetsValue,
        '',
        '',
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const templeName = temple?.name || (user as any)?.templeName || "Temple Management";
    const title = t[language].balanceSheet;

    // Top Orange Accent Line
    doc.setDrawColor(204, 85, 0);
    doc.setLineWidth(2);
    doc.line(10, 12, pageWidth - 10, 12);

    // Temple Name (Left)
    doc.setFontSize(24);
    doc.setTextColor(204, 85, 0);
    doc.setFont(undefined, "bold");
    doc.text(templeName, 14, 25);

    // Title (Right)
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, "bold");
    doc.text(title, pageWidth - 14, 25, { align: "right" });

    // Meta Info (Right)
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.setFont(undefined, "normal");
    doc.text(`${t[language].from}: ${startDate} ${t[language].to}: ${endDate}`, pageWidth - 14, 32, { align: "right" });
    doc.text(`${t("Generated", "உருவாக்கப்பட்டது")}: ${now.toLocaleDateString()}`, pageWidth - 14, 38, { align: "right" });

    // Divider
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(10, 42, pageWidth - 10, 42);

    // Summary bar (totals)
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(10, 46, pageWidth - 20, 12, 3, 3, "F");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, "bold");
    doc.text(`${t[language].totalLiabilities}: Rs. ${nf.format(totalLiabilitiesAndEquity)}`, 14, 54);
    doc.text(`${t[language].totalAssets}: ${nf.format(totalAssetsValue)}`, pageWidth - 14, 54, { align: "right" });

    let y = 62;

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
    if (netProfit > 0 || obCredit > 0) {
      if (obCredit > 0) {
        tableData.push([t[language].openingDiff, nf.format(obCredit), '', '']);
      }
      if (netProfit > 0) {
        tableData.push([t[language].netProfit, nf.format(netProfit), '', '']);
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
      tableWidth: 'wrap',
      margin: { top: 15, left: 10, right: 10, bottom: 25 }
    });

    // Get final Y position
    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;

    // Summary section
    doc.setFontSize(12);
    doc.setTextColor(249, 115, 22);
    doc.text(t[language].summary, 14, finalY + 15);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${t[language].totalAssets}: Rs. ${nf.format(totalAssetsValue)}`, 14, finalY + 25);
    doc.text(`${t[language].totalCredits}: Rs. ${nf.format(totalLiabilitiesAndEquity)}`, 14, finalY + 32);
    doc.text(`${t[language].netResult}: Rs. ${nf.format(netProfit)}`, 14, finalY + 39);



    // Save PDF
    doc.save(`balance-sheet_${query.startDate}_${query.endDate}.pdf`);
  };

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
           <TableRow  className="whitespace-nowrap">
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
            return (
              <TableRow
                key={`row-${i}`}
                className={tableClasses.row}
              >
                <TableCell className={tableClasses.cell}>{l?.account ?? ''}</TableCell>
                <TableCell className={cn(tableClasses.cell, "text-right")}>{l ? nf.format(l.balance) : ''}</TableCell>
                <TableCell className={tableClasses.cell}>{a?.account ?? ''}</TableCell>
                <TableCell className={cn(tableClasses.cell, "text-right")}>{a ? nf.format(a.balance) : ''}</TableCell>
                <TableCell className={tableClasses.cell}></TableCell>
                <TableCell className={cn(tableClasses.cell, "text-right")}></TableCell>
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
              <TableCell className={cn(tableClasses.cell, "text-right text-green-600")}>{netProfit > 0 ? nf.format(netProfit) : ''}</TableCell>
              <TableCell className={cn(tableClasses.cell, "font-medium text-red-600")}>{t[language].netLoss}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right text-red-600")}>{netProfit < 0 ? nf.format(Math.abs(netProfit)) : ''}</TableCell>
              <TableCell className={tableClasses.cell}></TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}></TableCell>
            </TableRow>


            {/* Total Amount */}
            <TableRow className={cn(tableClasses.row, "font-bold bg-purple-100")}>
              <TableCell className={tableClasses.cell}>{t[language].totalCredits}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}>{nf.format(totalLiabilitiesAndEquity)}</TableCell>
              <TableCell className={tableClasses.cell}>{t[language].totalAssets}</TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}>{nf.format(totalAssetsValue)}</TableCell>
              <TableCell className={tableClasses.cell}></TableCell>
              <TableCell className={cn(tableClasses.cell, "text-right")}></TableCell>
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
              {t[language].exportPdf}
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
                    <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
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
                            <span className="text-sm font-medium text-red-600">{t[language].currentLiabilities}</span>
                          </div>
                          {sortedLiabilities.map((item, idx) => (
                            <div key={`liab-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-gray-50">
                              <span className="text-sm text-gray-700">{item.account}</span>
                              <span className="text-sm font-medium text-red-600">₹{nf.format(item.balance)}</span>
                            </div>
                          ))}

                          {/* Retained Earnings Section */}
                          {(netProfit > 0 || obCredit > 0) && (
                            <>
                              <div className="px-4 py-2 bg-red-50/50 mt-2">
                                <span className="text-sm font-medium text-red-600">{t[language].retainedEarnings}</span>
                              </div>
                              {obCredit > 0 && (
                                <div className="px-4 py-2 flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{t[language].openingDiff}</span>
                                  <span className="text-sm font-medium text-red-600">₹{nf.format(obCredit)}</span>
                                </div>
                              )}
                              {netProfit > 0 && (
                                <div className="px-4 py-2 flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{t[language].netProfit}</span>
                                  <span className="text-sm font-medium text-red-600">₹{nf.format(netProfit)}</span>
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
                            <span className="text-sm font-medium text-green-600">{t[language].currentAssets}</span>
                          </div>
                          {sortedAssets.map((item, idx) => (
                            <div key={`asset-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-gray-50">
                              <span className="text-sm text-gray-700">{item.account}</span>
                              <span className="text-sm font-medium text-green-600">₹{nf.format(item.balance)}</span>
                            </div>
                          ))}

                          {/* Other Assets Section */}
                          {(netProfit < 0 || obDebit > 0) && (
                            <>
                              <div className="px-4 py-2 bg-green-50/50 mt-2">
                                <span className="text-sm font-medium text-green-600">{t[language].lossesAndDiffs}</span>
                              </div>
                              {obDebit > 0 && (
                                <div className="px-4 py-2 flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{t[language].openingDiff}</span>
                                  <span className="text-sm font-medium text-green-600">₹{nf.format(obDebit)}</span>
                                </div>
                              )}
                              {netProfit < 0 && (
                                <div className="px-4 py-2 flex justify-between items-center">
                                  <span className="text-sm text-gray-700">{t[language].netLoss}</span>
                                  <span className="text-sm font-medium text-red-600">₹{nf.format(Math.abs(netProfit))}</span>
                                </div>
                              )}
                            </>
                          )}

                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Profit & Loss Details Section */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        <CardTitle className="text-base text-indigo-900">{t[language].profitAndLossDetails}</CardTitle>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-semibold">{t[language].totalIncome}</p>
                          <p className="text-sm font-bold text-green-600">₹{nf.format(totals.income)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-semibold">{t[language].totalExpense}</p>
                          <p className="text-sm font-bold text-red-600">₹{nf.format(totals.expense)}</p>
                        </div>
                        <div className="bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                           <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-semibold">{t[language].netResult}</p>
                           <p className={cn("text-sm font-bold", netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                             {netProfit >= 0 ? "+" : ""}₹{nf.format(Math.abs(netProfit))}
                           </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 divide-x">
                      {/* Income Column */}
                      <div className="bg-white">
                        <div className="px-4 py-2 bg-green-50/30 border-b flex justify-between">
                          <span className="text-xs font-semibold text-green-700 uppercase tracking-tight">{t[language].incomeSources}</span>
                        </div>
                        <div className="divide-y max-h-[300px] overflow-y-auto">
                          {sortedIncome.length === 0 ? (
                            <div className="px-4 py-4 text-center text-gray-400 text-xs italic">{t[language].noIncomeRecords}</div>
                          ) : sortedIncome.map((item, idx) => (
                            <div key={`inc-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-green-50/20 transition-colors">
                              <span className="text-sm text-gray-600">{item.account}</span>
                              <span className="text-sm font-medium text-green-600">₹{nf.format(item.balance)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Expense Column */}
                      <div className="bg-white">
                        <div className="px-4 py-2 bg-red-50/30 border-b flex justify-between">
                          <span className="text-xs font-semibold text-red-700 uppercase tracking-tight">{t[language].expenseCategories}</span>
                        </div>
                        <div className="divide-y max-h-[300px] overflow-y-auto">
                          {sortedExpense.length === 0 ? (
                            <div className="px-4 py-4 text-center text-gray-400 text-xs italic">{t[language].noExpenseRecords}</div>
                          ) : sortedExpense.map((item, idx) => (
                            <div key={`exp-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-red-50/20 transition-colors">
                              <span className="text-sm text-gray-600">{item.account}</span>
                              <span className="text-sm font-medium text-red-600">₹{nf.format(item.balance)}</span>
                            </div>
                          ))}
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
                  <CardTitle className="text-base">{t[language].summary}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{t[language].asOfSelectedDate}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Total Assets */}
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-900">{t[language].totalAssets}</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600">₹{nf.format(totalAssetsValue)}</p>
                </div>

                {/* Total Liabilities */}
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium text-red-900">{t[language].totalLiabilities}</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">₹{nf.format(totalsRow.liabilities)}</p>
                </div>


                {/* Net Profit/Loss */}
                <div className={cn("rounded-lg p-3 border", netProfit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className={cn("h-4 w-4", netProfit >= 0 ? "text-green-600" : "text-red-600")} />
                    <span className={cn("text-xs font-medium", netProfit >= 0 ? "text-green-900" : "text-red-900")}>
                      {netProfit >= 0 ? t[language].netProfit : t[language].netLoss}
                    </span>
                  </div>
                  <p className={cn("text-lg font-bold", netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                    ₹{nf.format(Math.abs(netProfit))}
                  </p>
                </div>




                {/* Divider */}
                <div className="border-t pt-3 mt-3">
                  {/* Grand Total */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="h-4 w-4 text-white" />
                      <span className="text-xs font-medium text-white/90">{netProfit >= 0 ? t[language].netProfit : t[language].netLoss} ({t[language].grandTotal})</span>
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