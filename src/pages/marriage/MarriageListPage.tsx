import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { PrintButton } from '@/components/ui/print-button';

interface MarriageItem {
  id: number;
  register_no: string | null;
  date: string | null;
  time: string | null;
  event: string | null;
  groom_name: string | null;
  bride_name: string | null;
  address: string | null;
  village: string | null;
  guardian_name: string | null;
  witness_one: string | null;
  witness_two: string | null;
  remarks: string | null;
  amount?: number | null;
}

export default function MarriageListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<MarriageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  // Column keys and labels
  type ColKey =
    | '#'
    | 'register_no'
    | 'date_time'
    | 'groom_name'
    | 'bride_name'
    | 'village'
    | 'event'
    | 'remarks'
    | 'amount'
    | 'print';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: '#', label: '#' },
    { key: 'register_no', label: t('Reg No', 'பதிவு எண்') },
    { key: 'date_time', label: t('Date', 'தேதி') },
    { key: 'groom_name', label: t('Groom', 'வரன்') },
    { key: 'bride_name', label: t('Bride', 'மணமகள்') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'event', label: t('Event', 'நிகழ்வு') },
    { key: 'remarks', label: t('Remarks', 'குறிப்புகள்') },
    { key: 'amount', label: t('Amount', 'தொகை'), align: 'right' },
    { key: 'print', label: t('Print', 'அச்சிட'), align: 'center' },
  ];

  const STORAGE_KEY = 'marriage_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true,
    register_no: true,
    date_time: true,
    groom_name: true,
    bride_name: true,
    village: true,
    event: true,
    remarks: true,
    amount: true,
    print: true,
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

  // Context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const totalAmount = useMemo(() => {
    return items.reduce(
      (sum, r) =>
        sum + (typeof r.amount === 'number' ? r.amount : r.amount ? parseInt(String(r.amount), 10) || 0 : 0),
      0
    );
  }, [items]);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Handle search on Enter key press
  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      load();
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`/api/marriages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success) setItems(data.data);
      else setItems([]);
    } catch (e) {
      console.error('Failed loading marriages:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onExport = async () => {
    try {
      const res = await fetch('/api/marriages/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'marriages.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const onPrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('Marriage Register List', 'திருமண பதிவு பட்டியல்')}</h1>
      </div>

      {/* Filters: single horizontal row with actions (aligned with donation UI) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDownSearch}
              placeholder={t('Search by name/receipt/village/phone', 'பெயர்/ரசீது/கிராமம்/தொலைபேசி எண் மூலம் தேடுக')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <span className="text-gray-600">{t('to', 'வரை')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={load}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Search', 'தேடு')}
            </button>
            <button
              onClick={() => {
                setQ('');
                setFrom('');
                setTo('');
                load();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Clear', 'அழி')}
            </button>
            <button
              onClick={onExport}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Export CSV', 'CSV ஏற்றுமதி')}
            </button>
            <button
              onClick={onPrint}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Export PDF', 'PDF ஏற்றுமதி')}
            </button>
          </div>
        </div>
      </div>

      {/* Table with context menu for columns - styled like donation list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" onContextMenu={onContextMenu}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`${col.key === 'print' ? 'px-3 w-16' : 'px-6'} py-3 text-xs font-medium text-gray-500 uppercase tracking-wider align-middle ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {t('No data', 'தரவு இல்லை')}
                  </td>
                </tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols['#'] && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>}
                    {visibleCols.register_no && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.register_no || '-'}</td>
                    )}
                    {visibleCols.date_time && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.date || '-'} {r.time || ''}</td>
                    )}
                    {visibleCols.groom_name && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.groom_name || '-'}</td>
                    )}
                    {visibleCols.bride_name && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.bride_name || '-'}</td>
                    )}
                    {visibleCols.village && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.village || '-'}</td>
                    )}
                    {visibleCols.event && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.event || '-'}</td>
                    )}
                    {visibleCols.remarks && <td className="px-6 py-4 text-sm text-gray-900">{r.remarks || '-'}</td>}
                    {visibleCols.amount && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {typeof r.amount === 'number' ? r.amount.toLocaleString() : '-'}
                      </td>
                    )}
                    {visibleCols.print && (
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium align-middle w-16">
                        <div className="flex justify-center items-center gap-1">
                          <PrintButton onClick={() => window.print()} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination and summary */}
        <div className="px-6 py-4 flex items-center justify-between border-top border-gray-200 border-t">
          <div className="text-sm text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')} <span className="font-medium">1</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{items.length}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{items.length}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex gap-4 text-sm text-gray-700">
            <span>
              {t('Total records', 'மொத்த பதிவுகள்')}: <span className="font-medium">{items.length}</span>
            </span>
            <span>
              {t('Total amount', 'மொத்த தொகை')}: <span className="font-medium">{totalAmount.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 w-64"
          style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
        >
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <span className="text-xs text-gray-500">
              {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() => setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 p-2 border-t border-gray-200">
            <button
              onClick={() => {
                const allOn: typeof visibleCols = {} as any;
                allColumns.forEach((c) => {
                  (allOn as any)[c.key] = true;
                });
                setVisibleCols(allOn);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </button>
            <button
              onClick={() => {
                const allOff: typeof visibleCols = {} as any;
                allColumns.forEach((c) => {
                  (allOff as any)[c.key] = false;
                });
                setVisibleCols(allOff);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Clear all', 'அனைத்தையும் நீக்கு')}
            </button>
            <button
              onClick={() => {
                setVisibleCols({ ...defaultVisible });
                setMenuOpen(false);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Reset', 'மீட்டமை')}
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-auto"
              type="button"
            >
              {t('Close', 'மூடு')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
