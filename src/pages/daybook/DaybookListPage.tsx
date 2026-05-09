import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { daybookService, DaybookEntry, DaybookLog } from '@/services/daybookService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Utensils,
  Search,
  FileText,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility';
import { tableClasses } from '@/styles/theme';
import { cn } from '@/lib/utils';

export default function DaybookListPage() {
  const { temple } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [entries, setEntries] = useState<DaybookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [entryType, setEntryType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  
  // Stats
  const [stats, setStats] = useState({
    total_income: 0,
    total_expense: 0,
    income_count: 0,
    expense_count: 0,
    opening_balance: 0,
    period_net: 0,
    closing_balance: 0,
    current_balance: 0,
  });
  
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    receipt: true,
    booking_date: true,
    scheduled_date: true,
    type: true,
    description: true,
    party: true,
    food: true,
    people: true,
    payment: true,
    amount: true,
    balance: true,
    actions: true,
  });
  
  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  type ColKey = 'receipt' | 'booking_date' | 'scheduled_date' | 'type' | 'description' | 'party' | 'food' | 'people' | 'payment' | 'amount' | 'balance' | 'actions' | 'sno';

  const allColDefs: Array<{ key: ColKey; label: string; getValue: (row: DaybookEntry, idx: number) => string | number }> = [
    { key: 'sno', label: 'S.No', getValue: (_, idx) => idx + 1 },
    { key: 'receipt', label: t('Receipt', 'ரசீது'), getValue: (r) => r.receipt_number || '' },
    { key: 'booking_date', label: t('Booking Date', 'பதிவு தேதி'), getValue: (r) => formatDate(r.created_at) },
    { key: 'scheduled_date', label: t('Scheduled Date', 'நிகழ்வு தேதி'), getValue: (r) => formatDate(r.entry_date) },
    { key: 'type', label: t('Type', 'வகை'), getValue: (r) => r.reference_type === 'annadhanam' ? t('Annadhanam', 'அன்னதானம்') : r.entry_type === 'income' ? t('Income', 'வருமானம்') : r.entry_type === 'expense' ? t('Expense', 'செலவு') : t('Journal', 'ஜர்னல்') },
    { key: 'description', label: t('Description', 'விளக்கம்'), getValue: (r) => r.description || '' },
    { key: 'party', label: t('Party', 'தரப்பினர்'), getValue: (r) => r.party_name || '-' },
    { key: 'food', label: t('Food Items', 'உணவு பொருட்கள்'), getValue: (r) => {
      if (r.reference_type === 'annadhanam' && (r as any).enable_multi_slot) return t('Multi-Slot Food Donation', 'பல நேர உணவு தானம்');
      return r.reference_type === 'annadhanam' && r.notes ? (r.notes.startsWith('Money:') ? '-' : r.notes.split('(')[0].trim()) : '-';
    }},
    { key: 'people', label: t('People', 'நபர்கள்'), getValue: (r) => {
      if (r.reference_type === 'annadhanam' && (r as any).enable_multi_slot) return t('See Slots', 'இடங்களைக் காண்க');
      return r.reference_type === 'annadhanam' && r.notes && !r.notes.startsWith('Product:') && !r.notes.startsWith('Money:') && r.notes.includes('(') ? (r.notes.match(/\(([^)]+)\)/)?.[1] || '-') : '-';
    }},
    { key: 'payment', label: t('Payment', 'கட்டணம்'), getValue: (r) => r.payment_mode === 'in_kind' ? t('In Kind', 'உணவு') : r.payment_mode || '-' },
    { key: 'amount', label: t('Amount', 'தொகை'), getValue: (r) => r.amount },
    { key: 'balance', label: t('Balance', 'இருப்பு'), getValue: (r) => r.running_balance },
  ];

  const getSlotRowColor = (timeSlot: string) => {
    switch (timeSlot?.toLowerCase()) {
      case 'morning': return 'bg-orange-50/50';
      case 'afternoon': return 'bg-blue-50/50';
      case 'evening': return 'bg-purple-50/50';
      case 'night': return 'bg-indigo-50/50';
      default: return '';
    }
  };

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = allColDefs.map(c => ({
    key: c.key,
    label: c.label,
    align: c.key === 'amount' || c.key === 'balance' ? 'right' : c.key === 'sno' || c.key === 'type' || c.key === 'receipt' || c.key === 'booking_date' || c.key === 'scheduled_date' ? 'center' : 'left',
  }));

  const onToggleColumn = (key: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  // Delete dialog
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Logs dialog
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<DaybookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await daybookService.getEntries({
        q: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        type: entryType || undefined,
        page,
        pageSize,
      });
      
      setEntries(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error(t('Failed to load daybook entries', 'டேபுக் உள்ளீடுகளை ஏற்றுவதில் தோல்வி'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await daybookService.getStats({
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, [search, fromDate, toDate, entryType, page, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      setDeleteLoading(true);
      await daybookService.deleteEntry(deleteId);
      toast.success(t('Entry deleted successfully', 'உள்ளீடு வெற்றிகரமாக நீக்கப்பட்டது'));
      setDeleteId(null);
      fetchEntries();
      fetchStats();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(t('Failed to delete entry', 'உள்ளீட்டை நீக்குவதில் தோல்வி'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewLogs = async (id: number) => {
    try {
      setLogsLoading(true);
      setLogsOpen(true);
      const response = await daybookService.getEntryLogs(id);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error(t('Failed to load logs', 'லோடுகளை ஏற்றுவதில் தோல்வி'));
    } finally {
      setLogsLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const activeCols = allColDefs.filter(c => c.key !== 'actions' && visibleColumns[c.key]);
      const headers = activeCols.map(c => c.label);
      const csvRows = entries.map((r, idx) => activeCols.map(c => String(c.getValue(r, idx))));

      const csvContent = [
        headers.join(","),
        ...csvRows.map((row) => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.setAttribute("href", url);
      link.setAttribute("download", `daybook-${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV export failed", e);
      toast.error(t('Failed to export CSV', 'CSV ஏற்றுமதி தோல்வியடைந்தது.'));
    }
  };

  const exportVisiblePDF = () => {
    try {
      const title = t('Daybook Report', 'டேபுக் அறிக்கை');
      const templeName = temple?.name || 'Temple Management';

      // Filter: keep only visible cols, exclude 'actions'
      const activeCols = allColDefs.filter(c => c.key !== 'actions' && visibleColumns[c.key]);

      if (activeCols.length === 0) {
        toast.error(t('No columns selected', 'நெடுவரிசைகள் தேர்ந்தெடுக்கப்படவில்லை'));
        return;
      }

      const headCells = activeCols.map(c => c.label);
      const exportRows = entries.map((r, idx) => activeCols.map(c => {
        const val = c.getValue(r, idx);
        return typeof val === 'number' ? String(val) : String(val || '');
      }));

      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();

      // Header background
      doc.setFillColor(255, 255, 255);
      doc.rect(10, 10, pageWidth - 20, 35, "F");

      // Top border line
      doc.setDrawColor(204, 85, 0);
      doc.setLineWidth(2);
      doc.line(10, 12, pageWidth - 10, 12);

      // Left side - Temple name and subtitle
      doc.setFontSize(20);
      doc.setTextColor(204, 85, 0);
      doc.setFont(undefined, "bold");
      doc.text(templeName, 14, 24);

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, "normal");
      doc.text("Daybook Management System", 14, 30);

      // Right side - Title and metadata
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text(title, pageWidth - 14, 24, { align: "right" });

      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.setFont(undefined, "normal");
      doc.text(`${t('Generated', 'உருவாக்கப்பட்டது')}: ${now.toLocaleDateString()}`, pageWidth - 14, 30, { align: "right" });
      doc.text(`${t('Records', 'பதிவுகள்')}: ${entries.length}`, pageWidth - 14, 36, { align: "right" });

      // Bottom border line
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(10, 47, pageWidth - 10, 47);

      // Summary bar
      const totalIncome = entries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + e.amount, 0);
      const totalExpense = entries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + e.amount, 0);

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(10, 51, pageWidth - 20, 12, 3, 3, "F");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, "bold");
      doc.text(`${t('Total Income', 'மொத்த வருமானம்')}: Rs. ${String(Math.round(totalIncome))}`, 14, 59);
      doc.text(`${t('Total Expense', 'மொத்த செலவு')}: Rs. ${String(Math.round(totalExpense))}`, pageWidth / 2, 59, { align: "center" });
      doc.text(`${t('Records', 'பதிவுகள்')}: ${entries.length}`, pageWidth - 14, 59, { align: "right" });

      // Compute equal column widths based on visible count
      const usableWidth = pageWidth - 20;
      const colWidth = Math.floor(usableWidth / activeCols.length);

      const columnStyles: Record<number, object> = {};
      activeCols.forEach((col, i) => {
        const rightAlign = col.key === 'amount' || col.key === 'balance';
        const centerAlign = col.key === 'sno' || col.key === 'receipt' || col.key === 'booking_date' || col.key === 'scheduled_date' || col.key === 'type';
        columnStyles[i] = {
          cellWidth: colWidth,
          halign: rightAlign ? 'right' : centerAlign ? 'center' : 'left',
          ...(col.key === 'sno' ? { fontStyle: 'bold' } : {}),
        };
      });

      autoTable(doc, {
        head: [headCells],
        body: exportRows as (string | number)[][],
        startY: 67,
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          valign: "middle",
          lineColor: [220, 220, 220],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [204, 85, 0],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252],
        },
        columnStyles,
        margin: { top: 15, left: 10, right: 10, bottom: 25 },
        didDrawPage: (dataArg) => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setDrawColor(200);
          doc.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);
          doc.setFontSize(8);
          doc.setTextColor(80);
          doc.setFont(undefined, "bold");
          doc.text(templeName, 10, pageHeight - 10);
          doc.setFont(undefined, "normal");
          doc.text(now.toLocaleDateString(), pageWidth - 10, pageHeight - 10, { align: "right" });
          doc.setFont(undefined, "bold");
          doc.text(`Page ${dataArg.pageNumber} / ${doc.getNumberOfPages()}`, pageWidth / 2, pageHeight - 5, { align: "center" });
        },
      });

      const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      doc.save(`daybook-visible-${stamp}.pdf`);
    } catch (err) {
      console.error("Visible PDF export failed", err);
      toast.error(t('Failed to export PDF', 'PDF ஏற்றுமதி செய்வதில் தோல்வி'));
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const getEntryTypeBadge = (type: string, referenceType?: string) => {
    if (referenceType === 'annadhanam') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          <Utensils className="h-3 w-3 mr-1" />
          {t('Annadhanam', 'அன்னதானம்')}
        </Badge>
      );
    }

    if (referenceType === 'product_donation') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          {t('Income', 'வருமானம்')}
        </Badge>
      );
    }

    const variants = {
      income: 'bg-green-100 text-green-800',
      expense: 'bg-red-100 text-red-800',
      journal: 'bg-blue-100 text-blue-800',
    };
    
    const icons = {
      income: <TrendingUp className="h-3 w-3 mr-1" />,
      expense: <TrendingDown className="h-3 w-3 mr-1" />,
      journal: <BookOpen className="h-3 w-3 mr-1" />,
    };
    
    const labels = {
      income: t('Income', 'வருமானம்'),
      expense: t('Expense', 'செலவு'),
      journal: t('Journal', 'ஜர்னல்'),
    };
    
    return (
      <Badge className={variants[type as keyof typeof variants]}>
        {icons[type as keyof typeof icons]}
        {labels[type as keyof typeof labels]}
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            {t('Daybook', 'டேபுக்')}
          </h1>
        </div>

        {/* Improved Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
            <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {t('Period Income', 'கால வரவு')}
              </CardTitle>
              <ArrowUpRight className="h-3 w-3 text-green-500 opacity-70" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-base font-bold text-green-600 tracking-tight">
                {formatAmount(stats.total_income)}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-[8px] py-0 px-1 bg-green-50 text-green-700 border-green-100">
                  {stats.income_count} {t('Entries', 'உள்ளீடுகள்')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
            <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {t('Period Expense', 'கால செலவு')}
              </CardTitle>
              <ArrowDownRight className="h-3 w-3 text-red-500 opacity-70" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-base font-bold text-red-600 tracking-tight">
                {formatAmount(stats.total_expense)}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-[8px] py-0 px-1 bg-red-50 text-red-700 border-red-100">
                  {stats.expense_count} {t('Entries', 'உள்ளீடுகள்')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {t('Current Balance', 'தற்போதைய இருப்பு')}
              </CardTitle>
              <Wallet className="h-3 w-3 text-blue-500 opacity-70" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-base font-bold text-blue-600 tracking-tight">
                {formatAmount(stats.current_balance)}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-[8px] py-0 px-1 bg-blue-50 text-blue-700 border-blue-100">
                  {t('Net', 'மீதி')} {stats.period_net >= 0 ? '+' : ''}{formatAmount(stats.period_net)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t('Search entries...', 'உள்ளீடுகளைத் தேடுக...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-gray-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[140px] h-10 border-gray-200 focus:ring-orange-500 text-sm"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[140px] h-10 border-gray-200 focus:ring-orange-500 text-sm"
            />
          </div>

          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            className="px-2 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white h-10 text-sm min-w-[120px]"
          >
            <option value="">{t('All Types', 'அனைத்து வகைகள்')}</option>
            <option value="income">{t('Income', 'வருமானம்')}</option>
            <option value="expense">{t('Expense', 'செலவு')}</option>
            <option value="journal">{t('Journal', 'ஜர்னல்')}</option>
            <option value="annadhanam">{t('Annadhanam', 'அன்னதானம்')}</option>
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <ColumnVisibilityMenu 
              columns={allColumns} 
              visibleColumns={visibleColumns} 
              onToggleColumn={onToggleColumn} 
            />
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="h-10 border-gray-200 hover:bg-gray-50 text-gray-700 px-3 text-sm"
            >
              <Download className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
            
            <Button
              onClick={exportVisiblePDF}
              variant="outline"
              className="h-10 border-gray-200 hover:bg-gray-50 text-red-600 px-3 text-sm"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              PDF
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
                <p className="text-gray-500 text-sm">{t('Loading entries...', 'உள்ளீடுகளை ஏற்றுகிறது...')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className={tableClasses.header}>
                    <TableRow  className="whitespace-nowrap">
                      <TableHead className="w-[50px]">{t('S.No', 'வ.எண்')}</TableHead>
                      {visibleColumns.receipt && <TableHead>{t('Receipt', 'ரசீது')}</TableHead>}
                      {visibleColumns.booking_date && <TableHead>{t('Booking Date', 'பதிவு தேதி')}</TableHead>}
                      {visibleColumns.scheduled_date && <TableHead>{t('Scheduled Date', 'நிகழ்வு தேதி')}</TableHead>}
                      {visibleColumns.type && <TableHead>{t('Type', 'வகை')}</TableHead>}
                      {visibleColumns.description && <TableHead>{t('Description', 'விளக்கம்')}</TableHead>}
                      {visibleColumns.party && <TableHead>{t('Party', 'தரப்பினர்')}</TableHead>}
                      {visibleColumns.food && <TableHead>{t('Food Items', 'உணவு பொருட்கள்')}</TableHead>}
                      {visibleColumns.people && <TableHead>{t('People', 'நபர்கள்')}</TableHead>}
                      {visibleColumns.payment && <TableHead>{t('Payment', 'கட்டணம்')}</TableHead>}
                      {visibleColumns.amount && <TableHead className="text-right">{t('Amount', 'தொகை')}</TableHead>}
                      {visibleColumns.balance && <TableHead className="text-right">{t('Balance', 'இருப்பு')}</TableHead>}
                      {visibleColumns.actions && <TableHead className="text-center">{t('Actions', 'செயல்பாடுகள்')}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                       <TableRow  className="whitespace-nowrap">
                        <TableCell colSpan={Object.keys(visibleColumns).length + 1} className="text-center py-12 text-gray-500">
                          {t('No entries found', 'உள்ளீடுகள் எதுவும் கிடைக்கவில்லை')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry, index) => (
                        <React.Fragment key={entry.id}>
                          <TableRow 
                            className={cn(
                              "group transition-colors",
                              (entry as any).enable_multi_slot ? "cursor-pointer hover:bg-orange-50/30" : ""
                            )}
                            onClick={() => {
                              if ((entry as any).enable_multi_slot) {
                                setExpandedRows(prev => ({ ...prev, [entry.id]: !prev[entry.id] }));
                              }
                            }}
                          >
                            <TableCell className="font-medium relative">
                              <div className="flex items-center gap-2">
                                {(entry as any).enable_multi_slot && (
                                  <div className="absolute -left-1 flex items-center">
                                    {expandedRows[entry.id] ? (
                                      <ChevronDown className="h-4 w-4 text-orange-500 animate-in fade-in duration-200" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-400 transition-colors" />
                                    )}
                                  </div>
                                )}
                                <span className={cn((entry as any).enable_multi_slot ? "ml-4" : "")}>
                                  {(page - 1) * pageSize + index + 1}
                                </span>
                              </div>
                            </TableCell>
                            {visibleColumns.receipt && <TableCell className="font-medium whitespace-nowrap">{entry.receipt_number}</TableCell>}
                            {visibleColumns.booking_date && <TableCell className="whitespace-nowrap">{formatDate(entry.created_at)}</TableCell>}
                            {visibleColumns.scheduled_date && <TableCell className="whitespace-nowrap">{formatDate(entry.entry_date)}</TableCell>}
                            {visibleColumns.type && <TableCell>{getEntryTypeBadge(entry.entry_type, entry.reference_type)}</TableCell>}
                            {visibleColumns.description && <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description}</TableCell>}
                            {visibleColumns.party && (
                              <TableCell>
                                {entry.party_name && (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{entry.party_name}</span>
                                    {entry.party_mobile && <span className="text-xs text-gray-500">{entry.party_mobile}</span>}
                                  </div>
                                )}
                              </TableCell>
                            )}
                            {visibleColumns.food && (
                              <TableCell>
                                {entry.reference_type === 'annadhanam' && (entry as any).enable_multi_slot ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold text-orange-700">
                                      {t('Multi-Slot Donation', 'பல நேர தானம்')}
                                    </span>
                                    <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-orange-50 text-orange-600 border-orange-100 uppercase">
                                      {(entry as any).food_details?.length || 0} {t('Slots', 'இடங்கள்')}
                                    </Badge>
                                  </div>
                                ) : entry.reference_type === 'annadhanam' && entry.notes ? (
                                  <span className="text-sm">
                                    {entry.notes.startsWith('Money:') ? '-' : 
                                      entry.notes.split('(')[0].trim()
                                        .replace(/Product:/i, t('Product:', 'பொருள்:'))
                                        .replace(/Qty:/i, t('Qty:', 'அளவு:'))}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            )}
                            {visibleColumns.people && (
                              <TableCell>
                                {entry.reference_type === 'annadhanam' && (entry as any).enable_multi_slot ? (
                                  <span className="text-sm font-bold text-orange-600">
                                    {(entry as any).food_details?.reduce((sum: number, s: any) => sum + (Number(s.count) || 0), 0) || 0}
                                  </span>
                                ) : entry.reference_type === 'annadhanam' && 
                                 entry.notes && 
                                 !entry.notes.startsWith('Product:') && 
                                 !entry.notes.startsWith('Money:') && 
                                 entry.notes.includes('(') ? (
                                  <span className="text-sm font-medium">
                                    {entry.notes.match(/\(([^)]+)\)/)?.[1]?.replace(/people/i, t('people', 'நபர்கள்')) || '-'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            )}
                            {visibleColumns.payment && (
                              <TableCell className="capitalize">
                                {entry.payment_mode === 'cash' ? t('Cash', 'பணம்') :
                                 entry.payment_mode === 'card' ? t('Card', 'அட்டை') :
                                 entry.payment_mode === 'upi' ? t('UPI', 'UPI') :
                                 entry.payment_mode === 'cheque' ? t('Cheque', 'காசோலை') :
                                 entry.payment_mode === 'bank_transfer' ? t('Bank Transfer', 'வங்கி பரிமாற்றம்') :
                                 entry.payment_mode === 'in_kind' ? t('In Kind', 'பொருள்') :
                                 entry.payment_mode}
                              </TableCell>
                            )}
                            {visibleColumns.amount && (
                              <TableCell className="text-right font-medium">
                                {formatAmount(entry.amount)}
                              </TableCell>
                            )}
                            {visibleColumns.balance && (
                              <TableCell className="text-right font-medium">
                                <span className={entry.running_balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                                  {formatAmount(entry.running_balance)}
                                </span>
                              </TableCell>
                            )}
                            {visibleColumns.actions && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleViewLogs(entry.id)}>
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => navigate(`/daybook/edit/${entry.id}`)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(entry.id)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>

                          {/* Expanded Slots */}
                          {(entry as any).enable_multi_slot && expandedRows[entry.id] && (
                            <TableRow className="bg-gray-50/50 border-l-4 border-l-orange-400">
                              <TableCell colSpan={Object.keys(visibleColumns).length + 1} className="p-0">
                                <div className="px-12 py-4 animate-in slide-in-from-top-2 duration-200">
                                  <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                                    <Table className="w-full text-[11px]">
                                      <thead className="bg-gray-50 text-gray-600 uppercase font-bold">
                                        <tr>
                                          <th className="px-4 py-2 text-left">{t('Date', 'தேதி')}</th>
                                          <th className="px-4 py-2 text-left">{t('Time Slot', 'நேரம் வகை')}</th>
                                          <th className="px-4 py-2 text-left">{t('Time', 'நேரம்')}</th>
                                          <th className="px-4 py-2 text-left">{t('Food Details', 'உணவு விவரங்கள்')}</th>
                                          <th className="px-4 py-2 text-right">{t('Count', 'எண்ணிக்கை')}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {(entry as any).food_details?.map((slot: any) => (
                                          <tr key={slot.id} className={cn("hover:bg-gray-50/50 transition-colors", getSlotRowColor(slot.time_slot))}>
                                            <td className="px-4 py-2">
                                              <div className="flex items-center gap-1.5 font-medium">
                                                <Calendar className="h-3 w-3 text-orange-400" />
                                                {formatDate(slot.donation_date)}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2 capitalize">{slot.time_slot}</td>
                                            <td className="px-4 py-2">
                                              <div className="flex items-center gap-1.5 text-gray-500">
                                                <Clock className="h-3 w-3" />
                                                {slot.donation_time}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2 italic text-gray-700">{slot.food_details}</td>
                                            <td className="px-4 py-2 text-right font-bold text-orange-600">{slot.count}</td>
                                          </tr>
                                        ))}
                                        <tr className="bg-orange-50/30">
                                          <td colSpan={4} className="px-4 py-2 text-right font-bold text-gray-600">
                                            {t('Total People', 'மொத்த மக்கள் எண்ணிக்கை')}
                                          </td>
                                          <td className="px-4 py-2 text-right font-extrabold text-orange-700">
                                            {(entry as any).food_details?.reduce((sum: number, s: any) => sum + (Number(s.count) || 0), 0) || 0}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/30">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    {t('Showing', 'காண்பிப்பு')} {Math.min((page - 1) * pageSize + 1, total)} {t('to', 'to')} {Math.min(page * pageSize, total)} {t('of', 'of')} {total}
                  </div>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {[10, 25, 50, 100].map(v => (
                      <option key={v} value={v}>{v} {t('per page', 'ஒவ்வொன்று')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    {t('Previous', 'முந்தையது')}
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {t('Page', 'பக்கம்')} {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    {t('Next', 'அடுத்தது')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure?', 'நீங்கள் உறுதியாக இருக்கிறீர்களா?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone.', 'இந்தச் செயலை மாற்ற முடியாது.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'ரத்து செய்')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Delete', 'நீக்கு')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Audit Logs', 'தணிக்கை பதிவுகள்')}</DialogTitle>
          </DialogHeader>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg space-y-1 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">{log.action}</Badge>
                    <span className="text-xs text-gray-500">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  {log.details && (
                    <div className="text-[11px] font-mono text-gray-600 bg-white p-2 rounded border mt-2 overflow-x-auto">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
              {logs.length === 0 && <p className="text-center text-gray-500 py-4">{t('No logs found', 'பதிவுகள் எதுவும் இல்லை')}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
