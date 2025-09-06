import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { donationService, DonationItem } from '@/services/donationService';
import { PrintButton } from '@/components/ui/print-button';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
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

export default function DonationProductList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  // Column keys and labels
  type ColKey =
    | '#'
    | 'contact'
    | 'date'
    | 'donor'
    | 'category'
    | 'product'
    | 'qty'
    | 'price'
    | 'description'
    | 'print';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: '#', label: '#' },
    { key: 'contact', label: t('Contact', 'தொடர்பு') },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'donor', label: t('Donor', 'நன்கொடையாளர்') },
    { key: 'category', label: t('Category', 'வகை') },
    { key: 'product', label: t('Product', 'பொருள்') },
    { key: 'qty', label: t('Qty', 'அளவு'), align: 'right' },
    { key: 'price', label: t('Price', 'விலை'), align: 'right' },
    { key: 'description', label: t('Description', 'விளக்கம்') },
    { key: 'print', label: t('Print', 'அச்சிட'), align: 'center' },
  ];

  const STORAGE_KEY = 'donation_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true,
    contact: true,
    date: true,
    donor: true,
    category: true,
    product: true,
    qty: true,
    price: true,
    description: true,
    print: true,
  };

  // Print a donation receipt as PDF for a single item
  const onPrintPdf = (item: DonationItem) => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.text(t('Donation Receipt', 'நன்கொடை ரசீது'), 105, 15, { align: 'center' });

      // Body
      doc.setFontSize(12);
      const left = 20;
      let y = 30;

      const row = (label: string, value?: string | number | null) => {
        const v = value === null || value === undefined || value === '' ? '-' : String(value);
        doc.text(`${label}:`, left, y);
        doc.text(v, left + 50, y);
        y += 8;
      };

      row(t('Receipt No', 'ரசீது எண்'), item.id);
      row(t('Date', 'தேதி'), item.donation_date);
      row(t('Donor', 'நன்கொடையாளர்'), item.donor_name);
      row(t('Contact', 'தொடர்பு'), item.donor_contact);
      row(t('Category', 'வகை'), item.category);
      row(t('Product', 'பொருள்'), item.product_name);
      row(t('Quantity', 'அளவு'), item.quantity);
      row(t('Price', 'விலை'), item.price ? `₹${item.price}` : '-');
      row(t('Description', 'விளக்கம்'), item.description);

      // Footer / Notes
      y += 6;
      doc.setFontSize(10);
      doc.text(
        t('Thank you for your generous contribution!', 'உங்களுடைய பெருந்தன்மைக்கான நன்றி!'),
        105,
        y,
        { align: 'center' }
      );

      // Save
      const filename = `donation-${item.id}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error('PDF generation failed', e);
    }
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
        acc.price += toNum((r as any).price);
        return acc;
      },
      { qty: 0, price: 0 }
    );
  }, [items]);

  // Load donations from the service
  const load = async () => {
    setLoading(true);
    try {
      const params = { q, from, to };
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
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('Good Deed Donation List', 'பொருள் நன்கொடைக் பட்டியல்')}</h1>
      </div>

      {/* Filters: single horizontal row with actions */}
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
              placeholder={t('Search by donor/product/category/phone', 'தானயாளர்/பொருள்/வகை/தொலைபேசி மூலம் தேடுக')}
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
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              type="button"
            >
              {t('Export PDF', 'PDF ஏற்றுமதி')}
            </button>
          </div>
        </div>
      </div>

      {/* Table with context menu for columns */}
      <div
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
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
                  <td
                    colSpan={visibleColCount}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    {t('No data found', 'தரவு கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols['#'] && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                    )}
                    {visibleCols.contact && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.donor_contact || '-'}
                      </td>
                    )}
                    {visibleCols.date && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.donation_date || '-'}
                      </td>
                    )}
                    {visibleCols.donor && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.donor_name || '-'}</td>
                    )}
                    {visibleCols.category && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.category || '-'}</td>
                    )}
                    {visibleCols.product && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.product_name || '-'}</td>
                    )}
                    {visibleCols.qty && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {toNum((r as any).quantity).toLocaleString()}
                      </td>
                    )}
                    {visibleCols.price && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ₹{toNum((r as any).price).toLocaleString()}
                      </td>
                    )}
                    {visibleCols.description && (
                      <td className="px-6 py-4 text-sm text-gray-900">{r.description || '-'}</td>
                    )}
                    {visibleCols.print && (
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium align-middle w-16">
                        <div className="flex justify-center items-center gap-1">
                          <PrintButton onClick={() => onPrint(r)} />

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
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">1</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{items.length}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{items.length}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex gap-4 text-sm text-gray-700">
            <span>
              {t('Total Qty', 'மொத்த அளவு')}: <span className="font-medium">{totals.qty.toLocaleString()}</span>
            </span>
            <span>
              {t('Total Amount', 'மொத்த தொகை')}: <span className="font-medium">₹{totals.price.toLocaleString()}</span>
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
    </div>
  );
}
