import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { format } from 'date-fns';
import { ledgerService, LedgerEntry } from '@/services/ledgerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { FileDown, Search, RefreshCw, Edit, Trash2, Printer, Plus } from 'lucide-react';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define styles using formFieldStyles
const styles = {
  ...formFieldStyles,
  pageContainer: 'min-h-screen bg-gray-50 p-4',
  header: 'flex justify-between items-center mb-6',
  title: 'text-2xl font-bold text-gray-800',
  filterCard: 'bg-white rounded-lg shadow-md p-4 mb-6',
  filterGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  filterGroup: 'space-y-1',
  actionButtons: 'flex flex-wrap gap-2 mt-4',
  tableContainer: 'bg-white rounded-lg shadow-md overflow-hidden',
  table: 'min-w-full divide-y divide-gray-200',
  tableHeader: 'bg-gray-50',
  tableHeaderCell: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  tableRow: 'hover:bg-gray-50',
  tableCell: 'px-4 py-3 text-sm text-gray-900',
  pagination: 'flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200',
  paginationInfo: 'text-sm text-gray-700',
  paginationButtons: 'flex space-x-2',
  modalContent: 'max-w-4xl',
  modalHeader: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
  modalTitle: 'text-white',
  modalBody: 'max-h-[70vh] overflow-y-auto p-6',
  modalFooter: 'bg-gray-50 px-6 py-4 flex justify-end space-x-3',
  logItem: 'border-b border-gray-200 py-2 last:border-0',
  logHeader: 'flex justify-between items-center',
  logAction: 'font-medium',
  logDate: 'text-xs text-gray-500',
  logDetails: 'mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded',
};

