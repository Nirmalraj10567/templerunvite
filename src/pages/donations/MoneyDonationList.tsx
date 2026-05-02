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
import { Trash2, Loader2 } from 'lucide-react';
import { cn, pageContainerStyles, formFieldStyles } from '@/styles/formStyles';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { theme } from '@/styles/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from "@/components/ui/use-toast";
import { MoneyDonationFormData } from '@/services/moneyDonationService';

const toNum = (v: any) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/[^0-9.-]+/g, "")) || 0;
};

export default function MoneyDonationList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<MoneyDonationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

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
          const res = await fetch(`https://templeapi.agniplay.com/api/admin/members/${id}`, {
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

  type ColKey = '#' | 'receipt' | 'date' | 'name' | 'phone' | 'amount' | 'reason' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: '#', label: t('S.No', 'வ.எண்') },
    { key: 'receipt', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'entryDate', label: t('Entry Date', 'நுழைவு தேதி') },
    { key: 'date', label: t('Booking Date', 'பதிவு தேதி') },
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
    entryDate: true,
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
    } catch { }
    return defaultVisible;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch { }
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

  // User names and details for logs
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, { name: string, username?: string, mobile?: string }>>({});

  const openLogs = async (donationId: number) => {
    setLogsFor(donationId);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/money-donations/${donationId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('Logs API Response:', result); // Debug log
      if (result.success) {
        const logsData = Array.isArray(result.data) ? result.data : [];
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
      } else {
        console.error('API returned error:', result.error);
        setLogs([]);
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
      setLogs([]);
      // Show user-friendly error
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
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
      const res = await fetch(`https://templeapi.agniplay.com/api/money-donations/logs?page=${pageNum}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('All Logs API Response:', result); // Debug log
      if (result.success) {
        const logsData = Array.isArray(result.data) ? result.data : [];
        setAllLogs(logsData);
        setAllLogsTotal(Number(result.total || 0));
        setAllLogsPage(pageNum);

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
      } else {
        console.error('API returned error:', result.error);
        throw new Error(result.error || 'Failed to load logs');
      }
    } catch (e) {
      console.error('Failed to load all logs:', e);
      setAllLogs([]);
      setAllLogsTotal(0);
      // Show user-friendly error
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MoneyDonationItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return dateStr;
    }
  };

  const onEdit = (row: MoneyDonationItem) => {
    setEditingItem(row);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
      const payload: Partial<MoneyDonationFormData> = {
        registerNo: getVal('edit_registerNo'),
        name: getVal('edit_name'),
        phone: getVal('edit_phone'),
        entryDate: getVal('edit_entryDate'),
        bookingDate: getVal('edit_bookingDate'),
        amount: getVal('edit_amount'),
        reason: getVal('edit_reason'),
        transferTo: (document.getElementById('edit_transferTo') as HTMLSelectElement)?.value,
      };

      const res = await moneyDonationService.update(token, editingItem.id, payload);
      if (res.success) {
        toast({ title: t('Success', 'வெற்றி'), description: t('Donation updated successfully', 'நன்கொடை வெற்றிகரமாக புதுப்பிக்கப்பட்டது') });
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchItems();
        refreshJournal();
      }
    } catch (err) {
      console.error('Update failed:', err);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to update donation', 'நன்கொடையைப் புதுப்பிக்க முடியவில்லை'), variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Function to refresh journal after money donation operations
  const refreshJournal = async () => {
    try {
      await fetch('https://templeapi.agniplay.com/api/journal/sync-pooja', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      console.error('Failed to sync journal logs:', e);
    }
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
      // Refresh journal logs after successful delete
      await refreshJournal();
    } catch (e) {
      console.error('Failed to delete donation', e);
      // Optional: use toast if available; fallback alert
      alert(t('Delete failed', 'நீக்கம் தோல்வியுற்றது'));
    } finally {
      setDeleteOpen(false);
      setDeleteRow(null);
    }
  };

  const handleDownloadReceipt = async (donationId: number, registerNo: string | null) => {
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/money-donations/${donationId}/receipt.pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch receipt');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${registerNo || donationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert(t("Failed to download receipt. Please try again.", "ரசீதைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
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
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.card.header}>
          <CardTitle className={formFieldStyles.tableHeader.title}>
            {t('Money Donation List', 'பண நன்கொடைக் பட்டியல்')}
          </CardTitle>
        </CardHeader>


        {/* Filters */}
        <div className={formFieldStyles.moneyDonationList.filters.container}>
          <div className={formFieldStyles.moneyDonationList.filters.form}>
            <div className={formFieldStyles.moneyDonationList.filters.searchContainer}>
              <div className={formFieldStyles.moneyDonationList.filters.searchIcon}>
                <svg className={formFieldStyles.moneyDonationList.filters.searchIconSvg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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
                className={cn(theme.input.base, theme.input.size.sm, formFieldStyles.moneyDonationList.filters.searchInput)}
              />
            </div>

            <div className={formFieldStyles.moneyDonationList.filters.dateContainer}>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={cn(theme.input.base, theme.input.size.sm, formFieldStyles.moneyDonationList.filters.dateInput)}
              />
              <span className={formFieldStyles.moneyDonationList.filters.dateLabel}>{t('to', 'வரை')}</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={cn(theme.input.base, theme.input.size.sm, formFieldStyles.moneyDonationList.filters.dateInput)}
              />
            </div>

            <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
              <button
                onClick={load}
                className={formFieldStyles.moneyDonationList.filters.button}
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
                className={formFieldStyles.moneyDonationList.filters.button}
                type="button"
              >
                {t('Clear', 'அழி')}
              </button>
              <button
                onClick={openAllLogs}
                className={formFieldStyles.moneyDonationList.filters.button}
                type="button"
              >
                {t('All Logs', 'அனைத்து பதிவுகள்')}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={formFieldStyles.moneyDonationList.table.container} onContextMenu={onContextMenu}>
          <div className={formFieldStyles.moneyDonationList.table.scrollContainer}>
            <table className={formFieldStyles.moneyDonationList.table.table}>
              <thead className={formFieldStyles.moneyDonationList.table.thead}>
                <tr>
                  {allColumns.map(
                    (col) =>
                      visibleCols[col.key] && (
                        <th
                          key={col.key}
                          className={cn(
                            formFieldStyles.moneyDonationList.table.th,
                            col.key === 'actions' ? formFieldStyles.moneyDonationList.table.thActions : 'px-3',
                            col.align === 'right' ? formFieldStyles.moneyDonationList.table.thRight :
                              col.align === 'center' ? formFieldStyles.moneyDonationList.table.thCenter :
                                formFieldStyles.moneyDonationList.table.thLeft
                          )}
                        >
                          {col.label}
                        </th>
                      )
                  )}
                </tr>
              </thead>
              <tbody className={formFieldStyles.moneyDonationList.table.tbody}>
                {loading ? (
                  <tr>
                    <td colSpan={visibleColCount} className={formFieldStyles.moneyDonationList.table.loadingCell}>
                      <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColCount} className={formFieldStyles.moneyDonationList.table.emptyCell}>
                      {t('No data found', 'தரவு கிடைக்கவில்லை')}
                    </td>
                  </tr>
                ) : (
                  items.map((r, idx) => (
                    <tr key={r.id} className={formFieldStyles.moneyDonationList.table.tr}>
                      {visibleCols['#'] && <td className={formFieldStyles.moneyDonationList.table.td}>{idx + 1}</td>}
                      {visibleCols['receipt'] && (
                        <td className={formFieldStyles.moneyDonationList.table.td}>{(r as any).register_no || '-'}</td>
                      )}
                      {visibleCols['entryDate'] && <td className={formFieldStyles.moneyDonationList.table.td}>{formatDate((r as any).entry_date)}</td>}
                      {visibleCols['date'] && <td className={formFieldStyles.moneyDonationList.table.td}>{formatDate(r.date)}</td>}
                      {visibleCols['name'] && <td className={formFieldStyles.moneyDonationList.table.td}>{r.name || '-'}</td>}
                      {visibleCols['phone'] && <td className={formFieldStyles.moneyDonationList.table.td}>{r.phone || '-'}</td>}
                      {visibleCols['amount'] && (
                        <td className={cn(formFieldStyles.moneyDonationList.table.td, formFieldStyles.moneyDonationList.table.tdRight)}>{toNum(r.amount).toLocaleString()}</td>
                      )}
                      {visibleCols['reason'] && <td className={formFieldStyles.moneyDonationList.table.td}>{r.reason || '-'}</td>}
                      {visibleCols['actions'] && (
                        <td className={formFieldStyles.moneyDonationList.table.tdActions}>
                          <div className={formFieldStyles.moneyDonationList.actionButtons.container}>
                            <button
                              type="button"
                              onClick={() => handleDownloadReceipt(r.id, (r as any).register_no)}
                              className={formFieldStyles.moneyDonationList.actionButtons.print}
                              title={t("Print Receipt", "ரசீது அச்சிடுக")}
                            >
                              {t("Print", "அச்சிடு")}
                            </button>
                            <button
                              type="button"
                              onClick={() => openLogs(r.id)}
                              className={formFieldStyles.moneyDonationList.actionButtons.logs}
                              title={t('Logs', 'பதிவுகள்')}
                            >
                              {t('Logs', 'பதிவுகள்')}
                            </button>
                            <button
                              type="button"
                              onClick={() => onEdit(r)}
                              className={formFieldStyles.moneyDonationList.actionButtons.edit}
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
                                  className={canDelete ? formFieldStyles.moneyDonationList.actionButtons.delete : formFieldStyles.moneyDonationList.actionButtons.deleteDisabled}
                                  title={title}
                                  disabled={!canDelete}
                                >
                                  <Trash2 className={formFieldStyles.moneyDonationList.actionButtons.deleteIcon} />
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
          <div className={formFieldStyles.moneyDonationList.summary.container}>
            <div className={formFieldStyles.moneyDonationList.summary.info}>
              {t('Showing', 'காட்டப்படுகிறது')} <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>1</span> {t('to', 'இலிருந்து')}{' '}
              <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{items.length}</span> {t('of', 'மொத்தம்')}{' '}
              <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{items.length}</span> {t('results', 'முடிவுகள்')}
            </div>
            <div className={formFieldStyles.moneyDonationList.summary.total}>
              <span>
                {t('Total Amount', 'மொத்த தொகை')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{totals.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Context menu for column toggle */}
        {menuOpen && (
          <div
            ref={menuRef}
            className={formFieldStyles.moneyDonationList.contextMenu.container}
            style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
          >
            <div className={formFieldStyles.moneyDonationList.contextMenu.header}>
              <h3 className={formFieldStyles.moneyDonationList.contextMenu.title}>{t('Columns', 'நெடுவரிசைகள்')}</h3>
              <p className={formFieldStyles.moneyDonationList.contextMenu.subtitle}>
                {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
              </p>
            </div>
            <div className={formFieldStyles.moneyDonationList.contextMenu.content}>
              {allColumns.map((col) => (
                <label key={col.key} className={formFieldStyles.moneyDonationList.contextMenu.item}>
                  <input
                    type="checkbox"
                    checked={!!visibleCols[col.key]}
                    onChange={() => setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                    className={formFieldStyles.moneyDonationList.contextMenu.checkbox}
                  />
                  <span className={formFieldStyles.moneyDonationList.contextMenu.label}>{col.label}</span>
                </label>
              ))}
            </div>
            <div className={formFieldStyles.moneyDonationList.contextMenu.actions}>
              <button
                onClick={() => {
                  const allOn: typeof visibleCols = {} as any;
                  allColumns.forEach((c) => {
                    (allOn as any)[c.key] = true;
                  });
                  setVisibleCols(allOn);
                }}
                className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
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
                className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
                type="button"
              >
                {t('Clear all', 'அனைத்தையும் அழி')}
              </button>
              <button
                onClick={() => setMenuOpen(false)}
                className={formFieldStyles.moneyDonationList.contextMenu.closeButton}
                type="button"
              >
                {t('Close', 'மூடு')}
              </button>
            </div>
          </div>
        )}

        {/* Quick Edit Modal */}
        {isEditModalOpen && editingItem && (
          <div className={formFieldStyles.moneyDonationList.modal.overlay}>
            <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={() => setIsEditModalOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 flex flex-col">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-t-lg flex items-center justify-between">
                <h2 className="text-lg font-bold">{t('Quick Edit Donation', 'விரைவு திருத்தம்')}</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-white hover:text-gray-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Receipt No', 'ரசீது எண்')}</label>
                    <Input id="edit_registerNo" defaultValue={editingItem.register_no || ''} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Name', 'பெயர்')}</label>
                    <Input id="edit_name" defaultValue={editingItem.name || ''} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Phone', 'கைபேசி')}</label>
                    <Input id="edit_phone" defaultValue={editingItem.phone || ''} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Amount', 'தொகை')}</label>
                    <Input id="edit_amount" type="number" defaultValue={editingItem.amount || ''} className="h-9 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Entry Date', 'பதிவு தேதி')}</label>
                    <Input id="edit_entryDate" type="date" defaultValue={(editingItem as any).entry_date || editingItem.date || ''} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Booking Date', 'பூஜை தேதி')}</label>
                    <Input id="edit_bookingDate" type="date" defaultValue={editingItem.date || ''} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Transfer To', 'மாற்ற வேண்டிய கணக்கு')}</label>
                  <select 
                    id="edit_transferTo" 
                    defaultValue={(editingItem as any).transfer_to_account || 'INCOME A/C'} 
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  >
                    <option value="INCOME A/C">INCOME A/C</option>
                    <option value="CASH A/C">CASH A/C</option>
                    <option value="BANK A/C">BANK A/C</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Reason', 'காரணம்')}</label>
                  <textarea 
                    id="edit_reason" 
                    defaultValue={editingItem.reason || ''} 
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)} disabled={savingEdit}>
                  {t('Cancel', 'ரத்து செய்')}
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {t('Save Changes', 'மாற்றங்களைச் சேமி')}
                </Button>
              </div>
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
          <div className={formFieldStyles.moneyDonationList.modal.overlay}>
            <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-6 rounded-t-lg flex-shrink-0">
                <div className={formFieldStyles.moneyDonationList.modal.header}>
                  <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('All Money Donation Logs', 'அனைத்து பண நன்கொடை பதிவுகள்')}</h2>
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
                                  {t('Donation ID', 'நன்கொடை ஐடி')}
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
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${lg.action === 'create' ? 'bg-green-100 text-green-800' :
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
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.register_no ?? '-'}</td>
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
                                        const date = details.date || details.after?.date || details.before?.date;
                                        const name = details.name || details.after?.name || details.before?.name;
                                        const amount = details.amount || details.after?.amount || details.before?.amount;
                                        const phone = details.phone || details.after?.phone || details.before?.phone;
                                        const reason = details.reason || details.after?.reason || details.before?.reason;

                                        return (
                                          <div className="space-y-2">
                                            <div className="bg-green-50 p-3 rounded border text-xs">
                                              <div className="font-medium text-green-700 mb-2">{t('Money Donation Details', 'பண நன்கொடை விவரங்கள்')}</div>
                                              <div className="space-y-1 text-gray-600">
                                                {registerNo && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Receipt No', 'ரசீது எண்')}:</span>
                                                    <span>{registerNo}</span>
                                                  </div>
                                                )}
                                                {name && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Name', 'பெயர்')}:</span>
                                                    <span>{name}</span>
                                                  </div>
                                                )}
                                                {date && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Date', 'தேதி')}:</span>
                                                    <span>{date}</span>
                                                  </div>
                                                )}
                                                {amount && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Amount', 'தொகை')}:</span>
                                                    <span>{amount}</span>
                                                  </div>
                                                )}
                                                {phone && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Phone', 'கைபேசி')}:</span>
                                                    <span>{phone}</span>
                                                  </div>
                                                )}
                                                {reason && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Reason', 'காரணம்')}:</span>
                                                    <span>{reason}</span>
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
                              loadAllDonationLogs(prevPage);
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
                              loadAllDonationLogs(nextPage);
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
        {/* Logs Modal */}
        {logsFor !== null && (
          <div className={formFieldStyles.moneyDonationList.modal.overlay}>
            <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeLogs} />
            <div className={formFieldStyles.moneyDonationList.modal.container}>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-6 rounded-t-lg">
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
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${lg.action === 'create' ? 'bg-green-100 text-green-800' :
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
                                    const date = details.date || details.after?.date || details.before?.date;
                                    const name = details.name || details.after?.name || details.before?.name;
                                    const amount = details.amount || details.after?.amount || details.before?.amount;
                                    const phone = details.phone || details.after?.phone || details.before?.phone;
                                    const reason = details.reason || details.after?.reason || details.before?.reason;

                                    return (
                                      <div className="space-y-2">
                                        <div className="bg-green-50 p-3 rounded border text-xs">
                                          <div className="font-medium text-green-700 mb-2">{t('Money Donation Details', 'பண நன்கொடை விவரங்கள்')}</div>
                                          <div className="space-y-1 text-gray-600">
                                            {registerNo && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Receipt No', 'ரசீது எண்')}:</span>
                                                <span>{registerNo}</span>
                                              </div>
                                            )}
                                            {name && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Name', 'பெயர்')}:</span>
                                                <span>{name}</span>
                                              </div>
                                            )}
                                            {date && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Date', 'தேதி')}:</span>
                                                <span>{date}</span>
                                              </div>
                                            )}
                                            {amount && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Amount', 'தொகை')}:</span>
                                                <span>{amount}</span>
                                              </div>
                                            )}
                                            {phone && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Phone', 'கைபேசி')}:</span>
                                                <span>{phone}</span>
                                              </div>
                                            )}
                                            {reason && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Reason', 'காரணம்')}:</span>
                                                <span>{reason}</span>
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
