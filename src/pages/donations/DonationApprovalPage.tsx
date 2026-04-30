import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Download
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import { cn } from '@/styles/formStyles';

interface DonationItem {
  id: number;
  product_name: string;
  donor_name: string;
  donor_contact: string;
  donation_date: string;
  price: number;
  quantity: number;
  approval_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submitted_by_mobile: string;
  submitted_at: string;
  admin_notes?: string;
  rejection_reason?: string;
  logs?: ApprovalLog[];
}

interface ApprovalLog {
  id: number;
  action: string;
  performed_by?: { id: number; full_name?: string; username?: string } | null;
  performed_at: string;
  notes?: string;
  old_status?: string;
  new_status?: string;
}

interface ApprovalStats {
  status_counts: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  total_requests: number;
}

export default function DonationApprovalPage() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const { toast } = useToast();

  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<DonationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1
  });
  // Date range filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState({
    donations: false,
    stats: false,
    action: false,
    export: false
  });
  const [selectedRequest, setSelectedRequest] = useState<DonationItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState<ApprovalStats | null>(null);

  /** ====== Column visibility logic ====== */
  type ColKey = 'product' | 'donor' | 'quantity' | 'date' | 'status' | 'actions';
  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'product', label: t('Product', 'பொருள்') },
    { key: 'donor', label: t('Donor', 'தானம் அளிப்பவர்') },
    { key: 'quantity', label: t('Quantity', 'அளவு'), align: 'right' },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'status', label: t('Status', 'நிலை') },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' }
  ];

  const STORAGE_KEY = 'donation_approval_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    product: true,
    donor: true,
    quantity: true,
    date: true,
    status: true,
    actions: true
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
  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

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
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  /** ====== Fetch calls ====== */
  const fetchDonations = async () => {
    try {
      setLoading((prev) => ({ ...prev, donations: true }));
      const response = await fetch(`https://templeapi.agniplay.com/api/donations-approval/pending?page=${pagination.page}&pageSize=${pagination.pageSize}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed');
      const { data, total, totalPages } = await response.json();
      setDonations(data);
      setFilteredDonations(data);
      setPagination((prev) => ({ ...prev, totalItems: total, totalPages }));
    } catch {
      toast({ title: t('Error', 'பிழை'), description: t('Failed to load requests', 'ஏற்ற முடியவில்லை'), variant: 'destructive' });
    } finally {
      setLoading((prev) => ({ ...prev, donations: false }));
    }
  };

  const fetchStats = async () => {
    try {
      setLoading((prev) => ({ ...prev, stats: true }));
      const response = await fetch('https://templeapi.agniplay.com/api/donations-approval/stats', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result.success) setStats(result.data);
    } catch {
      toast({ title: t('Error', 'பிழை'), description: t('Failed to load stats', 'ஏற்ற முடியவில்லை'), variant: 'destructive' });
    } finally {
      setLoading((prev) => ({ ...prev, stats: false }));
    }
  };

  useEffect(() => {
    fetchDonations();
    fetchStats();
  }, [pagination.page, pagination.pageSize, token]);

  // Filtering
  useEffect(() => {
    let result = [...donations];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.donor_name?.toLowerCase().includes(term) ||
          item.product_name?.toLowerCase().includes(term) ||
          item.donor_contact?.includes(term) ||
          item.price?.toString().includes(term)
      );
    }
    if (statusFilter !== 'all') result = result.filter((i) => i.approval_status === statusFilter);
    // Apply date range on donation_date (normalize various formats to YYYY-MM-DD)
    const toKey = (val?: string): string | null => {
      if (!val) return null;
      const s = String(val);
      // Case 1: ISO or YYYY-MM-DD*
      const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) return isoMatch[1];
      // Case 2: DD/MM/YYYY
      const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (dmy) {
        const [_, dd, mm, yyyy] = dmy;
        return `${yyyy}-${mm}-${dd}`;
      }
      // Fallback: try Date.parse
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    };
    const withinDateRange = (dt?: string, submitted?: string) => {
      const key = toKey(dt) || toKey(submitted);
      if (!key) return true; // if no valid date, do not exclude
      if (fromDate && key < fromDate) return false;
      if (toDate && key > toDate) return false;
      return true;
    };
    if (fromDate || toDate) {
      result = result.filter((i) => withinDateRange(i.donation_date, i.submitted_at));
    }
    setFilteredDonations(result);
  }, [searchTerm, statusFilter, fromDate, toDate, donations]);

  /** ====== Approval actions ====== */
  const handleApprove = async (id: number) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      await fetch(`https://templeapi.agniplay.com/api/donations-approval/approve/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes })
      });
      toast({ title: t('Success', 'வெற்றி'), description: t('Approved', 'அனுமதிக்கப்பட்டது') });
      setIsApproveDialogOpen(false);
      setAdminNotes('');
      fetchDonations();
      fetchStats();
    } catch {
      toast({ title: t('Error', 'பிழை'), description: t('Failed', 'தோல்வி'), variant: 'destructive' });
    } finally { setLoading((p) => ({ ...p, action: false })); }
  };

  const handleReject = async (id: number) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      await fetch(`https://templeapi.agniplay.com/api/donations-approval/reject/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason, admin_notes: adminNotes })
      });
      toast({ title: t('Success', 'வெற்றி'), description: t('Rejected', 'நிராகரிக்கப்பட்டது') });
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setAdminNotes('');
      fetchDonations();
      fetchStats();
    } catch {
      toast({ title: t('Error', 'பிழை'), description: t('Failed', 'தோல்வி'), variant: 'destructive' });
    } finally { setLoading((p) => ({ ...p, action: false })); }
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      pending: { variant: 'secondary', text: t('Pending', 'நிலுவையில்') },
      approved: { variant: 'default', text: t('Approved', 'அனுமதிக்கப்பட்டது') },
      rejected: { variant: 'destructive', text: t('Rejected', 'நிராகரிக்கப்பட்டது') },
      cancelled: { variant: 'outline', text: t('Cancelled', 'ரத்து') }
    };
    return <Badge variant={map[status]?.variant || 'outline'}>{map[status]?.text || status}</Badge>;
  };

  /** ====== Render ====== */
  return (
    <div className="p-4 bg-white rounded shadow text-sm space-y-4">
      {/* Header & Filters */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-lg font-semibold">{t('Donation Approvals', 'நன்கொடை அனுமதிகள்')}</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('Search...', 'தேடுக...')} className={cn(theme.input.base, theme.input.size.sm, "w-56")} />
          <div className="flex items-center gap-1">
            <Input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className={cn(theme.input.base, theme.input.size.sm, "w-[140px]")} />
            <span className="text-xs text-gray-600">{t('to','வரை')}</span>
            <Input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className={cn(theme.input.base, theme.input.size.sm, "w-[140px]")} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(theme.select.base, theme.select.size.sm, "w-[150px]")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All','அனைத்தும்')}</SelectItem>
              <SelectItem value="pending">{t('Pending','நிலுவையில்')}</SelectItem>
              <SelectItem value="approved">{t('Approved','அனுமதி')}</SelectItem>
              <SelectItem value="rejected">{t('Rejected','நிராகரிப்பு')}</SelectItem>
              <SelectItem value="cancelled">{t('Cancelled','ரத்து')}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={async()=>{
            try{
              setLoading(p=>({...p,export:true}));
              const res=await fetch('https://templeapi.agniplay.com/api/donations-approval/export',{headers:{Authorization:`Bearer ${token}`}});
              const blob=await res.blob(); const url=URL.createObjectURL(blob);
              const a=document.createElement('a');a.href=url;a.download=`donations_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
              toast({title:t('Exported','ஏற்றுமதி செய்யப்பட்டது')});
            } catch{ toast({title:t('Error','பிழை'),variant:'destructive'});}
            finally{setLoading(p=>({...p,export:false}))}
          }}><Download className="h-3 w-3 mr-1"/>{t('Export','ஏற்றுமதி')}</Button>
        </div>
      </div>

      {/* Stats */}
      {stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs">{t('Total','மொத்தம்')}</p><p className="font-bold">{stats.total_requests}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs">{t('Pending','நிலுவையில்')}</p><p className="font-bold">{stats.status_counts.pending}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs">{t('Approved','அனுமதி')}</p><p className="font-bold">{stats.status_counts.approved}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs">{t('Rejected/Cancelled','நிராகரிப்பு/ரத்து')}</p><p className="font-bold">{stats.status_counts.rejected+stats.status_counts.cancelled}</p></CardContent></Card>
      </div>}

      {/* Table */}
      <div className={tableClasses.scrollContainerWrapper} onContextMenu={onContextMenu}>
        <div className={tableClasses.scrollContainer}>
          <Table className={tableClasses.container}>
            <TableHeader className={tableClasses.header}>
              <TableRow className={tableClasses.row}>
                {allColumns.map(col=>visibleCols[col.key]&&(
                  <TableHead key={col.key} className={cn(tableClasses.headerCell, col.align==='right'?'text-right':col.align==='center'?'text-center':'text-left')}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading.donations?(
                <TableRow><TableCell colSpan={visibleColCount} className={tableClasses.emptyState}><Loader2 className="h-4 w-4 animate-spin mx-auto"/></TableCell></TableRow>
              ):filteredDonations.length===0?(
                <TableRow><TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>{t('No data','தரவு இல்லை')}</TableCell></TableRow>
              ):filteredDonations.map(d=>(
                <TableRow key={d.id} className={tableClasses.row}>
                  {visibleCols.product&&<TableCell className={tableClasses.cell}>{d.product_name}</TableCell>}
                  {visibleCols.donor&&<TableCell className={tableClasses.cell}>{d.donor_name}<div className="text-xs text-gray-500">{d.donor_contact}</div></TableCell>}
                  {visibleCols.quantity&&<TableCell className={cn(tableClasses.cell, 'text-right')}>{d.quantity}</TableCell>}
                  {visibleCols.date&&<TableCell className={tableClasses.cell}>{new Date(d.donation_date).toLocaleDateString()}</TableCell>}
                  {visibleCols.status&&<TableCell className={tableClasses.cell}>{getStatusBadge(d.approval_status)}</TableCell>}
                  {visibleCols.actions&&<TableCell className={cn(tableClasses.cell, 'text-center')}><Button size="sm" variant="ghost" onClick={()=>{setSelectedRequest(d);setIsViewDialogOpen(true)}}><Eye className="h-3 w-3 mr-1"/>{t('View','பார்')}</Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className={tableClasses.pagination}>
          <span className="text-xs text-gray-700">{t('Showing','காட்டுகிறது')} {(pagination.page-1)*pagination.pageSize+1}-{Math.min(pagination.page*pagination.pageSize,pagination.totalItems)} {t('of','மொத்தம்')} {pagination.totalItems}</span>
          <span className="text-xs text-gray-700">{t('Page','பக்கம்')} {pagination.page}/{pagination.totalPages}</span>
        </div>
      </div>

      {/* Context menu */}
      {menuOpen&&<div ref={menuRef} className="fixed z-50 bg-white border rounded shadow w-64" style={{left:menuPos.x,top:menuPos.y}}>
        <div className="px-3 py-2 border-b"><p className="text-sm">{t('Columns','நெடுவரிசைகள்')}</p></div>
        <div className="max-h-60 overflow-y-auto p-2">
          {allColumns.map(c=><label key={c.key} className="flex gap-2 items-center px-2 py-1 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={visibleCols[c.key]} onChange={()=>setVisibleCols(prev=>({...prev,[c.key]:!prev[c.key]}))}/>
            <span className="text-sm">{c.label}</span>
          </label>)}
        </div>
        <div className="p-2 flex gap-2 border-t">
          <Button size="sm" variant="outline" onClick={()=>{const all:any={};allColumns.forEach(c=>all[c.key]=true);setVisibleCols(all)}}>{t('Select all','அனைத்தும்')}</Button>
          <Button size="sm" variant="outline" onClick={()=>{const all:any={};allColumns.forEach(c=>all[c.key]=false);setVisibleCols(all)}}>{t('Clear','அழி')}</Button>
          <Button size="sm" variant="outline" className="ml-auto" onClick={()=>setMenuOpen(false)}>{t('Close','மூடு')}</Button>
        </div>
      </div>}
      
      {/* Modals for view/approve/reject -> remain same as your original code, you can reuse directly */}
      {/* ... */}
    </div>
  );
}
