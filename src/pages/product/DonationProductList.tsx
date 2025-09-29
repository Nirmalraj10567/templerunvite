// src/components/DonationProductList.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { donationProductService } from '@/services/donationProductService';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
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
import { cn, formFieldStyles, pageContainerStyles } from '@/styles/formStyles';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  // User names and details for logs
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, {name: string, username?: string, mobile?: string}>>({});

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Fetch user names/details for given ids (per-id endpoint, resilient)
  const fetchUserNames = async (userIds: number[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter((v): v is number => typeof v === 'number')));
    if (uniqueIds.length === 0) return;
    // Skip ids we already have
    const missing = uniqueIds.filter((id) => !userDetails[id] && !userNames[id]);
    if (missing.length === 0) return;
    console.log('Fetching user profiles for IDs (per-id):', missing);
    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`https://tmsapi.xesstechlink.com/api/admin/members/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.warn('Failed to fetch member by id', id, data);
            return null;
          }
          const u = data?.data?.user || data?.data; // support both shapes
          if (!u) return null;
          const fullName = (u.full_name && String(u.full_name).trim()) || u.username || u.mobile || String(id);
          return { id, name: fullName, username: u.username, mobile: u.mobile } as { id: number; name: string; username?: string; mobile?: string };
        } catch (err) {
          console.warn('Error fetching member id', id, err);
          return null;
        }
      })
    );
    const nameMap: Record<number, string> = {};
    const detailsMap: Record<number, { name: string; username?: string; mobile?: string }> = {};
    results.forEach((r) => {
      if (!r) return;
      nameMap[r.id] = r.name;
      detailsMap[r.id] = { name: r.name, username: r.username, mobile: r.mobile };
    });
    if (Object.keys(nameMap).length > 0) {
      setUserNames((prev) => ({ ...prev, ...nameMap }));
      setUserDetails((prev) => ({ ...prev, ...detailsMap }));
      console.log('Updated user maps from per-id fetch:', { nameMap, detailsMap });
    }
  };

  // Logs functions
  const openLogs = async (item: DonationItem) => {
    setLogsFor(item.id);
    setLogsLoading(true);
    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/donations/${item.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        const logsData = result.data || [];
        setLogs(logsData);
        
        // Fetch user names for the logs
        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);
        console.log('openLogs - Found userIds:', userIds);
        if (userIds.length > 0) {
          console.log('openLogs - Calling fetchUserNames with:', userIds);
          await fetchUserNames(userIds);
        } else {
          console.log('openLogs - No userIds found, skipping fetchUserNames');
        }
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

  const loadAllDonationProductLogs = async (pageNum?: number) => {
    const pageToLoad = pageNum || allLogsPage;
    setAllLogsLoading(true);
    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/donations/logs?page=${pageToLoad}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        const logsData = result.data || [];
        setAllLogs(logsData);
        setAllLogsTotal(result.total || 0);
        setAllLogsPage(pageToLoad);
        
        // Fetch user names for the logs
        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);
        console.log('loadAllLogs - Found userIds:', userIds);
        if (userIds.length > 0) {
          console.log('loadAllLogs - Calling fetchUserNames with:', userIds);
          await fetchUserNames(userIds);
        } else {
          console.log('loadAllLogs - No userIds found, skipping fetchUserNames');
        }
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

  // Context menu for columns toggling
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
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
  });
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
      <div class="text-center mb-5">
        <img src="/logo.png" alt="Logo" class="h-20 mx-auto" />
        <h2 class="mt-2.5 text-xl font-bold">${t('Donation Receipt', 'நன்கொடை ரசீது')}</h2>
      </div>
      <div class="mx-5">
        ${
          item
            ? `<table class="w-full border-collapse">
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t(
                'Donor',
                'நன்கொடையாளர்'
              )}:</td><td class="p-2 border-b border-gray-300">${item.donor_name}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t(
                'Date',
                'தேதி'
              )}:</td><td class="p-2 border-b border-gray-300">${item.donation_date}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t(
                'Product',
                'பொருள்'
              )}:</td><td class="p-2 border-b border-gray-300">${item.product_name}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t(
                'Description',
                'விளக்கம்'
              )}:</td><td class="p-2 border-b border-gray-300">${item.description}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t(
                'Quantity',
                'அளவு'
              )}:</td><td class="p-2 border-b border-gray-300">${item.quantity}</td></tr>
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
    <div className={pageContainerStyles.container}>
        <Card className={pageContainerStyles.content}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center py-4 px-6", formFieldStyles.card.header)}>
            <CardTitle className="text-lg font-bold text-center w-full">
              {t('Donation List', 'பொருள் நன்கொடைக் பட்டியல்')}
            </CardTitle>
          </CardHeader>

      {/* Filters: single horizontal row with actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 mb-4">
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
              className="block w-full pl-8 pr-2 py-1 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-1 w-full md:w-auto">
            <button
              onClick={load}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Search', 'தேடு')}
            </button>
            <button
              onClick={() => {
                setQ('');
                load();
              }}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Clear', 'அழி')}
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Export CSV', 'CSV ஏற்றுமதி')}
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('Export PDF', 'PDF ஏற்றுமதி')}
            </button>
            <button
              onClick={openAllLogs}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              type="button"
            >
              {t('All Logs', 'அனைத்து பதிவுகள்')}
            </button>
          </div>
        </div>
      </div>

      {/* Table with context menu for columns */}
      <div
        className={formFieldStyles.moneyDonationList.table.container}
        onContextMenu={onContextMenu}
      >
        <div className={formFieldStyles.moneyDonationList.table.scrollContainer}>
          <Table className={formFieldStyles.moneyDonationList.table.table}>
            <TableHeader className={formFieldStyles.moneyDonationList.table.thead}>
              <TableRow className={formFieldStyles.moneyDonationList.table.tr}>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <TableHead
                        key={col.key}
                        className={cn(
                          formFieldStyles.moneyDonationList.table.th,
                          col.key === 'print' && formFieldStyles.moneyDonationList.table.thActions,
                          col.key === '#' && formFieldStyles.moneyDonationList.table.thLeft,
                          col.key === 'actions' && formFieldStyles.moneyDonationList.table.thRight,
                          col.align === 'right' && formFieldStyles.moneyDonationList.thRight,
                          col.align === 'center' && formFieldStyles.moneyDonationList.thCenter
                        )}
                      >
                        {col.label}
                      </TableHead>
                    )
                )}
              </TableRow>
            </TableHeader>
            <TableBody className={formFieldStyles.moneyDonationList.table.tbody}>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColCount}
                    className={formFieldStyles.moneyDonationList.table.loadingCell}
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColCount}
                    className={formFieldStyles.moneyDonationList.table.emptyCell}
                  >
                    {t('No data found', 'தரவு கிடைக்கவில்லை')}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r, idx) => (
                  <TableRow key={r.id} className={formFieldStyles.moneyDonationList.table.tr}>
                    {visibleCols['#'] && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>{idx + 1}</TableCell>
                    )}
                    {visibleCols.receipt && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>{(r as any).register_no || '-'}</TableCell>
                    )}
                    {visibleCols.contact && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>
                        {r.donor_contact || '-'}
                      </TableCell>
                    )}
                    {visibleCols.date && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>
                        {(r.donation_date || '').slice(0,10) || '-'}
                      </TableCell>
                    )}
                    {visibleCols.donor && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>{r.donor_name || '-'}</TableCell>
                    )}
                    {visibleCols.category && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>{r.category || '-'}</TableCell>
                    )}
                    {visibleCols.product && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>{r.product_name || '-'}</TableCell>
                    )}
                    {visibleCols.qty && (
                      <TableCell className={cn(formFieldStyles.moneyDonationList.table.td, formFieldStyles.moneyDonationList.table.tdRight)}>
                        {toNum((r as any).quantity).toLocaleString()}
                      </TableCell>
                    )}
                    {visibleCols.description && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.td}>{r.description || '-'}</TableCell>
                    )}
                    {visibleCols.print && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.tdActions}>
                        <div className="flex justify-center items-center gap-1">
                          <PrintButton onClick={() => onPrint(r)} />
                        </div>
                      </TableCell>
                    )}
                    {visibleCols.actions && (
                      <TableCell className={formFieldStyles.moneyDonationList.table.tdActions}>
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
                                className={`p-1 rounded-md ${canDelete ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}
                                title={title}
                                disabled={!canDelete}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            );
                          })()}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                className="flex items-center px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() => setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500"
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
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
                value={editForm.product}
                onChange={(e)=>setEditForm(prev=>({...prev, product: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Quantity','அளவு')}</label>
              <input
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
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
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
                value={editForm.donationDate}
                onChange={(e)=>setEditForm(prev=>({...prev, donationDate: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Category','வகை')}</label>
              <input
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
                value={editForm.category}
                onChange={(e)=>setEditForm(prev=>({...prev, category: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Status','நிலை')}</label>
              <select
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
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
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
                value={editForm.donorName}
                onChange={(e)=>setEditForm(prev=>({...prev, donorName: e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('Contact','தொடர்பு')}</label>
              <input
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
                value={editForm.donorContact}
                onChange={(e)=>setEditForm(prev=>({...prev, donorContact: e.target.value}))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('Description','விளக்கம்')}</label>
              <textarea
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
                rows={2}
                value={editForm.description}
                onChange={(e)=>setEditForm(prev=>({...prev, description: e.target.value}))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{t('Notes','குறிப்புகள்')}</label>
              <textarea
                className="w-full border border-gray-300 px-2 py-1 rounded-md"
                rows={2}
                value={editForm.notes}
                onChange={(e)=>setEditForm(prev=>({...prev, notes: e.target.value}))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={()=>setEditOpen(false)} className="px-3 py-1 border border-gray-300 rounded-md text-xs">{t('Cancel','ரத்து செய்')}</button>
            <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs">{t('Save','சேமி')}</button>
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
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
              {t('Delete', 'நீக்கு')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* All Donation Product Logs Modal */}
      {allLogsOpen && (
        <div className={formFieldStyles.moneyDonationList.modal.overlay}>
          <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-6 px-6 rounded-t-lg flex-shrink-0">
              <div className={formFieldStyles.moneyDonationList.modal.header}>
                <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('All Donation Product Logs', 'அனைத்து பொருள் நன்கொடை பதிவுகள்')}</h2>
                <button onClick={closeAllLogs} className={formFieldStyles.moneyDonationList.modal.closeButton}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
            {allLogsLoading ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}
              </div>
            ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-auto max-h-[60vh]">
                      <div className="bg-white border border-gray-200">
                        <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                          <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                            <tr>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                {t('Action', 'செயல்')}
                              </th>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                {t('Date & Time', 'தேதி மற்றும் நேரம்')}
                              </th>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                {t('Receipt No', 'ரசீது எண்')}
                              </th>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                {t('User', 'பயனர்')}
                              </th>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                {t('Details', 'விவரங்கள்')}
                              </th>
                    </tr>
                  </thead>
                          <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                            {allLogs.length === 0 ? (
                              <tr>
                                <td className={formFieldStyles.moneyDonationList.logsTable.tdCenter} colSpan={6}>
                                  {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                                </td>
                              </tr>
                            ) : allLogs.map((lg, index) => (
                              <tr key={lg.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                                <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    lg.action === 'create' ? 'bg-green-100 text-green-800' :
                                    lg.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                    lg.action === 'delete' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                                    {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                                     lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                                     lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                                     lg.action}
                            </span>
                          </td>
                                <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>
                                  {lg.created_at ? new Date(lg.created_at).toLocaleString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                          </td>
                                <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.donation_id}</td>
                                <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.receipt_number ?? '-'}</td>
                                <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                  {(() => {
                                    const userId = lg.created_by;
                                    if (!userId) return '-';
                                    const user = userDetails[userId];
                                    const name = userNames[userId];
                                    
                                    if (user?.username) {
                                      return `@${user.username}`;
                                    }
                                    if (user?.name) {
                                      return user.name;
                                    }
                                    if (name) {
                                      return name;
                                    }
                                    return `User ${userId}`;
                                  })()}
                                </td>
                                <td className="py-3 px-4 border-b">
                                  <div className="text-sm text-gray-600 max-w-md">
                                    {(() => {
                                      // Parse donation details from the log data
                                      const details = lg.details;
                                      if (!details) return <span className="text-gray-400">-</span>;
                                      
                                      // Extract specific fields from the details
                                      const registerNo = details.register_no || details.after?.register_no || details.before?.register_no;
                                      const price = details.price || details.after?.price || details.before?.price;
                                      const quantity = details.quantity || details.after?.quantity || details.before?.quantity;
                                      const category = details.category || details.after?.category || details.before?.category;
                                      const donorName = details.donor_name || details.after?.donor_name || details.before?.donor_name;
                                      const product = details.product || details.after?.product || details.before?.product;
                                      
                                      return (
                                        <div className="space-y-2">
                                          <div className="bg-blue-50 p-3 rounded border text-xs">
                                            <div className="font-medium text-blue-700 mb-2">{t('Donation Details', 'நன்கொடை விவரங்கள்')}</div>
                                            <div className="space-y-1 text-gray-600">
                                              {registerNo && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Receipt No', 'ரசீது எண்')}:</span>
                                                  <span>{registerNo}</span>
                                                </div>
                                              )}
                                              {donorName && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Donor', 'நன்கொடையாளர்')}:</span>
                                                  <span>{donorName}</span>
                                                </div>
                                              )}
                                              {product && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Product', 'பொருள்')}:</span>
                                                  <span>{product}</span>
                                                </div>
                                              )}
                                              {quantity && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Quantity', 'அளவு')}:</span>
                                                  <span>{quantity}</span>
                                                </div>
                                              )}
                                              {price && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Price', 'விலை')}:</span>
                                                  <span>₹{price}</span>
                                                </div>
                                              )}
                                              {category && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Category', 'வகை')}:</span>
                                                  <span>{category}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                            </div>
                          </td>
                        </tr>
                            ))}
                  </tbody>
                </table>
              </div>
          </div>
                    <div className={formFieldStyles.moneyDonationList.pagination.container}>
                      <div className={formFieldStyles.moneyDonationList.pagination.info}>
                        {t('Total', 'மொத்தம்')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{allLogsTotal}</span>
              </div>
                      <div className={formFieldStyles.moneyDonationList.pagination.controls}>
                <button
                          className={formFieldStyles.moneyDonationList.pagination.button}
                          disabled={allLogsPage <= 1}
                  onClick={() => {
                            const prevPage = Math.max(1, allLogsPage - 1);
                            loadAllDonationProductLogs(prevPage);
                  }}
                >
                  {t('Previous', 'முந்தைய')}
                </button>
                        <span className="text-sm text-gray-600">
                          {t('Page', 'பக்கம்')} {allLogsPage} {t('of', 'இல்')} {Math.ceil(allLogsTotal / allLogsPageSize)}
                        </span>
                <button
                          className={formFieldStyles.moneyDonationList.pagination.button}
                          disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                  onClick={() => {
                            const nextPage = allLogsPage + 1;
                            loadAllDonationProductLogs(nextPage);
                  }}
                >
                          {t('Next', 'அடுத்தது')}
                </button>
                      </div>
              </div>
            </div>
          )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donation Product Logs Modal */}
      {logsFor && (
        <div className={formFieldStyles.moneyDonationList.modal.overlay}>
          <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeLogs} />
          <div className={formFieldStyles.moneyDonationList.modal.container}>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 px-6 rounded-t-lg">
              <div className={formFieldStyles.moneyDonationList.modal.header}>
                <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('Activity Log', 'செயல்பாட்டு பதிவு')} #{logsFor}</h2>
                <button onClick={closeLogs} className={formFieldStyles.moneyDonationList.modal.closeButton}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {logsLoading ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {t('Loading logs...', 'பதிவுகள் ஏறுகிறது...')}
                  </div>
                ) : logs.length === 0 ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                    <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                      <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                        <tr>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {t('Action', 'செயல்')}
                          </th>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {t('Date & Time', 'தேதி மற்றும் நேரம்')}
                          </th>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {t('User', 'பயனர்')}
                          </th>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {t('Details', 'விவரங்கள்')}
                          </th>
                    </tr>
                  </thead>
                      <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                        {logs.map((lg, index) => (
                          <tr key={lg.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                            <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                lg.action === 'create' ? 'bg-green-100 text-green-800' :
                                lg.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                lg.action === 'delete' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                                {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                                 lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                                 lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                                 lg.action}
                            </span>
                          </td>
                            <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>
                              {lg.created_at ? new Date(lg.created_at).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                          </td>
                            <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                              {(() => {
                                const userId = lg.created_by;
                                if (!userId) return '-';
                                const user = userDetails[userId];
                                const name = userNames[userId];
                                
                                if (user?.username) {
                                  return `@${user.username}`;
                                }
                                if (user?.name) {
                                  return user.name;
                                }
                                if (name) {
                                  return name;
                                }
                                return `User ${userId}`;
                              })()}
                            </td>
                            <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                              <div className="text-sm text-gray-600 max-w-md">
                                {(() => {
                                  // Parse donation details from the log data
                                  const details = lg.details;
                                  if (!details) return <span className="text-gray-400">-</span>;
                                  
                                  // Extract specific fields from the details
                                  const registerNo = details.register_no || details.after?.register_no || details.before?.register_no;
                                  const price = details.price || details.after?.price || details.before?.price;
                                  const quantity = details.quantity || details.after?.quantity || details.before?.quantity;
                                  const category = details.category || details.after?.category || details.before?.category;
                                  const donorName = details.donor_name || details.after?.donor_name || details.before?.donor_name;
                                  const product = details.product || details.after?.product || details.before?.product;
                                  
                                  return (
                                    <div className="space-y-2">
                                      <div className="bg-blue-50 p-3 rounded border text-xs">
                                        <div className="font-medium text-blue-700 mb-2">{t('Donation Details', 'நன்கொடை விவரங்கள்')}</div>
                                        <div className="space-y-1 text-gray-600">
                                          {registerNo && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Receipt No', 'ரசீது எண்')}:</span>
                                              <span>{registerNo}</span>
                                            </div>
                                          )}
                                          {donorName && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Donor', 'நன்கொடையாளர்')}:</span>
                                              <span>{donorName}</span>
                                            </div>
                                          )}
                                          {product && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Product', 'பொருள்')}:</span>
                                              <span>{product}</span>
                                            </div>
                                          )}
                                          {quantity && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Quantity', 'அளவு')}:</span>
                                              <span>{quantity}</span>
                                            </div>
                                          )}
                                          {price && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Price', 'விலை')}:</span>
                                              <span>₹{price}</span>
                                            </div>
                                          )}
                                          {category && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Category', 'வகை')}:</span>
                                              <span>{category}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                            </div>
                          </td>
                        </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </div>
          </div>
        </div>
      )}
    </Card>
    </div>
  );
}