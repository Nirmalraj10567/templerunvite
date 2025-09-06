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

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  // Column visibility with persistence
  type ColKey = 'register_no' | 'date' | 'time' | 'event' | 'subdivision' | 'name' | 'address' | 'village' | 'mobile' | 'advance_amount' | 'total_amount' | 'balance_amount' | 'remarks';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left'|'right' }> = [
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols)); } catch {}
  }, [visibleCols]);

  // Context menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{x:number;y:number}>({x:0,y:0});
  const menuRef = useRef<HTMLDivElement|null>(null);
  const onContextMenu = (e: React.MouseEvent) => { e.preventDefault(); setMenuPos({x:e.clientX,y:e.clientY}); setMenuOpen(true); };
  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(ev.target as Node)) setMenuOpen(false); };
    const onEsc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onEsc); };
  }, []);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Totals
  const toNum = (v: string | null | undefined) => {
    if (!v) return 0;
    const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };
  const totals = useMemo(() => {
    return rows.reduce((acc, r) => {
      acc.total += toNum(r.total_amount);
      acc.advance += toNum(r.advance_amount);
      acc.balance += toNum(r.balance_amount);
      return acc;
    }, { total: 0, advance: 0, balance: 0 });
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

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, []);

  // Trigger search on Enter key for inputs
  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchData();
    }
  };

  const onExport = async () => {
    try {
      const res = await fetch('/api/hall-bookings/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hall_bookings.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {}
  };

  const onExportPdfAll = async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const url = '/api/hall-bookings/export-pdf' + (params.toString() ? `?${params.toString()}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'hall_bookings.pdf';
      a.click();
      window.URL.revokeObjectURL(href);
    } catch {}
  };

  const onExportPdfOne = async (id: number) => {
    try {
      const res = await fetch(`/api/hall-bookings/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `hall_booking_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(href);
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{t('Marriage Hall Bookings', 'திருமண மண்டப பதிவுகள்')}</h1>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <input
          className="border p-2 rounded flex-1"
          placeholder={t('Search by name/receipt/village/phone', 'பெயர்/ரசீது/கிராமம்/தொலைபேசி மூலம் தேடுக')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDownSearch}
          aria-label={t('Search', 'தேடுக')}
          title={t('Search', 'தேடுக')}
        />
        <input
          type="date"
          className="border p-2 rounded"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onKeyDown={onKeyDownSearch}
          aria-label={t('From date', 'தொடக்க தேதி')}
          title={t('From date', 'தொடக்க தேதி')}
        />
        <span className="text-gray-600">{t('to', 'முதல்')}</span>
        <input
          type="date"
          className="border p-2 rounded"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onKeyDown={onKeyDownSearch}
          aria-label={t('To date', 'முடிவு தேதி')}
          title={t('To date', 'முடிவு தேதி')}
        />
        <button className="border px-3 py-2 rounded" onClick={fetchData}>{t('Search', 'தேடுக')}</button>
        <button className="border px-3 py-2 rounded" onClick={() => { setQ(''); setFrom(''); setTo(''); }}>{t('Clear', 'அழி')}</button>
        <button className="border px-3 py-2 rounded" onClick={onExport}>{t('Export CSV', 'CSV ஏற்று')}</button>
        <button className="border px-3 py-2 rounded" onClick={onExportPdfAll}>{t('Export PDF', 'PDF ஏற்று')}</button>

      </div>

      {loading && <div className="text-sm">{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-auto" onContextMenu={onContextMenu}>
        <table className="min-w-full border text-sm">
          <thead onContextMenu={onContextMenu}>
            <tr className="bg-gray-50">
              {allColumns.map(c => visibleCols[c.key] && (
                <th key={c.key} className={`p-2 border-b text-gray-500 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
              ))}
              <th key="_actions" className="p-2 border-b text-gray-500 text-right">{t('Actions', 'செயல்கள்')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                {visibleCols.register_no && (<td className="p-2 border-b text-left">{r.register_no || ''}</td>)}
                {visibleCols.date && (<td className="p-2 border-b text-left">{r.date || ''}</td>)}
                {visibleCols.time && (<td className="p-2 border-b text-left">{r.time || ''}</td>)}
                {visibleCols.event && (<td className="p-2 border-b text-left">{r.event || ''}</td>)}
                {visibleCols.subdivision && (<td className="p-2 border-b text-left">{r.subdivision || ''}</td>)}
                {visibleCols.name && (<td className="p-2 border-b text-left">{r.name || ''}</td>)}
                {visibleCols.address && (<td className="p-2 border-b text-left">{r.address || ''}</td>)}
                {visibleCols.village && (<td className="p-2 border-b text-left">{r.village || ''}</td>)}
                {visibleCols.mobile && (<td className="p-2 border-b text-left">{r.mobile || ''}</td>)}
                {visibleCols.advance_amount && (<td className="p-2 border-b text-right">{toNum(r.advance_amount).toLocaleString()}</td>)}
                {visibleCols.total_amount && (<td className="p-2 border-b text-right">{toNum(r.total_amount).toLocaleString()}</td>)}
                {visibleCols.balance_amount && (<td className="p-2 border-b text-right">{toNum(r.balance_amount).toLocaleString()}</td>)}
                {visibleCols.remarks && (<td className="p-2 border-b text-left">{r.remarks || ''}</td>)}
                {/* Actions column (always visible) */}
                <td className="p-2 border-b text-right whitespace-nowrap">
                  <PrintButton onClick={() => onExportPdfOne(r.id)} title={t('Export PDF', 'PDF ஏற்று')} />
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td className="p-2" colSpan={visibleColCount + 1}>{t('No records', 'பதிவுகள் இல்லை')}</td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Context Menu */}
        {menuOpen && (
          <div ref={menuRef} className="fixed z-50 bg-white border rounded shadow text-sm" style={{ left: menuPos.x + 2, top: menuPos.y + 2, minWidth: 240 }}>
            <div className="px-3 py-2 font-medium bg-gray-50 border-b flex items-center justify-between">
              <span>{t('Columns', 'நெடுவரிசைகள்')}</span>
              <span className="text-xs text-gray-500">{Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}</span>
            </div>
            <div className="max-h-64 overflow-auto">
              {allColumns.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={!!visibleCols[col.key]} onChange={() => setVisibleCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))} />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 px-3 py-2 border-t flex-wrap">
              <button className="px-2 py-1 text-xs rounded border" onClick={() => { const m:any = {}; allColumns.forEach(c => m[c.key] = true); setVisibleCols(m); }}>{t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}</button>
              <button className="px-2 py-1 text-xs rounded border" onClick={() => { const m:any = {}; allColumns.forEach(c => m[c.key] = false); setVisibleCols(m); }}>{t('Unselect all', 'அனைத்தையும் நீக்கு')}</button>
              <button className="px-2 py-1 text-xs rounded border" onClick={() => { setVisibleCols({ ...defaultVisible }); setMenuOpen(false); }}>{t('Reset', 'மீட்டமை')}</button>
              <button className="px-2 py-1 text-xs rounded border" onClick={() => setMenuOpen(false)}>{t('Close', 'மூடு')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer totals */}
      <div className="mt-3 text-sm text-gray-700 flex items-center justify-between">
        <div>{t('Total records', 'மொத்த பதிவுகள்')}: {rows.length}</div>
        <div className="flex gap-4">
          <span>{t('Advance', 'முன்பணம்')}: {totals.advance.toLocaleString()}</span>
          <span>{t('Total', 'மொத்தம்')}: {totals.total.toLocaleString()}</span>
          <span>{t('Balance', 'இருப்பு')}: {totals.balance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
