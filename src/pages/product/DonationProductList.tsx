import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { donationService, DonationItem } from '@/services/donationService';
import { PrintButton } from '@/components/ui/print-button';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FileDown, Trash2 } from 'lucide-react';
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
import jsPDF from 'jspdf';

interface DonationProductItem {
  id: number;
  name: string | null;
  description: string | null;
  price: number | null;
  category: string | null;
  is_active: boolean;
  created_at: string | null;
}

interface DonationProductLog {
  id: number;
  donation_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  donation_name: string | null;
  receipt_number: string | null;
  details: any;
}

export default function DonationProductList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  
  // Logs state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<DonationProductLog[]>([]);
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<DonationProductLog[]>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const [allLogsPageSize] = useState(50);
  

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Logs functions
  const openLogs = async (item: DonationItem) => {
    setLogsFor(item.id);
    setLogsLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/donations/${item.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        setLogs(result.data || []);
      }
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
    setAllLogsLoading(true);
    await loadAllDonationProductLogs();
  };

  const loadAllDonationProductLogs = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/donations/logs?page=${allLogsPage}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        setAllLogs(result.data || []);
        setAllLogsTotal(result.total || 0);
      }
    } catch (e) {
      console.error('Failed to load all logs:', e);
      setAllLogs([]);
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
    setAllLogsPage(1);
  };

  // Column keys and labels
  type ColKey =
    | '#'
    | 'receipt'
    | 'contact'
    | 'date'
    | 'donor'
    | 'category'
    | 'product'
    | 'qty'
    | 'description'
    | 'print'
    | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: '#', label: '#' },
    { key: 'receipt', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'contact', label: t('Contact', 'தொடர்பு') },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'donor', label: t('Donor', 'நன்கொடையாளர்') },
    { key: 'category', label: t('Category', 'வகை') },
    { key: 'product', label: t('Product', 'பொருள்') },
    { key: 'qty', label: t('Qty', 'அளவு'), align: 'right' },
    { key: 'description', label: t('Description', 'விளக்கம்') },
    { key: 'print', label: t('Print', 'அச்சிட'), align: 'center' },
    { key: 'actions', label: t('Actions', 'நடவடிக்கைகள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'donation_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true,
    receipt: true,
    contact: true,
    date: true,
    donor: true,
    category: true,
    product: true,
    qty: true,
    description: true,
    print: true,
    actions: true,
  };

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ 
    product: string; 
    quantity: number | '';
    description: string;
    category: string;
    donorName: string;
    donorContact: string;
    donationDate: string;
    notes: string;
    status: string;
  }>({
    product: '',
    quantity: '',
    description: '',
    category: 'General',
    donorName: '',
    donorContact: '',
    donationDate: '',
    notes: '',
    status: 'available',
  });

  const openEdit = (item: DonationItem) => {
    setEditItemId(item.id);
    setEditForm({
      product: item.product_name || '',
      quantity: (item as any).quantity ?? '',
      description: item.description || '',
      category: item.category || 'General',
      donorName: item.donor_name || '',
      donorContact: item.donor_contact || '',
      donationDate: (item.donation_date || '').slice(0,10),
      notes: (item as any).notes || '',
      status: (item as any).status || 'available',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editItemId) return;
    try {
      await donationService.updateDonation(token, editItemId, {
        product: editForm.product,
        quantity: editForm.quantity === '' ? (undefined as any) : Number(editForm.quantity),
        description: editForm.description,
        category: editForm.category,
        donorName: editForm.donorName,
        donorContact: editForm.donorContact,
        donationDate: editForm.donationDate,
        notes: editForm.notes,
        status: editForm.status,
      });
      setEditOpen(false);
      setEditItemId(null);
      await load();
    } catch (e) {
      console.error('Update failed', e);
      alert(t('Update failed', 'புதுப்பிப்பு தோல்வியடைந்தது'));
    }
  };

  // Delete confirmation modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const openDelete = (item: DonationItem) => {
    if (!isLastReceipt(item)) {
      alert(t('Only the latest receipt can be deleted.', 'சமீபத்திய ரசீது மட்டுமே நீக்க இயலும்'));
      return;
    }
    setDeleteItemId(item.id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteItemId) return;
    try {
      await donationService.deleteDonation(token, deleteItemId);
      setDeleteOpen(false);
      setDeleteItemId(null);
      await load();
    } catch (e) {
      console.error('Delete failed', e);
      alert(t('Delete failed', 'நீக்கம் தோல்வியடைந்தது'));
    }
  };

  // Quick edit for quantity/description using prompts
  const onEdit = async (item: DonationItem) => {
    try {
      const currentQty = (item as any).quantity ?? '';
      const newQtyStr = window.prompt(t('Enter quantity', 'அளவை உள்ளிடுக'), String(currentQty));
      if (newQtyStr === null) return;
      const newQty = parseInt(newQtyStr, 10);
      const newDesc = window.prompt(t('Enter description', 'விளக்கத்தை உள்ளிடுக'), item.description || '') ?? item.description;
      await donationService.updateDonation(token, item.id, {
        quantity: Number.isFinite(newQty) ? newQty : (item as any).quantity,
        description: newDesc || '',
      });
      await load();
    } catch (e) {
      console.error('Update failed', e);
      alert(t('Update failed', 'புதுப்பிப்பு தோல்வியடைந்தது'));
    }
  };

  // Print a donation receipt via backend PDF (opens in new tab)
  const onPrintPdf = (item: DonationItem) => {
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    const url = `/api/money-donations/${item.id}/receipt.pdf${q}`;
    window.open(url, '_blank');
  };

  // Load visible columns from localStorage or default
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultVisible, ...JSON.parse(raw) };
    } catch {}
    return defaultVisible;
  });

  // Save visible columns to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // Context menu for columns toggling
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

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Helper to parse numeric values safely
  const toNum = (v: any) => {
    if (!v) return 0;
    const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };

  // Calculate totals for quantity and price
  const totals = useMemo(() => {
    return items.reduce(
      (acc, r) => {
        acc.qty += toNum((r as any).quantity);
        return acc;
      },
      { qty: 0 }
    );
  }, [items]);

  // --- Helpers: enforce deletion only for the last receipt by numeric receipt number (descending) ---
  const receiptNum = (s: any) => parseInt(String(s || '').replace(/\D/g, '') || '0', 10);

  const isLastReceipt = (item: DonationItem) => {
    if (!items.length) return false;
    const sorted = [...items].sort((a, b) => receiptNum((b as any).register_no) - receiptNum((a as any).register_no));
    return sorted[0]?.id === item.id;
  };

  // Load donations from the service
  const load = async () => {
    setLoading(true);
    try {
      const params = { q };
      const response = await donationService.getDonations(token, params);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load donations:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger search on Enter key
  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      load();
    }
  };

  // Export donations as CSV
  const onExport = async () => {
    try {
      const blob = await donationService.exportDonations(token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'donations.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  // Print a donation receipt
  const onPrint = (item?: DonationItem) => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="text-align:center; margin-bottom:20px;">
        <img src="/logo.png" alt="Logo" style="height:80px;" />
        <h2 style="margin-top:10px;">${t('Donation Receipt', 'நன்கொடை ரசீது')}</h2>
      </div>
      <div style="margin:20px;">
        ${
          item
            ? `<table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
              'Donor',
              'நன்கொடையாளர்'
            )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.donor_name}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
              'Date',
              'தேதி'
            )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.donation_date}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
              'Product',
              'பொருள்'
            )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.product_name}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
              'Description',
              'விளக்கம்'
            )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.description}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
              'Quantity',
              'அளவு'
            )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.quantity}</td></tr>
          </table>`
            : ''
        }
      </div>
    `;

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow?.document.write(printContent.innerHTML);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  return (
    <div className="p-4 bg-white rounded shadow text-sm">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg font-semibold text-gray-800">{t('Donation List', 'பொருள் நன்கொடைக் பட்டியல்')}</h1>
      </div>

      {/* Filters: single horizontal row with actions */}
      <div className="bg-white rounded border border-gray-200 p-2 mb-4">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDownSearch}
              placeholder={t('Search by donor/product/category/phone', 'தானயாளர்/பொருள்/வகை/தொலைபேசி மூலம் தேடுக')}
              className="block w-full pl-8 pr-2 py-1 border border-gray-300 rounded leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>

          

          {/* Actions */}
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
                load();
              }}
              className="px-3 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Clear', 'அழி')}
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Export CSV', 'CSV ஏற்றுமதி')}
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Export PDF', 'PDF ஏற்றுமதி')}
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

      {/* Table with context menu for columns */}
      <div
        className="bg-white rounded border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`${col.key === 'print' ? 'px-2 w-12' : 'px-3'} py-2 text-xs font-medium text-gray-500 uppercase tracking-wider align-middle ${
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
                  <td
                    colSpan={visibleColCount}
                    className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 text-center"
                  >
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 text-center"
                  >
                    {t('No data found', 'தரவு கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols['#'] && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{idx + 1}</td>
                    )}
                    {visibleCols.receipt && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{(r as any).register_no || '-'}</td>
                    )}
                    {visibleCols.contact && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {r.donor_contact || '-'}
                      </td>
                    )}
                    {visibleCols.date && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {(r.donation_date || '').slice(0,10) || '-'}
                      </td>
                    )}
                    {visibleCols.donor && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{r.donor_name || '-'}</td>
                    )}
                    {visibleCols.category && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{r.category || '-'}</td>
                    )}
                    {visibleCols.product && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{r.product_name || '-'}</td>
                    )}
                    {visibleCols.qty && (
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right">
                        {toNum((r as any).quantity).toLocaleString()}
                      </td>
                    )}
                    
                    {visibleCols.description && (
                      <td className="px-3 py-2 text-xs text-gray-900">{r.description || '-'}</td>
                    )}
                    {visibleCols.print && (
                      <td className="px-2 py-2 whitespace-nowrap text-center text-xs font-medium align-middle w-12">
                        <div className="flex justify-center items-center gap-1">
                          <PrintButton onClick={() => onPrint(r)} />
                        </div>
                      </td>
                    )}
                    {visibleCols.actions && (
                      <td className="px-2 py-2 whitespace-nowrap text-center text-xs font-medium align-middle">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="text-blue-600 hover:underline"
                          >
                            {t('Edit', 'திருத்த')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openLogs(r)}
                            className="text-green-600 hover:underline"
                          >
                            {t('Logs', 'பதிவுகள்')}
                          </button>
                          {(() => {
                            const canDelete = isLastReceipt(r);
                            const title = canDelete
                              ? undefined
                              : t('Only the latest receipt can be deleted', 'சமீபத்திய ரசீது மட்டுமே நீக்க இயலும்');
                            return (
                              <button
                                type="button"
                                onClick={() => openDelete(r)}
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

        {/* Pagination and summary */}
        <div className="px-3 py-2 flex items-center justify-between border-t border-gray-200">
          <div className="text-xs text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">1</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{items.length}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{items.length}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex gap-2 text-xs text-gray-700">
            <span>
              {t('Total Qty', 'மொத்த அளவு')}: <span className="font-medium">{totals.qty.toLocaleString()}</span>
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
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer select-none"
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
              {t('Clear all', 'அனைத்தையும் அழி')}
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

      {/* Edit Modal */}
      {editOpen && (
        <Modal title={t('Edit Donation', 'நன்கொடையை திருத்துக')} onClose={() => setEditOpen(false)}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('Product','பொருள்')}</label>
              <input
                className="w-full border px-2 py-1 rounded"
                value={editForm.product}
                onChange={(e)=>setEditForm(prev=>({...prev, product: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Quantity','அளவு')}</label>
              <input
                className="w-full border px-2 py-1 rounded"
                value={editForm.quantity}
                onChange={(e)=>{
                  const v = e.target.value;
                  if (v === '') return setEditForm(prev=>({...prev, quantity: ''}));
                  const n = parseInt(v,10);
                  if (!isNaN(n)) setEditForm(prev=>({...prev, quantity: n}));
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Date','தேதி')}</label>
              <input
                type="date"
                className="w-full border px-2 py-1 rounded"
                value={editForm.donationDate}
                onChange={(e)=>setEditForm(prev=>({...prev, donationDate: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Category','வகை')}</label>
              <input
                className="w-full border px-2 py-1 rounded"
                value={editForm.category}
                onChange={(e)=>setEditForm(prev=>({...prev, category: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Status','நிலை')}</label>
              <select
                className="w-full border px-2 py-1 rounded"
                value={editForm.status}
                onChange={(e)=>setEditForm(prev=>({...prev, status: e.target.value}))}
              >
                <option value="available">{t('Available','கிடைக்கும்')}</option>
                <option value="reserved">{t('Reserved','ஒதுக்கப்பட்டது')}</option>
                <option value="distributed">{t('Distributed','விநியோகிக்கப்பட்டது')}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('Donor','நன்கொடையாளர்')}</label>
              <input
                className="w-full border px-2 py-1 rounded"
                value={editForm.donorName}
                onChange={(e)=>setEditForm(prev=>({...prev, donorName: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Contact','தொடர்பு')}</label>
              <input
                className="w-full border px-2 py-1 rounded"
                value={editForm.donorContact}
                onChange={(e)=>setEditForm(prev=>({...prev, donorContact: e.target.value}))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('Description','விளக்கம்')}</label>
              <textarea
                className="w-full border px-2 py-1 rounded"
                rows={2}
                value={editForm.description}
                onChange={(e)=>setEditForm(prev=>({...prev, description: e.target.value}))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('Notes','குறிப்புகள்')}</label>
              <textarea
                className="w-full border px-2 py-1 rounded"
                rows={2}
                value={editForm.notes}
                onChange={(e)=>setEditForm(prev=>({...prev, notes: e.target.value}))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={()=>setEditOpen(false)} className="px-3 py-1 border rounded text-xs">{t('Cancel','ரத்து செய்')}</button>
            <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">{t('Save','சேமி')}</button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal (AlertDialog) */}
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

      {/* All Donation Product Logs Modal */}
      {allLogsOpen && (
        <Modal title={t('All Donation Product Logs', 'அனைத்து பொருள் நன்கொடை பதிவுகள்')} onClose={closeAllLogs}>
          <div className="max-h-96 overflow-y-auto">
            {allLogsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading logs...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('Action', 'செயல்')}</th>
                      <th className="text-left p-2">{t('Donation', 'நன்கொடை')}</th>
                      <th className="text-left p-2">{t('Receipt', 'ரசீது')}</th>
                      <th className="text-left p-2">{t('Date', 'தேதி')}</th>
                      <th className="text-left p-2">{t('Details', 'விவரங்கள்')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLogs.length > 0 ? (
                      allLogs.map((log) => (
                        <tr key={log.id} className="border-b">
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.action === 'create' ? 'bg-green-100 text-green-800' :
                              log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'delete' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                               log.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                               log.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                               log.action}
                            </span>
                          </td>
                          <td className="p-2">{log.donation_name || '-'}</td>
                          <td className="p-2">{log.receipt_number || '-'}</td>
                          <td className="p-2">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="text-xs text-muted-foreground">
                              {log.details ? (
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="h-24 text-center text-muted-foreground">
                          {t('No logs found', 'பதிவுகள் எதுவும் கிடைக்கவில்லை')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {allLogsTotal > allLogsPageSize && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {t('Showing', 'காட்டப்படுகிறது')} {((allLogsPage - 1) * allLogsPageSize) + 1} - {Math.min(allLogsPage * allLogsPageSize, allLogsTotal)} {t('of', 'மொத்தம்')} {allLogsTotal}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAllLogsPage(prev => Math.max(1, prev - 1));
                    loadAllDonationProductLogs();
                  }}
                  disabled={allLogsPage <= 1}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                >
                  {t('Previous', 'முந்தைய')}
                </button>
                <button
                  onClick={() => {
                    setAllLogsPage(prev => prev + 1);
                    loadAllDonationProductLogs();
                  }}
                  disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                >
                  {t('Next', 'அடுத்து')}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Donation Product Logs Modal */}
      {logsFor && (
        <Modal title={t('Donation Product Logs', 'பொருள் நன்கொடை பதிவுகள்')} onClose={closeLogs}>
          <div className="max-h-96 overflow-y-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading logs...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('Action', 'செயல்')}</th>
                      <th className="text-left p-2">{t('Date', 'தேதி')}</th>
                      <th className="text-left p-2">{t('Details', 'விவரங்கள்')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b">
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.action === 'create' ? 'bg-green-100 text-green-800' :
                              log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'delete' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                               log.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                               log.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                               log.action}
                            </span>
                          </td>
                          <td className="p-2">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="text-xs text-muted-foreground">
                              {log.details ? (
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="h-24 text-center text-muted-foreground">
                          {t('No logs found', 'பதிவுகள் எதுவும் கிடைக்கவில்லை')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
