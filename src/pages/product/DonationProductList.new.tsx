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
import {
  card,
  input,
  button,
  primaryButton,
  dangerButton,
  tableHeader,
  tableCell,
  tableCellCenter,
  tableRowHover,
  modalTitle,
  label,
  contextMenuItem,
  badge,
} from '@/lib/tailwindStyles';

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
      const response = await fetch(
        `http://localhost:4000/api/donations/logs?page=${allLogsPage}&pageSize=${allLogsPageSize}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
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

  // Column definitions
  const allColumns = [
    { key: '#', label: '#', align: 'left' as const },
    { key: 'receipt' as const, label: t('Receipt No', 'ரசீது எண்'), align: 'left' as const },
    { key: 'contact' as const, label: t('Contact', 'தொடர்பு'), align: 'left' as const },
    { key: 'date' as const, label: t('Date', 'தேதி'), align: 'left' as const },
    { key: 'donor' as const, label: t('Donor', 'நன்கொடையாளர்'), align: 'left' as const },
    { key: 'category' as const, label: t('Category', 'வகை'), align: 'left' as const },
    { key: 'product' as const, label: t('Product', 'பொருள்'), align: 'left' as const },
    { key: 'qty' as const, label: t('Qty', 'அளவு'), align: 'right' as const },
    { key: 'description' as const, label: t('Description', 'விளக்கம்'), align: 'left' as const },
    { key: 'print' as const, label: t('Print', 'அச்சிட'), align: 'center' as const },
    { key: 'actions' as const, label: t('Actions', 'நடவடிக்கைகள்'), align: 'center' as const },
  ] as const;

  type ColKey = typeof allColumns[number]['key'];

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

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem('donation_list_visible_columns_v1');
      if (raw) return { ...defaultVisible, ...JSON.parse(raw) };
    } catch {}
    return defaultVisible;
  });

  useEffect(() => {
    try {
      localStorage.setItem('donation_list_visible_columns_v1', JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // ... rest of the component code ...

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800">
          {t('Donation List', 'பொருள் நன்கொடைக் பட்டியல்')}
        </h1>
      </div>

      {/* Filters Card */}
      <div className={card}>
        <div className="flex flex-col md:flex-row gap-2 p-3 items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDownSearch}
              placeholder={t('Search by donor/product/category/phone', 'தானயாளர்/பொருள்/வகை/தொலைபேசி மூலம் தேடுக')}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { label: t('Search', 'தேடு'), onClick: load },
              { label: t('Clear', 'அழி'), onClick: () => { setQ(''); load(); } },
              { label: t('Export CSV', 'CSV ஏற்றுமதி'), onClick: onExport },
              { label: t('Export PDF', 'PDF ஏற்றுமதி'), onClick: () => window.print() },
              { label: t('All Logs', 'அனைத்து பதிவுகள்'), onClick: openAllLogs },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} className={button}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={card} onContextMenu={onContextMenu}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {allColumns.map((col) =>
                  visibleCols[col.key] ? (
                    <th
                      key={col.key}
                      className={`${tableHeader} ${
                        col.key === 'print' ? 'px-2 w-12' : 'px-3'
                      } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {col.label}
                    </th>
                  ) : null
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-3 py-4 text-center text-sm text-gray-500">
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-3 py-4 text-center text-sm text-gray-500">
                    {t('No data found', 'தரவு கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={r.id} className={tableRowHover}>
                    {visibleCols['#'] && <td className={tableCell}>{idx + 1}</td>}
                    {visibleCols.receipt && <td className={tableCell}>{(r as any).register_no || '-'}</td>}
                    {visibleCols.contact && <td className={tableCell}>{r.donor_contact || '-'}</td>}
                    {visibleCols.date && <td className={tableCell}>{(r.donation_date || '').slice(0, 10) || '-'}</td>}
                    {visibleCols.donor && <td className={tableCell}>{r.donor_name || '-'}</td>}
                    {visibleCols.category && <td className={tableCell}>{r.category || '-'}</td>}
                    {visibleCols.product && <td className={tableCell}>{r.product_name || '-'}</td>}
                    {visibleCols.qty && (
                      <td className={`${tableCell} text-right`}>
                        {toNum((r as any).quantity).toLocaleString()}
                      </td>
                    )}
                    {visibleCols.description && <td className={`${tableCell} max-w-xs break-words`}>{r.description || '-'}</td>}
                    {visibleCols.print && (
                      <td className={tableCellCenter}>
                        <PrintButton onClick={() => onPrint(r)} />
                      </td>
                    )}
                    {visibleCols.actions && (
                      <td className={tableCellCenter}>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline text-xs">
                            {t('Edit', 'திருத்த')}
                          </button>
                          <button onClick={() => openLogs(r)} className="text-green-600 hover:underline text-xs">
                            {t('Logs', 'பதிவுகள்')}
                          </button>
                          <button
                            onClick={() => openDelete(r)}
                            disabled={!isLastReceipt(r)}
                            title={!isLastReceipt(r) ? t('Only the latest receipt can be deleted', 'சமீபத்திய ரசீது மட்டுமே நீக்க இயலும்') : undefined}
                            className={`p-1 rounded ${isLastReceipt(r) ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
        <div className="px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-200 text-xs text-gray-600">
          <div>
            {t('Showing', 'காட்டப்படுகிறது')} <span className="font-medium">1</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{items.length}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{items.length}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div>
            {t('Total Qty', 'மொத்த அளவு')}: <span className="font-medium">{totals.qty.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200"
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
              <label key={col.key} className={contextMenuItem}>
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() => setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 p-2 border-t border-gray-200">
            <button
              onClick={() => setVisibleCols(Object.fromEntries(allColumns.map(c => [c.key, true])) as any)}
              className={button}
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </button>
            <button
              onClick={() => setVisibleCols(Object.fromEntries(allColumns.map(c => [c.key, false])) as any)}
              className={button}
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </button>
            <button onClick={() => setMenuOpen(false)} className={`${button} ml-auto`}>
              {t('Close', 'மூடு')}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={t('Edit Donation', 'நன்கொடையை திருத்துக')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="sm:col-span-2">
            <label className={label}>{t('Product', 'பொருள்')}</label>
            <input className={input} value={editForm.product} onChange={(e) => setEditForm(prev => ({ ...prev, product: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t('Quantity', 'அளவு')}</label>
            <input
              className={input}
              value={editForm.quantity}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') return setEditForm(prev => ({ ...prev, quantity: '' }));
                const n = parseInt(v, 10);
                if (!isNaN(n)) setEditForm(prev => ({ ...prev, quantity: n }));
              }}
            />
          </div>
          <div>
            <label className={label}>{t('Date', 'தேதி')}</label>
            <input type="date" className={input} value={editForm.donationDate} onChange={(e) => setEditForm(prev => ({ ...prev, donationDate: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t('Category', 'வகை')}</label>
            <input className={input} value={editForm.category} onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t('Status', 'நிலை')}</label>
            <select className={input} value={editForm.status} onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}>
              <option value="available">{t('Available', 'கிடைக்கும்')}</option>
              <option value="reserved">{t('Reserved', 'ஒதுக்கப்பட்டது')}</option>
              <option value="distributed">{t('Distributed', 'விநியோகிக்கப்பட்டது')}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{t('Donor', 'நன்கொடையாளர்')}</label>
            <input className={input} value={editForm.donorName} onChange={(e) => setEditForm(prev => ({ ...prev, donorName: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t('Contact', 'தொடர்பு')}</label>
            <input className={input} value={editForm.donorContact} onChange={(e) => setEditForm(prev => ({ ...prev, donorContact: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{t('Description', 'விளக்கம்')}</label>
            <textarea className={input} rows={2} value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{t('Notes', 'குறிப்புகள்')}</label>
            <textarea className={input} rows={2} value={editForm.notes} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setEditOpen(false)} className={button}>
            {t('Cancel', 'ரத்து செய்')}
          </button>
          <button onClick={saveEdit} className={primaryButton}>
            {t('Save', 'சேமி')}
          </button>
        </div>
      </Modal>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">{t('Are you sure?', 'நீங்கள் உறுதியாகவா?')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t('This action cannot be undone. This will permanently delete the donation record.', 'இந்த செயலை திரும்பப் பெற முடியாது. இது நன்கொடை பதிவை நிரந்தரமாக நீக்கும்.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={button}>{t('Cancel', 'ரத்து செய்')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={dangerButton}>
              {t('Delete', 'நீக்கு')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
