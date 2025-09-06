import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationItem } from '@/services/moneyDonationService';

export default function MoneyDonationList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<MoneyDonationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  type ColKey = '#' | 'date' | 'name' | 'phone' | 'amount' | 'reason';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left'|'right'|'center' }> = [
    { key: '#', label: '#' },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'phone', label: t('Phone', 'கைபேசி') },
    { key: 'amount', label: t('Amount', 'தொகை'), align: 'right' },
    { key: 'reason', label: t('Reason', 'காரணம்') },
  ];

  const STORAGE_KEY = 'money_donation_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true, date: true, name: true, phone: true, amount: true, reason: true
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultVisible, ...JSON.parse(raw) };
    } catch {}
    return defaultVisible;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols)); } catch {}
  }, [visibleCols]);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  const toNum = (v: any) => {
    if (v == null) return 0;
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const totals = useMemo(() => {
    return items.reduce((acc, r) => { acc += toNum(r.amount); return acc; }, 0);
  }, [items]);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await moneyDonationService.list(token);
      let data = resp.data;
      // simple client-side filter
      if (q) {
        const s = q.toLowerCase();
        data = data.filter(r =>
          (r.name||'').toLowerCase().includes(s) ||
          (r.phone||'').toLowerCase().includes(s) ||
          (r.reason||'').toLowerCase().includes(s)
        );
      }
      if (from) data = data.filter(r => r.date >= from);
      if (to) data = data.filter(r => r.date <= to);
      setItems(data);
    } catch (e) {
      console.error('Failed to load money donations', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('Money Donation List', 'பண நன்கொடைக் பட்டியல்')}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            </div>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              placeholder={t('Search by name/phone/reason', 'பெயர்/தொலைபேசி/காரணம் மூலம் தேடுக')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            <span className="text-gray-600">{t('to', 'வரை')}</span>
            <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button onClick={load} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50" type="button">{t('Search', 'தேடு')}</button>
            <button onClick={()=>{ setQ(''); setFrom(''); setTo(''); load(); }} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50" type="button">{t('Clear', 'அழி')}</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allColumns.map(col => visibleCols[col.key] && (
                  <th key={col.key} className={`${col.align==='right'?'text-right':col.align==='center'?'text-center':'text-left'} px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider`}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={visibleColCount} className="px-6 py-4 text-sm text-gray-500 text-center">{t('Loading...', 'ஏற்றுகிறது...')}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={visibleColCount} className="px-6 py-4 text-sm text-gray-500 text-center">{t('No data found', 'தரவு கிடைக்கவில்லை')}</td></tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols['#'] && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{idx+1}</td>)}
                    {visibleCols['date'] && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.date || '-'}</td>)}
                    {visibleCols['name'] && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.name || '-'}</td>)}
                    {visibleCols['phone'] && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.phone || '-'}</td>)}
                    {visibleCols['amount'] && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{toNum(r.amount).toLocaleString()}</td>)}
                    {visibleCols['reason'] && (<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.reason || '-'}</td>)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')} <span className="font-medium">1</span> {t('to', 'இலிருந்து')} <span className="font-medium">{items.length}</span> {t('of', 'மொத்தம்')} <span className="font-medium">{items.length}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex gap-4 text-sm text-gray-700">
            <span>{t('Total Amount', 'மொத்த தொகை')}: <span className="font-medium">₹{totals.toLocaleString()}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
