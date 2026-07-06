import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Eye, Edit, Trash2, Calendar, IndianRupee, ArrowDownCircle, ArrowUpCircle, Plus, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { useLanguage } from '@/lib/language';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { formFieldStyles, pageContainerStyles } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import { CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Receipt {
  id: number;
  receipt_number: string;
  date: string; // ISO
  type: 'income' | 'expense';
  donor?: string;
  receiver?: string;
  amount: number;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

// API response interface
interface ApiReceipt {
  id: number;
  register_no: string;
  date: string;
  type: 'receipt' | 'payment';
  from_person?: string;
  to_person?: string;
  amount: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper function to convert API response to frontend format
const mapApiReceiptToFrontend = (apiReceipt: ApiReceipt): Receipt => {
  // Normalize donor/receiver regardless of API naming or type
  const isExpense = apiReceipt.type === 'payment';
  // Some APIs may populate either from_person or to_person depending on context;
  // prefer explicit fields but fallback to the other one to avoid empty values.
  const from = apiReceipt.from_person || '';
  const to = apiReceipt.to_person || '';

  // Frontend convention: donor = payer (from), receiver = beneficiary (to)
  const donor = from || to || '';
  const receiver = to || from || '';

  return {
    id: apiReceipt.id,
    receipt_number: apiReceipt.register_no,
    date: apiReceipt.date,
    type: isExpense ? 'expense' : 'income',
    donor,
    receiver,
    amount: parseFloat(String(apiReceipt.amount || '0')),
    remarks: apiReceipt.remarks,
    created_at: apiReceipt.created_at,
    updated_at: apiReceipt.updated_at
  };
};

interface ReceiptFormData {
  date: string;
  type: 'income' | 'expense';
  donor?: string;
  receiver?: string;
  amount: number;
  remarks?: string;
}

export default function ReceiptListView() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const canExportCsv = useFeature('data_export_csv');
  const canExportPdf = useFeature('data_export_excel');
  const { language } = useLanguage();

  // Unified translation object
  const translations = {
    english: {
      title: 'ரசீது பட்டியல்',
      search: 'ரசீது எண், தந்தவர், பெற்றவர் மூலம் தேடவும்...',
      addReceipt: 'புதிய ரசீது',
      receiptNumber: 'ரசீது எண்',
      date: 'தேதி',
      type: 'வகை',
      amount: 'தொகை',
      actions: 'செயல்கள்',
      income: 'வரவு',
      expense: 'செலவு',
      donor: 'தந்தவர்',
      receiver: 'பெற்றவர்',
      view: 'பார்க்க',
      edit: 'திருத்து',
      delete: 'நீக்கு',
      noReceipts: 'ரசீது எதுவும் கிடைக்கவில்லை',
      loading: 'ஏற்றுகிறது...',
      deleteConfirmation: 'நீங்கள் உறுதியாகவா?',
      deleteDescription: 'இது ரசீதுவை நிரந்தரமாக நீக்கும்.',
      cancel: 'ரத்து செய்',
      confirm: 'நீக்கு',
      deleteSuccess: 'ரசீது நீக்கப்பட்டது',
      deleteError: 'ரசீது நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
      updateSuccess: 'ரசீது வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
      updateError: 'ரசீது புதுப்பிப்பு தோல்வி. மீண்டும் முயற்சிக்கவும்.',
      fetchError: 'ரசீது தரவைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
      exportError: 'CSV ஏற்றுமதி தோல்வி',
      printReceipt: 'ரசீதை அச்சிடு',
      remarks: 'குறிப்புகள்',
      print: 'அச்சிடு',
      close: 'மூடு',
      from: 'இருந்து',
      to: 'வரை',
      all: 'அனைத்தும்',
      exportCsv: 'CSV ஏற்றுமதி',
      toggleColumns: 'பத்திகளை மாற்று',
      viewReceipt: 'ரசீது பார்க்க',
      editReceipt: 'ரசீது திருத்தம்',
      viewDescription: 'கீழே உள்ள ரசீது விவரங்களை பார்க்கவும்',
      editDescription: 'கீழே உள்ள ரசீது விவரங்களை திருத்தவும்',
      saveChanges: 'மாற்றங்களை சேமிக்க',
      showing: 'காட்டப்படுகிறது',
      of: 'இல்',
      items: 'உருப்படிகள்',
      balance: 'இருப்பு',
      previous: 'முந்தைய',
      next: 'அடுத்து',
      success: 'வெற்றி',
      error: 'பிழை'
    },
    tamil: {
      title: 'Receipt List',
      search: 'Search by receipt no, donor, receiver...',
      addReceipt: 'Add Receipt',
      receiptNumber: 'Receipt No',
      date: 'Date',
      type: 'Type',
      amount: 'Amount',
      actions: 'Actions',
      income: 'Income',
      expense: 'Expense',
      donor: 'Donor',
      receiver: 'Receiver',
      view: 'View',
      edit: 'Edit',
      delete: 'Delete',
      noReceipts: 'No receipts found',
      loading: 'Loading...',
      deleteConfirmation: 'Are you sure?',
      deleteDescription: 'This will permanently delete the receipt.',
      cancel: 'Cancel',
      confirm: 'Delete',
      deleteSuccess: 'Receipt deleted',
      deleteError: 'Failed to delete receipt. Please try again.',
      updateSuccess: 'Receipt updated successfully',
      updateError: 'Failed to update receipt. Please try again.',
      fetchError: 'Failed to fetch receipts. Please try again.',
      exportError: 'Failed to export CSV',
      printReceipt: 'Print Receipt',
      remarks: 'Remarks',
      print: 'Print',
      close: 'Close',
      from: 'From',
      to: 'To',
      all: 'All',
      exportCsv: 'Export CSV',
      toggleColumns: 'Toggle Columns',
      viewReceipt: 'View Receipt',
      editReceipt: 'Edit Receipt',
      viewDescription: 'View the receipt details below',
      editDescription: 'Edit the receipt details below',
      saveChanges: 'Save Changes',
      showing: 'Showing',
      of: 'of',
      items: 'items',
      balance: 'Balance',
      previous: 'Previous',
      next: 'Next',
      success: 'Success',
      error: 'Error'
    }
  };

  // Translation function
  const t = (key: keyof typeof translations.english): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.english;
    return currentTranslations[key] || translations.english[key] || key;
  };

  // State variables
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [data, setData] = useState<Receipt[]>([]);
  const [pagination, setPagination] = useState({ 
    pageIndex: 0, 
    pageSize: 10, 
    total: 0, 
    totalPages: 1 
  });

  // Modal states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewEditReceipt, setViewEditReceipt] = useState<Receipt | null>(null);
  const [isViewEditOpen, setIsViewEditOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Partial<ReceiptFormData>>({});

  // Logs modal state
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTitle, setLogsTitle] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [isAllLogs, setIsAllLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsPageSize = 50;

  // Visible columns state
  type ColKey = '#' | 'receiptNumber' | 'date' | 'type' | 'donor' | 'receiver' | 'amount' | 'actions';
  const STORAGE_KEY = 'receipt_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    '#': true,
    receiptNumber: true,
    date: true,
    type: true,
    donor: true,
    receiver: true,
    amount: true,
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

  // Context menu state
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

  // Permission checks
  const isSuperAdmin = user?.role === 'superadmin';
  const canEdit = isSuperAdmin || (user as any)?.permissions?.some((p: any) => 
    p.permission_id === 'receipts' && (p.access_level === 'edit' || p.access_level === 'full')
  );

  // Fetch receipts function
  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
      });
      if (searchTerm) params.append('q', searchTerm);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const res = await fetch(`https://templeapi.agniplay.com/api/receipts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to fetch receipts');
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch receipts');
      
      // Map API response to frontend format and sort in descending receipt order
      const mappedData = (result.data || []).map(mapApiReceiptToFrontend);
      const sortedData = mappedData.slice().sort((a, b) => {
        const aNum = parseInt((a.receipt_number || '').replace(/\D/g, '') || '0', 10);
        const bNum = parseInt((b.receipt_number || '').replace(/\D/g, '') || '0', 10);

        if (bNum !== aNum) {
          return bNum - aNum;
        }

        // Fallback to date comparison when receipt numbers match
        return (b.date || '').localeCompare(a.date || '');
      });

      setData(sortedData);
      setPagination((prev) => ({ 
        ...prev, 
        total: result.pagination?.total || sortedData.length || 0, 
        totalPages: result.pagination?.totalPages || Math.ceil((result.pagination?.total || sortedData.length || 0) / prev.pageSize) 
      }));
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('error'), 
        description: t('fetchError'), 
        variant: 'destructive' 
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, fromDate, toDate, typeFilter]);

  // Event handlers
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (typeFilter !== 'all') {
        // Map frontend type to API type
        const apiType = typeFilter === 'income' ? 'receipt' : typeFilter === 'expense' ? 'payment' : undefined;
        if (apiType) params.append('type', apiType);
      }

      const res = await fetch(`https://templeapi.agniplay.com/api/receipts/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipts.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('error'), 
        description: t('exportError'), 
        variant: 'destructive' 
      });
    }
  };

  const exportVisiblePDF = () => {
    try {
      // Column definitions - use English labels for PDF (jsPDF doesn't support Tamil)
      type ColDef = { key: ColKey; label: string; getValue: (r: Receipt, idx: number) => string | number };
      const allColDefs: ColDef[] = [
        { key: '#', label: 'S.No', getValue: (_, idx) => idx + 1 },
        { key: 'receiptNumber', label: 'Receipt No', getValue: (r) => r.receipt_number || '' },
        { key: 'date', label: 'Date', getValue: (r) => formatDate(r.date) },
        { key: 'type', label: 'Type', getValue: (r) => r.type === 'income' ? 'Income' : 'Expense' },
        { key: 'donor', label: 'Donor', getValue: (r) => r.donor || '-' },
        { key: 'receiver', label: 'Receiver', getValue: (r) => r.receiver || '-' },
        { key: 'amount', label: 'Amount', getValue: (r) => `Rs. ${String(Math.round(r.amount || 0))}` },
      ];

      // 1. Filter: only visible cols, never 'actions'
      const activeCols = allColDefs.filter(c => c.key !== 'actions' && visibleCols[c.key]);

      if (activeCols.length === 0) {
        toast({
          title: t('error'),
          description: t('Please make at least one column visible.', 'குறைந்தது ஒரு நெடுவரிசையை காட்டுங்கள்.'),
          variant: 'destructive',
        });
        return;
      }

      // 2. Build table data
      const headCells = activeCols.map(c => c.label);
      const exportRows = data.map((r, idx) => activeCols.map(c => c.getValue(r, idx)));

      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const now = new Date();
      const templeName = (user as any)?.templeName || "Temple Management";
      const title = t('title');

      // Top Orange Accent Line
      doc.setDrawColor(204, 85, 0);
      doc.setLineWidth(2);
      doc.line(10, 12, pageWidth - 10, 12);

      // Temple Name (Left)
      doc.setFontSize(24);
      doc.setTextColor(204, 85, 0);
      doc.setFont(undefined, "bold");
      doc.text(templeName, 14, 25);

      // Title (Right)
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text(title, pageWidth - 14, 25, { align: "right" });

      // Meta Info (Right)
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.setFont(undefined, "normal");
      doc.text(`${t("Generated", "உருவாக்கப்பட்டது")}: ${now.toLocaleDateString()}`, pageWidth - 14, 32, { align: "right" });
      doc.text(`${t("Records", "பதிவுகள்")}: ${data.length}`, pageWidth - 14, 38, { align: "right" });

      // Divider
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(10, 42, pageWidth - 10, 42);

      // Summary bar
      const totalIncome = data.filter(r => r.type === 'income').reduce((sum, r) => sum + (r.amount || 0), 0);
      const totalExpense = data.filter(r => r.type === 'expense').reduce((sum, r) => sum + (r.amount || 0), 0);
      const balance = totalIncome - totalExpense;
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(10, 46, pageWidth - 20, 12, 3, 3, "F");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, "bold");
      doc.text(`${t("Total Income", "மொத்த வருமானம்")}: Rs. ${totalIncome.toFixed(2)}`, 14, 54);
      doc.text(`${t("Total Expense", "மொத்த செலவு")}: Rs. ${totalExpense.toFixed(2)}`, pageWidth / 2, 54, { align: "center" });
      doc.text(`${t('balance')}: Rs. ${balance.toFixed(2)}`, pageWidth - 14, 54, { align: "right" });

      // 3. Specific column widths based on content type
      const columnWidthMap: Record<ColKey, number> = {
        '#': 15,
        receiptNumber: 30,
        date: 25,
        type: 25,
        donor: 45,
        receiver: 45,
        amount: 30,
        actions: 0,
      };

      // 4. Alignment per key
      const rightAlign = ['amount'];
      const centerAlign = ['#', 'receiptNumber', 'date', 'type'];
      const columnStyles: Record<number, any> = {};
      activeCols.forEach((col, i) => {
        columnStyles[i] = {
          cellWidth: columnWidthMap[col.key],
          halign: rightAlign.includes(col.key) ? 'right' : centerAlign.includes(col.key) ? 'center' : 'left',
        };
      });

      // 5. PDF header (page 1 only via startY)
      autoTable(doc, {
        head: [headCells],
        body: exportRows as (string | number)[][],
        startY: 62,
        margin: { top: 15, left: 'auto', right: 'auto', bottom: 25 },
        tableWidth: 'auto',
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          valign: 'middle',
          halign: 'center',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [204, 85, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252]
        },
        columnStyles,
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150);
          const pageStr = `Page ${doc.getCurrentPageInfo().pageNumber}`;
          doc.text(pageStr, 14, pageHeight - 10);
          doc.text(templeName, pageWidth / 2, pageHeight - 10, { align: "center" } as any);
        }
      });

      const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      doc.save(`receipts-export-${stamp}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      toast({
        title: t('error'),
        description: "Failed to export PDF",
        variant: 'destructive',
      });
    }
  };

  const openReceiptLogs = async (id: number, receiptNo?: string) => {
    try {
      setIsAllLogs(false);
      setLogsOpen(true);
      setLogsLoading(true);
      setLogsTitle(`${t('viewReceipt')} ${receiptNo ? `#${receiptNo}` : ''}`);
      const res = await fetch(`https://templeapi.agniplay.com/api/receipts/${id}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setLogs(Array.isArray(result?.data) ? result.data : []);
      setLogsTotal(Array.isArray(result?.data) ? result.data.length : 0);
      setLogsPage(1);
    } catch (e) {
      console.error(e);
      setLogs([]);
      setLogsTotal(0);
    } finally {
      setLogsLoading(false);
    }
  };

  const openAllLogs = async (page = 1) => {
    try {
      setIsAllLogs(true);
      setLogsOpen(true);
      setLogsLoading(true);
      setLogsTitle(t('viewReceipt'));
      const res = await fetch(`https://templeapi.agniplay.com/api/receipts/logs?page=${page}&pageSize=${logsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      const arr = Array.isArray(result?.data) ? result.data : [];
      setLogs(arr);
      setLogsTotal(Number(result?.total || arr.length || 0));
      setLogsPage(page);
    } catch (e) {
      console.error(e);
      setLogs([]);
      setLogsTotal(0);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleViewClick = (rec: Receipt) => {
    setViewEditReceipt(rec);
    setEditedReceipt({
      date: rec.date?.slice(0, 10) || '',
      type: rec.type,
      donor: rec.donor || '',
      receiver: rec.receiver || '',
      amount: rec.amount,
      remarks: rec.remarks || '',
    });
    setEditMode(false);
    setIsViewEditOpen(true);
  };

  const handleEditClick = (rec: Receipt) => {
    // Navigate to dedicated entry page for editing
    navigate(`/dashboard/receipt/entry/${rec.id}`);
  };

  const handleSaveEdit = async () => {
    if (!viewEditReceipt || !editedReceipt) return;
    
    try {
      // Map frontend data back to API format for update
      const apiReceiptData: any = {
        date: editedReceipt.date,
        type: editedReceipt.type === 'expense' ? 'payment' : 'receipt',
        amount: editedReceipt.amount,
        remarks: editedReceipt.remarks
      };

      // Use API field names: from_person / to_person
      if (editedReceipt.donor != null) apiReceiptData.from_person = editedReceipt.donor;
      if (editedReceipt.receiver != null) apiReceiptData.to_person = editedReceipt.receiver;

      const res = await fetch(`https://templeapi.agniplay.com/api/receipts/${viewEditReceipt.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(apiReceiptData),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update receipt');
      }
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update receipt');
      
      // Map the updated receipt back to frontend format
      const updatedReceipt = mapApiReceiptToFrontend(result.data);
      setData((prev) => prev.map((r) => 
        r.id === viewEditReceipt.id ? { ...r, ...updatedReceipt } : r
      ));
      
      toast({ 
        title: t('success'), 
        description: t('updateSuccess') 
      });
      
      setIsViewEditOpen(false);
      setViewEditReceipt(null);
      setEditedReceipt({});
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('error'), 
        description: t('updateError'), 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/receipts/${deleteId}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete receipt');
      }
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete receipt');
      
      setData((prev) => prev.filter((r) => r.id !== deleteId));
      toast({ 
        title: t('success'), 
        description: t('deleteSuccess') 
      });
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('error'), 
        description: t('deleteError'), 
        variant: 'destructive' 
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Utility functions
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
  const formatAmount = (amt: number) => new Intl.NumberFormat(undefined, { 
    style: 'currency', 
    currency: 'INR' 
  }).format(amt || 0);

  // Calculate totals
  const totals = useMemo(() => {
    const total = data.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const income = data.filter(r => r.type === 'income').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expense = data.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const balance = income - expense;
    return { total, income, expense, balance };
  }, [data]);

  // Get the ID of the last (most recent) receipt
  const lastReceiptId = data.length > 0 ? data[0].id : null;

  return (
    <div className={cn(pageContainerStyles.container, 'max-w-7xl mx-auto')}>
      <div className={pageContainerStyles.content}>
        {/* Header */}
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
              {t('title')}
            </CardTitle>
          </div>
        </CardHeader>

        <Card>
          <CardContent className="pt-6">
            {/* Filters - Single Line */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('search')}
                  className={cn(theme.input.base, theme.input.size.md, "pl-9 w-full")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">{t('from')}:</span>
                <Input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)}
                  className={cn(theme.input.base, theme.input.size.sm)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">{t('to')}:</span>
                <Input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)}
                  className={cn(theme.input.base, theme.input.size.sm)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">{t('type')}:</span>
                <select 
                  className={cn(theme.select.base, theme.select.size.sm, "rounded")} 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <option value="all">{t('all')}</option>
                  <option value="income">{t('income')}</option>
                  <option value="expense">{t('expense')}</option>
                </select>
              </div>
              
              <div className="flex gap-2 ml-auto">
                {canExportPdf && (
                  <Button variant="outline" onClick={exportVisiblePDF} disabled={loading || data.length === 0}>
                    <FileDown className="h-3 w-3 mr-1" />
                    Export PDF
                  </Button>
                )}
                {canExportCsv && (
                  <Button onClick={handleExportCSV} disabled={loading || data.length === 0}>
                    Export CSV
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className={tableClasses.scrollContainerWrapper}>
              <div className={tableClasses.scrollContainer}>
                {loading ? (
                  <div className={cn(tableClasses.emptyState, "flex items-center justify-center py-12")}>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table className={tableClasses.container} onContextMenu={onContextMenu}>
                    <TableHeader className={tableClasses.header}>
                      <TableRow className={tableClasses.row}>
                        {visibleCols['#'] && <TableHead className={cn(tableClasses.headerCell, 'w-[50px]')}>{'#'}</TableHead>}
                        {visibleCols.receiptNumber && <TableHead className={tableClasses.headerCell}>{t('receiptNumber')}</TableHead>}
                        {visibleCols.date && <TableHead className={tableClasses.headerCell}>{t('date')}</TableHead>}
                        {visibleCols.type && <TableHead className={tableClasses.headerCell}>{t('type')}</TableHead>}
                        {visibleCols.donor && <TableHead className={tableClasses.headerCell}>{t('donor')}</TableHead>}
                        {visibleCols.receiver && <TableHead className={tableClasses.headerCell}>{t('receiver')}</TableHead>}
                        {visibleCols.amount && <TableHead className={cn(tableClasses.headerCell, 'text-right')}>{t('amount')}</TableHead>}
                        {visibleCols.actions && <TableHead className={cn(tableClasses.headerCell, 'text-right')}>{t('actions')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.length > 0 ? (
                        data.map((rec, idx) => (
                          <TableRow key={rec.id} className={tableClasses.row}>
                            {visibleCols['#'] && <TableCell className={cn(tableClasses.cell, 'w-[50px]')}>{idx + 1}</TableCell>}
                            {visibleCols.receiptNumber && <TableCell className={tableClasses.cell}>
                              {rec.receipt_number}
                            </TableCell>}
                            {visibleCols.date && <TableCell className={tableClasses.cell}>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                {formatDate(rec.date)}
                              </div>
                            </TableCell>}
                            {visibleCols.type && <TableCell className={tableClasses.cell}>
                              <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                rec.type === 'income' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {rec.type === 'income' ? (
                                  <ArrowDownCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                                )}
                                {rec.type === 'income' ? t('income') : t('expense')}
                              </div>
                            </TableCell>}
                            {visibleCols.donor && <TableCell className={tableClasses.cell}>
                              {rec.donor || '-'}
                            </TableCell>}
                            {visibleCols.receiver && <TableCell className={tableClasses.cell}>
                              {rec.receiver || '-'}
                            </TableCell>}
                            {visibleCols.amount && <TableCell className={cn(tableClasses.cell, 'text-right')}>
                              <div className={`inline-flex items-center justify-end w-full font-medium ${
                                rec.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatAmount(rec.amount)}
                              </div>
                            </TableCell>}
                            {visibleCols.actions && <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewClick(rec)}
                                  className={tableClasses.actionButtonPrimary}
                                  title={t('view')}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditClick(rec)}
                                  className={tableClasses.actionButtonSecondary}
                                  title={t('edit')}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className={rec.id === lastReceiptId ? tableClasses.actionButtonDanger : 'opacity-50 cursor-not-allowed'}
                                  onClick={() => handleDeleteClick(rec.id)}
                                  disabled={rec.id !== lastReceiptId}
                                  title={t('delete')}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>}
                          </TableRow>
                        ))
                      ) : (
                         <TableRow  className="whitespace-nowrap">
                          <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                            {t('noReceipts')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Footer with totals and pagination */}
              <div className={tableClasses.pagination}>
                <div className="text-xs text-gray-700 flex flex-wrap gap-4">
                  <span>
                    {t('showing')} {data.length} {t('of')} <span className="font-medium">{pagination.total}</span> {t('items')}
                  </span>
                  <span>| {t('income')}: <span className="font-medium">{formatAmount(totals.income)}</span></span>
                  <span>| {t('expense')}: <span className="font-medium">{formatAmount(totals.expense)}</span></span>
                  <span>| {t('balance')}: <span className="font-medium">{formatAmount(totals.balance)}</span></span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ 
                      ...prev, 
                      pageIndex: Math.max(0, prev.pageIndex - 1) 
                    }))}
                    disabled={pagination.pageIndex === 0}
                  >
                    {t('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ 
                      ...prev, 
                      pageIndex: prev.pageIndex + 1 
                    }))}
                    disabled={pagination.pageIndex >= pagination.totalPages - 1}
                  >
                    {t('next')}
                  </Button>
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
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b">
              {t('toggleColumns')}
            </div>
            {/* Define menu items inline since allColDefs is inside the PDF function */}
            {[
              { key: '#' as ColKey, label: language === 'english' ? 'S.No' : 'வ.எண்' },
              { key: 'receiptNumber' as ColKey, label: t('receiptNumber') },
              { key: 'date' as ColKey, label: t('date') },
              { key: 'type' as ColKey, label: t('type') },
              { key: 'donor' as ColKey, label: t('donor') },
              { key: 'receiver' as ColKey, label: t('receiver') },
              { key: 'amount' as ColKey, label: t('amount') },
            ].map(col => (
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
            <div className="border-t mt-1 pt-1">
              <button onClick={() => setVisibleCols({ '#': true, receiptNumber: true, date: true, type: true, donor: true, receiver: true, amount: true, actions: true })} className="w-full text-left px-3 py-1 text-xs text-blue-600 hover:bg-blue-50" type="button">
                {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
              </button>
              <button onClick={() => setMenuOpen(false)} className="w-full text-left px-3 py-1 text-xs text-gray-600 hover:bg-gray-50" type="button">
                {t('Close', 'மூடு')}
              </button>
            </div>
          </div>
        )}

        {/* View/Edit Modal */}
        <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? t('editReceipt') : t('viewReceipt')}
              </DialogTitle>
              <DialogDescription>
                {editMode ? t('editDescription') : t('viewDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className={formFieldStyles.taxForm.grid}>
              <div className="space-y-1">
                <Label htmlFor="date" className={formFieldStyles.taxForm.label}>{t('date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={editedReceipt.date || ''}
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, date: e.target.value })}
                  className={cn(theme.input.base, theme.input.size.md, formFieldStyles.taxForm.input)}
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type" className={formFieldStyles.taxForm.label}>{t('type')}</Label>
                <select
                  id="type"
                  value={editedReceipt.type || 'income'}
                  onChange={(e) => setEditedReceipt({ 
                    ...editedReceipt, 
                    type: e.target.value as 'income' | 'expense' 
                  })}
                  className={cn(theme.select.base, theme.select.size.md, formFieldStyles.taxForm.select, !editMode && 'opacity-50 cursor-not-allowed')}
                  disabled={!editMode}
                >
                  <option value="income">{t('income')}</option>
                  <option value="expense">{t('expense')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="donor" className={formFieldStyles.taxForm.label}>{t('donor')}</Label>
                <Input 
                  id="donor" 
                  value={editedReceipt.donor || ''} 
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, donor: e.target.value })} 
                  className={cn(theme.input.base, theme.input.size.md, formFieldStyles.taxForm.input)}
                  disabled={!editMode} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receiver" className={formFieldStyles.taxForm.label}>{t('receiver')}</Label>
                <Input 
                  id="receiver" 
                  value={editedReceipt.receiver || ''} 
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, receiver: e.target.value })} 
                  className={cn(theme.input.base, theme.input.size.md, formFieldStyles.taxForm.input)}
                  disabled={!editMode} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount" className={formFieldStyles.taxForm.label}>{t('amount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  value={editedReceipt.amount || ''}
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, amount: Number(e.target.value) || 0 })}
                  className={cn(theme.input.base, theme.input.size.md, formFieldStyles.taxForm.input)}
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-1 col-span-4">
                <Label htmlFor="remarks" className={formFieldStyles.taxForm.label}>{t('remarks')}</Label>
                <Input
                  id="remarks"
                  value={editedReceipt.remarks || ''}
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, remarks: e.target.value })}
                  className={cn(theme.input.base, theme.input.size.md, formFieldStyles.taxForm.input)}
                  disabled={!editMode}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsViewEditOpen(false);
                  setViewEditReceipt(null);
                  setEditedReceipt({});
                }}
              >
                {t('cancel')}
              </Button>
              {editMode && (
                <Button 
                  onClick={handleSaveEdit} 
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {t('saveChanges')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        {deleteId !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-[90%] max-w-sm">
              <div className="font-semibold mb-2">{t('deleteConfirmation')}</div>
              <div className="text-sm text-muted-foreground mb-4">
                {t('deleteDescription')}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteId(null)}>
                  {t('cancel')}
                </Button>
                <Button 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  onClick={confirmDelete}
                >
                  {t('confirm')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {logsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogsOpen(false)} />
          <div className="relative bg-white rounded shadow-lg w-full max-w-5xl mx-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">{logsTitle}</h2>
              <button onClick={() => setLogsOpen(false)} className="text-xs px-2 py-1 border rounded">{t('close')}</button>
            </div>
            {logsLoading ? (
              <div className="p-3 text-xs text-gray-600">{t('loading')}</div>
            ) : (
              <>
                <div className="max-h-[70vh] overflow-y-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1">{t('date')}</th>
                        <th className="text-left px-2 py-1">{t('type')}</th>
                        {isAllLogs && (
                          <>
                            <th className="text-left px-2 py-1">{t('receiptNumber')}</th>
                            <th className="text-left px-2 py-1">{t('donor')}</th>
                            <th className="text-left px-2 py-1">{t('receiver')}</th>
                          </>
                        )}
                        <th className="text-left px-2 py-1">User</th>
                        <th className="text-left px-2 py-1">{t('remarks')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={isAllLogs ? 7 : 4} className="px-2 py-2 text-center text-gray-500">
                            {t('noReceipts')}
                          </td>
                        </tr>
                      ) : logs.map((log: any) => (
                        <tr key={log.id} className="border-t align-top">
                          <td className="px-2 py-1 whitespace-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}
                          </td>
                          <td className="px-2 py-1">{log.action}</td>
                          {isAllLogs && (
                            <>
                              <td className="px-2 py-1">{log.receipt_number || '-'}</td>
                              <td className="px-2 py-1">{log.donor || '-'}</td>
                              <td className="px-2 py-1">{log.receiver || '-'}</td>
                            </>
                          )}
                          <td className="px-2 py-1">{log.created_by || '-'}</td>
                          <td className="px-2 py-1">
                            <pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isAllLogs && (
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="text-gray-700">
                      {t('showing')} <span className="font-medium">{logsTotal}</span> {t('items')}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={cn(theme.input.base, "px-2 py-1 rounded shadow-sm text-xs bg-white hover:bg-gray-50")}
                        disabled={logsPage <= 1}
                        onClick={() => openAllLogs(logsPage - 1)}
                      >
                        {t('previous')}
                      </button>
                      <span>{t('showing')} {logsPage}</span>
                      
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}