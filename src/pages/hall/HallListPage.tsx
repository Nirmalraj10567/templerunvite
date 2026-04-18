import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { PrintButton } from '@/components/ui/print-button';
import { Modal } from '@/components/ui/modal';
import { useNavigate } from 'react-router-dom';
import { Trash2, Search, Loader2, FileSpreadsheet, FileDown, Printer, Pencil, History } from 'lucide-react';
import { cn, formFieldStyles, pageContainerStyles } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface HallBooking {
  id: number;
  register_no: string | null;
  date: string | null;
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
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<HallBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
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
  const [userDetails, setUserDetails] = useState<Record<number, {name: string, username?: string, mobile?: string}>>({});

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

  
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

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

  // Logs functions
  const openLogs = async (item: HallBooking) => {
    setLogsFor(item.id);
    setLogsLoading(true);
    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/${item.id}/logs`, {
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
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/logs?page=${pageToLoad}&pageSize=${allLogsPageSize}`, {
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

  const handleEdit = (id: number) => {
    navigate(`/dashboard/hall/edit/${id}`);
  };

  type ColKey =
    | 'register_no'
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
    | 'remarks';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' }> = [
    { key: 'register_no', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'time', label: t('Time', 'நேரம்') },
    { key: 'event', label: t('Function', 'நிகழ்வு') },
    { key: 'subdivision', label: t('Subdivision', 'துணை பிரிவு') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'address', label: t('Address', 'முகவரி') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'mobile', label: t('Phone', 'தொலைபேசி') },
    { key: 'advance_amount', label: t('Advance', 'முன்பணம்'), align: 'right' },
    { key: 'total_amount', label: t('Total', 'மொத்தம்'), align: 'right' },
    { key: 'balance_amount', label: t('Balance', 'இருப்பு'), align: 'right' },
    { key: 'remarks', label: t('Remarks', 'குறிப்புகள்') },
  ];

  const STORAGE_KEY = 'hall_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    register_no: true,
    date: true,
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
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultVisible, ...JSON.parse(raw) };
    } catch {}
    return defaultVisible;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // Totals
  const toNum = (v: string | null | undefined) => {
    if (!v) return 0;
    const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };
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
      const url = 'https://tmsapi.xesstechlink.com/api/hall-bookings' + (params.toString() ? `?${params.toString()}` : '');
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

  const handleExportCSV = async () => {
    try {
      const qs = buildQueryString();
      const url = 'https://tmsapi.xesstechlink.com/api/hall-bookings/export' + (qs ? `?${qs}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'hall_bookings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const qs = buildQueryString();
      const url = 'https://tmsapi.xesstechlink.com/api/hall-bookings/export-pdf' + (qs ? `?${qs}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to export PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'hall_bookings.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError('Failed to export PDF');
    }
  };

  return (
        <div className={pageContainerStyles.container}>
             <Card className={pageContainerStyles.content}>
               <CardHeader className={cn("w-full", theme.header.container)}>
                 <div className={theme.header.contentSpacing}>
                   <CardTitle className={theme.header.main}>
                     {t('Hall Bookings','மண்டப பதிவுகள்')}
                   </CardTitle>
                 </div>
               </CardHeader>

      {loading && (
        <div className={tableClasses.emptyState}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
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
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={handleExportCSV} disabled={loading || rows.length === 0}>
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  {t('Export CSV', 'CSV ஏற்றுமதி')}
                </Button>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={handleExportPDF} disabled={loading || rows.length === 0}>
                  <FileDown className="h-3 w-3 mr-1" />
                  {t('Export PDF', 'PDF ஏற்றுமதி')}
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={tableClasses.scrollContainerWrapper}>
            <div className={tableClasses.scrollContainer}>
              {loading ? (
                <div className={tableClasses.emptyState}>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table className={tableClasses.container}>
                  <TableHeader className={tableClasses.header}>
                    <TableRow className={tableClasses.row}>
                      <TableHead className={tableClasses.headerCellSno}>{t("S.No", "எண்")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Receipt No", "ரசீது எண்")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Date", "தேதி")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Time", "நேரம்")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Function", "நிகழ்வு")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Name", "பெயர்")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Village", "கிராமம்")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Phone", "தொலைபேசி")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Advance", "முன்பணம்")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Total", "மொத்தம்")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Balance", "இருப்பு")}</TableHead>
                      <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Actions", "செயல்கள்")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((r, index) => (
                        <TableRow key={r.id} className={tableClasses.row}>
                          <TableCell className={tableClasses.cellSno}>
                            {index + 1}
                          </TableCell>
                          <TableCell className={tableClasses.cell}>
                            {r.register_no || '-'}
                          </TableCell>
                          <TableCell className={tableClasses.cell}>
                            {r.date || '-'}
                          </TableCell>
                          <TableCell className={tableClasses.cell}>
                            {r.time || '-'}
                          </TableCell>
                          <TableCell className={tableClasses.cell}>
                            {r.event || '-'}
                          </TableCell>
                          <TableCell className={tableClasses.cell}>
                            {r.name || '-'}
                          </TableCell>
                          <TableCell className={tableClasses.cell}>
                            {r.village || '-'}
                          </TableCell>
                          <TableCell className={tableClasses.cell}>
                            {r.mobile || '-'}
                          </TableCell>
                          <TableCell className={cn(tableClasses.cell, 'text-right')}>
                            ₹{toNum(r.advance_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className={cn(tableClasses.cell, 'text-right')}>
                            ₹{toNum(r.total_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className={cn(tableClasses.cell, 'text-right')}>
                            ₹{toNum(r.balance_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const pdfUrl = `/api/hall-bookings/${r.id}/receipt.pdf`;
                                  window.open(pdfUrl, '_blank');
                                }}
                                className={buttonClasses.actionSecondary}
                                title={t('Print Receipt', 'ரசீது அச்சிடு')}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(r.id)}
                                className={buttonClasses.actionPrimary}
                                title={t('Edit', 'திருத்து')}
                              >
                                <Pencil className="h-3.5 w-3.5" />
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
                                className={index === 0 ? buttonClasses.actionDanger : 'opacity-50 cursor-not-allowed'}
                                title={t('Delete', 'நீக்கு')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className={tableClasses.emptyState}>
                          {t("No records found", "பதிவுகள் கிடைக்கவில்லை")}
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

      {/* Financial Totals */}
      <div className="mt-2 flex justify-end text-xs text-gray-600">
        <div className="flex gap-3">
          <span>{t('Advance', 'முன்பணம்')}: ₹{totals.advance.toLocaleString()}</span>
          <span>{t('Total', 'மொத்தம்')}: ₹{totals.total.toLocaleString()}</span>
          <span>{t('Balance', 'இருப்பு')}: ₹{totals.balance.toLocaleString()}</span>
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
                  const res = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/${selectedBookingId}`, {
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
                                                  <span>₹{advanceAmount}</span>
                                                </div>
                                              )}
                                              {totalAmount && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Total', 'மொத்தம்')}:</span>
                                                  <span>₹{totalAmount}</span>
                                                </div>
                                              )}
                                              {balanceAmount && (
                                                <div className="flex justify-between">
                                                  <span className="font-medium">{t('Balance', 'இருப்பு')}:</span>
                                                  <span>₹{balanceAmount}</span>
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
                                              <span>₹{advanceAmount}</span>
                                            </div>
                                          )}
                                          {totalAmount && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Total', 'மொத்தம்')}:</span>
                                              <span>₹{totalAmount}</span>
                                            </div>
                                          )}
                                          {balanceAmount && (
                                            <div className="flex justify-between">
                                              <span className="font-medium">{t('Balance', 'இருப்பு')}:</span>
                                              <span>₹{balanceAmount}</span>
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
                  className={cn(theme.input.base, "h-3 w-3 text-blue-600 rounded")}
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
