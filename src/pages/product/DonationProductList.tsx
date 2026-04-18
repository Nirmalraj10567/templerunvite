// src/components/DonationProductList.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, Trash2, Edit, Eye } from 'lucide-react';
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
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Interfaces
interface DonationItem {
  id: number;
  product_name: string | null;
  description: string | null;
  category: string | null;
  donor_name: string | null;
  donor_contact: string | null;
  donation_date: string | null;
  quantity?: number;
  notes?: string;
  status?: string;
  register_no?: string;
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

interface User {
  id: number;
  name: string;
  username?: string;
  mobile?: string;
  full_name?: string;
}

// Donation Service
class DonationService {
  private baseUrl = 'http://localhost:4000/api';

  async getDonations(token: string, params: { q?: string } = {}) {
    const url = new URL(`${this.baseUrl}/donations`);
    if (params.q) url.searchParams.append('q', params.q);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch donations');
    return await response.json();
  }

  async createDonation(token: string, data: {
    product: string;
    quantity?: number;
    description?: string;
    category?: string;
    donorName?: string;
    donorContact?: string;
    donationDate?: string;
    notes?: string;
    status?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to create donation');
    return await response.json();
  }

  async updateDonation(token: string, id: number, data: {
    product?: string;
    quantity?: number;
    description?: string;
    category?: string;
    donorName?: string;
    donorContact?: string;
    donationDate?: string;
    notes?: string;
    status?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/donations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to update donation');
    return await response.json();
  }

  async deleteDonation(token: string, id: number) {
    const response = await fetch(`${this.baseUrl}/donations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete donation');
    return await response.json();
  }

  async exportDonations(token: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/donations/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to export donations');
    return await response.blob();
  }
}

const donationService = new DonationService();

// Print Button Component
const PrintButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
    title="Print Receipt"
  >
    <FileDown className="h-4 w-4" />
  </button>
);

// Main Component
export default function DonationProductList() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { language } = useLanguage();

  // State management
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

  // User details for logs
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, User>>({});

  // Translation helper
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    product: '',
    quantity: '' as number | '',
    description: '',
    category: 'General',
    donorName: '',
    donorContact: '',
    donationDate: '',
    notes: '',
    status: 'available',
  });

  // Delete confirmation modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // Column visibility state
  type ColKey = '#' | 'receipt' | 'contact' | 'date' | 'donor' | 'category' | 'product' | 'qty' | 'description' | 'print' | 'actions';

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>({
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

  // Context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Column definitions
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

  // Helper functions
  const toNum = (v: any) => {
    if (!v) return 0;
    const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };

  const receiptNum = (s: any) => parseInt(String(s || '').replace(/\D/g, '') || '0', 10);

  const isLastReceipt = (item: DonationItem) => {
    if (!items.length) return false;
    const sorted = [...items].sort((a, b) => receiptNum(b.register_no) - receiptNum(a.register_no));
    return sorted[0]?.id === item.id;
  };

  // Fetch user names for logs
  const fetchUserNames = async (userIds: number[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter((v): v is number => typeof v === 'number')));
    if (uniqueIds.length === 0) return;

    const missing = uniqueIds.filter((id) => !userDetails[id] && !userNames[id]);
    if (missing.length === 0) return;

    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`http://localhost:4000/api/admin/members/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.warn('Failed to fetch member by id', id, data);
            return null;
          }
          const u = data?.data?.user || data?.data;
          if (!u) return null;
          const fullName = (u.full_name && String(u.full_name).trim()) || u.username || u.mobile || String(id);
          return { id, name: fullName, username: u.username, mobile: u.mobile };
        } catch (err) {
          console.warn('Error fetching member id', id, err);
          return null;
        }
      })
    );

    const nameMap: Record<number, string> = {};
    const detailsMap: Record<number, User> = {};

    results.forEach((r) => {
      if (!r) return;
      nameMap[r.id] = r.name;
      detailsMap[r.id] = r;
    });

