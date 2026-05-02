import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationItem } from '@/services/moneyDonationService';
import { donationService, DonationItem as ProductDonationItem } from '@/services/donationService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Trash2, Search, FileDown } from 'lucide-react';
import { cn, pageContainerStyles, formFieldStyles } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "@/components/ui/use-toast";

// Unified type
interface UnifiedDonationRow {
  id: number;
  type: 'money' | 'product';
  registerNo: string | null;
  entryDate: string | null;
  bookingDate: string | null;
  date: string | null;
  name: string | null; // donor name
  phone: string | null;
  amount?: number; // for money
  product?: string | null; // for product
  qty?: number | null; // for product
  reason?: string | null;
  raw: MoneyDonationItem | ProductDonationItem;
}

export default function DonationUnifiedList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [rows, setRows] = useState<UnifiedDonationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'money' | 'product'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Visible columns (union of both types)
  type ColKey = '#' | 'type' | 'receipt' | 'date' | 'name' | 'phone' | 'amount' | 'product' | 'qty' | 'reason' | 'actions';
  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: '#', label: '#' },
    { key: 'type', label: t('Type', 'வகை') },
    { key: 'receipt', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'entryDate', label: t('Entry Date', 'நுழைவு தேதி') },
    { key: 'date', label: t('Booking Date', 'பதிவு தேதி') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'phone', label: t('Phone', 'கைபேசி') },
    { key: 'amount', label: t('Amount', 'தொகை'), align: 'right' },
    { key: 'product', label: t('Product', 'பொருள்') },
    { key: 'qty', label: t('Qty', 'அளவு'), align: 'right' },
    { key: 'reason', label: t('Reason', 'காரணம்') },
    { key: 'actions', label: t('Actions', 'நடவடிக்கைகள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'unified_donation_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true,
    type: true,
    receipt: true,
    entryDate: true,
    date: true,
    name: true,
    phone: true,
    amount: true,
    product: true,
    qty: true,
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols)); } catch { }
  }, [visibleCols]);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  const toNum = (v: any) => {
    if (v == null) return 0;
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return dateString;
    }
  };

  const receiptNum = (s: any) => parseInt(String(s || '').replace(/\D/g, '') || '0', 10);

  // Latest-only delete logic per type
  const latestIds = useMemo(() => {
    const grouped: Record<'money' | 'product', UnifiedDonationRow[]> = { money: [], product: [] };
    rows.forEach(r => grouped[r.type].push(r));
    const result: Partial<Record<'money' | 'product', number | null>> = {};
    (['money', 'product'] as const).forEach(type => {
      const list = grouped[type];
      if (!list.length) { result[type] = null; return; }
      const withReg = list.filter(r => r.registerNo);
      if (withReg.length) {
        const sorted = [...withReg].sort((a, b) => receiptNum(b.registerNo) - receiptNum(a.registerNo));
        result[type] = sorted[0]?.id ?? null;
      } else {
        const sorted = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
        result[type] = sorted[0]?.id ?? null;
      }
    });
    return result;
  }, [rows]);
  const canDelete = (row: UnifiedDonationRow) => (row.type === 'money' ? latestIds.money : latestIds.product) === row.id;

  // Logs modal state
  const [logsFor, setLogsFor] = useState<{ id: number; type: 'money' | 'product' } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; action: string; created_at: string; created_by: number | null; details: any }>>([]);

  const openLogs = async (row: UnifiedDonationRow) => {
    setLogsFor({ id: row.id, type: row.type });
    setLogs([]);
    setLogsLoading(true);
    try {
      let res: any;
      if (row.type === 'money') {
        res = await fetch(`https://templeapi.agniplay.com/api/money-donations/${row.id}/logs`, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        res = await fetch(`https://templeapi.agniplay.com/api/donations/${row.id}/logs`, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (!res.ok) throw new Error('Failed to fetch logs');
      const result = await res.json();
      setLogs(Array.isArray(result.data) ? result.data : result.data?.data || []);
    } catch (e) {
      console.error('Failed to load logs', e);
      setLogs([]);
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
    } finally {
      setLogsLoading(false);
    }
  };
  const closeLogs = () => { setLogsFor(null); setLogs([]); };

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<UnifiedDonationRow | null>(null);
  const askDelete = (row: UnifiedDonationRow) => {
    if (!canDelete(row)) {
      alert(t('Only the latest receipt can be deleted', 'கடைசி ரசீதை மட்டுமே நீக்க முடியும்'));
      return;
    }
    setDeleteRow(row);
    setDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      if (deleteRow.type === 'money') {
        await moneyDonationService.delete(token, deleteRow.id);
      } else {
        await donationService.deleteDonation(token, deleteRow.id);
      }
      setRows(prev => prev.filter(r => r.id !== deleteRow.id || r.type !== deleteRow.type));
    } catch (e) {
      console.error('Delete failed', e);
      alert(t('Delete failed', 'நீக்கம் தோல்வியடைந்தது'));
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
    const onDocClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // Load data
  const load = async () => {
    setLoading(true);
    try {
      const [moneyResp, productResp] = await Promise.all([
        moneyDonationService.list(token),
        donationService.getDonations(token, { q, from, to }),
      ]);

      let moneyItems = moneyResp?.data || [];
      let productItems = productResp?.data || [];

      // Apply local filters for money to match UI (q/from/to)
      if (q) {
        const s = q.toLowerCase();
        moneyItems = moneyItems.filter((r) => (r.name || '').toLowerCase().includes(s) || (r.phone || '').toLowerCase().includes(s) || (r.reason || '').toLowerCase().includes(s) || (r.register_no || '').toLowerCase().includes(s));
      }
      if (from) moneyItems = moneyItems.filter((r) => (r.date || '') >= from);
      if (to) moneyItems = moneyItems.filter((r) => (r.date || '') <= to);

      // Normalize
      const moneyRows: UnifiedDonationRow[] = moneyItems.map((m) => ({
        id: m.id,
        type: 'money',
        registerNo: m.register_no || null,
        entryDate: (m as any).entry_date || null,
        bookingDate: m.date || null,
        date: m.date || null,
        name: m.name || null,
        phone: m.phone || null,
        amount: Number(m.amount ?? 0),
        reason: m.reason || null,
        raw: m,
      }));

      const productRows: UnifiedDonationRow[] = (productItems as ProductDonationItem[]).map((p) => ({
        id: p.id,
        type: 'product',
        registerNo: p.register_no || null,
        entryDate: (p as any).entry_date || null,
        bookingDate: p.donation_date || null,
        date: (p.donation_date || null),
        name: p.donor_name || null,
        phone: p.donor_contact || null,
        product: p.product_name || null,
        qty: p.quantity ?? null,
        reason: p.description || null,
        raw: p,
      }));

      // Sort: by receipt number desc if present else id desc
      const getNum = (v: any) => parseInt(String((v || '').toString()).replace(/\D/g, '') || '0', 10);
      let combined = [...moneyRows, ...productRows].sort((a, b) => {
        const nb = getNum(b.registerNo);
        const na = getNum(a.registerNo);
        if (nb !== na) return nb - na;
        return (b.id || 0) - (a.id || 0);
      });

      // Apply type filter
      if (typeFilter !== 'all') {
        combined = combined.filter(r => r.type === typeFilter);
      }

      setRows(combined);
    } catch (e) {
      console.error('Failed to load unified donations', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); load(); }
  };

  // Edit - navigate to full entry page
  const onEdit = (row: UnifiedDonationRow) => {
    const editUrl = row.type === 'money' 
      ? `/dashboard/donations/entry?editId=${row.id}&type=money`
      : `/dashboard/donations/entry?editId=${row.id}&type=product`;
    navigate(editUrl);
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

  // Print per type
  const onPrint = (row: UnifiedDonationRow) => {
    if (row.type === 'money') {
      handleDownloadReceipt(row.id, row.registerNo);
    } else {
      // Simple print window with basic details
      const p = row.raw as ProductDonationItem;
      const html = `
        <div style="text-align:center;margin-bottom:12px">
          <h2 style="margin:0">${t('Donation Receipt', 'நன்கொடை ரசீது')}</h2>
        </div>
        <div style="padding:8px 16px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px;border-bottom:1px solid #ddd;font-weight:600">${t('Donor', 'நன்கொடையாளர்')}:</td><td style="padding:6px;border-bottom:1px solid #ddd">${p.donor_name || '-'}</td></tr>
            <tr><td style="padding:6px;border-bottom:1px solid #ddd;font-weight:600">${t('Date', 'தேதி')}:</td><td style="padding:6px;border-bottom:1px solid #ddd">${(p.donation_date || '').slice(0, 10)}</td></tr>
            <tr><td style="padding:6px;border-bottom:1px solid #ddd;font-weight:600">${t('Product', 'பொருள்')}:</td><td style="padding:6px;border-bottom:1px solid #ddd">${p.product_name || '-'}</td></tr>
            <tr><td style="padding:6px;border-bottom:1px solid #ddd;font-weight:600">${t('Quantity', 'அளவு')}:</td><td style="padding:6px;border-bottom:1px solid #ddd">${p.quantity ?? '-'}</td></tr>
          </table>
        </div>
      `;
      const win = window.open('', '', 'width=700,height=600');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = rows.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [q, from, to, typeFilter]);

  // Totals
  const totals = useMemo(() => {
    return rows.reduce((acc, r) => {
      if (r.type === 'money') acc.amount += toNum(r.amount);
      if (r.type === 'product') acc.qty += toNum(r.qty);
      return acc;
    }, { amount: 0, qty: 0 });
  }, [rows]);

  // ------- Export helpers -------
  const csvEscape = (value: any) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(str)) {
      return `"${str}"`;
    }
    return str;
  };

  const exportToCSV = () => {
    try {
      const headers = [
        t("Type", "வகை"),
        t("Receipt No", "ரசீது எண்"),
        t("Entry Date", "நுழைவு தேதி"),
        t("Booking Date", "பதிவு தேதி"),
        t("Name", "பெயர்"),
        t("Phone", "கைபேசி"),
        t("Amount", "தொகை"),
        t("Product", "பொருள்"),
        t("Qty", "அளவு"),
        t("Reason", "காரணம்"),
      ];

      const exportRows = rows.map((r) => [
        r.type === 'money' ? t('Money', 'பணம்') : t('Product', 'பொருள்'),
        r.registerNo || "",
        formatDate(r.entryDate),
        formatDate(r.bookingDate),
        r.name || "",
        r.phone || "",
        r.type === 'money' ? toNum(r.amount) : "",
        r.product || "",
        r.qty ?? "",
        r.reason || "",
      ]);

      const csv = [headers.join(","), ...exportRows.map((row) => row.map(csvEscape).join(","))].join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.href = url;
      link.download = `donations-export-${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to export CSV.", "CSV ஏற்றுமதி தோல்வியடைந்தது."),
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    try {
      const title = t("Donation List", "நன்கொடை பட்டியல்");
      const headCells = [
        t("Type", "வகை"),
        t("Receipt No", "ரசீது எண்"),
        t("Entry Date", "நுழைவு தேதி"),
        t("Booking Date", "பதிவு தேதி"),
        t("Name", "பெயர்"),
        t("Phone", "கைபேசி"),
        t("Amount", "தொகை"),
        t("Product", "பொருள்"),
        t("Qty", "அளவு"),
      ];

      const exportRows = rows.map((r) => [
        r.type === 'money' ? t('Money', 'பணம்') : t('Product', 'பொருள்'),
        r.registerNo || "",
        formatDate(r.entryDate),
        formatDate(r.bookingDate),
        r.name || "",
        r.phone || "",
        r.type === 'money' ? toNum(r.amount).toLocaleString() : "-",
        r.product || "-",
        r.qty ?? "-",
      ]);

      const doc = new jsPDF('landscape');
      
      // Add Title and Styling
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text(title, 14, 22);
      
      // Add metadata info
      doc.setFontSize(10);
      doc.setTextColor(100);
      const now = new Date();
      const meta = `${t("Generated", "உருவாக்கப்பட்டது")}: ${now.toLocaleString()} | ${t("Items", "உருப்படிகள்")}: ${rows.length}`;
      doc.text(meta, 14, 30);
      
      // Horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 33, 283, 33);

      autoTable(doc, {
        head: [headCells],
        body: exportRows,
        startY: 40,
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [79, 70, 229], // Indigo 600
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // Gray 50
        },
        margin: { top: 40 },
        didDrawPage: (data) => {
          // Footer: Page Number
          const str = `Page ${(doc as any).getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(150);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(str, 14, pageHeight - 10);
        }
      });

      const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      doc.save(`donations-export-${stamp}.pdf`);
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
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
              {t('Donation List (Unified)', 'நன்கொடை பட்டியல் (ஒன்றுபட்ட)')}
            </CardTitle>
          </div>
        </CardHeader>

        {/* Table */}
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
                  placeholder={t('Search by name/phone/reason/product/receipt', 'பெயர்/தொலைபேசி/காரணம்/பொருள்/ரசீது மூலம் தேடுக')}
                  className={cn(theme.input.base, theme.input.size.sm, "pl-8")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyDownSearch}
                />
              </div>
              <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => { setQ(''); setFrom(''); setTo(''); setTypeFilter('all'); load(); }}>
                  {t('Clear', 'அழி')}
                </Button>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={load}>
                  {t('Search', 'தேடு')}
                </Button>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportToCSV} disabled={loading || rows.length === 0}>
                  <FileDown className="h-3 w-3 mr-1" />
                  {t('Export CSV', 'CSV ஏற்றுமதி')}
                </Button>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportToPDF} disabled={loading || rows.length === 0}>
                  <FileDown className="h-3 w-3 mr-1" />
                  {t('Export PDF', 'PDF ஏற்றுமதி')}
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={tableClasses.scrollContainerWrapper} onContextMenu={onContextMenu}>
            <div className={tableClasses.scrollContainer}>
              {loading ? (
                <div className={tableClasses.emptyState}>
                  <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                </div>
              ) : (
                <Table className={tableClasses.container}>
                  <TableHeader className={tableClasses.header}>
                    <TableRow className={tableClasses.row}>
                      {allColumns.map((col) => (
                        visibleCols[col.key] && (
                          <TableHead key={col.key} className={cn(
                            tableClasses.headerCell,
                            col.key === '#' ? tableClasses.headerCellSno : '',
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          )}>
                            {col.label}
                          </TableHead>
                        )
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                          {t('No data found', 'தரவு கிடைக்கவில்லை')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((r, idx) => (
                        <TableRow key={`${r.type}-${r.id}`} className={tableClasses.row}>
                          {visibleCols['#'] && <TableCell className={tableClasses.cellSno}>{startIndex + idx + 1}</TableCell>}
                          {visibleCols['type'] && <TableCell className={tableClasses.cell}>{r.type === 'money' ? t('Money', 'பணம்') : t('Product', 'பொருள்')}</TableCell>}
                          {visibleCols['receipt'] && <TableCell className={tableClasses.cell}>{r.registerNo || '-'}</TableCell>}
                          {visibleCols['entryDate'] && <TableCell className={tableClasses.cell}>{formatDate(r.entryDate)}</TableCell>}
                          {visibleCols['date'] && <TableCell className={tableClasses.cell}>{formatDate(r.bookingDate)}</TableCell>}
                          {visibleCols['name'] && <TableCell className={tableClasses.cell}>{r.name || '-'}</TableCell>}
                          {visibleCols['phone'] && <TableCell className={tableClasses.cell}>{r.phone || '-'}</TableCell>}
                          {visibleCols['amount'] && (
                            <TableCell className={cn(tableClasses.cell, 'text-right')}>
                              {r.type === 'money' ? `₹${toNum(r.amount).toLocaleString()}` : '-'}
                            </TableCell>
                          )}
                          {visibleCols['product'] && <TableCell className={tableClasses.cell}>{r.type === 'product' ? (r.product || '-') : '-'}</TableCell>}
                          {visibleCols['qty'] && (
                            <TableCell className={cn(tableClasses.cell, 'text-right')}>
                              {r.type === 'product' ? (toNum(r.qty).toLocaleString()) : '-'}
                            </TableCell>
                          )}
                          {visibleCols['reason'] && <TableCell className={tableClasses.cell}>{r.reason || '-'}</TableCell>}
                          {visibleCols['actions'] && (
                            <TableCell className={cn(tableClasses.cell, tableClasses.actionCell, "text-center")}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onPrint(r)}
                                  className={cn(tableClasses.actionButton, "bg-red-600 text-white hover:bg-red-700")}
                                  title={t('Print Receipt', 'ரசீது அச்சிடுக')}
                                >
                                  {t('Print', 'அச்சிடு')}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onEdit(r)}
                                  className={tableClasses.actionButtonSecondary}
                                  title={t('Edit', 'திருத்து')}
                                >
                                  {t('Edit', 'திருத்து')}
                                </button>
                                {(() => {
                                  const deletable = canDelete(r);
                                  const title = deletable ? t('Delete', 'நீக்கு') : t('Only the latest receipt can be deleted', 'கடைசி ரசீதை மட்டுமே நீக்க முடியும்');
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => deletable ? askDelete(r) : undefined}
                                      className={cn(
                                        tableClasses.actionButton,
                                        deletable ? tableClasses.actionButtonDanger : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                      )}
                                      title={title}
                                      disabled={!deletable}
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
              )}
            </div>

            {/* Summary */}
            <div className={formFieldStyles.moneyDonationList.summary.container}>
              <div className={formFieldStyles.moneyDonationList.summary.info}>
                {t('Showing', 'காட்டப்படுகிறது')} <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>
                  {rows.length > 0 ? startIndex + 1 : 0}
                </span> {t('to', 'இலிருந்து')}{' '}
                <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>
                  {Math.min(endIndex, rows.length)}
                </span> {t('of', 'மொத்தம்')}{' '}
                <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{rows.length}</span> {t('results', 'முடிவுகள்')}
              </div>
              <div className={formFieldStyles.moneyDonationList.summary.total}>
                <span style={{ marginRight: 16 }}>
                  {t('Total Amount', 'மொத்த தொகை')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>₹{totals.amount.toLocaleString()}</span>
                </span>
                <span>
                  {t('Total Qty', 'மொத்த அளவு')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{totals.qty.toLocaleString()}</span>
                </span>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={tableClasses.pagination}>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இலிருந்து')} {totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={cn(tableClasses.paginationButton, currentPage === 1 && 'opacity-50 cursor-not-allowed')}
                  >
                    {t('Previous', 'முந்தையது')}
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(tableClasses.paginationButton, currentPage === pageNum && tableClasses.paginationButtonActive)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(tableClasses.paginationButton, currentPage === totalPages && 'opacity-50 cursor-not-allowed')}
                  >
                    {t('Next', 'அடுத்தது')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Context menu for column toggle */}
      {menuOpen && (
        <div ref={menuRef} className={formFieldStyles.moneyDonationList.contextMenu.container} style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}>
          <div className={formFieldStyles.moneyDonationList.contextMenu.header}>
            <h3 className={formFieldStyles.moneyDonationList.contextMenu.title}>{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className={formFieldStyles.moneyDonationList.contextMenu.subtitle}>
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className={formFieldStyles.moneyDonationList.contextMenu.content}>
            {allColumns.map((col) => (
              <label key={col.key} className={formFieldStyles.moneyDonationList.contextMenu.item}>
                <input type="checkbox" checked={!!visibleCols[col.key]} onChange={() => setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))} className={formFieldStyles.moneyDonationList.contextMenu.checkbox} />
                <span className={formFieldStyles.moneyDonationList.contextMenu.label}>{col.label}</span>
              </label>
            ))}
          </div>
          <div className={formFieldStyles.moneyDonationList.contextMenu.actions}>
            <button onClick={() => { const allOn: typeof visibleCols = {} as any; allColumns.forEach((c) => { (allOn as any)[c.key] = true; }); setVisibleCols(allOn); }} className={formFieldStyles.moneyDonationList.contextMenu.actionButton} type="button">
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </button>
            <button onClick={() => setMenuOpen(false)} className={formFieldStyles.moneyDonationList.contextMenu.closeButton} type="button">
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
              {t('This will permanently delete the donation record. This action cannot be undone.', 'இது நன்கொடை பதிவை நிரந்தரமாக நீக்கும். இந்த செயலை திரும்பப் பெற முடியாது.')}
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

      {/* Logs Modal */}
      {logsFor && (
        <div className={formFieldStyles.moneyDonationList.modal.overlay}>
          <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeLogs} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
            <div className={theme.card.header}>
              <div className={formFieldStyles.moneyDonationList.modal.header}>
                <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('Donation Logs', 'நன்கொடை பதிவுகள்')}</h2>
                <button onClick={closeLogs} className={formFieldStyles.moneyDonationList.modal.closeButton}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {logsLoading ? (
                <div className={formFieldStyles.moneyDonationList.modal.loading}>{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</div>
              ) : (
                <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                  <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                    <tr>
                      <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Action', 'செயல்')}</th>
                      <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Date & Time', 'தேதி & நேரம்')}</th>
                      <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('User', 'பயனர்')}</th>
                      <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Details', 'விவரங்கள்')}</th>
                    </tr>
                  </thead>
                  <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                    {logs.length === 0 ? (
                      <tr>
                        <td className={formFieldStyles.moneyDonationList.logsTable.tdCenter} colSpan={4}>{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td>
                      </tr>
                    ) : (
                      logs.map(lg => (
                        <tr key={lg.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                          <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.action}</td>
                          <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.created_at}</td>
                          <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.created_by ?? '-'}</td>
                          <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                            <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(lg.details, null, 2)}</pre>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
  );
}
