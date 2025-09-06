"use client";

import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

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

  const [date, setDate] = useState<string>('2025-08-14');

  // Demo rows; replace with backend later
  const liabilities: Row[] = useMemo(() => [
    { id: 1, name: 'Deposit A/c', amount: 0 },
    { id: 2, name: 'Capital A/c', amount: 0 },
    { id: 3, name: t[language].netProfit, amount: 4500 },
    { id: 4, name: t[language].openingDiff, amount: 0 }
  ], [t, language]);
  const assets: Row[] = useMemo(() => [
    { id: 1, name: 'Cash in hand', amount: -378833.33 },
    { id: 2, name: 'Cash A/c', amount: -378833.33 },
    { id: 3, name: 'Loan Amount', amount: 200000 },
    { id: 4, name: 'Hp Amount', amount: 183333.33 },
    { id: 5, name: t[language].openingDiff, amount: 0 }
  ], [t, language]);

  const totals = useMemo(() => {
    const l = liabilities.reduce((s, r) => s + r.amount, 0);
    const a = assets.reduce((s, r) => s + r.amount, 0);
    return { l, a };
  }, [liabilities, assets]);

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-indigo-500 text-lg">📅</span>
          <label className="text-sm font-medium text-gray-700">{t[language].selectDate}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[180px]"
          />
        </div>

        <div className="ml-auto flex gap-3">
          <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm">
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
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">0 {t[language].records}</span>
            <button className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600">▦</button>
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
                {Array.from({ length: Math.max(liabilities.length, assets.length) }).map((_, idx) => {
                  const l = liabilities[idx];
                  const a = assets[idx];
                  return (
                    <tr key={idx} className="border-b">
                      <td className={`px-4 py-3 text-sm ${l?.name === t[language].netProfit ? 'text-green-600 font-medium' : 'text-gray-800'}`}>{l?.name || ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{l ? l.amount.toFixed(2) : ''}</td>
                      <td className={`px-4 py-3 text-sm ${a?.name?.includes('Cash in hand') || a?.name?.includes('Cash A/c') ? 'text-red-600' : 'text-gray-800'}`}>{a?.name || ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a ? a.amount.toFixed(2) : ''}</td>
                    </tr>
                  );
                })}

                {/* Opening diff row duplicates already included above in data */}
                <tr className="bg-indigo-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t[language].total}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{totals.l.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t[language].total}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{totals.a.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
