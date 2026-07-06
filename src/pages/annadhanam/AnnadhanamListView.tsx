import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PlusCircle, Loader2, Eye, Edit, Trash2, Calendar, Users, Clock, FileDown, FileSpreadsheet, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useFeature } from "@/hooks/useFeature";
import { cn, pageContainerStyles, formFieldStyles } from "@/styles/formStyles";
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiClient from "@/lib/apiClient";

interface AnnadhanamSlot {
  id: number;
  annadhanam_id: number;
  donation_date: string;
  time_slot: string;
  donation_time: string;
  food_details: string;
  count: number;
}

interface Annadhanam {
  id: number;
  receipt_number: string;
  name: string;
  mobile_number: string;
  food: string;
  peoples: number;
  time: string;
  from_date: string;
  to_date: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  donation_type?: 'food' | 'product' | 'money';
  product_name?: string;
  quantity?: number;
  unit?: string;
  amount?: number;
  enable_multi_slot?: number | boolean;
  food_details?: AnnadhanamSlot[];
}

interface AnnadhanamFormData {
  name: string;
  mobileNumber: string;
  food: string;
  peoples: number;
  time: string;
  fromDate: string;
  toDate: string;
  remarks?: string;
}

interface AnnadhanamLog {
  id: number;
  annadhanam_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  annadhanam_name: string | null;
  receipt_number: string | null;
  details: any;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. VISIBLE COLUMNS STATE & TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type ColKey = '#' | 'receipt_number' | 'name' | 'mobile_number' | 'donation_type' | 'food' | 'qty' | 'peoples' | 'multi_slot' | 'date_range' | 'time' | 'actions';

const STORAGE_KEY = 'annadhanam_visible_cols_v1';
const defaultVisibleCols: Record<ColKey, boolean> = {
  '#': true,
  'receipt_number': true,
  'name': true,
  'mobile_number': true,
  'donation_type': true,
  'food': true,
  'qty': true,
  'peoples': true,
  'multi_slot': true,
  'date_range': true,
  'time': true,
  'actions': true,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. allColDefs ARRAY (core of PDF logic)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const allColDefs: Array<{
  key: ColKey;
  label: string;
  labelTa?: string;
  getValue: (row: Annadhanam, index: number) => string | number;
}> = [
  { key: '#', label: 'S.No', labelTa: 'வ.எண்', getValue: (_, idx) => idx + 1 },
  { key: 'receipt_number', label: 'Receipt No', labelTa: 'ரசீது எண்', getValue: (r) => r.receipt_number || '' },
  { key: 'name', label: 'Name', labelTa: 'பெயர்', getValue: (r) => r.name || '' },
  { key: 'mobile_number', label: 'Mobile', labelTa: 'செல்', getValue: (r) => r.mobile_number || '' },
  { key: 'donation_type', label: 'Donation Type', labelTa: 'நன்கொடை வகை', getValue: (r) => {
    if (r.donation_type === 'product') return 'Product';
    if (r.donation_type === 'money') return 'Money';
    return 'Food';
  }},
  { key: 'food', label: 'Items/Product', labelTa: 'பொருள்', getValue: (r) => {
    if (r.donation_type === 'product' && r.product_name) return r.product_name;
    if (r.donation_type === 'money') return `Money: ${r.amount || ''}`;
    if (r.enable_multi_slot) return 'Multi-Slot Food Donation';
    return r.food || '';
  }},
  { key: 'qty', label: 'Qty', labelTa: 'அளவு', getValue: (r) => {
    if (r.donation_type === 'product' && r.quantity != null) {
      return `${r.quantity}${r.unit ? ` ${r.unit}` : ''}`;
    }
    return '-';
  }},
  { key: 'peoples', label: 'Total Qty', labelTa: 'மொத்த அளவு', getValue: (r) => r.peoples ?? '' },
  { key: 'multi_slot', label: 'Multi Slot', labelTa: 'பல இடங்கள்', getValue: (r) => (r.enable_multi_slot ? 'Yes' : 'No') },
  { key: 'date_range', label: 'Date Range', labelTa: 'தேதி', getValue: (r) => {
      const from = formatDateStatic(r.from_date);
      const to = formatDateStatic(r.to_date);
      return from !== to ? `${from} - ${to}` : from;
    }},
  { key: 'time', label: 'Time', labelTa: 'நேரம்', getValue: (r) => formatTimeStatic(r.time) || '' },
];

// Static helpers for export (don't depend on component instance)
const formatDateStatic = (dateString: string | null | undefined) => {
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

const formatTimeStatic = (timeString: string) => {
  return timeString;
};

export default function AnnadhanamListView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { language } = useLanguage();
  const canExportCsv = useFeature('data_export_csv');
  const canExportPdf = useFeature('data_export_excel');

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  const normalizeDateString = (s?: string) => {
    if (!s) return '';
    return s.slice(0, 10);
  };

  const normalizeTimeString = (s?: string) => {
    if (!s) return '';
    const hm = s.match(/^\d{2}:\d{2}(:\d{2})?$/);
    if (hm) return s.slice(0, 5);
    const ampm = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = ampm[2];
      const ap = ampm[3].toUpperCase();
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      const hh = String(h).padStart(2, '0');
      return `${hh}:${m}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return '';
  };

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<Annadhanam[]>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewEditAnnadhanam, setViewEditAnnadhanam] = useState<Annadhanam | null>(null);
  const [isViewEditOpen, setIsViewEditOpen] = useState(false);
  const [editedAnnadhanam, setEditedAnnadhanam] = useState<Partial<AnnadhanamFormData>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [donationTypeFilter, setDonationTypeFilter] = useState<string>("all");
  const [isMultiSlotFilter, setIsMultiSlotFilter] = useState<string>("all");

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Logs modal state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; action: string; created_at: string; created_by: number | null; details: any }>>([]);

  // All Logs (temple scoped) state
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<Array<{
    id: number;
    annadhanam_id: number;
    action: string;
    created_at: string;
    created_by: number | null;
    annadhanam_name: string | null;
    receipt_number: string | null;
    details: any;
  }>>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const allLogsPageSize = 50;

  // User names and details for logs
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, { name: string, username?: string, mobile?: string }>>({});

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. VISIBLE COLUMNS STATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(defaultVisibleCols);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const tableRef = useRef<HTMLDivElement>(null);

  // Load visibleCols from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new columns
        setVisibleCols({ ...defaultVisibleCols, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load visibleCols from localStorage', e);
    }
  }, []);

  // Persist visibleCols to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch (e) {
      console.warn('Failed to save visibleCols to localStorage', e);
    }
  }, [visibleCols]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const toggleColumn = (key: ColKey) => {
    if (key === 'actions') return; // Never hide actions in UI
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  };

  // Fetch user names/details for given ids (per-id endpoint, resilient)
  const fetchUserNames = async (userIds: number[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter((v): v is number => typeof v === 'number')));
    if (uniqueIds.length === 0) return;
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
          const u = data?.data?.user || data?.data;
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

  const openLogs = async (annadhanamId: number) => {
    setLogsFor(annadhanamId);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/annadhanam/${annadhanamId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('Logs API Response:', result);
      if (result.success) {
        const logsData = Array.isArray(result.data) ? result.data : [];
        setLogs(logsData);
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
    await loadAllAnnadhanamLogs(1);
  };

  const loadAllAnnadhanamLogs = async (pageNum: number) => {
    setAllLogsLoading(true);
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/annadhanam/logs?page=${pageNum}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('All Logs API Response:', result);
      if (result.success) {
        const logsData = Array.isArray(result.data) ? result.data : [];
        setAllLogs(logsData);
        setAllLogsTotal(Number(result.total || 0));
        setAllLogsPage(pageNum);
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
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
  };

  // Fetch annadhanam entries from API
  const fetchAnnadhanam = async () => {
    try {
      setLoading(true);
      const donationParam = donationTypeFilter !== 'all' ? `&donationType=${donationTypeFilter}` : '';
      const slotParam = isMultiSlotFilter !== 'all' ? `&isMultiSlot=${isMultiSlotFilter === 'multi'}` : '';
      
      const response = await fetch(`https://templeapi.agniplay.com/api/annadhanam?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}&search=${encodeURIComponent(searchTerm)}${donationParam}${slotParam}&sort=receipt_number&order=desc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch annadhanam data');
      const result = await response.json();
      if (result.success) {
        const sorted = (result.data || []).slice().sort((a, b) => {
          const aNum = parseInt((a.receipt_number || '').replace(/\D/g, '') || '0');
          const bNum = parseInt((b.receipt_number || '').replace(/\D/g, '') || '0');
          return bNum - aNum;
        });
        setData(sorted);
        setPagination((prev) => ({
          ...prev,
          total: result.total || sorted.length,
          totalPages: result.total_pages || Math.max(1, Math.ceil(sorted.length / prev.pageSize)),
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error("Error fetching annadhanam data:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to fetch annadhanam data. Please try again.", "அன்னதானம் தரவைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXPORT HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const csvEscape = (value: any) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(str)) return `"${str}"`;
    return str;
  };

  const exportToCSV = () => {
    try {
      // Filter to visible columns only, exclude 'actions'
      const activeCols = allColDefs.filter(c => c.key !== 'actions' && visibleCols[c.key]);
      const headers = activeCols.map(c => csvEscape(t(c.label, c.labelTa || c.label)));
      // Export ALL data, not just paginated
      const rows = data.map((r, idx) => activeCols.map(c => csvEscape(c.getValue(r, idx))));
      const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.href = url;
      link.download = `annadhanam-export-${stamp}.csv`;
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. exportVisiblePDF FUNCTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const exportVisiblePDF = () => {
    try {
      // 1. Filter: only visible cols, never 'actions'
      const activeCols = allColDefs.filter(c => c.key !== 'actions' && visibleCols[c.key]);
      if (activeCols.length === 0) {
        toast({
          title: t("Error", "பிழை"),
          description: t("No columns selected for export.", "ஏற்றுமதி செய்ய எந்த நெடுவையும் தேர்ந்தெடுக்கப்படவில்லை."),
          variant: "destructive",
        });
        return;
      }

      // 2. Build table data - export ALL rows, not paginated
      const headCells = activeCols.map(c => t(c.label, c.labelTa || c.label));
      
      const exportRows: any[] = [];
      data.forEach((r, idx) => {
        // Master Row
        const masterRow = activeCols.map(c => {
          const val = c.getValue(r, idx);
          return typeof val === 'string' ? val.replace(/₹/g, 'Rs.') : val;
        });
        exportRows.push(masterRow);

        // If multi-slot, add children rows
        if (r.enable_multi_slot && r.food_details && r.food_details.length > 0) {
          // Add a spacer/header row for slots
          const slotHeader = activeCols.map(c => {
            if (c.key === 'food') return `--- ${t('SLOT DETAILS', 'இடங்கள் விவரங்கள்')} ---`;
            return '';
          });
          exportRows.push(slotHeader);

          r.food_details.forEach(slot => {
            const slotRow = activeCols.map(c => {
              if (c.key === 'date_range') return formatDateStatic(slot.donation_date);
              if (c.key === 'time') return `${slot.time_slot} (${slot.donation_time})`;
              if (c.key === 'food') return `  ↳ ${slot.food_details}`;
              if (c.key === 'peoples') return slot.count;
              if (c.key === 'multi_slot') return '';
              if (c.key === 'donation_type') return '';
              if (c.key === 'receipt_number') return '';
              if (c.key === 'name') return '';
              if (c.key === 'mobile_number') return '';
              if (c.key === '#') return '';
              return '';
            });
            exportRows.push(slotRow);
          });
          
          // Add a small spacer after slots
          exportRows.push(activeCols.map(() => ''));
        }
      });

      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const now = new Date();
      const templeName = (user as any)?.templeName || "Temple";
      const title = t("Annadhanam List", "அன்னதானம் பட்டியல்");

      /* =========================================================
         🎨 MODERN HEADER (Page 1 only via startY)
      ========================================================= */
      // Top Accent Line
      doc.setDrawColor(204, 85, 0);
      doc.setLineWidth(2);
      doc.line(10, 12, pageWidth - 10, 12);

      // Temple Name (Left)
      doc.setFontSize(24);
      doc.setTextColor(204, 85, 0);
      doc.setFont(undefined, "bold");
      doc.text(templeName, 14, 25);

      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, "normal");
      doc.text("Annadhanam Management System", 14, 31);

      // Title (Right)
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text(title, pageWidth - 14, 25, { align: "right" });

      // Meta Info
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.setFont(undefined, "normal");
      doc.text(
        `${t("Generated", "உருவாக்கப்பட்டது")}: ${now.toLocaleDateString()}`,
        pageWidth - 14,
        32,
        { align: "right" }
      );
      doc.text(
        `${t("Records", "பதிவுகள்")}: ${data.length}`,
        pageWidth - 14,
        38,
        { align: "right" }
      );

      // Divider
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(10, 42, pageWidth - 10, 42);

      /* =========================================================
         📊 SUMMARY BAR
      ========================================================= */
      const totalPeople = data.reduce((sum, r) => sum + (Number(r.peoples) || 0), 0);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(10, 46, pageWidth - 20, 12, 3, 3, "F");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, "bold");
      doc.text(`${t("Total People", "மொத்த மக்கள்")}: ${totalPeople}`, 14, 54);
      doc.text(`${t("Total Records", "மொத்த பதிவுகள்")}: ${data.length}`, pageWidth - 14, 54, { align: "right" });

      /* =========================================================
         3. Auto column widths & alignment
      ========================================================= */
      const colWidth = Math.floor((pageWidth - 20) / activeCols.length);
      const rightAlign: ColKey[] = ['peoples', 'qty'];
      const centerAlign: ColKey[] = ['#', 'receipt_number', 'mobile_number', 'time', 'date_range'];
      
      const columnStyles: Record<number, any> = {};
      activeCols.forEach((col, i) => {
        columnStyles[i] = {
          cellWidth: colWidth,
          halign: rightAlign.includes(col.key) ? 'right' : centerAlign.includes(col.key) ? 'center' : 'left',
        };
      });

      /* =========================================================
         📋 TABLE - autoTable config
         CRITICAL: startY:62 for page 1, margin.top:15 for page 2+
      ========================================================= */
      autoTable(doc, {
        head: [headCells],
        body: exportRows,
        startY: 62, // Table starts here on page 1
        margin: { top: 15, left: 10, right: 10, bottom: 25 }, // Page 2+ uses top:15
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
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles,
        didDrawPage: (dataArg) => {
          // Footer on EVERY page
          doc.setDrawColor(200);
          doc.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);
          doc.setFontSize(8);
          doc.setTextColor(80);
          doc.setFont(undefined, "bold");
          doc.text(templeName, 10, pageHeight - 10);
          doc.setFont(undefined, "normal");
          doc.text(now.toLocaleDateString(), pageWidth - 10, pageHeight - 10, { align: "right" });
          doc.setFont(undefined, "bold");
          doc.text(
            `Page ${dataArg.pageNumber} / ${doc.getNumberOfPages()}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
          );
        },
      });

      /* =========================================================
         💾 SAVE
      ========================================================= */
      const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      doc.save(`annadhanam-${stamp}.pdf`);

    } catch (err) {
      console.error("PDF export failed", err);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to export PDF.", "PDF ஏற்றுமதி தோல்வியடைந்தது."),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAnnadhanam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, donationTypeFilter, isMultiSlotFilter]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  };

  const handleViewClick = (annadhanam: Annadhanam) => {
    setViewEditAnnadhanam(annadhanam);
    setEditedAnnadhanam({
      name: annadhanam.name,
      mobileNumber: annadhanam.mobile_number,
      food: annadhanam.food,
      peoples: annadhanam.peoples,
      time: normalizeTimeString(annadhanam.time),
      fromDate: normalizeDateString(annadhanam.from_date),
      toDate: normalizeDateString(annadhanam.to_date),
      remarks: annadhanam.remarks,
    });
    setIsViewEditOpen(true);
  };

  const handleEditClick = (annadhanam: Annadhanam) => {
    navigate(`/dashboard/annadhanam/edit/${annadhanam.id}`);
  };

  const isLastReceipt = (receipt: Annadhanam) => {
    if (!data.length) return false;
    const sortedReceipts = [...data].sort((a, b) => {
      const aNum = parseInt((a.receipt_number || '').replace(/\D/g, '') || '0');
      const bNum = parseInt((b.receipt_number || '').replace(/\D/g, '') || '0');
      return bNum - aNum;
    });
    return sortedReceipts[0].id === receipt.id;
  };

  const handleDeleteClick = (id: number) => {
    const receipt = data.find(r => r.id === id);
    if (!receipt || !isLastReceipt(receipt)) {
      toast({
        title: t("Error", "பிழை"),
        description: t("Only the last receipt can be deleted", "கடைசி ரசீதை மட்டுமே நீக்க முடியும்"),
        variant: "destructive",
      });
      return;
    }
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/annadhanam/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete annadhanam');
      }
      const result = await response.json();
      if (result.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setPagination((prev) => {
          const newTotal = Math.max(0, prev.total - 1);
          const newTotalPages = Math.max(1, Math.ceil(newTotal / prev.pageSize));
          const newPageIndex = Math.min(prev.pageIndex, newTotalPages - 1);
          return { ...prev, total: newTotal, totalPages: newTotalPages, pageIndex: newPageIndex };
        });
        toast({
          title: t("Success", "வெற்றி"),
          description: t("Annadhanam deleted successfully", "அன்னதானம் வெற்றிகரமாக நீக்கப்பட்டது"),
        });
      } else {
        throw new Error(result.error || 'Failed to delete annadhanam');
      }
    } catch (error) {
      console.error("Error deleting annadhanam:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to delete annadhanam. Please try again.", "அன்னதானத்தை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleDownloadReceipt = async (annadhanamId: number, receiptNumber: string) => {
    try {
      const activeToken = token || localStorage.getItem('authToken');
      if (!activeToken) {
        toast({
          title: t("Authentication Error", "அங்கீகாரப் பிழை"),
          description: t("Please login again.", "தயவுசெய்து மீண்டும் உள்நுழையவும்."),
          variant: "destructive",
        });
        return;
      }
      const url = `/api/annadhanam/${annadhanamId}/receipt.pdf?token=${encodeURIComponent(activeToken)}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (!response.ok) throw new Error(`Failed to fetch receipt: ${response.status}`);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `receipt-${receiptNumber || annadhanamId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to download receipt. Please try again.", "ரசீதைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
    }
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

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getSlotRowColor = (timeSlot: string) => {
    switch (timeSlot?.toLowerCase()) {
      case 'morning': return 'bg-orange-50/50';
      case 'afternoon': return 'bg-blue-50/50';
      case 'evening': return 'bg-purple-50/50';
      case 'night': return 'bg-indigo-50/50';
      default: return '';
    }
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={cn(pageContainerStyles.content, "max-w-6xl")}>
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {t("Annadhanam List", "அன்னதானம் பதிவு")}
              </CardTitle>
            </div>
          </CardHeader>

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
                      placeholder={t("Search by name, receipt number, or mobile...", "பெயர், ரசீது எண் அல்லது மொபைல் மூலம் தேடவும்...")}
                      className={cn(theme.input.base, theme.input.size.sm, "pl-8")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleSearch}
                    />
                  </div>

                  <div className="flex gap-2 items-center">
                    <Select value={donationTypeFilter} onValueChange={setDonationTypeFilter}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue placeholder={t("Donation Type", "நன்கொடை வகை")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("All Types", "அனைத்து வகைகள்")}</SelectItem>
                        <SelectItem value="food">{t("Food", "உணவு")}</SelectItem>
                        <SelectItem value="product">{t("Product", "பொருள்")}</SelectItem>
                        <SelectItem value="money">{t("Money", "பணம்")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={isMultiSlotFilter} onValueChange={setIsMultiSlotFilter}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue placeholder={t("Slot Type", "இட வகை")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("All Slots", "அனைத்து இடங்கள்")}</SelectItem>
                        <SelectItem value="single">{t("Single Slot", "ஒற்றை இடம்")}</SelectItem>
                        <SelectItem value="multi">{t("Multi Slot", "பல இடங்கள்")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => {
                      setSearchTerm('');
                      setDonationTypeFilter('all');
                      setIsMultiSlotFilter('all');
                    }}>
                      {t('Clear', 'அழி')}
                    </Button>
                  </div>

                  <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                    {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        5. BUTTONS IN TOOLBAR
                      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    {canExportCsv && (
                      <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportToCSV} disabled={loading || data.length === 0}>
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        {t('Export CSV', 'CSV ஏற்றுமதி')}
                      </Button>
                    )}
                    {canExportPdf && (
                      <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportVisiblePDF} disabled={loading || data.length === 0}>
                        <FileDown className="h-3 w-3 mr-1" />
                        {t('Export PDF', 'PDF ஏற்றுமதி')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table with right-click context menu */}
              <div className={tableClasses.scrollContainerWrapper} ref={tableRef} onContextMenu={handleTableRightClick}>
                <div className={tableClasses.scrollContainer}>
                  {loading ? (
                    <div className={tableClasses.emptyState}>
                      <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                    </div>
                  ) : (
                    <Table className={tableClasses.container}>
                      <TableHeader className={tableClasses.header}>
                        <TableRow className={tableClasses.row}>
                          <TableHead className={cn(tableClasses.headerCell, "w-[40px]")}></TableHead>
                          {/* Render only visible columns */}
                          {allColDefs.filter(c => visibleCols[c.key] && c.key !== 'actions').map((col) => (
                            <TableHead key={col.key} className={cn(tableClasses.headerCell, "whitespace-nowrap", col.key === '#' ? tableClasses.headerCellSno : "text-left")}>
                              {t(col.label, col.labelTa || col.label)}
                            </TableHead>
                          ))}
                          {visibleCols['actions'] && (
                            <TableHead className={cn(tableClasses.headerCell, "whitespace-nowrap text-right")}>{t("Actions", "செயல்கள்")}</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.length > 0 ? (
                          data.map((annadhanam, index) => (
                            <React.Fragment key={annadhanam.id}>
                              <TableRow 
                                className={cn(
                                  tableClasses.row, 
                                  expandedRows[annadhanam.id] ? "bg-orange-50/30" : "",
                                  "cursor-pointer hover:bg-gray-50/80 transition-colors"
                                )}
                                onClick={() => annadhanam.enable_multi_slot && toggleRow(annadhanam.id)}
                              >
                                <TableCell className="py-2 text-center">
                                  {annadhanam.enable_multi_slot ? (
                                    expandedRows[annadhanam.id] ? (
                                      <ChevronDown className="h-4 w-4 text-orange-600" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )
                                  ) : null}
                                </TableCell>
                                {allColDefs.filter(c => visibleCols[c.key] && c.key !== 'actions').map((col) => (
                                  <TableCell key={col.key} className={cn(tableClasses.cell, col.key === '#' ? tableClasses.cellSno : "", col.key === 'food' ? "max-w-xs truncate" : "")}>
                                    {col.key === 'date_range' ? (
                                      <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                                        <div className="text-[11px]">
                                          <div>{formatDate(annadhanam.from_date)}</div>
                                          {annadhanam.from_date !== annadhanam.to_date && (
                                            <div className="text-muted-foreground">{t("to", "வரை")} {formatDate(annadhanam.to_date)}</div>
                                          )}
                                        </div>
                                      </div>
                                    ) : col.key === 'time' ? (
                                      <div className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1 text-gray-400" />
                                        {formatTime(annadhanam.time)}
                                      </div>
                                    ) : col.key === 'peoples' ? (
                                      <div className="flex items-center justify-center font-semibold">
                                        <Users className="h-3 w-3 mr-1 text-gray-400" />
                                        {annadhanam.peoples}
                                      </div>
                                    ) : col.key === 'multi_slot' ? (
                                      <div className="flex flex-col gap-1 items-center">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                                          annadhanam.enable_multi_slot ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                        )}>
                                          {annadhanam.enable_multi_slot ? t('Yes', 'ஆம்') : t('No', 'இல்லை')}
                                        </span>
                                        {annadhanam.enable_multi_slot && annadhanam.food_details && (
                                          <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                            {annadhanam.food_details.length} {t('Slots', 'இடங்கள்')}
                                          </span>
                                        )}
                                      </div>
                                    ) : col.key === 'qty' ? (
                                      <div className="flex items-center font-medium text-orange-700">
                                        {col.getValue(annadhanam, index)}
                                      </div>
                                    ) : col.key === 'donation_type' ? (
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                                        annadhanam.donation_type === 'product' ? "bg-blue-100 text-blue-700" : 
                                        annadhanam.donation_type === 'money' ? "bg-purple-100 text-purple-700" : 
                                        "bg-orange-100 text-orange-700"
                                      )}>
                                        {col.getValue(annadhanam, index)}
                                      </span>
                                    ) : (
                                      col.getValue(annadhanam, pagination.pageIndex * pagination.pageSize + index)
                                    )}
                                  </TableCell>
                                ))}
                                {visibleCols['actions'] && (
                                  <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(annadhanam)} className={cn(tableClasses.actionButtonSecondary, "h-5 w-5 p-0")}>
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(annadhanam.id, annadhanam.receipt_number)} className="h-5 w-5 p-0 text-green-600 hover:text-green-700" title={t("Download Receipt PDF", "ரசீது PDF ஐ பதிவிறக்கு")}>
                                        <FileDown className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(annadhanam.id)} disabled={!isLastReceipt(annadhanam)} title={!isLastReceipt(annadhanam) ? t("Only the last receipt can be deleted", "கடைசி ரசீதை மட்டுமே நீக்க முடியும்") : ""} className={cn(!isLastReceipt(annadhanam) ? "opacity-50 cursor-not-allowed h-5 w-5 p-0" : tableClasses.actionButtonDanger, "h-5 w-5 p-0")}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>

                              {/* Expandable Child Rows */}
                              {annadhanam.enable_multi_slot && expandedRows[annadhanam.id] && (
                                <TableRow className="bg-gray-50/40 border-l-4 border-l-orange-400">
                                  <TableCell colSpan={allColDefs.filter(c => visibleCols[c.key]).length + 2} className="p-0">
                                    <div className="px-12 py-4 animate-in slide-in-from-top-2 duration-200">
                                      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                                        <Table className="w-full text-[11px]">
                                          <thead className="bg-gray-100/80 text-gray-600 uppercase font-bold">
                                            <tr>
                                              <th className="px-4 py-2 text-left">{t('Date', 'தேதி')}</th>
                                              <th className="px-4 py-2 text-left">{t('Time Slot', 'நேரம் வகை')}</th>
                                              <th className="px-4 py-2 text-left">{t('Time', 'நேரம்')}</th>
                                              <th className="px-4 py-2 text-left">{t('Food Details', 'உணவு விவரங்கள்')}</th>
                                              <th className="px-4 py-2 text-right">{t('Count', 'எண்ணிக்கை')}</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-50">
                                            {annadhanam.food_details?.map((slot) => (
                                              <tr key={slot.id} className={cn("hover:bg-gray-50/50 transition-colors", getSlotRowColor(slot.time_slot))}>
                                                <td className="px-4 py-2 font-medium">
                                                  <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 text-orange-400" />
                                                    {formatDate(slot.donation_date)}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                  <span className="capitalize">{slot.time_slot}</span>
                                                </td>
                                                <td className="px-4 py-2">
                                                  <div className="flex items-center gap-1.5 text-gray-500">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTime(slot.donation_time)}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-2 italic text-gray-700">
                                                  {slot.food_details}
                                                </td>
                                                <td className="px-4 py-2 text-right font-bold text-orange-600">
                                                  {slot.count}
                                                </td>
                                              </tr>
                                            ))}
                                            <tr className="bg-orange-50/30">
                                              <td colSpan={4} className="px-4 py-2 text-right font-bold text-gray-600">
                                                {t('Total People', 'மொத்த மக்கள் எண்ணிக்கை')}
                                              </td>
                                              <td className="px-4 py-2 text-right font-extrabold text-orange-700 border-t border-orange-200">
                                                {annadhanam.peoples}
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
                        ) : (
                           <TableRow  className="whitespace-nowrap">
                            <TableCell colSpan={allColDefs.filter(c => visibleCols[c.key]).length} className={tableClasses.emptyState}>
                              {t("No annadhanam entries found", "அன்னதானம் பதிவுகள் எதுவும் கிடைக்கவில்லை")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Context Menu for Column Toggle */}
                {contextMenu.visible && (
                  <div className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-[200px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b">{t('Toggle Columns', 'நெடுவையை மாற்று')}</div>
                    {allColDefs.filter(c => c.key !== 'actions').map((col) => (
                      <label key={col.key} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={visibleCols[col.key]} onChange={() => toggleColumn(col.key)} className="mr-2" />
                        <span className="text-sm">{t(col.label, col.label)}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <div className={tableClasses.pagination}>
                  <div className="text-sm text-gray-700">
                    {t("Showing", "காட்டப்படுகிறது")} {data.length} {t("of", "இல்")}{" "}
                    <span className="font-medium">{pagination.total}</span> {t("items", "உருப்படிகள்")}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))} disabled={pagination.pageIndex === 0} className={tableClasses.paginationButton}>
                      {t("Previous", "முந்தைய")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))} disabled={pagination.pageIndex >= pagination.totalPages - 1} className={tableClasses.paginationButton}>
                      {t("Next", "அடுத்து")}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Modal */}
          <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("View Annadhanam", "அன்னதானத்தை பார்க்க")}</DialogTitle>
                <DialogDescription>{t("View the annadhanam details below", "கீழே உள்ள அன்னதான விவரங்களை பார்க்கவும்")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">{t("Name", "பெயர்")}</Label>
                  <Input id="name" value={editedAnnadhanam.name || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, name: e.target.value })} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="mobileNumber" className="text-right">{t("Mobile Number", "மொபைல் எண்")}</Label>
                  <Input id="mobileNumber" value={editedAnnadhanam.mobileNumber || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, mobileNumber: e.target.value })} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="food" className="text-right">{t("Food Items", "உணவு பொருட்கள்")}</Label>
                  <Textarea id="food" value={editedAnnadhanam.food || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, food: e.target.value })} className="col-span-3" disabled rows={3} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="peoples" className="text-right">{t("Number of People", "மக்கள் எண்ணிக்கை")}</Label>
                  <Input id="peoples" type="number" value={editedAnnadhanam.peoples || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, peoples: parseInt(e.target.value) })} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="time" className="text-right">{t("Time", "நேரம்")}</Label>
                  <Input id="time" type="time" value={editedAnnadhanam.time || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, time: e.target.value })} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fromDate" className="text-right">{t("From Date", "தொடக்க தேதி")}</Label>
                  <Input id="fromDate" type="date" value={editedAnnadhanam.fromDate || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, fromDate: e.target.value })} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="toDate" className="text-right">{t("To Date", "முடிவு தேதி")}</Label>
                  <Input id="toDate" type="date" value={editedAnnadhanam.toDate || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, toDate: e.target.value })} className="col-span-3" disabled />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="remarks" className="text-right">{t("Remarks", "குறிப்புகள்")}</Label>
                  <Textarea id="remarks" value={editedAnnadhanam.remarks || ""} onChange={(e) => setEditedAnnadhanam({ ...editedAnnadhanam, remarks: e.target.value })} className="col-span-3" disabled rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsViewEditOpen(false); setViewEditAnnadhanam(null); setEditedAnnadhanam({}); }}>
                  {t("Cancel", "ரத்து செய்")}
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => navigate('/dashboard/annadhanam/entry')}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t("New Entry", "புதிய பதிவு")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Modal */}
          <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Are you sure?", "நீங்கள் உறுதியாகவா?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("This action cannot be undone. This will permanently delete the annadhanam entry and remove all associated data.", "இந்த செயலை திரும்பப் பெற முடியாது. இது அன்னதானம் பதிவை நிரந்தரமாக நீக்கி அனைத்து தொடர்புடைய தரவுகளையும் அகற்றும்.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancel", "ரத்து செய்")}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t("Delete", "நீக்கு")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* All Logs Modal */}
          {allLogsOpen && (
            <div className={formFieldStyles.moneyDonationList.modal.overlay}>
              <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
              <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-r from-blue-300 to-indigo-400 text-white py-2 px-6 rounded-t-lg flex-shrink-0">
                  <div className={formFieldStyles.moneyDonationList.modal.header}>
                    <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('All Annadhanam Logs', 'அனைத்து அன்னதானம் பதிவுகள்')}</h2>
                    <button onClick={closeAllLogs} className={formFieldStyles.moneyDonationList.modal.closeButton}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    {allLogsLoading ? (
                      <div className={formFieldStyles.moneyDonationList.modal.loading}>{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</div>
                    ) : (
                      <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-auto">
                          <div className="bg-white border border-gray-200">
                            <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                              <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                                <tr>
                                  <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Action', 'செயல்')}</th>
                                  <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Date & Time', 'தேதி மற்றும் நேரம்')}</th>
                                  <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Annadhanam ID', 'அன்னதானம் ஐடி')}</th>
                                  <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Name', 'பெயர்')}</th>
                                  <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Receipt No', 'ரசீது எண்')}</th>
                                  <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('User', 'பயனர்')}</th>
                                  <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Details', 'விவரங்கள்')}</th>
                                </tr>
                              </thead>
                              <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                                {allLogs.length === 0 ? (
                                  <tr><td className={formFieldStyles.moneyDonationList.logsTable.tdCenter} colSpan={7}>{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td></tr>
                                ) : allLogs.map((lg) => (
                                  <tr key={lg.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                                    <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${lg.action === 'create' ? 'bg-green-100 text-green-800' : lg.action === 'update' ? 'bg-blue-100 text-blue-800' : lg.action === 'delete' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') : lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') : lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') : lg.action}
                                      </span>
                                    </td>
                                    <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>{lg.created_at ? new Date(lg.created_at).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                    <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.annadhanam_id}</td>
                                    <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.annadhanam_name ?? '-'}</td>
                                    <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.receipt_number ?? '-'}</td>
                                    <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                      {(() => {
                                        const userId = lg.created_by;
                                        if (!userId) return '-';
                                        const user = userDetails[userId];
                                        const name = userNames[userId];
                                        if (user?.username) return `@${user.username}`;
                                        if (user?.name) return user.name;
                                        if (name) return name;
                                        return `User ${userId}`;
                                      })()}
                                    </td>
                                    <td className="py-3 px-4 border-b">
                                      <div className="text-sm text-gray-600 max-w-md">
                                        {(() => {
                                          const details = lg.details;
                                          if (!details) return <span className="text-gray-400">-</span>;
                                          const food = details.food || details.after?.food || details.before?.food;
                                          if (!food) return <span className="text-gray-400">-</span>;
                                          if (food.startsWith('Money:')) {
                                            const amount = food.replace('Money:', '').trim();
                                            return <div className="space-y-2"><div className="bg-green-50 p-2 rounded border text-xs"><div className="font-medium text-green-700 mb-1">{t('Money Donation', 'பண தானம்')}</div><div className="text-gray-600">{amount}</div></div></div>;
                                          } else if (food.startsWith('Product:')) {
                                            const productInfo = food.replace('Product:', '').trim();
                                            const parts = productInfo.split('|').map(p => p.trim());
                                            const productName = parts[0];
                                            const qtyPart = parts.find(p => /qty/i.test(p));
                                            const quantity = qtyPart ? qtyPart.replace(/qty\s*[:]?/i, '').trim() : '';
                                            return <div className="space-y-2"><div className="bg-blue-50 p-2 rounded border text-xs"><div className="font-medium text-blue-700 mb-1">{t('Product Donation', 'பொருள் தானம்')}</div><div className="text-gray-600">{productName}</div>{quantity && <div className="text-gray-500">Qty: {quantity}</div>}</div></div>;
                                          } else {
                                            return <div className="space-y-2"><div className="bg-orange-50 p-2 rounded border text-xs"><div className="font-medium text-orange-700 mb-1">{t('Food Donation', 'உணவு தானம்')}</div><div className="text-gray-600">{food}</div></div></div>;
                                          }
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
                          <div className={formFieldStyles.moneyDonationList.pagination.info}>{t('Total', 'மொத்தம்')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{allLogsTotal}</span></div>
                          <div className={formFieldStyles.moneyDonationList.pagination.controls}>
                            <button className={formFieldStyles.moneyDonationList.pagination.button} disabled={allLogsPage <= 1} onClick={() => loadAllAnnadhanamLogs(allLogsPage - 1)}>{t('Previous', 'முந்தைய')}</button>
                            <span className="text-sm text-gray-600">{t('Page', 'பக்கம்')} {allLogsPage}</span>
                            <button className={formFieldStyles.moneyDonationList.pagination.button} disabled={allLogsPage * allLogsPageSize >= allLogsTotal} onClick={() => loadAllAnnadhanamLogs(allLogsPage + 1)}>{t('Next', 'அடுத்தது')}</button>
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
                <div className="bg-gradient-to-r from-blue-300 to-indigo-400 text-white py-2 px-6 rounded-t-lg">
                  <div className={formFieldStyles.moneyDonationList.modal.header}>
                    <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('Activity Log', 'செயல்பாட்டு பதிவு')} #{logsFor}</h2>
                    <button onClick={closeLogs} className={formFieldStyles.moneyDonationList.modal.closeButton}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {logsLoading ? (
                      <div className={formFieldStyles.moneyDonationList.modal.loading}>{t('Loading logs...', 'பதிவுகள் ஏறுகிறது...')}</div>
                    ) : logs.length === 0 ? (
                      <div className={formFieldStyles.moneyDonationList.modal.loading}>{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                          <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                            <tr>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Action', 'செயல்')}</th>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Date & Time', 'தேதி மற்றும் நேரம்')}</th>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('User', 'பயனர்')}</th>
                              <th className={formFieldStyles.moneyDonationList.logsTable.th}>{t('Details', 'விவரங்கள்')}</th>
                            </tr>
                          </thead>
                          <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                            {logs.map((lg) => (
                              <tr key={lg.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                                <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${lg.action === 'create' ? 'bg-green-100 text-green-800' : lg.action === 'update' ? 'bg-blue-100 text-blue-800' : lg.action === 'delete' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') : lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') : lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') : lg.action}
                                  </span>
                                </td>
                                <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>{lg.created_at ? new Date(lg.created_at).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                  {(() => {
                                    const userId = lg.created_by;
                                    if (!userId) return '-';
                                    const user = userDetails[userId];
                                    const name = userNames[userId];
                                    if (user?.username) return `@${user.username}`;
                                    if (user?.name) return user.name;
                                    if (name) return name;
                                    return `User ${userId}`;
                                  })()}
                                </td>
                                <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                  <div className="text-sm text-gray-600 max-w-md">
                                    {(() => {
                                      const details = lg.details;
                                      if (!details) return <span className="text-gray-400">-</span>;
                                      const food = details.food || details.after?.food || details.before?.food;
                                      if (!food) return <span className="text-gray-400">-</span>;
                                      if (food.startsWith('Money:')) {
                                        const amount = food.replace('Money:', '').trim();
                                        return <div className="space-y-2"><div className="bg-green-50 p-2 rounded border text-xs"><div className="font-medium text-green-700 mb-1">{t('Money Donation', 'பண தானம்')}</div><div className="text-gray-600">{amount}</div></div></div>;
                                      } else if (food.startsWith('Product:')) {
                                        const productInfo = food.replace('Product:', '').trim();
                                        const parts = productInfo.split('|').map(p => p.trim());
                                        const productName = parts[0];
                                        const qtyPart = parts.find(p => /qty/i.test(p));
                                        const quantity = qtyPart ? qtyPart.replace(/qty\s*[:]?/i, '').trim() : '';
                                        return <div className="space-y-2"><div className="bg-blue-50 p-2 rounded border text-xs"><div className="font-medium text-blue-700 mb-1">{t('Product Donation', 'பொருள் தானம்')}</div><div className="text-gray-600">{productName}</div>{quantity && <div className="text-gray-500">Qty: {quantity}</div>}</div></div>;
                                      } else {
                                        return <div className="space-y-2"><div className="bg-orange-50 p-2 rounded border text-xs"><div className="font-medium text-orange-700 mb-1">{t('Food Donation', 'உணவு தானம்')}</div><div className="text-gray-600">{food}</div></div></div>;
                                      }
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
    </div>
  );
}