export default function LedgerListPage() {
  const { language } = useLanguage();
  const { token, temple } = useAuth();
  const canExportCsv = useFeature('data_export_csv');
  const canExportPdf = useFeature('data_export_excel');
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all' as const,
    under: 'all' as const,
    name: ''
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Logs state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; action: string; created_at: string; created_by: number | null; details: any }>>([]);
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<Array<{
    id: number;
    ledger_entry_id: number;
    action: string;
    created_at: string;
    created_by: number | null;
    entry_name: string | null;
    details: any;
  }>>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const allLogsPageSize = 50;

  // User names and details for logs
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, { name: string, username?: string, mobile?: string }>>({});

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);
  const itemsPerPage = 10;

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

  // Column Keys
  type ColKey = 'date' | 'name' | 'category' | 'credit' | 'debit' | 'balance' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'category', label: t('Category', 'வகை') },
    { key: 'credit', label: t('Credit', 'கடன்'), align: 'right' },
    { key: 'debit', label: t('Debit', 'பற்று'), align: 'right' },
    { key: 'balance', label: t('Balance', 'இருப்பு'), align: 'right' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'ledger_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    date: true,
    name: true,
    category: true,
    credit: true,
    debit: true,
    balance: true,
    actions: true,
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultVisible, ...JSON.parse(saved) } : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch { }
  }, [visibleCols]);

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
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

  const visibleColCount = useMemo(
    () => Object.values(visibleCols).filter(Boolean).length,
    [visibleCols]
  );

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Load data
  useEffect(() => {
    loadData();
    loadCategories();
  }, [currentPage, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [entries, balance] = await Promise.all([
        ledgerService.getEntries({
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          type: filters.type === 'all' ? undefined : filters.type,
          under: filters.under === 'all' ? undefined : filters.under,
          name: filters.name?.trim() ? filters.name.trim() : undefined,
          page: currentPage,
          limit: itemsPerPage,
        }),
        ledgerService.getCurrentBalance(),
      ]);
      setEntries(entries.data);
      setCurrentBalance(balance);
      setTotalPages(entries.pagination.totalPages);
      setTotalCount(entries.pagination.total);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to load data', 'தரவை ஏற்ற முடியவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ledgerService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Logs functions
  const openLogs = async (entry: LedgerEntry) => {
    setLogsFor(entry.id!);
    setLogsLoading(true);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/ledger-entries/${entry.id}/logs`, {
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
    await loadAllLedgerLogs();
  };

  const loadAllLedgerLogs = async (pageNum?: number) => {
    const pageToLoad = pageNum || allLogsPage;
    setAllLogsLoading(true);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/ledger-entries/logs?page=${pageToLoad}&pageSize=${allLogsPageSize}`, {
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

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleEdit = (entry: LedgerEntry) => {
    console.log('Navigating to edit page for entry:', entry.id);
    navigate(`/dashboard/ledger/edit/${entry.id}`);
  };

  const handleDelete = async (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await ledgerService.deleteEntry(deleteId);
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const onPrintEntry = (entry: LedgerEntry) => {
    const runningBalance = entries
      .slice(0, entries.findIndex((e) => e.id === entry.id) + 1)
      .reduce((sum, e) => (e.type === 'credit' ? sum + e.amount : sum - e.amount), 0);

    const printContent = `
      <div style="text-align:center; margin-bottom:20px;">
        <h2>${t('Ledger Entry Receipt', 'பதிவேட்டு உள்ளீட்டு ரசீது')}</h2>
      </div>
      <div style="margin:20px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Date', 'தேதி')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${format(new Date(entry.date), 'dd/MM/yyyy')}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Name', 'பெயர்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${entry.name}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Category', 'வகை')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${entry.under || '-'}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Type', 'வகை')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${entry.type === 'credit' ? t('Credit', 'கடன்') : t('Debit', 'பற்று')}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Amount', 'தொகை')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatAmount(entry.amount)}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Running Balance', 'ஓட்ட இருப்பு')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatAmount(runningBalance)}</td></tr>
        </table>
      </div>
    `;

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow?.document.write(`
      <html>
        <head><title>Ledger Entry</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  const onExportCSV = async () => {
    try {
      const blob = await ledgerService.exportAsCSV({
        startDate: filters.startDate,
        endDate: filters.endDate,
        type: filters.type === 'all' ? undefined : filters.type,
        under: filters.under === 'all' ? undefined : filters.under,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ledger-entries.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV Export failed', e);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const onExportPDF = () => {
    try {
      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const now = new Date();
      const templeName = temple?.name || "Temple Management";
      const title = t("Ledger Report", "லெட்ஜர் அறிக்கை");

      // Header
      doc.setDrawColor(204, 85, 0);
      doc.setLineWidth(2);
      doc.line(10, 12, pageWidth - 10, 12);

      doc.setFontSize(20);
      doc.setTextColor(204, 85, 0);
      doc.setFont(undefined, "bold");
      doc.text(templeName, 14, 24);

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, "normal");
      doc.text("Ledger Management System", 14, 30);

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text(title, pageWidth - 14, 24, { align: "right" });

      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.setFont(undefined, "normal");
      doc.text(`${t('Generated', 'உருவாக்கப்பட்டது')}: ${now.toLocaleDateString()}`, pageWidth - 14, 30, { align: "right" });
      doc.text(`${t('Records', 'பதிவுகள்')}: ${entries.length}`, pageWidth - 14, 36, { align: "right" });

      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(10, 42, pageWidth - 10, 42);

      // Summary bar
      const totalCredit = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
      const totalDebit = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(10, 46, pageWidth - 20, 12, 3, 3, "F");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, "bold");
      
      // Center all three items in the summary bar
      const summaryY = 54;
      const summaryItems = [
        `${t('Total Credit', 'மொத்த கடன்')}: Rs. ${String(Math.round(totalCredit))}`,
        `${t('Total Debit', 'மொத்த பற்று')}: Rs. ${String(Math.round(totalDebit))}`,
        `${t('Balance', 'இருப்பு')}: Rs. ${String(Math.round(currentBalance))}`
      ];
      
      const itemWidth = (pageWidth - 20) / 3;
      summaryItems.forEach((item, idx) => {
        const x = 10 + itemWidth * idx + itemWidth / 2;
        doc.text(item, x, summaryY, { align: "center" });
      });

      // Table data
      const headCells = [
        t('S.No', 'எண்'),
        t('Date', 'தேதி'),
        t('Name', 'பெயர்'),
        t('Category', 'வகை'),
        t('Credit', 'கடன்'),
        t('Debit', 'பற்று'),
        t('Balance', 'இருப்பு'),
      ];

      // Calculate running balance for each entry
      let runningBalance = 0;
      const exportRows = entries.map((r, idx) => {
        if (r.type === 'credit') {
          runningBalance += r.amount;
        } else {
          runningBalance -= r.amount;
        }
        
        return [
          String(idx + 1),
          formatDate(r.date),
          r.name || '',
          r.under || '',
          r.type === 'credit' ? String(Math.round(r.amount)) : '',
          r.type === 'debit' ? String(Math.round(r.amount)) : '',
          String(Math.round(runningBalance)),
        ];
      });

      const columnStyles: Record<number, any> = {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 40, halign: 'left' },
        3: { cellWidth: 35, halign: 'left' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      };

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
      doc.save(`ledger-${stamp}.pdf`);
      
      toast({
        title: t("Success", "வெற்றி"),
        description: t("PDF exported successfully", "PDF வெற்றிகரமாக ஏற்றுமதி செய்யப்பட்டது"),
      });
    } catch (err) {
      console.error("PDF export failed", err);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to export PDF", "PDF ஏற்றுமதி தோல்வியடைந்தது"),
        variant: "destructive",
      });
    }
  };

  const showToast = (message: string, isError = false) => {
    toast({
      title: isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி'),
      description: message,
      variant: isError ? 'destructive' : 'default'
    });
  };


  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <div className={pageContainerStyles.content}>
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {t('Ledger', 'பதிவேடு')}
              </CardTitle>
            </div>
          </CardHeader>

          <div className="text-xs text-gray-600">
            {t('Balance', 'இருப்பு')}:{' '}
            <span className={`font-medium ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(currentBalance)}
            </span>
          </div>
        </div>

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
                    placeholder={t('Search by name...', 'பெயர் மூலம் தேடவும்...')}
                    className={cn(theme.input.base, theme.input.size.sm, "pl-8")}
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  />
                </div>
                <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                  <Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => { setFilters(prev => ({ ...prev, name: '' })); }}>
                    {t('Clear', 'அழி')}
                  </Button>
                  {canExportCsv && (
                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={onExportCSV} disabled={isLoading || entries.length === 0}>
                      <FileDown className="h-3 w-3 mr-1" />
                      {t('Export CSV', 'CSV ஏற்றுமதி')}
                    </Button>
                  )}
                  {canExportPdf && (
                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={onExportPDF} disabled={isLoading || entries.length === 0}>
                      <FileDown className="h-3 w-3 mr-1" />
                      {t('Export PDF', 'PDF ஏற்றுமதி')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={tableClasses.scrollContainerWrapper} onContextMenu={onContextMenu}>
              <div className={tableClasses.scrollContainer}>
                {isLoading ? (
                  <div className={tableClasses.emptyState}>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-600 mx-auto"></div>
                  </div>
                ) : (
                  <Table className={tableClasses.container}>
                    <TableHeader className={tableClasses.header}>
                      <TableRow className={tableClasses.row}>
                        <TableHead className={tableClasses.headerCellSno}>{t("S.No", "எண்")}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Date", "தேதி")}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Name", "பெயர்")}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Category", "வகை")}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Credit", "கடன்")}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Debit", "பற்று")}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Balance", "இருப்பு")}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Actions", "செயல்கள்")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.length > 0 ? (
                        entries.map((entry, index) => {
                          let runningBalance = entries
                            .slice(0, index + 1)
                            .reduce((sum, e) => (e.type === 'credit' ? sum + e.amount : sum - e.amount), 0);

                          return (
                            <TableRow key={entry.id} className={tableClasses.row}>
                              <TableCell className={tableClasses.cellSno}>
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </TableCell>
                              <TableCell className={tableClasses.cell}>
                                {format(new Date(entry.date), 'dd/MM/yy')}
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, "max-w-32 truncate")}>
                                {entry.name}
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, "max-w-24 truncate")}>
                                {entry.under || '-'}
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, "text-green-600", "text-right")}>
                                {entry.type === 'credit' ? `${entry.amount.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, "text-red-600", "text-right")}>
                                {entry.type === 'debit' ? `${entry.amount.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, "font-medium", "text-right")}>
                                {runningBalance.toFixed(2)}
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onPrintEntry(entry)}
                                    className={cn(buttonClasses.actionSecondary, "h-5 w-5 p-0")}
                                  >
                                    <Printer className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(entry)}
                                    className={cn(buttonClasses.actionPrimary, "h-5 w-5 p-0")}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(entry.id!)}
                                    className={cn(buttonClasses.actionDanger, "h-5 w-5 p-0")}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                         <TableRow  className="whitespace-nowrap">
                          <TableCell colSpan={8} className={tableClasses.emptyState}>
                            {t("No entries found", "உள்ளீடுகள் கிடைக்கவில்லை")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              <div className={tableClasses.pagination}>
                <div className="text-sm text-gray-700">
                  {t("Showing", "காட்டப்படுகிறது")} {(currentPage - 1) * itemsPerPage + 1} {t("to", "இலிருந்து")} {Math.min(currentPage * itemsPerPage, totalCount)} {t("of", "இல்")}{" "}
                  <span className="font-medium">{totalCount}</span> {t("items", "உருப்படிகள்")}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={tableClasses.paginationButton}
                  >
                    {t('Previous', 'முந்தைய')}
                  </Button>
                  <span className="text-xs flex items-center">
                    {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={tableClasses.paginationButton}
                  >
                    {t('Next', 'அடுத்தது')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className={cn(theme.input.base, "fixed z-50 bg-white rounded shadow w-48 text-xs")}
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <div className={cn(theme.input.base, "px-3 py-2")}>
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
                    className={cn(theme.input.base, "h-3 w-3 text-blue-600 rounded")}
                  />
                  <span className="ml-2 text-xs text-gray-700">{col.label}</span>
                </label>
              ))}
            </div>
            <div className={cn(theme.input.base, "flex flex-wrap gap-1 p-1")}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-0.5 px-1.5 h-auto"
                onClick={() =>
                  setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, true])) as any)
                }
              >
                {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-0.5 px-1.5 h-auto"
                onClick={() =>
                  setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, false])) as any)
                }
              >
                {t('Clear all', 'அனைத்தையும் அழி')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs py-0.5 px-1.5 h-auto ml-auto"
                onClick={() => setMenuOpen(false)}
              >
                {t('Close', 'மூடு')}
              </Button>
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">{t('Confirm Delete', 'நீக்குதலை உறுதிப்படுத்தவும்')}</DialogTitle>
              <DialogDescription className="text-sm">
                {t('Are you sure you want to delete this entry? This action cannot be undone.', 'இந்த உள்ளீட்டை நீக்க விரும்புகிறீர்களா? இந்த செயலை திரும்பப் பெற முடியாது.')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} className="text-xs">
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDelete} className="text-xs">
                {t('Delete', 'நீக்கு')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* All Ledger Logs Modal */}
        {allLogsOpen && (
          <div className={formFieldStyles.moneyDonationList.modal.overlay}>
            <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-6 rounded-t-lg flex-shrink-0">
                <div className={formFieldStyles.moneyDonationList.modal.header}>
                  <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('All Ledger Logs', 'அனைத்து பதிவேடு பதிவுகள்')}</h2>
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
                        <div className={cn(theme.input.base, "bg-white")}>
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
                                  {t('Entry ID', 'உள்ளீடு ஐடி')}
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
                                  <td className={formFieldStyles.moneyDonationList.logsTable.tdCenter} colSpan={5}>
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
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.ledger_entry_id}</td>
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
                                        // Parse ledger entry details from the log data
                                        const details = lg.details;
                                        if (!details) return <span className="text-gray-400">-</span>;

                                        // Extract specific fields from the details
                                        const name = details.name || details.after?.name || details.before?.name;
                                        const date = details.date || details.after?.date || details.before?.date;
                                        const type = details.type || details.after?.type || details.before?.type;
                                        const amount = details.amount || details.after?.amount || details.before?.amount;
                                        const under = details.under || details.after?.under || details.before?.under;

                                        return (
                                          <div className="space-y-2">
                                            <div className="bg-purple-50 p-3 rounded border text-xs">
                                              <div className="font-medium text-purple-700 mb-2">{t('Ledger Entry Details', 'பதிவேடு உள்ளீடு விவரங்கள்')}</div>
                                              <div className="space-y-1 text-gray-600">
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
                                                {type && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Type', 'வகை')}:</span>
                                                    <span>{type === 'credit' ? t('Credit', 'கடன்') : t('Debit', 'பற்று')}</span>
                                                  </div>
                                                )}
                                                {amount && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Amount', 'தொகை')}:</span>
                                                    <span>{amount}</span>
                                                  </div>
                                                )}
                                                {under && (
                                                  <div className="flex justify-between">
                                                    <span className="font-medium">{t('Category', 'வகை')}:</span>
                                                    <span>{under}</span>
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
                              loadAllLedgerLogs(prevPage);
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
                              loadAllLedgerLogs(nextPage);
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

        {/* Individual Ledger Logs Modal */}
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
                <div className={cn(theme.input.base, "bg-white rounded-lg overflow-hidden")}>
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
                                    // Parse ledger entry details from the log data
                                    const details = lg.details;
                                    if (!details) return <span className="text-gray-400">-</span>;

                                    // Extract specific fields from the details
                                    const name = details.name || details.after?.name || details.before?.name;
                                    const date = details.date || details.after?.date || details.before?.date;
                                    const type = details.type || details.after?.type || details.before?.type;
                                    const amount = details.amount || details.after?.amount || details.before?.amount;
                                    const under = details.under || details.after?.under || details.before?.under;

                                    return (
                                      <div className="space-y-2">
                                        <div className="bg-purple-50 p-3 rounded border text-xs">
                                          <div className="font-medium text-purple-700 mb-2">{t('Ledger Entry Details', 'பதிவேடு உள்ளீடு விவரங்கள்')}</div>
                                          <div className="space-y-1 text-gray-600">
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
                                            {type && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Type', 'வகை')}:</span>
                                                <span>{type === 'credit' ? t('Credit', 'கடன்') : t('Debit', 'பற்று')}</span>
                                              </div>
                                            )}
                                            {amount && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Amount', 'தொகை')}:</span>
                                                <span>{amount}</span>
                                              </div>
                                            )}
                                            {under && (
                                              <div className="flex justify-between">
                                                <span className="font-medium">{t('Category', 'வகை')}:</span>
                                                <span>{under}</span>
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
