import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { PrintButton } from '@/components/ui/print-button';
import { Modal } from '@/components/ui/modal';
import { useNavigate } from 'react-router-dom';
import { Trash2, Search, Loader2, FileSpreadsheet, FileDown, Edit, History, IndianRupee, Save, X, Settings2 } from 'lucide-react';
import { cn, formFieldStyles, pageContainerStyles } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "@/components/ui/use-toast";

interface HallBooking {
  id: number;
  register_no: string | null;
  date: string | null;
  entry_date: string | null;
  booking_date: string | null;
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
  cleaning?: string | number | null;
  chair?: string | number | null;
  eb?: string | number | null;
  gas?: string | number | null;
  ac?: string | number | null;
  check_in_date?: string | null;
  check_in_time?: string | null;
  check_out_date?: string | null;
  check_out_time?: string | null;
}

interface HallBookingLog {
  id: number;
  hall_booking_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  hall_booking_name: string | null;
  receipt_number: string | null;
  details: any;
}

export default function HallListPage() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<HallBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [q, setQ] = useState('');
  
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

  // Helper to convert date to YYYY-MM-DD format for date inputs
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch (e) {
      return '';
    }
  };
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Payment state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<HallBooking | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const toNum = (v: any) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };

  // Modal toggle states
  const [showPayCheckInOut, setShowPayCheckInOut] = useState(false);
  const [showPayAdditional, setShowPayAdditional] = useState(false);

  const calculateModalTotals = () => {
    if (!selectedBooking) return;
    const getVal = (id: string) => Number((document.getElementById(id) as HTMLInputElement)?.value || 0);

    const cleaning = getVal('pay_cleaning');
    const chair = getVal('pay_chair');
    const eb = getVal('pay_eb');
    const gas = getVal('pay_gas');
    const ac = getVal('pay_ac');

    // Base total = old total - old charges
    const oldCharges = toNum(selectedBooking.cleaning) + toNum(selectedBooking.chair) + toNum(selectedBooking.eb) + toNum(selectedBooking.gas) + toNum(selectedBooking.ac);
    const baseTotal = getVal('pay_baseTotal') || Math.max(0, toNum(selectedBooking.total_amount) - oldCharges);
    const newTotal = baseTotal + cleaning + chair + eb + gas + ac;

    const totalEl = document.getElementById('modal_new_total');
    if (totalEl) totalEl.innerText = `${newTotal.toLocaleString()}`;

    const balEl = document.getElementById('modal_new_balance');
    if (balEl) {
      const adv = toNum(selectedBooking.advance_amount) + Number(payAmount || 0);
      balEl.innerText = `${Math.max(0, newTotal - adv).toLocaleString()}`;
    }
  };

  // Update balance display when payAmount changes
  useEffect(() => {
    if (showPayModal) calculateModalTotals();
  }, [payAmount, showPayModal]);

  // Logs state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<HallBookingLog[]>([]);
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<HallBookingLog[]>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const [allLogsPageSize] = useState(50);

  // User names and details for logs
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, { name: string, username?: string, mobile?: string }>>({});

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);


  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

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

  // Logs functions
  const openLogs = async (item: HallBooking) => {
    setLogsFor(item.id);
    setLogsLoading(true);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/${item.id}/logs`, {
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
    await loadAllHallBookingLogs();
  };

  const loadAllHallBookingLogs = async (pageNum?: number) => {
    const pageToLoad = pageNum || allLogsPage;
    setAllLogsLoading(true);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/logs?page=${pageToLoad}&pageSize=${allLogsPageSize}`, {
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

  const handleDownloadReceipt = async (bookingId: number, registerNo: string | null) => {
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/${bookingId}/receipt.pdf`, {
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
      link.download = `receipt-${registerNo || bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert(t("Failed to download receipt. Please try again.", "ரசீதைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/dashboard/hall/edit/${id}`);
  };

  type ColKey =
    | '#'
    | 'register_no'
    | 'entry_date'
    | 'booking_date'
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
    | 'remarks'
    | 'actions';


  const allColDefs: Array<{
    key: ColKey;
    label: string;
    getValue: (row: HallBooking, idx: number) => string | number;
  }> = [
    { key: '#', label: 'S.No', getValue: (_, idx) => idx + 1 },
    { key: 'register_no', label: t('Receipt No', 'ரசீது எண்'), getValue: (r) => r.register_no || '' },
    { key: 'entry_date', label: t('Entry Date', 'பதிவு தேதி'), getValue: (r) => formatDate(r.entry_date) },
    { key: 'booking_date', label: t('Booking Date', 'பூஜை தேதி'), getValue: (r) => formatDate(r.booking_date) },
    { key: 'date', label: t('Legacy Date', 'தேதி'), getValue: (r) => formatDate(r.date) },
    { key: 'time', label: t('Time', 'நேரம்'), getValue: (r) => r.time || '' },
    { key: 'event', label: t('Function', 'நிகழ்வு'), getValue: (r) => r.event || '' },
    { key: 'subdivision', label: t('Subdivision', 'துணை பிரிவு'), getValue: (r) => r.subdivision || '' },
    { key: 'name', label: t('Name', 'பெயர்'), getValue: (r) => r.name || '' },
    { key: 'address', label: t('Address', 'முகவரி'), getValue: (r) => r.address || '' },
    { key: 'village', label: t('Village', 'கிராமம்'), getValue: (r) => r.village || '' },
    { key: 'mobile', label: t('Phone', 'தொலைபேசி'), getValue: (r) => r.mobile || '' },
    { key: 'advance_amount', label: t('Advance', 'முன்பணம்'), getValue: (r) => toNum(r.advance_amount) },
    { key: 'total_amount', label: t('Total', 'மொத்தம்'), getValue: (r) => toNum(r.total_amount) },
    { key: 'balance_amount', label: t('Balance', 'இருப்பு'), getValue: (r) => toNum(r.balance_amount) },
    { key: 'remarks', label: t('Remarks', 'குறிப்புகள்'), getValue: (r) => r.remarks || '' },
  ];

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    ...allColDefs.map(c => ({
      key: c.key,
      label: c.label,
      align: c.key === 'advance_amount' || c.key === 'total_amount' || c.key === 'balance_amount' ? 'right' : c.key === '#' ? 'center' : 'left' as any,
    })),
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' }
  ];

  const STORAGE_KEY = 'hall_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true,
    register_no: true,
    entry_date: true,
    booking_date: true,
    date: false,
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols)); } catch { }
  }, [visibleCols]);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Totals

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

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    fetchData(1, newPageSize);
  };

  const fetchData = async (page: number = currentPage, limit: number = pageSize) => {
    setLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('sort', 'desc'); // Add descending order parameter
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      const url = 'https://templeapi.agniplay.com/api/hall-bookings' + (params.toString() ? `?${params.toString()}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      // Handle paginated response
      if (data.data && Array.isArray(data.data)) {
        // Sort by register_no in descending order
        const sortedData = [...data.data].sort((a: HallBooking, b: HallBooking) => {
          // Convert register_no to numbers for proper numeric comparison
          const numA = a.register_no ? parseInt(a.register_no.replace(/\D/g, ''), 10) : 0;
          const numB = b.register_no ? parseInt(b.register_no.replace(/\D/g, ''), 10) : 0;
          return numB - numA; // For descending order
        });
        setRows(sortedData);
        setTotalRecords(data.total || data.data.length);
      } else if (Array.isArray(data)) {
        // Fallback for non-paginated response
        const sortedData = [...data].sort((a: HallBooking, b: HallBooking) => {
          // Convert register_no to numbers for proper numeric comparison
          const numA = a.register_no ? parseInt(a.register_no.replace(/\D/g, ''), 10) : 0;
          const numB = b.register_no ? parseInt(b.register_no.replace(/\D/g, ''), 10) : 0;
          return numB - numA; // For descending order
        });
        setRows(sortedData);
        setTotalRecords(sortedData.length);
      } else {
        setRows([]);
        setTotalRecords(0);
      }

      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleExportCSV = () => {
    try {
      const activeCols = allColDefs.filter(c => c.key !== 'actions' && visibleCols[c.key]);
      const headers = activeCols.map(c => c.label);
      const csvRows = rows.map((r, idx) => activeCols.map(c => String(c.getValue(r, idx))));

      const csvContent = [
        headers.join(","),
        ...csvRows.map((row) => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.setAttribute("href", url);
      link.setAttribute("download", `hall-bookings-${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV export failed", e);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to export CSV.", "CSV ஏற்றுமதி தோல்வியடைந்தது."),
        variant: "destructive",
      });
    }
  };

  const exportVisiblePDF = () => {
    try {
      // 1. Filter: only visible cols, never 'actions'
      const activeCols = allColDefs.filter(c => c.key !== 'actions' && visibleCols[c.key]);

      if (activeCols.length === 0) {
        toast({
          title: t("Error", "பிழை"),
          description: t("Please make at least one column visible.", "குறைந்தது ஒரு நெடுவரிசையைக் காட்டுங்கள்."),
          variant: "destructive",
        });
        return;
      }

      // 2. Build table data - always export full rows array
      // Use shorter labels for PDF headers to fit better
      const pdfHeaderMap: Record<string, string> = {
        '#': 'S.No',
        'register_no': 'Receipt',
        'entry_date': 'Entry',
        'booking_date': 'Booking',
        'date': 'Legacy',
        'time': 'Time',
        'event': 'Event',
        'subdivision': 'Sub',
        'name': 'Name',
        'address': 'Address',
        'village': 'Village',
        'mobile': 'Phone',
        'advance_amount': 'Adv',
        'total_amount': 'Total',
        'balance_amount': 'Balance',
      };

      const headCells = activeCols.map(c => pdfHeaderMap[c.key] || c.label);
      const exportRows = rows.map((r, idx) => activeCols.map(c => {
        const val = c.getValue(r, idx);
        // CRITICAL: NEVER use ₹ inside doc.text() or table cells -> use "Rs." instead
        return typeof val === 'string' ? val.replace(/₹/g, 'Rs.') : val;
      }));

      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const now = new Date();
      const templeName = (user as any)?.templeName || "Temple Management";
      const title = t("Hall Bookings List", "மண்டப பதிவுகள் பட்டியல்");

      /* =========================================================
         🎨 PDF Header (page 1 only via startY)
      ========================================================= */
      // Orange accent line at top
      doc.setDrawColor(204, 85, 0);
      doc.setLineWidth(2);
      doc.line(10, 12, pageWidth - 10, 12);

      // Temple/company name large orange top-left
      doc.setFontSize(24);
      doc.setTextColor(204, 85, 0);
      doc.setFont(undefined, "bold");
      doc.text(templeName, 14, 25);

      // Page title top-right
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text(title, pageWidth - 14, 25, { align: "right" });

      // Generated date + record count
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.setFont(undefined, "normal");
      doc.text(`${t("Generated", "உருவாக்கப்பட்டது")}: ${now.toLocaleDateString()}`, pageWidth - 14, 32, { align: "right" });
      doc.text(`${t("Records", "பதிவுகள்")}: ${rows.length}`, pageWidth - 14, 38, { align: "right" });

      // Divider
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(10, 42, pageWidth - 10, 42);

      // Summary bar (totals)
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(10, 46, pageWidth - 20, 12, 3, 3, "F");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, "bold");
      doc.text(`${t("Total Amount", "மொத்த தொகை")}: Rs. ${String(Math.round(totals.total))}`, 14, 54);
      doc.text(`${t("Total Records", "மொத்த பதிவுகள்")}: ${rows.length}`, pageWidth - 14, 54, { align: "right" });

      /* =========================================================
         📏 Auto column widths & Alignment per key
      ========================================================= */
      // Define proportional widths for different column types
      const getColumnWidth = (key: string) => {
        // Date columns need more space
        if (['entry_date', 'booking_date', 'date'].includes(key)) return 1.3;
        // Number columns can be narrower
        if (['#', 'time'].includes(key)) return 0.7;
        // Advance/Total/Balance columns
        if (['advance_amount', 'total_amount', 'balance_amount'].includes(key)) return 1.1;
        // Default width
        return 1;
      };

      const totalWidth = activeCols.reduce((sum, col) => sum + getColumnWidth(col.key), 0);
      const baseColWidth = (pageWidth - 20) / totalWidth;

      const rightAlign = ['advance_amount', 'total_amount', 'balance_amount'];
      const centerAlign = ['#', 'register_no', 'entry_date', 'booking_date', 'date', 'time', 'mobile'];
      
      const columnStyles: Record<number, any> = {};
      activeCols.forEach((col, i) => {
        const proportionalWidth = baseColWidth * getColumnWidth(col.key);
        columnStyles[i] = {
          cellWidth: proportionalWidth,
          halign: rightAlign.includes(col.key) ? 'right' : centerAlign.includes(col.key) ? 'center' : 'left',
        };
      });

      /* =========================================================
         📋 autoTable config
         CRITICAL: startY:62 for page 1, margin.top:15 for page 2+
      ========================================================= */
      autoTable(doc, {
        head: [headCells],
        body: exportRows,
        startY: 62,
        margin: { top: 15, left: 10, right: 10, bottom: 25 },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          valign: "middle",
          lineColor: [220, 220, 220],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [204, 85, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          fontSize: 7,
          cellPadding: 2,
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles,
        didDrawPage: (data) => {
          // Footer on every page: name left, date right, page number center
          const pWidth = doc.internal.pageSize.getWidth();
          const pHeight = doc.internal.pageSize.getHeight();
          doc.setDrawColor(200);
          doc.line(10, pHeight - 18, pWidth - 10, pHeight - 18);
          doc.setFontSize(8);
          doc.setTextColor(80);
          doc.setFont(undefined, "bold");
          doc.text(templeName, 10, pHeight - 10);
          doc.setFont(undefined, "normal");
          doc.text(now.toLocaleDateString(), pWidth - 10, pHeight - 10, { align: "right" });
          doc.setFont(undefined, "bold");
          doc.text(`Page ${data.pageNumber} / ${doc.getNumberOfPages()}`, pWidth / 2, pHeight - 5, { align: "center" });
        },
      });

      const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      doc.save(`hall-bookings-visible-${stamp}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to export PDF.", "PDF ஏற்றுமதி தோல்வியடைந்தது."),
        variant: "destructive",
      });
    }
  };

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={cn("w-full", theme.header.container)}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
              {t('Hall Bookings', 'மண்டப பதிவுகள்')}
            </CardTitle>
          </div>
        </CardHeader>

        {error && <div className="text-red-600">{error}</div>}

        {/* Table Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Search + Export Toolbar */}
            <div className={formFieldStyles.moneyDonationList.filters.container}>
              <div className={formFieldStyles.moneyDonationList.filters.form}>
                <div className={formFieldStyles.moneyDonationList.filters.searchContainer}>
                  <div className={formFieldStyles.moneyDonationList.filters.searchIcon}>
                    <Search className={formFieldStyles.moneyDonationList.filters.searchIconSvg} />
                  </div>
                  <Input
                    type="search"
                    placeholder={t('Search by name, receipt, village, or phone...', 'பெயர், ரசீது, கிராமம் அல்லது தொலைபேசி மூலம் தேடவும்...')}
                    className={cn(theme.input.base, theme.input.size.sm, "pl-8")}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (setCurrentPage(1), fetchData(1))}
                  />
                </div>
                <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                  <Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => { setQ(''); setCurrentPage(1); fetchData(1); }}>
                    {t('Clear', 'அழி')}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    variant="outline"
                    onClick={() => setMenuOpen(prev => !prev)}
                  >
                    <Settings2 className="h-3 w-3 mr-1" />
                    {t('Columns', 'நெடுவரிசைகள்')}
                  </Button>
                  <Button size="sm" className="h-8 text-xs" variant="outline" onClick={handleExportCSV} disabled={loading || rows.length === 0}>
                    {t('Export CSV', 'CSV ஏற்றுமதி')}
                  </Button>
                  <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportVisiblePDF} disabled={loading || rows.length === 0}>
                    {t('Export PDF', 'PDF ஏற்றுமதி')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={tableClasses.scrollContainerWrapper}>
               <div className={tableClasses.scrollContainer} onContextMenu={onContextMenu}>
                {loading ? (
                  <div className={tableClasses.emptyState}>
                    <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                  </div>
                ) : (
                  <Table className={tableClasses.container}>
                    <TableHeader className={tableClasses.header}>
                       <TableRow className={tableClasses.row}>
                         {allColumns.filter(c => visibleCols[c.key]).map(col => (
                           <TableHead key={col.key} className={cn(tableClasses.headerCell, col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left')}>
                             {col.label}
                           </TableHead>
                         ))}
                       </TableRow>
                     </TableHeader>
                    <TableBody>
                       {rows.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                             {t('No records found', 'பதிவுகள் கிடைக்கவில்லை')}
                           </TableCell>
                         </TableRow>
                       ) : (
                         rows.map((r, index) => (
                           <TableRow key={r.id} className={tableClasses.row}>
                             {visibleCols['#'] && <TableCell className={tableClasses.cellSno}>{(currentPage - 1) * pageSize + index + 1}</TableCell>}
                             {visibleCols['register_no'] && <TableCell className={tableClasses.cell}>{r.register_no || '-'}</TableCell>}
                             {visibleCols['entry_date'] && <TableCell className={tableClasses.cell}>{formatDate(r.entry_date)}</TableCell>}
                             {visibleCols['booking_date'] && <TableCell className={tableClasses.cell}>{formatDate(r.booking_date)}</TableCell>}
                             {visibleCols['date'] && <TableCell className={tableClasses.cell}>{formatDate(r.date)}</TableCell>}
                             {visibleCols['time'] && <TableCell className={tableClasses.cell}>{r.time || '-'}</TableCell>}
                             {visibleCols['event'] && <TableCell className={tableClasses.cell}>{r.event || '-'}</TableCell>}
                             {visibleCols['subdivision'] && <TableCell className={tableClasses.cell}>{r.subdivision || '-'}</TableCell>}
                             {visibleCols['name'] && <TableCell className={tableClasses.cell}>{r.name || '-'}</TableCell>}
                             {visibleCols['address'] && <TableCell className={tableClasses.cell}>{r.address || '-'}</TableCell>}
                             {visibleCols['village'] && <TableCell className={tableClasses.cell}>{r.village || '-'}</TableCell>}
                             {visibleCols['mobile'] && <TableCell className={tableClasses.cell}>{r.mobile || '-'}</TableCell>}
                             {visibleCols['advance_amount'] && <TableCell className={cn(tableClasses.cell, 'text-right')}>{toNum(r.advance_amount).toLocaleString()}</TableCell>}
                             {visibleCols['total_amount'] && <TableCell className={cn(tableClasses.cell, 'text-right')}>{toNum(r.total_amount).toLocaleString()}</TableCell>}
                             {visibleCols['balance_amount'] && <TableCell className={cn(tableClasses.cell, 'text-right')}>{toNum(r.balance_amount).toLocaleString()}</TableCell>}
                             {visibleCols['remarks'] && <TableCell className={tableClasses.cell}>{r.remarks || '-'}</TableCell>}
                             {visibleCols['actions'] && (
                               <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                                 <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBooking(r);
                                        setPayAmount(String(toNum(r.balance_amount)));
                                        setShowPayModal(true);
                                        setShowPayCheckInOut(false);
                                        setShowPayAdditional(false);
                                      }}
                                      className={cn(buttonClasses.actionSuccess, "h-6 w-6 p-0")}
                                      title={t('Add Payment & Details', 'கட்டணம் மற்றும் விவரங்களைச் சேமி')}
                                    >
                                      <IndianRupee className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownloadReceipt(r.id, r.registerNo)}
                                      className={cn(buttonClasses.actionSecondary, "h-6 w-6 p-0")}
                                      title={t('Print Receipt', 'ரசீது அச்சிடு')}
                                    >
                                      <FileDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(r.id)}
                                      className={cn(buttonClasses.actionPrimary, "h-6 w-6 p-0")}
                                      title={t('Edit', 'திருத்து')}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (index === 0) {
                                          setSelectedBookingId(r.id);
                                          setShowDeleteModal(true);
                                        }
                                      }}
                                      disabled={index !== 0}
                                      className={index === 0 ? cn(tableClasses.actionButtonDanger, "h-6 w-6 p-0") : "opacity-50 cursor-not-allowed h-6 w-6 p-0"}
                                      title={t('Delete', 'நீக்கு')}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                 </div>
                               </TableCell>
                             )}
                           </TableRow>
                          ))
                        )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              <div className={tableClasses.pagination}>
                <div className="text-sm text-gray-700">
                  {t("Showing", "காட்டப்படுகிறது")} {(currentPage - 1) * pageSize + 1} {t("to", "இலிருந்து")} {Math.min(currentPage * pageSize, totalRecords)} {t("of", "இல்")}{" "}
                  <span className="font-medium">{totalRecords}</span> {t("items", "உருப்படிகள்")}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                      fetchData(newPage);
                    }}
                    className={tableClasses.paginationButton}
                  >
                    {t('Previous', 'முந்தைய')}
                  </Button>
                  <span className="text-xs flex items-center">
                    {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {Math.ceil(totalRecords / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= Math.ceil(totalRecords / pageSize)}
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      fetchData(newPage);
                    }}
                    className={tableClasses.paginationButton}
                  >
                    {t('Next', 'அடுத்தது')}
                  </Button>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="ml-auto border rounded px-2 py-0.5 text-xs"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(size => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
               </div>
             </CardContent>
           </Card>

           {/* Column Toggle Context Menu */}
           {menuOpen && (
             <div
               ref={menuRef}
               style={{ position: 'fixed', top: menuPos.y, left: menuPos.x, zIndex: 9999 }}
               className="bg-white border rounded shadow-lg py-1 min-w-[180px] max-h-[60vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}
             >
               <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b">{t('Toggle Columns', 'பத்திகளை மாற்று')}</div>
               {allColumns.map(col => (
                 <label key={col.key} className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-100 cursor-pointer">
                   <input
                     type="checkbox"
                     checked={visibleCols[col.key]}
                     onChange={() => setVisibleCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                     className="rounded"
                   />
                   {col.label}
                 </label>
               ))}
             </div>
           )}

         {/* Financial Totals */}
        <div className="mt-2 flex justify-end text-xs text-gray-600">
          <div className="flex gap-3">
            <span>{t('Advance', 'முன்பணம்')}: {totals.advance.toLocaleString()}</span>
            <span>{t('Total', 'மொத்தம்')}: {totals.total.toLocaleString()}</span>
            <span>{t('Balance', 'இருப்பு')}: {totals.balance.toLocaleString()}</span>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedBookingId && (
          <Modal
            title={t('Confirm Delete', 'நீக்குவதை உறுதிப்படுத்தவும்')}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedBookingId(null);
            }}
          >
            <p className="mb-4">{t('Are you sure you want to delete this booking? This action cannot be undone.', 'இந்த பதிவை நீக்க விரும்புகிறீர்களா? இந்த நடவடிக்கையை மாற்ற முடியாது.')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedBookingId(null);
                }}
                className="border px-3 py-1 rounded hover:bg-gray-100"
                disabled={deleting}
              >
                {t('Cancel', 'ரத்து')}
              </button>
              <button
                onClick={async () => {
                  if (!selectedBookingId) return;
                  setDeleting(true);
                  try {
                    const res = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/${selectedBookingId}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    });

                    if (!res.ok) {
                      throw new Error('Failed to delete booking');
                    }

                    // Refresh the current page
                    fetchData(currentPage);

                    // Close modal
                    setShowDeleteModal(false);
                    setSelectedBookingId(null);
                  } catch (error: any) {
                    setError(error.message || t('Delete failed', 'நீக்குவதில் தோல்வி'));
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? t('Deleting...', 'நீக்குகிறது...') : t('Delete', 'நீக்கு')}
              </button>
            </div>
          </Modal>
        )}

        {/* Edit & Pay Modal */}
        {showPayModal && selectedBooking && (
          <Modal
            title={t('Edit & Pay Booking', 'பதிவைத் திருத்தவும் மற்றும் கட்டணம் செலுத்தவும்')}
            onClose={() => {
              setShowPayModal(false);
              setSelectedBooking(null);
              setPayAmount('');
            }}
          >
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <p className="text-xs text-blue-600 uppercase font-semibold">{t('Balance Due', 'நிலுவைத் தொகை')}</p>
                  <p className="text-xl font-bold text-blue-700">{toNum(selectedBooking.balance_amount).toLocaleString()}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p className="font-mono">{selectedBooking.register_no}</p>
                </div>
              </div>

              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Receipt No', 'ரசீது எண்')}</label>
                  <Input className="h-8 text-sm" defaultValue={selectedBooking.register_no || ''} id="pay_registerNo" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Name', 'பெயர்')}</label>
                  <Input className="h-8 text-sm" defaultValue={selectedBooking.name || ''} id="pay_name" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Mobile', 'கைபேசி')}</label>
                  <Input className="h-8 text-sm" defaultValue={selectedBooking.mobile || ''} id="pay_mobile" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Event', 'நிகழ்வு')}</label>
                  <Input className="h-8 text-sm" defaultValue={selectedBooking.event || ''} id="pay_event" />
                </div>
              </div>

              {/* Date Section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Entry Date', 'பதிவு தேதி')}</label>
                  <Input 
                    type="date" 
                    className={cn("h-8 text-sm", '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')} 
                    defaultValue={formatDateForInput(selectedBooking.entry_date) || formatDateForInput(selectedBooking.date) || ''} 
                    id="pay_entryDate" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Booking Date', 'பூஜை தேதி')}</label>
                  <Input 
                    type="date" 
                    className={cn("h-8 text-sm", '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')} 
                    defaultValue={formatDateForInput(selectedBooking.booking_date) || formatDateForInput(selectedBooking.date) || ''} 
                    id="pay_bookingDate" 
                  />
                </div>
              </div>

              {/* Check-in / Check-out Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full p-2 bg-gray-50 flex items-center justify-between text-sm font-medium hover:bg-gray-100"
                  onClick={() => setShowPayCheckInOut(!showPayCheckInOut)}
                >
                  <span>{t('Check-in / Check-out Details', 'செக்-இன் / செக்-அவுட் விவரங்கள்')}</span>
                  <span>{showPayCheckInOut ? '▲' : '▼'}</span>
                </button>
                {showPayCheckInOut && (
                  <div className="p-3 grid grid-cols-2 gap-3 bg-white">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Check-in Date', 'செக்-இன் தேதி')}</label>
                      <Input type="date" className="h-8 text-sm" defaultValue={formatDateForInput(selectedBooking.check_in_date) || ''} id="pay_checkInDate" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Time', 'நேரம்')}</label>
                      <Input type="time" className="h-8 text-sm" defaultValue={selectedBooking.check_in_time || ''} id="pay_checkInTime" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Check-out Date', 'செக்-அவுட் தேதி')}</label>
                      <Input type="date" className="h-8 text-sm" defaultValue={formatDateForInput(selectedBooking.check_out_date) || ''} id="pay_checkOutDate" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Time', 'நேரம்')}</label>
                      <Input type="time" className="h-8 text-sm" defaultValue={selectedBooking.check_out_time || ''} id="pay_checkOutTime" />
                    </div>
                  </div>
                )}
              </div>

              {/* Charges & Total Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full p-2 bg-gray-50 flex items-center justify-between text-sm font-medium hover:bg-gray-100"
                  onClick={() => setShowPayAdditional(!showPayAdditional)}
                >
                  <span>{t('Charges & Total', 'கட்டணங்கள் மற்றும் மொத்தம்')}</span>
                  <span>{showPayAdditional ? '▲' : '▼'}</span>
                </button>
                {showPayAdditional && (
                  <div className="p-3 space-y-3 bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Cleaning', 'சுத்தம் செய்தல்')}</label>
                        <Input type="number" className="h-8 text-sm" defaultValue={selectedBooking.cleaning || ''} id="pay_cleaning" placeholder="0.00"
                          onChange={calculateModalTotals} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Chair', 'நாற்காலி')}</label>
                        <Input type="number" className="h-8 text-sm" defaultValue={selectedBooking.chair || ''} id="pay_chair" placeholder="0.00"
                          onChange={calculateModalTotals} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">EB</label>
                        <Input type="number" className="h-8 text-sm" defaultValue={selectedBooking.eb || ''} id="pay_eb" placeholder="0.00"
                          onChange={calculateModalTotals} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Gas', 'கேஸ்')}</label>
                        <Input type="number" className="h-8 text-sm" defaultValue={selectedBooking.gas || ''} id="pay_gas" placeholder="0.00"
                          onChange={calculateModalTotals} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">AC</label>
                        <Input type="number" className="h-8 text-sm" defaultValue={selectedBooking.ac || ''} id="pay_ac" placeholder="0.00"
                          onChange={calculateModalTotals} />
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">{t('Base Total Amount', 'அடிப்படை மொத்தத் தொகை')}</label>
                        <Input 
                          type="number" 
                          className="h-8 text-sm font-bold" 
                          defaultValue={Math.max(0, toNum(selectedBooking.total_amount) - (toNum(selectedBooking.cleaning) + toNum(selectedBooking.chair) + toNum(selectedBooking.eb) + toNum(selectedBooking.gas) + toNum(selectedBooking.ac)))} 
                          id="pay_baseTotal" 
                          onChange={calculateModalTotals}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">{t('Projected Total', 'உத்தேச மொத்தம்')}</div>
                  <div className="font-bold text-gray-900" id="modal_new_total">{toNum(selectedBooking.total_amount).toLocaleString()}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-[10px] text-orange-600 uppercase font-semibold">{t('Remaining Balance', 'மீதமுள்ள நிலுவை')}</div>
                  <div className="font-bold text-orange-700" id="modal_new_balance">{toNum(selectedBooking.balance_amount).toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-2 border-t mt-2">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{t('Payment Amount', 'கட்டணத் தொகை')}</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="w-full"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[0.25, 0.5, 1].map((pct) => {
                        const amt = Math.round(toNum(selectedBooking.balance_amount) * pct);
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setPayAmount(String(amt))}
                            className="text-[10px] px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                          >
                            {pct === 1 ? t('Full', 'முழுவதும்') : `${pct * 100}%`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('Payment Mode', 'கட்டணம் செலுத்தும் முறை')}</label>
                      <select id="pay_mode" className={cn(theme.input.base, theme.input.size.sm)}>
                        <option value="CASH A/C">{t('Cash', 'பணம்')}</option>
                        <option value="BANK A/C">{t('Bank / UPI', 'வங்கி / UPI')}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{t('Remarks', 'குறிப்புகள்')}</label>
                      <Input id="pay_remarks" placeholder={t('Optional notes', 'விருப்பமான குறிப்புகள்')} className={theme.input.size.sm} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4 sticky bottom-0 bg-white">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedBooking(null);
                    setPayAmount('');
                  }}
                  disabled={paying}
                >
                  {t('Cancel', 'ரத்து')}
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={paying}
                  onClick={async () => {
                    setPaying(true);
                    try {
                      const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;

                      const payload = {
                        amount: Number(payAmount || 0),
                        transferTo: getVal('pay_mode'),
                        remarks: getVal('pay_remarks'),
                        registerNo: getVal('pay_registerNo'),
                        name: getVal('pay_name'),
                        mobile: getVal('pay_mobile'),
                        event: getVal('pay_event'),
                        entryDate: getVal('pay_entryDate'),
                        bookingDate: getVal('pay_bookingDate'),
                        checkInDate: getVal('pay_checkInDate'),
                        checkInTime: getVal('pay_checkInTime'),
                        checkOutDate: getVal('pay_checkOutDate'),
                        checkOutTime: getVal('pay_checkOutTime'),
                        totalAmount: document.getElementById('modal_new_total')?.innerText.replace(/,/g, ''),
                        cleaning: getVal('pay_cleaning'),
                        chair: getVal('pay_chair'),
                        eb: getVal('pay_eb'),
                        gas: getVal('pay_gas'),
                        ac: getVal('pay_ac')
                      };

                      const res = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/${selectedBooking.id}/pay`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                      });

                      if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || 'Payment failed');
                      }

                      fetchData(currentPage);
                      setShowPayModal(false);
                      setSelectedBooking(null);
                      setPayAmount('');
                    } catch (err: any) {
                      alert(err.message || 'Payment failed');
                    } finally {
                      setPaying(false);
                    }
                  }}
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Update & Record', 'புதுப்பித்து சேமி')}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* All Hall Booking Logs Modal */}
        {allLogsOpen && (
          <div className={formFieldStyles.moneyDonationList.modal.overlay}>
            <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-6 rounded-t-lg flex-shrink-0">
                <div className={formFieldStyles.moneyDonationList.modal.header}>
                  <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('All Hall Booking Logs', 'அனைத்து மண்டப பதிவு பதிவுகள்')}</h2>
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
                                  {t('Booking ID', 'பதிவு ஐடி')}
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
                                            lg.action === 'payment' ? 'bg-emerald-100 text-emerald-800' :
                                              'bg-gray-100 text-gray-800'
                                      }`}>
                                      {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                                        lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                                          lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                                            lg.action === 'payment' ? t('Payment', 'கட்டணம்') :
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
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.hall_booking_id}</td>
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
                                        // Parse hall booking details from the log data
                                        const details = lg.details;
                                        if (!details) return <span className="text-gray-400">-</span>;

                                        // Extract specific fields from the details
                                        const registerNo = details.register_no || details.after?.register_no || details.before?.register_no;
                                        const name = details.name || details.after?.name || details.before?.name;
                                        const mobile = details.mobile || details.after?.mobile || details.before?.mobile;
                                        const advanceAmount = details.advance_amount || details.after?.advance_amount || details.before?.advance_amount;
                                        const totalAmount = details.total_amount || details.after?.total_amount || details.before?.total_amount;
                                        const balanceAmount = details.balance_amount || details.after?.balance_amount || details.before?.balance_amount;
                                        const event = details.event || details.after?.event || details.before?.event;
                                        const date = details.date || details.after?.date || details.before?.date;
                                        const time = details.time || details.after?.time || details.before?.time;
                                        const village = details.village || details.after?.village || details.before?.village;

                                        return (
                                          <div className="space-y-2">
                                            <div className="bg-blue-50 p-3 rounded border text-xs">
                                              <div className="font-medium text-blue-700 mb-2">{t('Hall Booking Details', 'மண்டப பதிவு விவரங்கள்')}</div>
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
                                                {mobile && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Phone', 'கைபேசி')}:</span>
                                                    <span>{mobile}</span>
                                                  </div>
                                                )}
                                                {event && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Event', 'நிகழ்வு')}:</span>
                                                    <span>{event}</span>
                                                  </div>
                                                )}
                                                {date && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Date', 'தேதி')}:</span>
                                                    <span>{date}</span>
                                                  </div>
                                                )}
                                                {time && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Time', 'நேரம்')}:</span>
                                                    <span>{time}</span>
                                                  </div>
                                                )}
                                                {village && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Village', 'கிராமம்')}:</span>
                                                    <span>{village}</span>
                                                  </div>
                                                )}
                                                {advanceAmount && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Advance', 'முன்பணம்')}:</span>
                                                    <span>{advanceAmount}</span>
                                                  </div>
                                                )}
                                                {totalAmount && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Total', 'மொத்தம்')}:</span>
                                                    <span>{totalAmount}</span>
                                                  </div>
                                                )}
                                                {balanceAmount && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Balance', 'இருப்பு')}:</span>
                                                    <span>{balanceAmount}</span>
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
                              loadAllHallBookingLogs(prevPage);
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
                              loadAllHallBookingLogs(nextPage);
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

        {/* Hall Booking Logs Modal */}
        {logsFor && (
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
                                        lg.action === 'payment' ? 'bg-emerald-100 text-emerald-800' :
                                          'bg-gray-100 text-gray-800'
                                  }`}>
                                  {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                                    lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                                      lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                                        lg.action === 'payment' ? t('Payment', 'கட்டணம்') :
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
                                    // Parse hall booking details from the log data
                                    const details = lg.details;
                                    if (!details) return <span className="text-gray-400">-</span>;

                                    // Extract specific fields from the details
                                    const registerNo = details.register_no || details.after?.register_no || details.before?.register_no;
                                    const name = details.name || details.after?.name || details.before?.name;
                                    const mobile = details.mobile || details.after?.mobile || details.before?.mobile;
                                    const advanceAmount = details.advance_amount || details.after?.advance_amount || details.before?.advance_amount;
                                    const totalAmount = details.total_amount || details.after?.total_amount || details.before?.total_amount;
                                    const balanceAmount = details.balance_amount || details.after?.balance_amount || details.before?.balance_amount;
                                    const event = details.event || details.after?.event || details.before?.event;
                                    const date = details.date || details.after?.date || details.before?.date;
                                    const time = details.time || details.after?.time || details.before?.time;
                                    const village = details.village || details.after?.village || details.before?.village;

                                    return (
                                      <div className="space-y-2">
                                        <div className="bg-blue-50 p-3 rounded border text-xs">
                                          <div className="font-medium text-blue-700 mb-2">{t('Hall Booking Details', 'மண்டப பதிவு விவரங்கள்')}</div>
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
                                            {mobile && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Phone', 'கைபேசி')}:</span>
                                                <span>{mobile}</span>
                                              </div>
                                            )}
                                            {event && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Event', 'நிகழ்வு')}:</span>
                                                <span>{event}</span>
                                              </div>
                                            )}
                                            {date && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Date', 'தேதி')}:</span>
                                                <span>{date}</span>
                                              </div>
                                            )}
                                            {time && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Time', 'நேரம்')}:</span>
                                                <span>{time}</span>
                                              </div>
                                            )}
                                            {village && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Village', 'கிராமம்')}:</span>
                                                <span>{village}</span>
                                              </div>
                                            )}
                                            {advanceAmount && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Advance', 'முன்பணம்')}:</span>
                                                <span>{advanceAmount}</span>
                                              </div>
                                            )}
                                            {totalAmount && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Total', 'மொத்தம்')}:</span>
                                                <span>{totalAmount}</span>
                                              </div>
                                            )}
                                            {balanceAmount && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Balance', 'இருப்பு')}:</span>
                                                <span>{balanceAmount}</span>
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

        {/* Context Menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="fixed z-50 bg-white rounded shadow-lg border border-gray-200 w-48 text-xs"
            style={{ top: '200px', right: '20px' }}
          >
            <div className="px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
              <p className="text-xs text-gray-500">
                {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center px-2 py-1 rounded hover:bg-gray-50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!visibleCols[col.key]}
                    onChange={() =>
                      setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                    }
                    className={cn(theme.input.base, "h-4 w-4 text-blue-600 rounded cursor-pointer")}
                  />
                  <span className="ml-2 text-xs text-gray-700">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 p-1 border-t border-gray-200">
              <button
                className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50"
                onClick={() =>
                  setVisibleCols(
                    Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                  )
                }
              >
                {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
              </button>
              <button
                className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50"
                onClick={() =>
                  setVisibleCols(
                    Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                  )
                }
              >
                {t('Clear all', 'அனைத்தையும் அழி')}
              </button>
              <button
                className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50"
                onClick={() => setVisibleCols({ ...defaultVisible })}
              >
                {t('Reset', 'மீட்டமை')}
              </button>
              <button
                className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50 ml-auto"
                onClick={() => setMenuOpen(false)}
              >
                {t('Close', 'மூடு')}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>

  );
}
