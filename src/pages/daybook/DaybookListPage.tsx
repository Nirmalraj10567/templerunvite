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
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ColumnVisibilityMenu } from '@/components/ui/column-visibility';
import { tableClasses } from '@/styles/theme';



export default function DaybookListPage() {
  const { token } = useAuth();
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
  
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  type ColKey = 'receipt' | 'booking_date' | 'scheduled_date' | 'type' | 'description' | 'party' | 'food' | 'people' | 'payment' | 'amount' | 'balance' | 'actions' | 'sno';

  const allColDefs: Array<{ key: ColKey; label: string; getValue: (row: DaybookEntry, idx: number) => string | number }> = [
    { key: 'sno', label: 'S.No', getValue: (_, idx) => idx + 1 },
    { key: 'receipt', label: t('Receipt', 'ரசீது'), getValue: (r) => r.receipt_number || '' },
    { key: 'booking_date', label: t('Booking Date', 'பதிவு தேதி'), getValue: (r) => formatDate(r.created_at) },
    { key: 'scheduled_date', label: t('Scheduled Date', 'நிகழ்வு தேதி'), getValue: (r) => formatDate(r.entry_date) },
    { key: 'type', label: t('Type', 'வகை'), getValue: (r) => r.reference_type === 'annadhanam' ? t('Annadhanam', 'அன்னதானம்') : r.entry_type === 'income' ? t('Income', 'வருமானம்') : r.entry_type === 'expense' ? t('Expense', 'செலவு') : t('Journal', 'ஜர்னல்') },
    { key: 'description', label: t('Description', 'விளக்கம்'), getValue: (r) => r.description || '' },
    { key: 'party', label: t('Party', 'தரப்பினர்'), getValue: (r) => r.party_name || '-' },
    { key: 'food', label: t('Food Items', 'உணவு பொருட்கள்'), getValue: (r) => r.reference_type === 'annadhanam' && r.notes ? (r.notes.startsWith('Money:') ? '-' : r.notes.split('(')[0].trim()) : '-' },
    { key: 'people', label: t('People', 'நபர்கள்'), getValue: (r) => r.reference_type === 'annadhanam' && r.notes && !r.notes.startsWith('Product:') && !r.notes.startsWith('Money:') && r.notes.includes('(') ? (r.notes.match(/\(([^)]+)\)/)?.[1] || '-') : '-' },
    { key: 'payment', label: t('Payment', 'கட்டணம்'), getValue: (r) => r.payment_mode === 'in_kind' ? t('In Kind', 'உணவு') : r.payment_mode || '-' },
    { key: 'amount', label: t('Amount', 'தொகை'), getValue: (r) => r.amount },
    { key: 'balance', label: t('Balance', 'இருப்பு'), getValue: (r) => r.running_balance },
  ];

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
  }, [search, fromDate, toDate, entryType, page]);

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

  const handleExport = async () => {
    try {
      await daybookService.exportCSV({
        from: fromDate || undefined,
        to: toDate || undefined,
        type: entryType || undefined,
      });
      toast.success(t('Export downloaded successfully', 'ஏற்றுமதி வெற்றிகரமாக பதிவிறக்கம் செய்யப்பட்டது'));
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error(t('Failed to export', 'ஏற்றுமதி செய்வதில் தோல்வி'));
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
      const templeName = "Temple Management";

      // Header
      doc.setDrawColor(204, 85, 0);
      doc.setLineWidth(2);
      doc.line(10, 12, pageWidth - 10, 12);

      doc.setFontSize(24);
      doc.setTextColor(204, 85, 0);
      doc.setFont(undefined, "bold");
      doc.text(templeName, 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, "normal");
      doc.text("Daybook Management System", 14, 31);

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text(title, pageWidth - 14, 25, { align: "right" });

      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.setFont(undefined, "normal");
      doc.text(`${t('Generated', 'உருவாக்கப்பட்டது')}: ${now.toLocaleDateString()}`, pageWidth - 14, 32, { align: "right" });
      doc.text(`${t('Records', 'பதிவுகள்')}: ${entries.length}`, pageWidth - 14, 38, { align: "right" });

      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(10, 42, pageWidth - 10, 42);

      // Summary bar
      const totalIncome = entries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + e.amount, 0);
      const totalExpense = entries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + e.amount, 0);

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(10, 46, pageWidth - 20, 12, 3, 3, "F");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, "bold");
      doc.text(`${t('Total Income', 'மொத்த வருமானம்')}: Rs. ${String(Math.round(totalIncome)).replace(/['"]/g, '')}`, 14, 54);
      doc.text(`${t('Total Expense', 'மொத்த செலவு')}: Rs. ${String(Math.round(totalExpense)).replace(/['"]/g, '')}`, pageWidth / 2, 54, { align: "center" });
      doc.text(`${t('Records', 'பதிவுகள்')}: ${entries.length}`, pageWidth - 14, 54, { align: "right" });

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
        startY: 62,
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
        {/* Period Income */}
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

        {/* Period Expense */}
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

        {/* Total Balance */}
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
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={t('Search entries...', 'உள்ளீடுகளை தேடுக...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-gray-200"
          />
        </div>

        <div className="flex items-center group">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[140px] h-10 border-gray-200 focus:ring-orange-500 text-sm"
          />
        </div>

        <div className="flex items-center group">
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
            {t('Export CSV', 'CSV')}
          </Button>
          
          <Button
            onClick={exportVisiblePDF}
            variant="outline"
            className="h-10 border-gray-200 hover:bg-gray-50 text-red-600 px-3 text-sm"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            {t('Export PDF', 'PDF')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader  className={tableClasses.header}>
                  <TableRow>
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
                    {visibleColumns.actions && <TableHead className="text-center">{t('Actions', 'நடவடிக்கைகள்')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(v => v).length + 1} className="text-center py-12 text-gray-500">
                          {t('No entries found', 'உள்ளீடுகள் எதுவும் கிடைக்கவில்லை')}
                        </TableCell>
                      </TableRow>
                  ) : (
                    entries.map((entry, index) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{(page - 1) * pageSize + index + 1}</TableCell>
                        {visibleColumns.receipt && <TableCell className="font-medium">{entry.receipt_number}</TableCell>}
                        {visibleColumns.booking_date && <TableCell>{formatDate(entry.created_at)}</TableCell>}
                        {visibleColumns.scheduled_date && <TableCell>{formatDate(entry.entry_date)}</TableCell>}
                        {visibleColumns.type && <TableCell>{getEntryTypeBadge(entry.entry_type, entry.reference_type)}</TableCell>}
                        {visibleColumns.description && <TableCell className="max-w-xs truncate">{entry.description}</TableCell>}
                        {visibleColumns.party && (
                          <TableCell>
                            {entry.party_name && (
                              <div>
                                <div className="font-medium">{entry.party_name}</div>
                                {entry.party_mobile && (
                                  <div className="text-sm text-gray-500">{entry.party_mobile}</div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.food && (
                          <TableCell>
                            {entry.reference_type === 'annadhanam' && entry.notes ? (
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
                            {entry.reference_type === 'annadhanam' && 
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
                            {entry.journal_to_account ? (
                              <span className="font-medium text-blue-600">{entry.journal_to_account}</span>
                            ) : entry.payment_mode === 'in_kind' ? (
                              <span className="text-green-600">{t('In Kind', 'உணவு')}</span>
                            ) : (
                              <span>
                                {entry.payment_mode === 'cash' ? t('Cash', 'பணம்') :
                                 entry.payment_mode === 'card' ? t('Card', 'அட்டை') :
                                 entry.payment_mode === 'upi' ? t('UPI', 'UPI') :
                                 entry.payment_mode === 'cheque' ? t('Cheque', 'காசோலை') :
                                 entry.payment_mode === 'bank_transfer' ? t('Bank Transfer', 'வங்கி பரிமாற்றம்') :
                                 entry.payment_mode}
                              </span>
                            )}
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
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewLogs(entry.id)}
                                title={t('View Logs', 'லோடுகளை காண்க')}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/daybook/edit/${entry.id}`)}
                                title={t('Edit', 'திருத்து')}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(entry.id)}
                                title={t('Delete', 'நீக்கு')}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages >= 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
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
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={10}>10 {t('per page', 'ஒவ்வொன்று')}</option>
                      <option value={25}>25 {t('per page', 'ஒவ்வொன்று')}</option>
                      <option value={50}>50 {t('per page', 'ஒவ்வொன்று')}</option>
                      <option value={100}>100 {t('per page', 'ஒவ்வொன்று')}</option>
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
                    <span className="text-sm text-gray-600 px-2">
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Entry?', 'உள்ளீட்டை நீக்கவா?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone. The entry and all associated logs will be permanently deleted.', 'இந்த செயலை மீண்டும் செய்ய முடியாது. உள்ளீடு மற்றும் அதனுடன் தொடர்புடைய அனைத்து லோடுகளும் நிரந்தரமாக நீக்கப்படும்.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'ரத்து')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('Deleting...', 'நீக்குகிறது...')}
                </>
              ) : (
                t('Delete', 'நீக்கு')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Entry Logs', 'உள்ளீடு லோடுகள்')}</DialogTitle>
          </DialogHeader>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('No logs found', 'லோடுகள் எதுவும் கிடைக்கவில்லை')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Action', 'செயல்')}</TableHead>
                  <TableHead>{t('Date/Time', 'தேதி/நேரம்')}</TableHead>
                  <TableHead>{t('User', 'பயனர்')}</TableHead>
                  <TableHead>{t('Details', 'விவரங்கள்')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge
                        className={
                          log.action === 'created'
                            ? 'bg-green-100 text-green-800'
                            : log.action === 'updated'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                    <TableCell>{log.created_by || '-'}</TableCell>
                    <TableCell className="max-w-sm truncate font-mono text-xs">
                      {log.details ? JSON.stringify(log.details, null, 2) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