    if (Object.keys(nameMap).length > 0) {
      setUserNames((prev) => ({ ...prev, ...nameMap }));
      setUserDetails((prev) => ({ ...prev, ...detailsMap }));
    }
  };

  // Main data loading
  const load = async () => {
    setLoading(true);
    try {
      const params = { q };
      const response = await donationService.getDonations(token, params);
      setItems(response.data || []);
    } catch (error) {
      console.error('Failed to load donations:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Log operations
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
        const logsData = result.data || [];
        setLogs(logsData);

        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);

        if (userIds.length > 0) {
          await fetchUserNames(userIds);
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
      const response = await fetch(`http://localhost:4000/api/donations/logs?page=${pageToLoad}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        const logsData = result.data || [];
        setAllLogs(logsData);
        setAllLogsTotal(result.total || 0);
        setAllLogsPage(pageToLoad);

        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);

        if (userIds.length > 0) {
          await fetchUserNames(userIds);
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

  // Edit operations
  const openEdit = (item: DonationItem) => {
    setEditItemId(item.id);
    setEditForm({
      product: item.product_name || '',
      quantity: item.quantity ?? '',
      description: item.description || '',
      category: item.category || 'General',
      donorName: item.donor_name || '',
      donorContact: item.donor_contact || '',
      donationDate: (item.donation_date || '').slice(0,10),
      notes: item.notes || '',
      status: item.status || 'available',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editItemId) return;
    try {
      await donationService.updateDonation(token, editItemId, {
        product: editForm.product,
        quantity: editForm.quantity === '' ? undefined : Number(editForm.quantity),
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

  // Delete operations
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

  // Export and print operations
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
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t('Donor', 'நன்கொடையாளர்')}:</td><td class="p-2 border-b border-gray-300">${item.donor_name}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t('Date', 'தேதி')}:</td><td class="p-2 border-b border-gray-300">${item.donation_date}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t('Product', 'பொருள்')}:</td><td class="p-2 border-b border-gray-300">${item.product_name}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t('Description', 'விளக்கம்')}:</td><td class="p-2 border-b border-gray-300">${item.description}</td></tr>
              <tr><td class="p-2 border-b border-gray-300 font-bold">${t('Quantity', 'அளவு')}:</td><td class="p-2 border-b border-gray-300">${item.quantity}</td></tr>
            </table>`
            : ''
        }
      </div>
    `;

    const printWindow = window.open('', '', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Context menu handling
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  // Event handlers
  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      load();
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    return items.reduce(
      (acc, r) => {
        acc.qty += toNum(r.quantity);
        return acc;
      },
      { qty: 0 }
    );
  }, [items]);

  // Visible column count
  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Effects
  useEffect(() => {
    load();
  }, []);

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
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.card.header}>
          <CardTitle className="text-lg font-bold text-center w-full">
            {t('Donation List', 'பொருள் நன்கொடைக் பட்டியல்')}
          </CardTitle>
        </CardHeader>

        {/* Filters and Search */}
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
                placeholder={t('Search by donor/product/category/phone', 'தானகயாளர்/பொருள்/வகை/தொலைபேசி மூலம் தேடுக')}
                className="block w-full pl-8 pr-2 py-1 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              />
            </div>

            {/* Action Buttons */}
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

        {/* Main Table */}
        <div className={tableClasses.scrollContainerWrapper} onContextMenu={onContextMenu}>
          <div className={tableClasses.scrollContainer}>
            <Table className={tableClasses.container}>
              <TableHeader className={tableClasses.header}>
                <TableRow className={tableClasses.row}>
                  {allColumns.map(
                    (col) =>
                      visibleCols[col.key] && (
                        <TableHead
                          key={col.key}
                          className={cn(
                            tableClasses.headerCell,
                            col.align === 'right' && "text-right",
                            col.align === 'center' && "text-center"
                          )}
                        >
                          {col.label}
                        </TableHead>
                      )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColCount}
                      className={tableClasses.emptyState}
                    >
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColCount}
                      className={tableClasses.emptyState}
                    >
                      {t('No data found', 'தரவு கிடைக்கவில்லை')}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, idx) => (
                    <TableRow key={item.id} className={tableClasses.row}>
                      {visibleCols['#'] && (
                        <TableCell className={cn(tableClasses.cell, 'font-medium')}>
                          {idx + 1}
                        </TableCell>
                      )}
                      {visibleCols.receipt && (
                        <TableCell className={tableClasses.cell}>
                          {item.register_no || '-'}
                        </TableCell>
                      )}
                      {visibleCols.contact && (
                        <TableCell className={tableClasses.cell}>
                          {item.donor_contact || '-'}
                        </TableCell>
                      )}
                      {visibleCols.date && (
                        <TableCell className={tableClasses.cell}>
                          {(item.donation_date || '').slice(0,10) || '-'}
                        </TableCell>
                      )}
                      {visibleCols.donor && (
                        <TableCell className={tableClasses.cell}>
                          {item.donor_name || '-'}
                        </TableCell>
                      )}
                      {visibleCols.category && (
                        <TableCell className={tableClasses.cell}>
                          {item.category || '-'}
                        </TableCell>
                      )}
                      {visibleCols.product && (
                        <TableCell className={tableClasses.cell}>
                          {item.product_name || '-'}
                        </TableCell>
                      )}
                      {visibleCols.qty && (
                        <TableCell className={cn(tableClasses.cell, 'text-right')}>
                          {toNum(item.quantity).toLocaleString()}
                        </TableCell>
                      )}
                      {visibleCols.description && (
                        <TableCell className={cn(tableClasses.cell, 'max-w-xs truncate')}>
                          {item.description || '-'}
                        </TableCell>
                      )}
                      {visibleCols.print && (
                        <TableCell className={cn(tableClasses.cell, 'text-center')}>
                          <PrintButton onClick={() => onPrint(item)} />
                        </TableCell>
                      )}
                      {visibleCols.actions && (
                        <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(item)}
                              className={tableClasses.actionButtonPrimary}
                            >
                              {t('Edit', 'திருத்த')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLogs(item)}
                              className={tableClasses.actionButtonSecondary}
                            >
                              {t('Logs', 'பதிவுகள்')}
                            </Button>
                            {(() => {
                              const canDelete = isLastReceipt(item);
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDelete(item)}
                                  className={canDelete ? tableClasses.actionButtonDanger : 'opacity-50 cursor-not-allowed'}
                                  title={canDelete ? undefined : t('Only the latest receipt can be deleted', 'சமீபத்திய ரசீது மட்டுமே நீக்க இயலும்')}
                                  disabled={!canDelete}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
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

          {/* Footer with pagination and totals */}
          <div className={tableClasses.pagination}>
            <div className="text-xs text-gray-700 flex flex-wrap gap-4">
              <span>
                {t('Showing', 'காட்டப்படுகிறது')}{' '}
                <span className="font-medium">1</span> {t('to', 'இலிருந்து')}{' '}
                <span className="font-medium">{items.length}</span> {t('of', 'மொத்தம்')}{' '}
                <span className="font-medium">{items.length}</span> {t('results', 'முடிவுகள்')}
              </span>
              <span>
                {t('Total Qty', 'மொத்த அளவு')}: <span className="font-medium">{totals.qty.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Context Menu for Column Visibility */}
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
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 p-2 border-t border-gray-200">
              <button
                onClick={() => {
                  const allOn: Record<ColKey, boolean> = {} as any;
                  allColumns.forEach((c) => {
                    allOn[c.key] = true;
                  });
                  setVisibleCols(allOn);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                type="button"
              >
                {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Product','பொருள்')}</label>
                <input
                  className={cn(theme.input.base, theme.input.size.md, "w-full")}
                  value={editForm.product}
                  onChange={(e)=>setEditForm(prev=>({...prev, product: e.target.value}))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Quantity','அளவு')}</label>
                <input
                  className={cn(theme.input.base, theme.input.size.md)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Date','தேதி')}</label>
                <input
                  type="date"
                  className={cn(theme.input.base, theme.input.size.md, "w-full")}
                  value={editForm.donationDate}
                  onChange={(e)=>setEditForm(prev=>({...prev, donationDate: e.target.value}))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Category','வகை')}</label>
                <input
                  className={cn(theme.input.base, theme.input.size.md, "w-full")}
                  value={editForm.category}
                  onChange={(e)=>setEditForm(prev=>({...prev, category: e.target.value}))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Status','நிலை')}</label>
                <select
                  className={cn(theme.select.base, theme.select.size.md, "w-full")}
                  value={editForm.status}
                  onChange={(e)=>setEditForm(prev=>({...prev, status: e.target.value}))}
                >
                  <option value="available">{t('Available','கிடைக்கும்')}</option>
                  <option value="reserved">{t('Reserved','ஒதுக்கப்பட்டது')}</option>
                  <option value="distributed">{t('Distributed','விநியோகிக்கப்பட்டது')}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Donor','நன்கொடையாளர்')}</label>
                <input
                  className={cn(theme.input.base, theme.input.size.md, "w-full")}
                  value={editForm.donorName}
                  onChange={(e)=>setEditForm(prev=>({...prev, donorName: e.target.value}))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Contact','தொடர்பு')}</label>
                <input
                  className={cn(theme.input.base, theme.input.size.md, "w-full")}
                  value={editForm.donorContact}
                  onChange={(e)=>setEditForm(prev=>({...prev, donorContact: e.target.value}))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Description','விளக்கம்')}</label>
                <textarea
                  className={cn(theme.textarea.base, theme.textarea.size.md, "w-full")}
                  rows={3}
                  value={editForm.description}
                  onChange={(e)=>setEditForm(prev=>({...prev, description: e.target.value}))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Notes','குறிப்புகள்')}</label>
                <textarea
                  className={cn(theme.textarea.base, theme.textarea.size.md, "w-full")}
                  rows={3}
                  value={editForm.notes}
                  onChange={(e)=>setEditForm(prev=>({...prev, notes: e.target.value}))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('Cancel','ரத்து செய்')}
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('Save','சேமி')}
              </button>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Dialog */}
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

        {/* Individual Item Logs Modal */}
        {logsFor && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeLogs} />
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{t('Activity Log', 'செயல்பாட்டு பதிவு')} #{logsFor}</h3>
                  <button
                    onClick={closeLogs}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {logsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</span>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Action', 'செயல்')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Date & Time', 'தேதி மற்றும் நேரம்')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('User', 'பயனர்')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Details', 'விவரங்கள்')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(() => {
                                const userId = log.created_by;
                                if (!userId) return '-';
                                const user = userDetails[userId];
                                if (user?.username) return `@${user.username}`;
                                if (user?.name) return user.name;
                                return userNames[userId] || `User ${userId}`;
                              })()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {log.details ? (
                                <div className="max-w-xs">
                                  <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              ) : (
                                '-'
                              )}
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
        )}

        {/* All Logs Modal */}
        {allLogsOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeAllLogs} />
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{t('All Donation Product Logs', 'அனைத்து பொருள் நன்கொடை பதிவுகள்')}</h3>
                  <button
                    onClick={closeAllLogs}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {allLogsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</span>
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto max-h-96">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('Action', 'செயல்')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('Date & Time', 'தேதி மற்றும் நேரம்')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('Donation ID', 'நன்கொடை ஐடி')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('Receipt No', 'ரசீது எண்')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('User', 'பயனர்')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('Details', 'விவரங்கள்')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                              </td>
                            </tr>
                          ) : allLogs.map((log) => (
                            <tr key={log.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {log.donation_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {log.receipt_number || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(() => {
                                  const userId = log.created_by;
                                  if (!userId) return '-';
                                  const user = userDetails[userId];
                                  if (user?.username) return `@${user.username}`;
                                  if (user?.name) return user.name;
                                  return userNames[userId] || `User ${userId}`;
                                })()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {log.details ? (
                                  <div className="max-w-xs">
                                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-700">
                        {t('Total', 'மொத்தம்')}: <span className="font-medium">{allLogsTotal}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={allLogsPage <= 1}
                          onClick={() => loadAllDonationProductLogs(Math.max(1, allLogsPage - 1))}
                        >
                          {t('Previous', 'முந்தைய')}
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">
                          {t('Page', 'பக்கம்')} {allLogsPage} {t('of', 'இல்')} {Math.ceil(allLogsTotal / allLogsPageSize)}
                        </span>
                        <button
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                          onClick={() => loadAllDonationProductLogs(allLogsPage + 1)}
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
        )}
      </Card>
    </div>
  );
}

export { DonationService, donationService };