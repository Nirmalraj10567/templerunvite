import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationItem } from '@/services/moneyDonationService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

export default function MoneyDonationList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<MoneyDonationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  type ColKey = '#' | 'receipt' | 'date' | 'name' | 'phone' | 'amount' | 'reason' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: '#', label: '#' },
    { key: 'receipt', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'phone', label: t('Phone', 'கைபேசி') },
    { key: 'amount', label: t('Amount', 'தொகை'), align: 'right' },
    { key: 'reason', label: t('Reason', 'காரணம்') },
    { key: 'actions', label: t('Actions', 'நடவடிக்கைகள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'money_donation_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true,
    receipt: true,
    date: true,
    name: true,
    phone: true,
    amount: true,
    reason: true,
    actions: true,
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

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  const toNum = (v: any) => {
    if (v == null) return 0;
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const totals = useMemo(() => {
    return items.reduce((acc, r) => {
      acc += toNum(r.amount);
      return acc;
    }, 0);
  }, [items]);

  // Latest-only delete helpers: determine latest by numeric register_no if present, else by id
  const receiptNum = (s: any) => parseInt(String(s || '').replace(/\D/g, '') || '0', 10);
  const latestDonationId = useMemo(() => {
    if (!items.length) return null as number | null;
    const withReg = items.filter((it: any) => it && (it as any).register_no);
    if (withReg.length) {
      const sorted = [...withReg].sort((a: any, b: any) => receiptNum((b as any).register_no) - receiptNum((a as any).register_no));
      return sorted[0]?.id ?? null;
    }
    // Fallback: highest id as latest
    return items.slice().sort((a, b) => (b.id || 0) - (a.id || 0))[0]?.id ?? null;
  }, [items]);
  const isLatest = (row: MoneyDonationItem) => latestDonationId != null && row.id === latestDonationId;

  // Logs modal state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; action: string; created_at: string; created_by: number | null; details: any }>>([]);

  // All Logs (temple scoped) state
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<Array<{
    id: number;
    donation_id: number;
    action: string;
    created_at: string;
    created_by: number | null;
    donation_name: string | null;
    register_no: string | null;
    details: any;
  }>>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const allLogsPageSize = 50;

  const openLogs = async (donationId: number) => {
    setLogsFor(donationId);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`https://tmsapi.xesstechlink.com/api/money-donations/${donationId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const result = await res.json();
      setLogs(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.error('Failed to load logs:', e);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogs = () => {
    setLogsFor(null);
    setLogs([]);
  };

  const openAllLogs = async () => {
    setAllLogsOpen(true);
    await loadAllDonationLogs(1);
  };

  const loadAllDonationLogs = async (pageNum: number) => {
    setAllLogsLoading(true);
    try {
      const res = await fetch(`https://tmsapi.xesstechlink.com/api/money-donations/logs?page=${pageNum}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const result = await res.json();
      if (result.success) {
        setAllLogs(Array.isArray(result.data) ? result.data : []);
        setAllLogsTotal(Number(result.total || 0));
        setAllLogsPage(pageNum);
      } else {
        throw new Error(result.error || 'Failed to load logs');
      }
    } catch (e) {
      console.error('Failed to load all logs:', e);
      setAllLogs([]);
      setAllLogsTotal(0);
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
  };

  const load = async () => {
    setLoading(true);
    try {
      const resp = await moneyDonationService.list(token);
      let data = resp.data;
      if (q) {
        const s = q.toLowerCase();
        data = data.filter(
          (r) =>
            (r.name || '').toLowerCase().includes(s) ||
            (r.phone || '').toLowerCase().includes(s) ||
            (r.reason || '').toLowerCase().includes(s)
        );
      }
      if (from) data = data.filter((r) => r.date >= from);
      if (to) data = data.filter((r) => r.date <= to);
      // Sort by receipt number descending if available; fallback to id desc
      const getNum = (v: any) => parseInt(String((v || '').toString()).replace(/\D/g, '') || '0', 10);
      data = data.slice().sort((a: any, b: any) => {
        const nb = getNum((b as any).register_no);
        const na = getNum((a as any).register_no);
        if (nb !== na) return nb - na;
        return (b.id || 0) - (a.id || 0);
      });
      setItems(data);
    } catch (e) {
      console.error('Failed to load money donations', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      load();
    }
  };

  const onEdit = (row: MoneyDonationItem) => {
    // Navigate to entry page with query param; entry page may be enhanced to support editing later
    navigate(`/dashboard/donations/money-entry?editId=${row.id}`);
  };

  // Delete confirmation modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<MoneyDonationItem | null>(null);

  const askDelete = (row: MoneyDonationItem) => {
    if (!isLatest(row)) {
      alert(t('Only the latest receipt can be deleted', 'கடைசி ரசீதை மட்டுமே நீக்க முடியும்'));
    } else {
      setDeleteRow(row);
      setDeleteOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      await moneyDonationService.delete(token, deleteRow.id);
      setItems(prev => prev.filter(it => it.id !== deleteRow.id));
    } catch (e) {
      console.error('Failed to delete donation', e);
      // Optional: use toast if available; fallback alert
      alert(t('Delete failed', 'நீக்கம் தோல்வியுற்றது'));
    } finally {
      setDeleteOpen(false);
      setDeleteRow(null);
    }
  };

  // Context menu
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

  return (
    <div className="p-4 bg-white rounded shadow text-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg font-semibold text-gray-800">{t('Money Donation List', 'பண நன்கொடைக் பட்டியல்')}</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded border border-gray-200 p-2 mb-4">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDownSearch}
              placeholder={t('Search by name/phone/reason', 'பெயர்/தொலைபேசி/காரணம் மூலம் தேடுக')}
              className="block w-full pl-8 pr-2 py-1 border border-gray-300 rounded leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 w-full md:w-auto">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
            <span className="text-gray-600 text-xs">{t('to', 'வரை')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1 w-full md:w-auto">
            <button
              onClick={load}
              className="px-3 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="px-3 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Clear', 'அழி')}
            </button>
            <button
              onClick={openAllLogs}
              className="px-3 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('All Logs', 'அனைத்து பதிவுகள்')}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden" onContextMenu={onContextMenu}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`${col.key === 'actions' ? 'px-2 w-16' : 'px-3'} py-2 text-xs font-medium text-gray-500 uppercase tracking-wider align-middle ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
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
                  <td colSpan={visibleColCount} className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 text-center">
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 text-center">
                    {t('No data found', 'தரவு கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols['#'] && <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{idx + 1}</td>}
                    {visibleCols['receipt'] && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{(r as any).register_no || '-'}</td>
                    )}
                    {visibleCols['date'] && <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{r.date || '-'}</td>}
                    {visibleCols['name'] && <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{r.name || '-'}</td>}
                    {visibleCols['phone'] && <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{r.phone || '-'}</td>}
                    {visibleCols['amount'] && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right">₹{toNum(r.amount).toLocaleString()}</td>
                    )}
                    {visibleCols['reason'] && <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{r.reason || '-'}</td>}
                    {visibleCols['actions'] && (
                      <td className="px-2 py-2 whitespace-nowrap text-center text-xs font-medium align-middle">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = moneyDonationService.receiptUrl(r.id, token);
                              window.open(url, '_blank');
                            }}
                            className="px-2 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title={t('Print Receipt', 'ரசீது அச்சிடுக')}
                          >
                            {t('Print', 'அச்சிடு')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openLogs(r.id)}
                            className="px-2 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title={t('Logs', 'பதிவுகள்')}
                          >
                            {t('Logs', 'பதிவுகள்')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(r)}
                            className="px-2 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-blue-700 bg-white hover:bg-gray-50"
                            title={t('Edit', 'திருத்து')}
                          >
                            {t('Edit', 'திருத்து')}
                          </button>
                          {(() => {
                            const canDelete = isLatest(r);
                            const title = canDelete ? t('Delete', 'நீக்கு') : t('Only the latest receipt can be deleted', 'கடைசி ரசீதை மட்டுமே நீக்க முடியும்');
                            return (
                              <button
                                type="button"
                                onClick={() => canDelete ? askDelete(r) : undefined}
                                className={`p-1 rounded ${canDelete ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}
                                title={title}
                                disabled={!canDelete}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="px-3 py-2 flex items-center justify-between border-t border-gray-200">
          <div className="text-xs text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')} <span className="font-medium">1</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{items.length}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{items.length}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex gap-2 text-xs text-gray-700">
            <span>
              {t('Total Amount', 'மொத்த தொகை')}: <span className="font-medium">₹{totals.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Context menu for column toggle */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 w-64"
          style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {allColumns.map((col) => (
              <label key={col.key} className="flex items-center px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer select-none">
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
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
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
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              type="button"
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="ml-auto px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              type="button"
            >
              {t('Close', 'மூடு')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure?', 'நீங்கள் உறுதியாகவா?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone. This will permanently delete the donation record.', 'இந்த செயலை திரும்பப் பெற முடியாது. இது நன்கொடை பதிவை நிரந்தரமாக நீக்கும்.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'ரத்து செய்')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('Delete', 'நீக்கு')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* All Logs Modal */}
      {allLogsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeAllLogs} />
          <div className="relative bg-white rounded shadow-lg w-full max-w-5xl mx-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">{t('All Money Donation Logs', 'அனைத்து பண நன்கொடை பதிவுகள்')}</h2>
              <button onClick={closeAllLogs} className="text-xs px-2 py-1 border rounded">{t('Close', 'மூடு')}</button>
            </div>
            {allLogsLoading ? (
              <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</div>
            ) : (
              <>
                <div className="max-h-[70vh] overflow-y-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                        <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                        <th className="text-left px-2 py-1">{t('Donation ID', 'நன்கொடை ஐடி')}</th>
                        <th className="text-left px-2 py-1">{t('Name', 'பெயர்')}</th>
                        <th className="text-left px-2 py-1">{t('Register No', 'பதிவு எண்')}</th>
                        <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                        <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLogs.length === 0 ? (
                        <tr>
                          <td className="px-2 py-2 text-center text-gray-500" colSpan={7}>{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td>
                        </tr>
                      ) : allLogs.map((lg) => (
                        <tr key={lg.id} className="border-t align-top">
                          <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                          <td className="px-2 py-1">{lg.action}</td>
                          <td className="px-2 py-1">{lg.donation_id}</td>
                          <td className="px-2 py-1">{lg.donation_name ?? '-'}</td>
                          <td className="px-2 py-1">{lg.register_no ?? '-'}</td>
                          <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                          <td className="px-2 py-1"><pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">{JSON.stringify(lg.details, null, 2)}</pre></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <div className="text-gray-700">{t('Total', 'மொத்தம்')}: <span className="font-medium">{allLogsTotal}</span></div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 border border-gray-300 rounded shadow-sm text-xs bg-white hover:bg-gray-50"
                      disabled={allLogsPage <= 1}
                      onClick={() => loadAllDonationLogs(allLogsPage - 1)}
                    >
                      {t('Previous', 'முந்தைய')}
                    </button>
                    <span>{t('Page', 'பக்கம்')} {allLogsPage}</span>
                    <button
                      className="px-2 py-1 border border-gray-300 rounded shadow-sm text-xs bg-white hover:bg-gray-50"
                      disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                      onClick={() => loadAllDonationLogs(allLogsPage + 1)}
                    >
                      {t('Next', 'அடுத்தது')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Logs Modal */}
      {logsFor !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeLogs} />
          <div className="relative bg-white rounded shadow-lg w-full max-w-4xl mx-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">{t('Donation Logs', 'நன்கொடை பதிவுகள்')} #{logsFor}</h2>
              <button onClick={closeLogs} className="text-xs px-2 py-1 border rounded">{t('Close', 'மூடு')}</button>
            </div>
            {logsLoading ? (
              <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏறுகிறது...')}</div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                      <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                      <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                      <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={4} className="px-2 py-2 text-center text-gray-500">{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td></tr>
                    ) : logs.map(lg => (
                      <tr key={lg.id} className="border-t align-top">
                        <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                        <td className="px-2 py-1">{lg.action}</td>
                        <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                        <td className="px-2 py-1">
                          <pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">{JSON.stringify(lg.details, null, 2)}</pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
