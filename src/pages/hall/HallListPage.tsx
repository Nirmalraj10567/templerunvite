import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { PrintButton } from '@/components/ui/print-button';

interface HallBooking {
  id: number;
  register_no: string | null;
  date: string | null;
  time: string | null;
  event: string | null;
  subdivision: string | null;
  name: string | null;
  address: string | null;
  village: string | null;
  mobile: string | null;
  advance_amount: string | null;
  total_amount: string | null;
  balance_amount: string | null;
  remarks: string | null;
}

export default function HallListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<HallBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  type ColKey =
    | 'register_no'
    | 'date'
    | 'time'
    | 'event'
    | 'subdivision'
    | 'name'
    | 'address'
    | 'village'
    | 'mobile'
    | 'advance_amount'
    | 'total_amount'
    | 'balance_amount'
    | 'remarks';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' }> = [
    { key: 'register_no', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'time', label: t('Time', 'நேரம்') },
    { key: 'event', label: t('Function', 'நிகழ்வு') },
    { key: 'subdivision', label: t('Subdivision', 'துணை பிரிவு') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'address', label: t('Address', 'முகவரி') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'mobile', label: t('Phone', 'தொலைபேசி') },
    { key: 'advance_amount', label: t('Advance', 'முன்பணம்'), align: 'right' },
    { key: 'total_amount', label: t('Total', 'மொத்தம்'), align: 'right' },
    { key: 'balance_amount', label: t('Balance', 'இருப்பு'), align: 'right' },
    { key: 'remarks', label: t('Remarks', 'குறிப்புகள்') },
  ];

  const STORAGE_KEY = 'hall_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    register_no: true,
    date: true,
    time: true,
    event: true,
    subdivision: false,
    name: true,
    address: false,
    village: true,
    mobile: true,
    advance_amount: true,
    total_amount: true,
    balance_amount: true,
    remarks: false,
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultVisible, ...JSON.parse(raw) };
    } catch {}
    return defaultVisible;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // Totals
  const toNum = (v: string | null | undefined) => {
    if (!v) return 0;
    const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += toNum(r.total_amount);
        acc.advance += toNum(r.advance_amount);
        acc.balance += toNum(r.balance_amount);
        return acc;
      },
      { total: 0, advance: 0, balance: 0 }
    );
  }, [rows]);

  const fetchData = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const url = '/api/hall-bookings' + (params.toString() ? `?${params.toString()}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRows(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  };

  const handleExportCSV = async () => {
    try {
      const qs = buildQueryString();
      const url = '/api/hall-bookings/export' + (qs ? `?${qs}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'hall_bookings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const qs = buildQueryString();
      const url = '/api/hall-bookings/export-pdf' + (qs ? `?${qs}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to export PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'hall_bookings.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError('Failed to export PDF');
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white p-3 rounded shadow text-xs">
      <h1 className="text-base font-semibold mb-2">{t('Marriage Hall Bookings', 'திருமண மண்டப பதிவுகள்')}</h1>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
        <input
          className="border px-2 py-1 rounded text-xs"
          placeholder={t('Search by name/receipt/village/phone', 'பெயர்/ரசீது/கிராமம்/தொலைபேசி மூலம் தேடுக')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input type="date" className="border px-2 py-1 rounded text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="border px-2 py-1 rounded text-xs" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="border px-2 py-1 rounded" onClick={fetchData}>{t('Search', 'தேடுக')}</button>
        <button className="border px-2 py-1 rounded" onClick={() => { setQ(''); setFrom(''); setTo(''); }}>{t('Clear', 'அழி')}</button>
        <div className="flex gap-1">
          <button className="border px-2 py-1 rounded flex-1" onClick={handleExportCSV}>{t('CSV', 'CSV')}</button>
          <button className="border px-2 py-1 rounded flex-1" onClick={handleExportPDF}>{t('PDF', 'PDF')}</button>
        </div>
      </div>

      {loading && <div>{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="text-red-600">{error}</div>}

      {/* Grid layout */}
      <div className="grid border border-gray-300">
        {/* Header */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] bg-gray-100 text-gray-700 font-medium">
          {allColumns.map(c => visibleCols[c.key] && (
            <div key={c.key} className={`px-2 py-1 border-b border-r ${c.align === 'right' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
              {c.label}
            </div>
          ))}
          <div className="px-2 py-1 border-b text-right">{t('Actions', 'செயல்கள்')}</div>
        </div>

        {/* Rows */}
        {rows.map((r, idx) => (
          <div key={r.id} className={`grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            {visibleCols.register_no && (<div className="px-2 py-1 border-b truncate">{r.register_no || ''}</div>)}
            {visibleCols.date && (<div className="px-2 py-1 border-b truncate">{r.date || ''}</div>)}
            {visibleCols.time && (<div className="px-2 py-1 border-b truncate">{r.time || ''}</div>)}
            {visibleCols.event && (<div className="px-2 py-1 border-b truncate">{r.event || ''}</div>)}
            {visibleCols.subdivision && (<div className="px-2 py-1 border-b truncate">{r.subdivision || ''}</div>)}
            {visibleCols.name && (<div className="px-2 py-1 border-b truncate">{r.name || ''}</div>)}
            {visibleCols.address && (<div className="px-2 py-1 border-b truncate">{r.address || ''}</div>)}
            {visibleCols.village && (<div className="px-2 py-1 border-b truncate">{r.village || ''}</div>)}
            {visibleCols.mobile && (<div className="px-2 py-1 border-b truncate">{r.mobile || ''}</div>)}
            {visibleCols.advance_amount && (<div className="px-2 py-1 border-b text-right">{toNum(r.advance_amount).toLocaleString()}</div>)}
            {visibleCols.total_amount && (<div className="px-2 py-1 border-b text-right">{toNum(r.total_amount).toLocaleString()}</div>)}
            {visibleCols.balance_amount && (<div className="px-2 py-1 border-b text-right">{toNum(r.balance_amount).toLocaleString()}</div>)}
            {visibleCols.remarks && (<div className="px-2 py-1 border-b truncate">{r.remarks || ''}</div>)}
            <div className="px-2 py-1 border-b text-right">
              <PrintButton onClick={() => {}} title={t('Print', 'அச்சிடு')} />
            </div>
          </div>
        ))}

        {!rows.length && !loading && (
          <div className="col-span-full text-center px-2 py-2">{t('No records', 'பதிவுகள் இல்லை')}</div>
        )}
      </div>

      {/* Totals */}
      <div className="mt-2 flex justify-between text-xs text-gray-600">
        <div>{t('Total records', 'மொத்த பதிவுகள்')}: {rows.length}</div>
        <div className="flex gap-3">
          <span>{t('Advance', 'முன்பணம்')}: {totals.advance.toLocaleString()}</span>
          <span>{t('Total', 'மொத்தம்')}: {totals.total.toLocaleString()}</span>
          <span>{t('Balance', 'இருப்பு')}: {totals.balance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
