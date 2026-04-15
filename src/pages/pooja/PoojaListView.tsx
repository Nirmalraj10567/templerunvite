import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Eye, Edit, Trash2, Calendar, Clock, Filter, X, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/lib/language";
import { poojaService, Pooja, PoojaFormData } from "@/services/poojaService";
import { cn, pageContainerStyles, formFieldStyles } from "@/styles/formStyles";
import { theme } from "@/styles/theme";

interface PoojaLog {
  id: number;
  pooja_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  pooja_name: string | null;
  receipt_number: string | null;
  details: any;
}

export default function PoojaListView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { language } = useLanguage();
  // State for expanded pooja details
  const [expandedPoojas, setExpandedPoojas] = useState<Record<number, boolean>>({});

  // Translation object
  const t = {
    english: {
      poojaList: 'பூஜை பட்டியல்',
      entries: 'பதிவுகள்',
      showing: 'காட்டப்படுகிறது',
      of: 'இல்',
      items: 'உருப்படிகள்',
      total: 'மொத்தம்',
      page: 'பக்கம்',
      receiptNo: 'ரசீது எண்',
      name: 'பெயர்',
      mobile: 'மொபைல்',
      dateRange: 'தேதி வரம்பு',
      time: 'நேரம்',
      actions: 'செயல்கள்',
      loading: 'ஏற்றுகிறது…',
      searchPlaceholder: 'பூஜைகளைத் தேடு...',
      clear: 'அழி',
      export: 'ஏற்றுமதி',
      view: 'காண்க',
      edit: 'திருத்து',
      delete: 'நீக்கு',
      confirmDelete: 'இந்த பூஜையை நிச்சயமாக நீக்க விரும்புகிறீர்களா?',
      cancel: 'ரத்து செய்',
      confirm: 'உறுதி செய்',
      close: 'மூடு',
      saveChanges: 'மாற்றங்களை சேமி',
      success: 'வெற்றி',
      receipt: 'ரசீது',
      poojaName: 'பூஜை பெயர்',
      poojaDate: 'பூஜை தேதி',
      poojaTime: 'பூஜை நேரம்',
      devoteeName: 'பக்தர் பெயர்',
      devoteeMobile: 'பக்தர் மொபைல்',
      address: 'முகவரி',
      amount: 'தொகை',
      notes: 'குறிப்புகள்',
      remarks: 'கருத்துகள்',
      fromDate: 'தொடக்க தேதி',
      toDate: 'முடிவு தேதி',
      status: 'நிலை',
      columns: 'நெடுவரிசைகள்',
      visible: 'புலப்படும்',
      selectAll: 'அனைத்தையும் தேர்ந்தெடு',
      clearAll: 'அனைத்தையும் அழி',
      first: 'முதல்',
      previous: 'முந்தைய',
      next: 'அடுத்து',
      last: 'கடைசி',
      rowsPerPage: 'ஒரு பக்கத்திற்கு',
      noPoojaEntriesFound: 'பூஜை பதிவுகள் எதுவும் கிடைக்கவில்லை',
      error: 'பிழை',
      failedToFetchData: 'தரவைப் பெற முடியவில்லை',
      failedToUpdatePooja: 'பூஜையை புதுப்பிக்க முடியவில்லை',
      failedToDeletePooja: 'பூஜையை நீக்க முடியவில்லை',
      poojaUpdatedSuccessfully: 'பூஜை வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
      poojaDeletedSuccessfully: 'பூஜை வெற்றிகரமாக நீக்கப்பட்டது',
      viewAll: 'அனைத்தையும் பார்',
      hideDetails: 'விவரங்களை மறை',
      showDetails: 'விவரங்களை காட்டு',
    },
    tamil: {
      poojaList: 'Pooja List',
      entries: 'entries',
      showing: 'Showing',
      of: 'of',
      items: 'items',
      total: 'Total',
      page: 'Page',
      receiptNo: 'Receipt No',
      name: 'Name',
      mobile: 'Mobile',
      dateRange: 'Date Range',
      time: 'Time',
      actions: 'Actions',
      loading: 'Loading…',
      searchPlaceholder: 'Search poojas...',
      clear: 'Clear',
      export: 'Export',
      view: 'View',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this pooja?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      saveChanges: 'Save Changes',
      success: 'Success',
      receipt: 'Receipt',
      poojaName: 'Pooja Name',
      poojaDate: 'Pooja Date',
      poojaTime: 'Pooja Time',
      devoteeName: 'Devotee Name',
      devoteeMobile: 'Devotee Mobile',
      address: 'Address',
      amount: 'Amount',
      notes: 'Notes',
      remarks: 'Remarks',
      fromDate: 'From Date',
      toDate: 'To Date',
      status: 'Status',
      columns: 'Columns',
      visible: 'Visible',
      selectAll: 'Select all',
      clearAll: 'Clear all',
      first: 'First',
      previous: 'Previous',
      next: 'Next',
      last: 'Last',
      rowsPerPage: 'Rows per page',
      noPoojaEntriesFound: 'No pooja entries found',
      error: 'Error',
      failedToFetchData: 'Failed to fetch data',
      failedToUpdatePooja: 'Failed to update pooja',
      failedToDeletePooja: 'Failed to delete pooja',
      poojaUpdatedSuccessfully: 'Pooja updated successfully',
      poojaDeletedSuccessfully: 'Pooja deleted successfully',
      allLogs: 'All Logs',
      logs: 'Logs',
      allPoojaLogs: 'All Pooja Logs',
      poojaLogs: 'Pooja Logs',
      action: 'Action',
      pooja: 'Pooja',
      date: 'Date',
      details: 'Details',
      created: 'Created',
      updated: 'Updated',
      deleted: 'Deleted',
      noLogsFound: 'No logs found',
      viewAll: 'View All',
      hideDetails: 'Hide Details',
      showDetails: 'Show Details',
    }
  };

  // Helper function to get translation
  const translate = (key: string) => {
    const lang = language === 'tamil' || language === 'english' ? language : 'tamil';
    return (t as any)[lang]?.[key] ?? key;
  };

  // Logs functions
  const openLogs = async (item: Pooja) => {
    setLogsFor(item.id);
    setLogsLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/pooja/${item.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        setLogs(result.data || []);
        
        // Fetch usernames for individual logs
        const userIds = [...new Set(result.data?.map((log: PoojaLog) => log.created_by).filter(Boolean) || [])] as number[];
        await fetchUserNames(userIds);
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
    await loadAllPoojaLogs();
  };

  const loadAllPoojaLogs = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/pooja/logs?page=${allLogsPage}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        setAllLogs(result.data || []);
        setAllLogsTotal(result.total || 0);
        
        // Fetch usernames for all logs
        const userIds = [...new Set(result.data?.map((log: PoojaLog) => log.created_by).filter(Boolean) || [])] as number[];
        await fetchUserNames(userIds);
      }
    } catch (e) {
      console.error('Failed to load all logs:', e);
      setAllLogs([]);
    } finally {
      setAllLogsLoading(false);
    }
  };

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
          const res = await fetch(`http://localhost:4000/api/admin/members/${id}`, {
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

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
    setAllLogsPage(1);
  };

  // Helper functions for log details
  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatAmount = (amount: any) => {
    if (!amount) return '₹0';
    const num = parseFloat(amount);
    return isNaN(num) ? '₹0' : `₹${num.toFixed(2)}`;
  };

  const formatLogDetails = (action: string, details: any, createdBy: number | null) => {
    if (!details) return 'No details available';
    
    const user = createdBy ? userDetails[createdBy] : null;
    const userName = createdBy ? userNames[createdBy] : null;
    
    const displayUser = (() => {
      if (!createdBy) return null;
      if (user?.username) return `@${user.username}`;
      if (user?.name) return user.name;
      if (userName) return userName;
      return `User ${createdBy}`;
    })();
    
    // Extract specific fields from details
    const receiptNumber = details.receipt_number || details.after?.receipt_number || details.before?.receipt_number;
    const name = details.name || details.after?.name || details.before?.name;
    const mobileNumber = details.mobile_number || details.after?.mobile_number || details.before?.mobile_number;
    const amount = details.amount || details.after?.amount || details.before?.amount;
    
    return (
      <div className="space-y-2">
        
        {/* Display specific fields if available */}
        {(receiptNumber || name || mobileNumber || amount) && (
          <div className="text-xs space-y-1">
            <strong>Pooja Details:</strong>
            <div className="bg-gray-50 p-2 rounded border space-y-1">
              {receiptNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Receipt:</span>
                  <span className="font-medium">{receiptNumber}</span>
                </div>
              )}
              {name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{name}</span>
                </div>
              )}
              {mobileNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Mobile:</span>
                  <span className="font-medium">{mobileNumber}</span>
                </div>
              )}
              {amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">{formatAmount(amount)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Show raw JSON as fallback if no specific fields */}
        {!receiptNumber && !name && !mobileNumber && !amount && details && (
          <div className="text-xs">
            <strong>Details:</strong>
            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const getAmountInfo = (details: any, compact: boolean = false) => {
    if (!details) return null;
    
    // Extract specific fields from details (check both direct and nested properties)
    const receiptNumber = details.receipt_number || details.after?.receipt_number || details.before?.receipt_number;
    const name = details.name || details.after?.name || details.before?.name || details.pooja_name;
    const mobile = details.mobile_number || details.after?.mobile_number || details.before?.mobile_number || details.mobile;
    const amount = details.amount || details.after?.amount || details.before?.amount || details.amount_paid || details.tax_amount;
    
    if (compact) {
      return (
        <div className="text-xs space-y-1">
          {receiptNumber && <div><strong>Receipt:</strong> {receiptNumber}</div>}
          {name && <div><strong>Name:</strong> {name}</div>}
          {mobile && <div><strong>Mobile:</strong> {mobile}</div>}
          {amount && <div><strong>Amount:</strong> {formatAmount(amount)}</div>}
        </div>
      );
    }
    
    return (
      <div className="text-xs space-y-2">
        {receiptNumber && (
          <div className="bg-purple-50 p-2 rounded border">
            <div className="font-medium text-purple-700">Receipt</div>
            <div className="text-purple-900">{receiptNumber}</div>
          </div>
        )}
        {name && (
          <div className="bg-blue-50 p-2 rounded border">
            <div className="font-medium text-blue-700">Name</div>
            <div className="text-blue-900">{name}</div>
          </div>
        )}
        {mobile && (
          <div className="bg-green-50 p-2 rounded border">
            <div className="font-medium text-green-700">Mobile</div>
            <div className="text-green-900">{mobile}</div>
          </div>
        )}
        {amount && (
          <div className="bg-yellow-50 p-2 rounded border">
            <div className="font-medium text-yellow-700">Amount</div>
            <div className="text-yellow-900">{formatAmount(amount)}</div>
          </div>
        )}
      </div>
    );
  };

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Pooja[]>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
    total: 0,
    totalPages: 1,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewPooja, setViewPooja] = useState<Pooja | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; value: string; label: string }>>([]);
  
  // Logs state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<PoojaLog[]>([]);
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<PoojaLog[]>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const [allLogsPageSize] = useState(50);
  
  // Username fetching state
  const [userDetails, setUserDetails] = useState<Record<number, any>>({});
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  
  // Log details expansion state
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  
  // Quick search filter
  const [quickSearch, setQuickSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Column Keys
  type ColKey = 'receipt' | 'name' | 'mobile' | 'dateRange' | 'time' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'receipt', label: translate('receiptNo') },
    { key: 'name', label: translate('name') },
    { key: 'mobile', label: translate('mobile') },
    { key: 'dateRange', label: translate('dateRange') },
    { key: 'time', label: translate('time') },
    { key: 'actions', label: translate('actions'), align: 'center' },
  ];

  const STORAGE_KEY = 'pooja_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    receipt: true,
    name: true,
    mobile: true,
    dateRange: true,
    time: true,
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
    } catch {}
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

  const isSuperAdmin = user?.role === "superadmin";

  // Check if user can edit/delete any pooja (admin/superadmin)
  const canEditAny = isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "pooja_registrations" &&
        (p.access_level === "edit" || p.access_level === "full")
    );

  const canDeleteAny = isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "pooja_registrations" &&
        p.access_level === "full"
    );
    
  // Check if user can edit/delete a specific pooja (either has permission or is the creator)
  const canEditPooja = (pooja: Pooja) => {
    if (!pooja) return false;
    // If user can edit any pooja, return true
    if (canEditAny) return true;
    // Otherwise, check if user is the creator
    return pooja.created_by === user?.id;
  };

  const canDeletePooja = (pooja: Pooja) => {
    if (!pooja) return false;
    // If user can delete any pooja, return true
    if (canDeleteAny) return true;
    // Otherwise, check if user is the creator
    return pooja.created_by === user?.id;
  };

  // Debug logging
  console.log('Current user:', {
    userId: user?.id,
    isSuperAdmin,
    canEditAny,
    canDeleteAny,
    userPermissions: (user as any)?.permissions,
    userRole: user?.role
  });

  const fetchPooja = async () => {
    try {
      setLoading(true);
      const result = await poojaService.getPoojaList(
        pagination.pageIndex + 1,
        pagination.pageSize,
        debouncedSearch
      );
      
      if (result.success) {
        setData(result.data);
        setPagination((prev) => ({
          ...prev,
          total: result.pagination?.total || result.data.length,
          totalPages: result.pagination?.totalPages || Math.ceil((result.pagination?.total || result.data.length) / prev.pageSize),
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error("Error fetching pooja data:", error);
      toast({
        title: translate("error"),
        description: translate("failedToFetchData"),
        variant: "destructive",
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(quickSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [quickSearch]);

  useEffect(() => {
    fetchPooja();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!token) return;
        const resp = await fetch('http://localhost:4000/api/ledger/categories', { headers: { Authorization: `Bearer ${token}` } });
        const body = await resp.json().catch(() => ({}));
        const raw = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
        const mapped = (raw || []).map((item: any, idx: number) => {
          if (typeof item === 'string') return { id: idx + 1, value: item, label: item };
          return { id: item.id || idx + 1, value: item.value || item.label, label: item.label || item.value };
        });
        setCategories(mapped);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [token]);

  const handleViewClick = (pooja: Pooja) => {
    setViewPooja(pooja);
    setIsViewOpen(true);
  };

  // Toggle function for showing/hiding pooja details
  const togglePoojaDetails = (poojaId: number) => {
    setExpandedPoojas(prev => ({
      ...prev,
      [poojaId]: !prev[poojaId]
    }));
  };

  const handleEditClick = (pooja: Pooja) => {
    // Navigate to PoojaEntryPage for editing
    navigate(`/dashboard/pooja/edit/${pooja.id}`);
  };


  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId || !user) return;
    
    // Find the pooja to be deleted
    const poojaToDelete = data.find(item => item.id === deleteId);
    
    // Check if user has permission to delete this pooja
    if (!poojaToDelete || !canDeletePooja(poojaToDelete)) {
      toast({
        title: translate("error"),
        description: "You don't have permission to delete this pooja registration.",
        variant: "destructive",
      });
      setIsDeleteOpen(false);
      setDeleteId(null);
      return;
    }

    try {
      await poojaService.deletePooja(deleteId);
      setData((prev) => prev.filter((item) => item.id !== deleteId));
      toast({
        title: translate("success"),
        description: translate("poojaDeletedSuccessfully"),
      });
    } catch (error) {
      console.error("Error deleting pooja:", error);
      toast({
        title: translate("error"),
        description: translate("failedToDeletePooja"),
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const handleExportPdf = () => {
    window.print();
  };

  // Use data directly since filtering is now done server-side
  const filteredData = data;

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        {/* Header */}
        <CardHeader className={cn(formFieldStyles.tableHeader.container, formFieldStyles.card.header)}>
          <div className="flex items-center justify-between">
            <CardTitle className={formFieldStyles.tableHeader.title}>
              {translate("poojaList")}
            </CardTitle>
           
          </div>
        </CardHeader>

        {/* Filters */}
        <div className={formFieldStyles.moneyDonationList.filters.container}>
          <div className={formFieldStyles.moneyDonationList.filters.form}>
            {/* Search */}
            <div className={formFieldStyles.moneyDonationList.filters.searchContainer}>
              <div className={formFieldStyles.moneyDonationList.filters.searchIcon}>
                <Search className={formFieldStyles.moneyDonationList.filters.searchIconSvg} />
              </div>
              <Input
                type="search"
                placeholder={translate("searchPlaceholder")}
                className={cn(theme.input.base, formFieldStyles.moneyDonationList.filters.searchInput)}
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickSearch("")}
                disabled={!quickSearch}
                className={formFieldStyles.moneyDonationList.filters.button}
              >
                <X className="h-3 w-3 mr-1" />
                {translate("clear")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} className={formFieldStyles.moneyDonationList.filters.button}>
                <FileDown className="h-3 w-3 mr-1" />
                {translate("export")}
              </Button>
             
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className={formFieldStyles.moneyDonationList.table.container}
          onContextMenu={onContextMenu}
        >
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
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      {translate("loading")}
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((pooja) => {
                    // Calculate permissions for current row
                    const canEdit = canEditPooja(pooja);
                    const canDelete = canDeletePooja(pooja);
                    
                    return (
                      <tr key={pooja.id} className={formFieldStyles.moneyDonationList.table.tr}>
                        {visibleCols.receipt && (
                          <td className={formFieldStyles.moneyDonationList.table.td}>
                            {pooja.receipt_number}
                          </td>
                        )}
                        {visibleCols.name && (
                          <td className={formFieldStyles.moneyDonationList.table.td}>
                            <div className="max-w-32 truncate">
                              {pooja.name}
                            </div>
                          </td>
                        )}
                        {visibleCols.mobile && (
                          <td className={formFieldStyles.moneyDonationList.table.td}>
                            {pooja.mobile_number}
                          </td>
                        )}
                        {visibleCols.dateRange && (
                          <td className={formFieldStyles.moneyDonationList.table.td}>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                              <div>
                                <div>{formatDate(pooja.from_date)}</div>
                                {pooja.from_date !== pooja.to_date && (
                                  <div className="text-gray-400">
                                    - {formatDate(pooja.to_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleCols.time && (
                          <td className={formFieldStyles.moneyDonationList.table.td}>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-gray-400" />
                              {formatTime(pooja.time)}
                            </div>
                          </td>
                        )}
                        {visibleCols.actions && (
                          <td className={cn(formFieldStyles.moneyDonationList.table.td, formFieldStyles.moneyDonationList.table.tdCenter)}>
                            <div className={formFieldStyles.moneyDonationList.actionButtons.container}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePoojaDetails(pooja.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                {expandedPoojas[pooja.id] ? translate("hideDetails") : translate("showDetails")}
                              </Button>
                              {/* Fixed: Use calculated permissions */}
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(pooja)}
                                  className="h-6 w-6 p-0"
                                  title={translate("edit")}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(pooja.id)}
                                  className="h-6 w-6 p-0 text-red-600"
                                  title={translate("delete")}
                                  disabled={filteredData.indexOf(pooja) !== 0}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                          
                            </div>
                          </td>
                        )}
                        {/* Pooja Details Section */}
                        {expandedPoojas[pooja.id] && (
                          <tr className="bg-gray-50 dark:bg-gray-800">
                            <td colSpan={Object.keys(visibleCols).length} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">{translate("poojaDetails")}</h4>
                                  <p><span className="font-medium">{translate("poojaName")}:</span> {pooja.pooja_name}</p>
                                  <p><span className="font-medium">{translate("poojaDate")}:</span> {formatDate(pooja.from_date)} {pooja.from_date !== pooja.to_date ? `- ${formatDate(pooja.to_date)}` : ''}</p>
                                  <p><span className="font-medium">{translate("poojaTime")}:</span> {formatTime(pooja.time)}</p>
                                  <p><span className="font-medium">{translate("amount")}:</span> ₹{pooja.amount || '0'}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">{translate("devoteeInfo")}</h4>
                                  <p><span className="font-medium">{translate("devoteeName")}:</span> {pooja.name}</p>
                                  <p><span className="font-medium">{translate("devoteeMobile")}:</span> {pooja.mobile_number}</p>
                                  {pooja.address && (
                                    <p><span className="font-medium">{translate("address")}:</span> {pooja.address}</p>
                                  )}
                                  {pooja.notes && (
                                    <p className="mt-2">
                                      <span className="font-medium">{translate("notes")}:</span> {pooja.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={visibleColCount} className={formFieldStyles.moneyDonationList.table.emptyCell}>
                      {translate("noPoojaEntriesFound")}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

          {/* Footer */}
          <div className={formFieldStyles.moneyDonationList.summary.container}>
            <div className={formFieldStyles.moneyDonationList.summary.info}>
              {translate("showing")} <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>
                {pagination.pageIndex * pagination.pageSize + 1}-{
                  Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.total)
                }
              </span> {translate("of")}{" "}
              <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{pagination.total}</span> {translate("items")}
            </div>
            <div className={formFieldStyles.moneyDonationList.summary.total}>
              {translate("total")}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{pagination.total}</span>
            </div>
          </div>
      </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={formFieldStyles.moneyDonationList.pagination.container}>
            <div className={formFieldStyles.moneyDonationList.pagination.controls}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
                className={formFieldStyles.moneyDonationList.pagination.button}
              >
                {translate("first")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                disabled={pagination.pageIndex === 0}
                className={formFieldStyles.moneyDonationList.pagination.button}
              >
                {translate("previous")}
              </Button>
              <span className="text-xs">
                {translate("page")} {pagination.pageIndex + 1} {translate("of")} {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.min(prev.pageIndex + 1, pagination.totalPages - 1) }))}
                disabled={pagination.pageIndex >= pagination.totalPages - 1}
                className={formFieldStyles.moneyDonationList.pagination.button}
              >
                {translate("next")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: pagination.totalPages - 1 }))}
                disabled={pagination.pageIndex >= pagination.totalPages - 1}
                className={formFieldStyles.moneyDonationList.pagination.button}
              >
                {translate("last")}
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500">{translate("rowsPerPage")}: </span>
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(value) => {
                    setPagination(prev => ({
                      ...prev,
                      pageSize: Number(value),
                      pageIndex: 0 // Reset to first page
                    }));
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue placeholder={pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className={formFieldStyles.moneyDonationList.contextMenu.container}
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <div className={formFieldStyles.moneyDonationList.contextMenu.header}>
              <h3 className={formFieldStyles.moneyDonationList.contextMenu.title}>{translate('columns')}</h3>
              <p className={formFieldStyles.moneyDonationList.contextMenu.subtitle}>
                {translate('visible')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
              </p>
            </div>
            <div className={formFieldStyles.moneyDonationList.contextMenu.content}>
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className={formFieldStyles.moneyDonationList.contextMenu.item}
                >
                  <input
                    type="checkbox"
                    checked={!!visibleCols[col.key]}
                    onChange={() =>
                      setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                    }
                    className={formFieldStyles.moneyDonationList.contextMenu.checkbox}
                  />
                  <span className={formFieldStyles.moneyDonationList.contextMenu.label}>{col.label}</span>
                </label>
              ))}
            </div>
            <div className={formFieldStyles.moneyDonationList.contextMenu.actions}>
              <Button
                variant="outline"
                size="sm"
                className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
                onClick={() =>
                  setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, true])) as any)
                }
              >
                {translate('selectAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
                onClick={() =>
                  setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, false])) as any)
                }
              >
                {translate('clearAll')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={formFieldStyles.moneyDonationList.contextMenu.closeButton}
                onClick={() => setMenuOpen(false)}
              >
                {translate('close')}
              </Button>
            </div>
          </div>
        )}

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {translate("view")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("receiptNo")}</Label>
              <div className="col-span-2 text-xs h-7 flex items-center">
                {viewPooja?.receipt_number}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("name")}</Label>
              <div className="col-span-2 text-xs h-7 flex items-center">
                {viewPooja?.name}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("mobile")}</Label>
              <div className="col-span-2 text-xs h-7 flex items-center">
                {viewPooja?.mobile_number}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("time")}</Label>
              <div className="col-span-2 text-xs h-7 flex items-center">
                {viewPooja?.time}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("fromDate")}</Label>
              <div className="col-span-2 text-xs h-7 flex items-center">
                {viewPooja?.from_date}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("toDate")}</Label>
              <div className="col-span-2 text-xs h-7 flex items-center">
                {viewPooja?.to_date}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("amount")}</Label>
              <div className="col-span-2 text-xs h-7 flex items-center">
                {(viewPooja as any)?.amount || 'N/A'}
              </div>
            </div>
            <div className="grid grid-cols-3 items-start gap-2">
              <Label className="text-xs">{translate("remarks")}</Label>
              <div className="col-span-2 text-xs">
                {viewPooja?.remarks || 'N/A'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsViewOpen(false);
                setViewPooja(null);
              }}
              className="text-xs"
            >
              {translate("close")}
            </Button>
            {viewPooja && canEditPooja(viewPooja) && (
              <Button 
                size="sm" 
                onClick={() => {
                  setIsViewOpen(false);
                  handleEditClick(viewPooja);
                }} 
                className="text-xs"
              >
                {translate("edit")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">{translate("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {translate("confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{translate("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* All Pooja Logs Modal */}
      {allLogsOpen && (
        <div className={formFieldStyles.moneyDonationList.modal.overlay}>
          <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-6xl mx-4">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-6 px-6 rounded-t-lg">
              <div className={formFieldStyles.moneyDonationList.modal.header}>
                <h2 className={formFieldStyles.moneyDonationList.modal.title}>{translate("allPoojaLogs")}</h2>
                <Button variant="ghost" className={formFieldStyles.moneyDonationList.modal.closeButton} onClick={closeAllLogs}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div className={cn(theme.input.base, "bg-white rounded-lg overflow-hidden")}>
                {allLogsLoading ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {translate("loading")}...
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                        <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                          <tr>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("action")}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("date")}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("receipt")}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("name")}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("mobile")}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("amount")}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("user")}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {translate("details")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                          {allLogs.length === 0 ? (
                            <tr>
                              <td className={formFieldStyles.moneyDonationList.logsTable.tdCenter} colSpan={8}>
                                {translate("noLogsFound")}
                              </td>
                            </tr>
                          ) : allLogs.map((log, index) => (
                            <tr key={log.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  log.action === 'create' ? 'bg-green-100 text-green-800' :
                                  log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                  log.action === 'delete' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.action === 'create' ? translate("created") :
                                   log.action === 'update' ? translate("updated") :
                                   log.action === 'delete' ? translate("deleted") :
                                   log.action}
                                </span>
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>
                                {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>{log.receipt_number || '-'}</td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>{log.pooja_name || '-'}</td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                {log.details?.mobile_number || log.details?.mobile || '-'}
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                {log.details?.amount ? `₹${log.details.amount}` : '-'}
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                {(() => {
                                  const userId = log.created_by;
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
                                    const isExpanded = expandedLogs.has(log.id);
                                    const hasAmountInfo = log.details && (
                                      log.details.amount || log.details.amount_paid ||
                                      log.details.mobile_number || log.details.mobile ||
                                      log.details.name || log.details.pooja_name
                                    );

                                    return (
                                      <div className="space-y-2">
                                        {/* Compact amount display */}
                                        {hasAmountInfo && (
                                          <div className="text-xs text-gray-600">
                                            {getAmountInfo(log.details, true)}
                                          </div>
                                        )}

                                        {/* View All button */}
                                        <button
                                          onClick={() => toggleLogExpansion(log.id)}
                                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {isExpanded ? translate('hideDetails') : translate('viewAll')}
                                        </button>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded border text-xs">
                                            {formatLogDetails(log.action, log.details, log.created_by)}
                                          </div>
                                        )}
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
                    <div className={formFieldStyles.moneyDonationList.pagination.container}>
                      <div className={formFieldStyles.moneyDonationList.pagination.info}>
                        {translate("total")}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{allLogsTotal}</span>
                      </div>
                      <div className={formFieldStyles.moneyDonationList.pagination.controls}>
                        <Button variant="outline" disabled={allLogsPage <= 1} onClick={() => {
                          setAllLogsPage(prev => Math.max(1, prev - 1));
                          loadAllPoojaLogs();
                        }} className={formFieldStyles.moneyDonationList.pagination.button}>
                          {translate("previous")}
                        </Button>
                        <span className="text-sm text-gray-600">{translate("page")} {allLogsPage}</span>
                        <Button variant="outline" disabled={allLogsPage * allLogsPageSize >= allLogsTotal} onClick={() => {
                          setAllLogsPage(prev => prev + 1);
                          loadAllPoojaLogs();
                        }} className={formFieldStyles.moneyDonationList.pagination.button}>
                          {translate("next")}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pooja Logs Modal */}
      {logsFor && (
        <div className={formFieldStyles.moneyDonationList.modal.overlay}>
          <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeLogs} />
          <div className={formFieldStyles.moneyDonationList.modal.container}>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 px-6 rounded-t-lg">
              <div className={formFieldStyles.moneyDonationList.modal.header}>
                <h2 className={formFieldStyles.moneyDonationList.modal.title}>{translate("poojaLogs")} #{logsFor}</h2>
                <Button variant="ghost" className={formFieldStyles.moneyDonationList.modal.closeButton} onClick={closeLogs}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div className={cn(theme.input.base, "bg-white rounded-lg overflow-hidden")}>
                {logsLoading ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {translate("loading")}...
                  </div>
                ) : logs.length === 0 ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {translate("noLogsFound")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                      <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                        <tr>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {translate("action")}
                          </th>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {translate("date")}
                          </th>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {translate("user")}
                          </th>
                          <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                            {translate("details")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                        {logs.map((log, index) => (
                          <tr key={log.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                            <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                log.action === 'create' ? 'bg-green-100 text-green-800' :
                                log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                log.action === 'delete' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.action === 'create' ? translate("created") :
                                 log.action === 'update' ? translate("updated") :
                                 log.action === 'delete' ? translate("deleted") :
                                 log.action}
                              </span>
                            </td>
                            <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>
                              {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </td>
                            <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                              {(() => {
                                const userId = log.created_by;
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
                                  const isExpanded = expandedLogs.has(log.id);
                                  const hasAmountInfo = log.details && (
                                    log.details.amount || log.details.amount_paid ||
                                    log.details.mobile_number || log.details.mobile ||
                                    log.details.name || log.details.pooja_name
                                  );

                                  return (
                                    <div className="space-y-2">
                                      {/* Compact amount display */}
                                      {hasAmountInfo && (
                                        <div className="text-xs text-gray-600">
                                          {getAmountInfo(log.details, true)}
                                        </div>
                                      )}

                                      {/* View All button */}
                                      <button
                                        onClick={() => toggleLogExpansion(log.id)}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                      >
                                        {isExpanded ? translate('hideDetails') : translate('viewAll')}
                                      </button>

                                      {/* Expanded details */}
                                      {isExpanded && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded border text-xs">
                                          {formatLogDetails(log.action, log.details, log.created_by)}
                                        </div>
                                      )}
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