"use client";

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAuthToken } from '@/lib/auth';

type Row = { id: number; name: string; amount: number };

export default function AccountBalanceSheetPage() {
  const { language } = useLanguage();

  const t = useMemo(() => ({
    tamil: {
      title: 'பாலன்ஸ் ஷீட்',
      selectDate: 'தேதி தேர்வு:',
      refresh: 'புதுப்பி',
      print: 'அச்சிடு',
      heading: 'பாலன்ஸ் ஷீட் தரவு',
      records: 'பதிவுகள்',
      liabilities: 'பொறுப்புகள்',
      assets: 'சொத்துக்கள்',
      amount: 'தொகை',
      openingDiff: 'திறப்பில் வித்தியாசம்',
      total: 'மொத்தம்',
      netProfit: 'நிகர வரவு'
    },
    english: {
      title: 'Balance Sheet',
      selectDate: 'Select Date:',
      refresh: 'Refresh',
      print: 'Print',
      heading: 'Balance Sheet Data',
      records: 'records',
      liabilities: 'Liabilities',
      assets: 'Assets',
      amount: 'Amount',
      openingDiff: 'Opening Balance Diff',
      total: 'Total',
      netProfit: 'Net Profit'
    }
  }), []);

  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [liabilities, setLiabilities] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [openingDiff, setOpeningDiff] = useState<number>(0);

  const totals = useMemo(() => {
    const l = liabilities.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const a = assets.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { l, a };
  }, [liabilities, assets]);

  const recordCount = useMemo(() => Math.max(liabilities.length, assets.length), [liabilities.length, assets.length]);

  const totalsRow = useMemo(() => {
    const ta = assets.reduce((s, r) => s + (r.amount || 0), 0);
    const tl = liabilities.reduce((s, r) => s + (r.amount || 0), 0);
    return { assets: ta, liabilities: tl };
  }, [assets, liabilities]);

  const netResult = useMemo(() => (totalsRow.assets - totalsRow.liabilities) || 0, [totalsRow.assets, totalsRow.liabilities]);
  const profit = useMemo(() => Math.max(0, -netResult), [netResult]);
  const loss = useMemo(() => Math.max(0, netResult), [netResult]);
  const obCredit = useMemo(() => Math.max(0, openingDiff), [openingDiff]);
  const obDebit = useMemo(() => Math.max(0, -openingDiff), [openingDiff]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      const qs = `from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;
      const resp = await fetch(`https://tmsapi.xesstechlink.com/api/journal/balance-sheet?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error('Failed to load');
      const body = await resp.json();
      const a: Array<{ account: string; balance: number }> = body?.data?.assets || [];
      const l: Array<{ account: string; balance: number }> = body?.data?.liabilities || [];
      setAssets(a.map((x, i) => ({ id: i + 1, name: x.account, amount: Number(x.balance) || 0 })));
      setLiabilities(l.map((x, i) => ({ id: i + 1, name: x.account, amount: Number(x.balance) || 0 })));
      const od = (body?.data?.openingDiff ?? body?.data?.opening_balance_diff ?? 0) as number;
      setOpeningDiff(Number.isFinite(od) ? od : 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setAssets([]);
      setLiabilities([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const setThisMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = new Date(y, m, 1).toISOString().slice(0, 10);
    const last = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    setFromDate(first);
    setToDate(last);
  };

  const setThisYear = () => {
    const now = new Date();
    const y = now.getFullYear();
    const first = new Date(y, 0, 1).toISOString().slice(0, 10);
    const last = new Date(y, 11, 31).toISOString().slice(0, 10);
    setFromDate(first);
    setToDate(last);
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-indigo-500 text-lg">📅</span>
          <label className="text-sm font-medium text-gray-700">{t[language].selectDate}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[150px]"
          />
          <span className="text-gray-500">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[150px]"
          />
        </div>

        <div className="ml-auto flex gap-3">
          <button onClick={setThisMonth} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium shadow-sm">This Month</button>
          <button onClick={setThisYear} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium shadow-sm">This Year</button>
          <button onClick={load} disabled={isLoading} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm">
            <span className="mr-2">↻</span>
            {t[language].refresh}
          </button>
          <button className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm">
            <span className="mr-2">🖨️</span>
            {t[language].print}
          </button>
        </div>
      </div>

      {/* Data Card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100">
        {/* Card Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600">📘</span>
            <h3 className="font-semibold text-gray-800">{t[language].heading}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{recordCount} {t[language].records}</span>
            <button onClick={load} disabled={isLoading} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600">▦</button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto p-4">
          <div className="max-w-6xl mx-auto">
            <table className="w-full border border-gray-200">
              <thead>
                <tr>
                  <th className="bg-indigo-600 text-white px-4 py-3 text-left w-1/4">{t[language].liabilities}</th>
                  <th className="bg-indigo-600 text-white px-4 py-3 text-left w-1/4">{t[language].amount}</th>
                  <th className="bg-indigo-600 text-white px-4 py-3 text-left w-1/4">{t[language].assets}</th>
                  <th className="bg-indigo-600 text-white px-4 py-3 text-left w-1/4">{t[language].amount}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm text-gray-500">Loading...</td>
                  </tr>
                )}
                {!isLoading && error && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm text-red-600">{error}</td>
                  </tr>
                )}
                {!isLoading && !error && Array.from({ length: Math.max(liabilities.length, assets.length) }).map((_, idx) => {
                  const l = liabilities[idx];
                  const a = assets[idx];
                  return (
                    <tr key={idx} className="border-b">
                      <td className={`px-4 py-3 text-sm text-gray-800`}>{l?.name || ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{l ? l.amount.toFixed(2) : ''}</td>
                      <td className={`px-4 py-3 text-sm ${a?.name?.toLowerCase()?.includes('cash') ? 'text-green-600' : 'text-gray-800'}`}>{a?.name || ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a ? a.amount.toFixed(2) : ''}</td>
                    </tr>
                  );
                })}

                {/* Opening Balance Diff */}
                <tr className="bg-indigo-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t[language].openingDiff}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{obCredit ? obCredit.toFixed(2) : ''}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t[language].openingDiff}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{obDebit ? obDebit.toFixed(2) : ''}</td>
                </tr>

                {/* Net Loss / Profit */}
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">Net Loss</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">{loss ? loss.toFixed(2) : ''}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">{t[language].netProfit}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">{profit ? profit.toFixed(2) : ''}</td>
                </tr>

                {/* Totals */}
                <tr className="bg-indigo-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t[language].total}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{(totals.l + profit + obCredit).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t[language].total}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{(totals.a + loss + obDebit).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
