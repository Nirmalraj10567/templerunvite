import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ledgerService, LedgerEntry } from '@/services/ledgerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { FileDown, Search, RefreshCw, Edit, Trash2, Printer, Plus } from 'lucide-react';
import { formFieldStyles, cn, pageContainerStyles } from '@/styles/formStyles';

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
  const { token } = useAuth();
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
  const [userDetails, setUserDetails] = useState<Record<number, {name: string, username?: string, mobile?: string}>>({});

  const t = (en: string, ta: string) => language === 'english' ? ta : en;
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
          const res = await fetch(`https://tmsapi.xesstechlink.com/api/admin/members/${id}`, {
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

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
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
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/ledger-entries/${entry.id}/logs`, {
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
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/ledger-entries/logs?page=${pageToLoad}&pageSize=${allLogsPageSize}`, {
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

  const onExportPDF = () => {
    window.print();
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
         <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 text-center", formFieldStyles.card.header)}>
           <CardTitle className="text-lg font-bold w-full">
           {t('Ledger', 'பதிவேடு')}
           </CardTitle>
         </CardHeader>
       
        <div className="text-xs text-gray-600">
          {t('Balance', 'இருப்பு')}:{' '}
          <span className={`font-medium ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatAmount(currentBalance)}
          </span>
        </div>
      </div>

      {/* Compact Filters */}
      <Card className="mb-2">
        <CardContent className="p-2">
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-8 gap-2 items-center">
            {/* Date Range */}
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="text-xs h-7"
              placeholder={t('From', 'முதல்')}
            />
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="text-xs h-7"
              placeholder={t('To', 'வரை')}
            />

            {/* Type */}
            <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Types', 'அனைத்து வகைகள்')}</SelectItem>
                <SelectItem value="credit">{t('Credit', 'கடன்')}</SelectItem>
                <SelectItem value="debit">{t('Debit', 'பற்று')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={filters.under} onValueChange={(v) => handleFilterChange('under', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t('Category', 'வகை')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Categories', 'அனைத்து வகைகள்')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Name Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                placeholder={t('Search name', 'பெயரைத் தேடவும்')}
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className="text-xs h-7 pl-7"
              />
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  type: 'all',
                  under: 'all',
                  name: '',
                });
              }}
              className="text-xs h-7 px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t('Reset', 'மீட்டமை')}
            </Button>

            <Button variant="outline" size="sm" onClick={onExportCSV} className="text-xs h-7 px-2">
              <FileDown className="h-3 w-3 mr-1" />
              CSV
            </Button>

            <Button variant="outline" size="sm" onClick={onExportPDF} className="text-xs h-7 px-2">
              <FileDown className="h-3 w-3 mr-1" />
              PDF
            </Button>

            
          </div>
        </CardContent>
      </Card>

      {/* Compact Table */}
      <div
        className="bg-white rounded border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto text-xs max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-2 py-2 text-center text-xs text-gray-500">
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-2 py-2 text-center text-xs text-gray-500">
                    {t('No entries found', 'உள்ளீடுகள் கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  let runningBalance = entries
                    .slice(0, index + 1)
                    .reduce((sum, e) => (e.type === 'credit' ? sum + e.amount : sum - e.amount), 0);

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      {visibleCols.date && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                          {format(new Date(entry.date), 'dd/MM/yy')}
                        </td>
                      )}
                      {visibleCols.name && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 max-w-32 truncate">
                          {entry.name}
                        </td>
                      )}
                      {visibleCols.category && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500 max-w-24 truncate">
                          {entry.under || '-'}
                        </td>
                      )}
                      {visibleCols.credit && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-green-600 text-right">
                          {entry.type === 'credit' ? `₹${entry.amount.toFixed(2)}` : '-'}
                        </td>
                      )}
                      {visibleCols.debit && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-red-600 text-right">
                          {entry.type === 'debit' ? `₹${entry.amount.toFixed(2)}` : '-'}
                        </td>
                      )}
                      {visibleCols.balance && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-right">
                          ₹{runningBalance.toFixed(2)}
                        </td>
                      )}
                      {visibleCols.actions && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPrintEntry(entry)}
                              className="h-6 w-6 p-0"
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(entry.id!)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-gray-200 text-xs">
          <div className="text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span>{' '}
            {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span>{' '}
            {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{totalCount}</span>
          </div>
          <div className="text-gray-700">
            {t('Balance', 'இருப்பு')}: <span className="font-medium">₹{currentBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="text-xs py-1 px-2 h-7"
          >
            {t('Previous', 'முந்தைய')}
          </Button>
          <span className="text-xs">
            {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="text-xs py-1 px-2 h-7"
          >
            {t('Next', 'அடுத்தது')}
          </Button>
        </div>
      )}

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded shadow border border-gray-200 w-48 text-xs"
          style={{ left: menuPos.x, top: menuPos.y }}
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
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-xs text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 p-1 border-t border-gray-200">
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
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-6 px-6 rounded-t-lg flex-shrink-0">
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
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    lg.action === 'create' ? 'bg-green-100 text-green-800' :
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
                                                  <span>₹{amount}</span>
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
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 px-6 rounded-t-lg">
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
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                lg.action === 'create' ? 'bg-green-100 text-green-800' :
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
                                              <span>₹{amount}</span>
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
