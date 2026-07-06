import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Trash2, Search, Loader2 } from 'lucide-react';
import { cn, pageContainerStyles, formFieldStyles } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';

type TaxRegistration = {
  id: number;
  name: string;
  mobile_number?: string;
  aadhaar_number?: string | null;
  reference_number?: string;
  village?: string;
  created_at?: string;
  tax_amount?: number;
  amount_paid?: number;
  outstanding_amount?: number;
  // Additional member fields
  alternative_name?: string;
  wife_name?: string;
  education?: string;
  occupation?: string;
  father_name?: string;
  address?: string;
  birth_date?: string;
  pan_number?: string;
  clan?: string;
  group?: string;
  postal_code?: string;
  male_heirs?: number;
  female_heirs?: number;
  member_id?: number;
  // Family chain fields
  gender?: string;
  marital_status?: string;
  parent_reference_id?: string | null;
  family_head_reference?: string | null;
  relationship_type?: string;
  wife_father_name?: string;
};

export default function TaxUserListPage() {
  const { token } = useAuth();
  const canExportPdf = useFeature('data_export_excel');
  const { language } = useLanguage();
  const [rows, setRows] = useState<TaxRegistration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'paid'>('all');
const [familyFilter, setFamilyFilter] = useState<'all' | 'family'>('all');
  const [currentYearTax, setCurrentYearTax] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [paidCount, setPaidCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Filter rows based on family chain filter
  const filteredRows = useMemo(() => {
    if (familyFilter === 'family') {
      return rows.filter(r => r.parent_reference_id || r.family_head_reference || r.relationship_type);
    }
    return rows;
  }, [rows, familyFilter]);

  // Column Keys
  type ColKey = 'sno' | 'name' | 'mobile_number' | 'aadhaar_number' | 'reference_number' | 'village' | 'created_at' | 'status' | 'actions' | 'father_name' | 'education' | 'occupation' | 'clan' | 'group' | 'address' | 'birth_date' | 'pan_number' | 'postal_code' | 'male_heirs' | 'female_heirs' | 'member_id' | 'gender' | 'marital_status' | 'family_chain';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'sno', label: t('S.No', 'வ.எண்') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'mobile_number', label: t('Mobile', 'தொலைபேசி') },
    { key: 'aadhaar_number', label: t('Aadhaar', 'ஆதார்') },
    { key: 'reference_number', label: t('Ref No', 'குறிப்பு எண்') },
    { key: 'father_name', label: t('Father Name', 'தந்தை பெயர்') },
    { key: 'education', label: t('Education', 'கல்வி') },
    { key: 'occupation', label: t('Occupation', 'தொழில்') },
    { key: 'clan', label: t('Clan', 'குலம்') },
    { key: 'group', label: t('Group', 'குழு') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'address', label: t('Address', 'முகவரி') },
    { key: 'birth_date', label: t('Birth Date', 'பிறந்த தேதி') },
    { key: 'pan_number', label: t('PAN', 'பான்') },
    { key: 'postal_code', label: t('Postal Code', 'அஞ்சல் குறியீடு') },
    { key: 'male_heirs', label: t('Male Heirs', 'ஆண் வாரிசு'), align: 'center' },
    { key: 'female_heirs', label: t('Female Heirs', 'பெண் வாரிசு'), align: 'center' },
    { key: 'member_id', label: t('Member ID', 'உறுப்பினர் ஐடி'), align: 'center' },
    { key: 'gender', label: t('Gender', 'பாலினம்') },
    { key: 'marital_status', label: t('Marital', 'திருமண நிலை') },
    { key: 'family_chain', label: t('Family Chain', 'குடும்ப சங்கிலி'), align: 'center' },
    { key: 'created_at', label: t('Created', 'உருவாக்கப்பட்டது') },
    { key: 'status', label: t('Status', 'நிலை'), align: 'center' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'tax_user_list_visible_columns_v2';
  const defaultVisible: Record<ColKey, boolean> = {
    sno: true,
    name: true,
    mobile_number: true,
    aadhaar_number: true,
    reference_number: true,
    father_name: true,
    education: false,
    occupation: false,
    clan: false,
    group: false,
    village: true,
    address: false,
    birth_date: false,
    pan_number: false,
    postal_code: false,
    male_heirs: false,
    female_heirs: false,
    member_id: false,
    gender: false,
    marital_status: false,
    family_chain: true,
    created_at: true,
    status: true,
    actions: true,
  };

  const openLogs = async (row: TaxRegistration) => {
    if (row.id < 0) {
      alert(t('This is an inferred record without a saved tax registration. No logs available.', 'இது சேமிக்கப்பட்ட வரி பதிவு இல்லாத ஊகிக்கப்பட்ட பதிவு. பதிவுகள் இல்லை.'));
      return;
    }
    setLogsFor(row.id);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/${row.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('openLogs - API response:', data);
      if (!res.ok) throw new Error(data.error || 'Failed to load logs');
      const logsData = Array.isArray(data.data) ? data.data : [];
      console.log('openLogs - logsData:', logsData);
      setLogs(logsData);
      
      // Fetch user names for the logs
      const userIds = logsData
        .map(log => log.created_by)
        .filter((id): id is number => id !== null && id !== undefined);
      console.log('openLogs - Found userIds:', userIds);
      console.log('openLogs - Raw created_by values:', logsData.map(log => ({ id: log.id, created_by: log.created_by, action: log.action })));
      if (userIds.length > 0) {
        console.log('openLogs - Calling fetchUserNames with:', userIds);
        await fetchUserNames(userIds);
      } else {
        console.log('openLogs - No userIds found, skipping fetchUserNames');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogs = () => {
    setLogsFor(null);
    setLogs([]);
    setExpandedLogs(new Set());
  };

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

  // Helper function to format amounts
  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return Number.isFinite(num) ? `${num.toFixed(2)}` : '-';
  };

  // Helper function to get amount info
  const getAmountInfo = (details: any, compact = false) => {
    // Check for amount fields in different possible locations
    const taxAmount = details.tax_amount || details.taxAmount || details.total_tax || details.totalAmount;
    const amountPaid = details.amount_paid || details.amountPaid || details.paid_amount || details.paidAmount;
    const outstanding = details.outstanding_amount || details.outstandingAmount;
    
    // Only show if we have at least one amount field
    if (!taxAmount && !amountPaid && outstanding === undefined) return null;
    
    if (compact) {
      return (
        <div className="text-xs text-gray-600">
          <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(taxAmount)}</div>
          <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(amountPaid)}</div>
          {outstanding !== undefined && (
            <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(outstanding)}</div>
          )}
        </div>
      );
    }
    
    return (
      <div className="bg-gray-50 p-2 rounded border text-xs">
        <div className="font-medium text-gray-700 mb-1">{t('Amount Details', 'தொகை விவரங்கள்')}</div>
        <div className="space-y-1">
          <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(taxAmount)}</div>
          <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(amountPaid)}</div>
          {outstanding !== undefined && (
            <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(outstanding)}</div>
          )}
        </div>
      </div>
    );
  };

  // Format log details for user-friendly display
  const formatLogDetails = (action: string, details: any, createdBy?: number | null) => {
    if (!details) return t('No details available', 'விவரங்கள் இல்லை');
    
    // Debug: Log the details to console for troubleshooting
    console.log('Log details for action:', action, details);
    
    // Helper function to safely stringify objects
    const safeStringify = (obj: any, maxDepth = 2, currentDepth = 0): string => {
      if (currentDepth >= maxDepth) return '[Object]';
      if (obj === null || obj === undefined) return String(obj);
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
      if (Array.isArray(obj)) {
        return `[${obj.map(item => safeStringify(item, maxDepth, currentDepth + 1)).join(', ')}]`;
      }
      if (typeof obj === 'object') {
        const entries = Object.entries(obj).slice(0, 5); // Limit to first 5 properties
        const pairs = entries.map(([key, value]) => `${key}: ${safeStringify(value, maxDepth, currentDepth + 1)}`);
        return `{${pairs.join(', ')}${Object.keys(obj).length > 5 ? '...' : ''}}`;
      }
      return String(obj);
    };
    
    switch (action) {
      case 'create':
        return (
          <div className="space-y-2">
            <div className="text-xs text-green-700 font-medium">{t('New Tax Registration Created', 'புதிய வரி பதிவு உருவாக்கப்பட்டது')}</div>
            <div className="text-xs text-gray-600 space-y-1">
              {details.name && <div><span className="font-medium">{t('Name', 'பெயர்')}:</span> {details.name}</div>}
              {details.reference_number && <div><span className="font-medium">{t('Reference', 'குறிப்பு')}:</span> {details.reference_number}</div>}
              {details.mobile_number && <div><span className="font-medium">{t('Mobile', 'தொலைபேசி')}:</span> {details.mobile_number}</div>}
              {details.village && <div><span className="font-medium">{t('Village', 'கிராமம்')}:</span> {details.village}</div>}
            </div>
            {(details.tax_amount || details.amount_paid) && getAmountInfo(details)}
          </div>
        );
      
      case 'update':
        const changes: string[] = [];
        if (details.name) changes.push(`${t('Name', 'பெயர்')}: ${details.name}`);
        if (details.mobile_number) changes.push(`${t('Mobile', 'தொலைபேசி')}: ${details.mobile_number}`);
        if (details.aadhaar_number) changes.push(`${t('Aadhaar', 'ஆதார்')}: ${details.aadhaar_number}`);
        if (details.village) changes.push(`${t('Village', 'கிராமம்')}: ${details.village}`);
        if (details.reference_number) changes.push(`${t('Reference', 'குறிப்பு')}: ${details.reference_number}`);
        
        // Handle before/after comparison
        const hasBeforeAfter = details.before && details.after;
        
        return (
          <div className="space-y-2">
            <div className="text-xs text-blue-700 font-medium">{t('Tax Registration Updated', 'வரி பதிவு புதுப்பிக்கப்பட்டது')}</div>
            <div className="text-xs text-gray-600 space-y-1">
              {hasBeforeAfter ? (
                <div className="space-y-2">
                  {/* Reference ID */}
                  {(details.before.reference_number || details.after.reference_number) && (
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">{t('Reference', 'குறிப்பு')}:</span> {details.after.reference_number || details.before.reference_number}
                    </div>
                  )}
                  
                  {/* Before Amount Details */}
                  {(() => {
                    const beforeAmounts = {
                      tax_amount: details.before.tax_amount || details.before.taxAmount,
                      amount_paid: details.before.amount_paid || details.before.amountPaid,
                      outstanding_amount: details.before.outstanding_amount || details.before.outstandingAmount
                    };
                    if (beforeAmounts.tax_amount || beforeAmounts.amount_paid || beforeAmounts.outstanding_amount !== undefined) {
                      return (
                        <div className="bg-red-50 p-2 rounded border">
                          <div className="font-medium text-red-700 mb-1">{t('Before Amount Details', 'முன் தொகை விவரங்கள்')}</div>
                          <div className="space-y-1">
                            <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(beforeAmounts.tax_amount)}</div>
                            <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(beforeAmounts.amount_paid)}</div>
                            {beforeAmounts.outstanding_amount !== undefined && (
                              <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(beforeAmounts.outstanding_amount)}</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* After Amount Details */}
                  {(() => {
                    const afterAmounts = {
                      tax_amount: details.after.tax_amount || details.after.taxAmount,
                      amount_paid: details.after.amount_paid || details.after.amountPaid,
                      outstanding_amount: details.after.outstanding_amount || details.after.outstandingAmount
                    };
                    if (afterAmounts.tax_amount || afterAmounts.amount_paid || afterAmounts.outstanding_amount !== undefined) {
                      return (
                        <div className="bg-green-50 p-2 rounded border">
                          <div className="font-medium text-green-700 mb-1">{t('After Amount Details', 'பின் தொகை விவரங்கள்')}</div>
                          <div className="space-y-1">
                            <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(afterAmounts.tax_amount)}</div>
                            <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(afterAmounts.amount_paid)}</div>
                            {afterAmounts.outstanding_amount !== undefined && (
                              <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(afterAmounts.outstanding_amount)}</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : changes.length > 0 ? (
                changes.map((change, idx) => (
                  <div key={idx}>{change}</div>
                ))
              ) : (
                <div className="text-gray-500 italic">
                  {t('Details updated', 'விவரங்கள் புதுப்பிக்கப்பட்டது')}
                  {Object.keys(details).length > 0 && (
                    <div className="mt-1 text-xs">
                      {Object.entries(details).slice(0, 3).map(([key, value], idx) => (
                        <div key={idx}>
                          <span className="font-medium">{key}:</span> {safeStringify(value)}
                        </div>
                      ))}
                      {Object.keys(details).length > 3 && (
                        <div className="text-gray-400">...and {Object.keys(details).length - 3} more fields</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {(details.tax_amount !== undefined || details.amount_paid !== undefined) && getAmountInfo(details)}
          </div>
        );
      
      case 'delete':
        return (
          <div className="space-y-2">
            <div className="text-xs text-red-700 font-medium">{t('Tax Registration Deleted', 'வரி பதிவு நீக்கப்பட்டது')}</div>
            <div className="text-xs text-gray-600 space-y-1">
              {details.name && <div><span className="font-medium">{t('Name', 'பெயர்')}:</span> {details.name}</div>}
              {details.reference_number && <div><span className="font-medium">{t('Reference', 'குறிப்பு')}:</span> {details.reference_number}</div>}
            </div>
            {(details.tax_amount || details.amount_paid) && getAmountInfo(details)}
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-700 font-medium">{t('Action', 'செயல்')}: {action}</div>
            <div className="text-xs text-gray-600 space-y-1">
              {Object.keys(details).length > 0 ? (
                Object.entries(details).map(([key, value], idx) => (
                  <div key={idx}>
                    <span className="font-medium">{key}:</span> {safeStringify(value)}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">{t('No additional details', 'கூடுதல் விவரங்கள் இல்லை')}</div>
              )}
            </div>
            {(details.tax_amount !== undefined || details.amount_paid !== undefined) && getAmountInfo(details)}
          </div>
        );
    }
  };

  const openAllLogs = async () => {
    setAllLogsOpen(true);
    await loadAllLogs(1);
  };

  const loadAllLogs = async (pageNum: number) => {
    setAllLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), pageSize: String(allLogsPageSize) });
      const res = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('loadAllLogs - API response:', data);
      if (!res.ok) throw new Error(data.error || 'Failed to load logs');
      const logsData = Array.isArray(data.data) ? data.data : [];
      console.log('loadAllLogs - logsData:', logsData);
      setAllLogs(logsData);
      setAllLogsTotal(Number(data.total || 0));
      setAllLogsPage(Number(data.page || pageNum));
      
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
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
    setExpandedLogs(new Set());
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

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Helper functions
  const toNum = (v: any): number => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeMobile = (m?: string) => (m ? String(m).replace(/\D/g, '') : '');

  // Edit modal state
  const [editing, setEditing] = useState<null | TaxRegistration>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    mobile_number: '',
    aadhaar_number: '' as string | null,
    reference_number: '',
    village: '',
    tax_amount: '' as string,
    amount_paid: '' as string,
    // Additional member fields
    father_name: '',
    education: '',
    occupation: '',
    clan: '',
    group: '',
    address: '',
    birth_date: '',
    pan_number: '',
    postal_code: '',
    male_heirs: '' as string,
    female_heirs: '' as string,
  });
  const [editErrors, setEditErrors] = useState<{
    name?: string;
    mobile_number?: string;
    aadhaar_number?: string;
    reference_number?: string;
    village?: string;
    tax_amount?: string;
    amount_paid?: string;
    father_name?: string;
    education?: string;
    occupation?: string;
    clan?: string;
    group?: string;
    address?: string;
    birth_date?: string;
    pan_number?: string;
    postal_code?: string;
    male_heirs?: string;
    female_heirs?: string;
  }>({});

  // Logs modal state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{
    id: number;
    action: string;
    created_at: string;
    created_by: number | null;
    details: any;
  }>>([]);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, {name: string, username?: string, mobile?: string}>>({});
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  // All Logs (temple scoped) modal state
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<Array<{
    id: number;
    tax_registration_id: number;
    registration_name: string | null;
    registration_ref: string | null;
    action: string;
    created_at: string;
    created_by: number | null;
    details: any;
  }>>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const allLogsPageSize = 50;

  const validateEdit = (field?: keyof typeof editForm, value?: string | null) => {
    const nextErrors: typeof editErrors = { ...editErrors };
    const v = (value ?? (field ? (editForm as any)[field] : undefined)) as string | undefined | null;
    const setErr = (k: keyof typeof editErrors, msg?: string) => {
      if (msg) nextErrors[k] = msg; else delete nextErrors[k];
    };
    const checkField = (k: keyof typeof editForm) => {
      const val = (k === field ? v : (editForm as any)[k]) as any;
      switch (k) {
        case 'name':
          setErr('name', !val || String(val).trim() === '' ? t('Name is required', 'பெயர் தேவை') : undefined);
          break;
        case 'reference_number':
          setErr('reference_number', !val || String(val).trim() === '' ? t('Reference number is required', 'குறிப்பு எண் தேவை') : undefined);
          break;
        case 'mobile_number': {
          const mv = String(val || '').trim();
          if (mv && !/^\d{10}$/.test(mv.replace(/\D/g, ''))) setErr('mobile_number', t('Enter a valid 10-digit mobile number', 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'));
          else setErr('mobile_number');
          break;
        }
        case 'aadhaar_number': {
          const av = String(val || '').trim();
          if (av && !/^\d{12}$/.test(av.replace(/\D/g, ''))) setErr('aadhaar_number', t('Enter a valid 12-digit Aadhaar number', 'சரியான 12 இலக்க ஆதார் எண்ணை உள்ளிடவும்'));
          else setErr('aadhaar_number');
          break;
        }
        case 'tax_amount': {
          const tv = String(val || '').trim();
          if (tv) {
            const n = Number(tv);
            if (!Number.isFinite(n) || n < 0) setErr('tax_amount', t('Tax amount must be a non-negative number', 'வரி தொகை நேர்மறை எண் ஆக இருக்க வேண்டும்'));
            else setErr('tax_amount');
          } else setErr('tax_amount');
          break;
        }
        case 'amount_paid': {
          const pv = String(val || '').trim();
          if (pv) {
            const n = Number(pv);
            const taxN = Number(String((editForm.tax_amount || '').toString()).trim() || '0');
            if (!Number.isFinite(n) || n < 0) setErr('amount_paid', t('Amount paid must be a non-negative number', 'செலுத்திய தொகை நேர்மறை எண் ஆக இருக்க வேண்டும்'));
            else if (Number.isFinite(taxN) && taxN >= 0 && n > taxN) setErr('amount_paid', t('Amount paid cannot exceed tax amount', 'செலுத்திய தொகை வரி தொகையை விட அதிகமாக இருக்க முடியாது'));
            else setErr('amount_paid');
          } else setErr('amount_paid');
          break;
        }
        default:
          break;
      }
    };
    if (field) {
      checkField(field);
    } else {
      (Object.keys(editForm) as Array<keyof typeof editForm>).forEach((k) => checkField(k));
    }
    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => validateEdit();

  const isEditValid = useMemo(() => {
    // Trigger full validation without mutating state for memo calc
    const hasRequired = editForm.name.trim() !== '' && editForm.reference_number.trim() !== '';
    const hasErrors = Object.keys(editErrors).length > 0;
    return hasRequired && !hasErrors;
  }, [editForm.name, editForm.reference_number, editErrors]);

  const openEdit = (row: TaxRegistration) => {
    if (row.id < 0) {
      alert(t('This is an inferred record without a saved tax registration. Create a tax registration first.', 'இது சேமிக்கப்பட்ட வரி பதிவு இல்லாத ஊகிக்கப்பட்ட பதிவு. முதலில் வரி பதிவை உருவாக்கவும்.'));
      return;
    }
    setEditing(row);
    setEditForm({
      name: row.name || '',
      mobile_number: row.mobile_number || '',
      aadhaar_number: row.aadhaar_number ?? '',
      reference_number: row.reference_number || '',
      village: row.village || '',
      tax_amount: (row.tax_amount ?? '').toString(),
      amount_paid: (row.amount_paid ?? '').toString(),
      // Additional member fields
      father_name: row.father_name || '',
      education: row.education || '',
      occupation: row.occupation || '',
      clan: row.clan || '',
      group: row.group || '',
      address: row.address || '',
      birth_date: row.birth_date || '',
      pan_number: row.pan_number || '',
      postal_code: row.postal_code || '',
      male_heirs: (row.male_heirs ?? '').toString(),
      female_heirs: (row.female_heirs ?? '').toString(),
    });
    setEditErrors({});
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      if (!validateAll()) {
        throw new Error(t('Please fix validation errors before saving', 'சேமிக்கும் முன் சரிபார்ப்பு பிழைகளை சரி செய்யவும்'));
      }
      const payload: any = {
        name: editForm.name,
        mobile_number: editForm.mobile_number,
        aadhaar_number: editForm.aadhaar_number || null,
        reference_number: editForm.reference_number,
        village: editForm.village,
        // Additional member fields
        father_name: editForm.father_name,
        education: editForm.education,
        occupation: editForm.occupation,
        clan: editForm.clan,
        group: editForm.group,
        address: editForm.address,
        birth_date: editForm.birth_date,
        pan_number: editForm.pan_number,
        postal_code: editForm.postal_code,
        male_heirs: editForm.male_heirs ? Number(editForm.male_heirs) : undefined,
        female_heirs: editForm.female_heirs ? Number(editForm.female_heirs) : undefined,
      };
      // include numeric fields if provided
      const taxN = editForm.tax_amount?.trim() ? Number(editForm.tax_amount) : undefined;
      const paidN = editForm.amount_paid?.trim() ? Number(editForm.amount_paid) : undefined;
      if (typeof taxN === 'number' && Number.isFinite(taxN)) payload.tax_amount = taxN;
      if (typeof paidN === 'number' && Number.isFinite(paidN)) payload.amount_paid = paidN;
      const res = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update');
      }
      // Refresh list
      await load();
      closeEdit();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleDelete = async (row: TaxRegistration) => {
    if (row.id < 0) {
      alert(t('This is an inferred record without a saved tax registration. Nothing to delete.', 'இது சேமிக்கப்பட்ட வரி பதிவு இல்லாத ஊகிக்கப்பட்ட பதிவு. நீக்க எதுவும் இல்லை.'));
      return;
    }
    const ok = window.confirm(t('Are you sure you want to delete this tax registration?', 'இந்த வரி பதிவை நிச்சயமாக நீக்க விரும்புகிறீர்களா?'));
    if (!ok) return;
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete');
      }
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // Fetch current year's default tax (used for users without a tax registration)
  useEffect(() => {
    const year = new Date().getFullYear();
    (async () => {
      try {
        const res = await fetch(`https://templeapi.agniplay.com/api/tax-settings/year/${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const amt = toNum(data?.data?.tax_amount);
          if (amt > 0) setCurrentYearTax(amt);
        }
      } catch (e) {
        // Failed to load tax settings, fallback to 0
      }
    })();
  }, [token]);

  // Load data (combined view: tax registrations + base registrations)

  const load = async () => {
    setLoading(true);
    try {
      // Get current year's tax amount
      const currentYear = new Date().getFullYear();
      const taxSettingsRes = await fetch(`https://templeapi.agniplay.com/api/tax-settings/year/${currentYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const taxSettings = await taxSettingsRes.json();
      const currentYearTax = taxSettings?.data?.tax_amount ? toNum(taxSettings.data.tax_amount) : 0;

      // Always fetch all tax registrations matching search (no tab filter; we will filter client-side)
      const taxParams = new URLSearchParams({ page: '1', pageSize: '1000' });
      if (search) taxParams.set('search', search);
      const taxRes = await fetch(`https://templeapi.agniplay.com/api/tax-registrations?${taxParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const taxData = await taxRes.json();
      if (!taxRes.ok) throw new Error(taxData.error || 'Failed to load tax registrations');

      const taxRows: TaxRegistration[] = (taxData.data || []).map((r: any) => {
        const tax = toNum(r.tax_amount ?? r.taxAmount ?? r.total_tax ?? r.totalAmount);
        const paid = toNum(r.amount_paid ?? r.amountPaid ?? r.paid_amount ?? r.paidAmount);
        const outstandingRaw = r.outstanding_amount ?? r.outstandingAmount;
        const outstanding = outstandingRaw !== null && outstandingRaw !== undefined
          ? toNum(outstandingRaw)
          : Math.max(0, tax - paid);
        return {
          id: r.id,
          name: r.name,
          mobile_number: r.mobile_number ?? r.mobileNumber,
          aadhaar_number: r.aadhaar_number ?? r.aadhaarNumber ?? null,
          reference_number: r.reference_number ?? r.referenceNumber,
          village: r.village,
          created_at: r.created_at ?? r.createdAt,
          tax_amount: tax,
          amount_paid: paid,
          outstanding_amount: outstanding,
          // Additional member fields
          alternative_name: r.alternative_name,
          wife_name: r.wife_name,
          education: r.education,
          occupation: r.occupation,
          father_name: r.father_name,
          address: r.address,
          birth_date: r.birth_date,
          pan_number: r.pan_number,
          clan: r.clan,
          group: r.group,
          postal_code: r.postal_code,
          male_heirs: r.male_heirs,
          female_heirs: r.female_heirs,
          member_id: r.member_id,
          // Family chain fields - CRITICAL for family identification
          gender: r.gender,
          marital_status: r.marital_status,
          parent_reference_id: r.parent_reference_id,
          family_head_reference: r.family_head_reference,
          relationship_type: r.relationship_type,
          wife_father_name: r.wife_father_name,
        } as TaxRegistration;
      });

      // Fetch base registrations to include users without a tax registration yet
      const regParams = new URLSearchParams({ page: '1', pageSize: '1000' });
      if (search) regParams.set('search', search);
      const regRes = await fetch(`https://templeapi.agniplay.com/api/registrations?${regParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Failed to load registrations');

      // Build a map of users with tax registrations using reference number as key
      const userTaxMap = new Map<string, TaxRegistration>();
      taxRows.forEach((row) => {
        const refNumber = row.reference_number;
        if (refNumber) {
          // Only keep the most recent tax record for each reference number
          const existing = userTaxMap.get(refNumber);
          if (!existing || (row.created_at && existing.created_at && row.created_at > existing.created_at)) {
            userTaxMap.set(refNumber, row);
          }
        }
      });

      // Create synthetic tax rows for base registrations without tax registration
      const synthetic: TaxRegistration[] = [];
      (regData.data || []).forEach((r: any) => {
        const refNumber = r.reference_number ?? r.referenceNumber;
        if (!refNumber) return; // Skip if missing reference number

        // Check if this user has any tax record by reference number
        const hasTax = userTaxMap.has(refNumber);

        if (hasTax) return; // skip if user already has tax record

        const tax = currentYearTax > 0 ? currentYearTax : 0;
        synthetic.push({
          id: -Math.abs(Number(r.id) || Math.floor(Math.random() * 1e9)),
          name: r.name || 'Unknown',
          mobile_number: r.mobile_number ?? r.mobileNumber ?? '',
          aadhaar_number: r.aadhaar_number ?? r.aadhaarNumber ?? null,
          reference_number: refNumber,
          village: r.village ?? '',
          created_at: r.created_at ?? r.createdAt ?? new Date().toISOString(),
          tax_amount: tax,
          amount_paid: 0,
          outstanding_amount: tax,
        });
      });

      // Convert map values to array and combine with synthetic rows
      let merged: TaxRegistration[] = [
        ...Array.from(userTaxMap.values()),
        ...synthetic
      ];

      // Ensure we don't have any duplicates using reference number as primary key
      // and name+mobile as fallback for users without reference numbers
      const seen = new Set<string>();
      merged = merged.filter(row => {
        const refNumber = row.reference_number;
        const name = row.name?.toLowerCase().trim();
        const mobile = normalizeMobile(row.mobile_number);

        // Use reference number as primary key if available
        let key = refNumber;

        // If no reference number, use name+mobile combination
        if (!key && name && mobile) {
          key = `${name}_${mobile}`;
        }

        // Skip if no unique identifier found or already seen
        if (!key || seen.has(key)) return false;

        seen.add(key);
        return true;
      });

      // Calculate counts based on the merged data (after deduplication)
      const totalUsers = merged.length;

      // Separate users into paid and pending
      const paidUsersList = merged.filter((r) => {
        const paid = toNum(r.amount_paid);
        const outstanding = toNum(r.outstanding_amount);
        return paid > 0 && outstanding <= 0;
      });

      const pendingUsersList = merged.filter((r) => {
        const paid = toNum(r.amount_paid);
        const outstanding = toNum(r.outstanding_amount);
        return paid === 0 || outstanding > 0;
      });

      // Set the counts
      setTotalUsers(totalUsers);
      setPaidCount(paidUsersList.length);
      setPendingCount(pendingUsersList.length);

      // Apply tab filter client-side using the pre-filtered lists
      if (statusTab === 'pending') {
        merged = pendingUsersList;
      } else if (statusTab === 'paid') {
        merged = paidUsersList;
      }
      // For 'all' tab, keep the original merged array

      // Apply different sorting based on family filter mode
      if (familyFilter === 'family') {
        // Family Chain mode: sort by family tree hierarchy
        merged.sort((a, b) => {
          const aFamilyHead = a.family_head_reference || '';
          const bFamilyHead = b.family_head_reference || '';
          const aHasFamily = !!(aFamilyHead || a.parent_reference_id);
          const bHasFamily = !!(bFamilyHead || b.parent_reference_id);
          
          if (aHasFamily && !bHasFamily) return -1;
          if (!aHasFamily && bHasFamily) return 1;
          
          if (aFamilyHead !== bFamilyHead) {
            return String(aFamilyHead).localeCompare(String(bFamilyHead));
          }
          
          const aIsHead = a.reference_number && a.family_head_reference === a.reference_number;
          const bIsHead = b.reference_number && b.family_head_reference === b.reference_number;
          if (aIsHead && !bIsHead) return -1;
          if (!aIsHead && bIsHead) return 1;
          
          const aParent = a.parent_reference_id || '';
          const bParent = b.parent_reference_id || '';
          if (aParent !== bParent) {
            return String(aParent).localeCompare(String(bParent));
          }
          
          return String(a.name).localeCompare(String(b.name));
        });
      } else {
        // All Users mode: sort by reference number descending (newest receipt first)
        merged.sort((a, b) => {
          const refA = a.reference_number || '';
          const refB = b.reference_number || '';
          // Extract year and number for proper sorting
          const parseRef = (ref: string) => {
            const match = ref.match(/T-(\d+)-(\d+)/);
            if (match) {
              return { year: parseInt(match[1]), num: parseInt(match[2]) };
            }
            return { year: 0, num: 0 };
          };
          const parsedA = parseRef(refA);
          const parsedB = parseRef(refB);
          // Sort by year desc, then by number desc
          if (parsedB.year !== parsedA.year) {
            return parsedB.year - parsedA.year;
          }
          return parsedB.num - parsedA.num;
        });
      }

      // Client-side pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      // Use the total count from the registrations API for pagination
      setTotal(merged.length);
      setRows(merged.slice(start, end));
    } catch (e) {
      // Failed to load tax registrations
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, statusTab, search, familyFilter]);

  // Export functions
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export PDF');
      }
      const blob = await res.blob();
      downloadBlob(blob, `tax-registration-${id}.pdf`);
    } catch (err) {
      // PDF download failed
      alert((err as Error).message);
    }
  };

  const handleExportAllPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusTab === 'pending') params.set('pending', '1');
      if (statusTab === 'paid') params.set('paid', '1');

      const res = await fetch(
        `https://templeapi.agniplay.com/api/tax-registrations/export/pdf?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export all PDFs');
      }
      const blob = await res.blob();
      downloadBlob(blob, 'tax-registrations.pdf');
    } catch (err) {
      // PDF export failed
      alert((err as Error).message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
      {/* Header */}
        <CardHeader className={theme.card.header}>
          <div className="flex items-center justify-between">
            <CardTitle className={formFieldStyles.tableHeader.title}>
              {t('Tax Registrations', 'வரி பதிவுகள்')}
            </CardTitle>
            <div className="flex items-center gap-2">
              
             
      </div>
          </div>
        </CardHeader>

      {/* Summary Stats */}
      <Card className="mb-3">
        <CardContent className="p-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 shadow-sm">
              <div className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-1">{t('Total Users', 'மொத்த பயனர்கள்')}</div>
              <div className="text-2xl font-black text-orange-900">{totalUsers}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 shadow-sm">
              <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">{t('Paid', 'செலுத்தப்பட்டது')}</div>
              <div className="text-2xl font-black text-emerald-900">{paidCount}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-sm">
              <div className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1">{t('Pending', 'நிலுவை')}</div>
              <div className="text-2xl font-black text-amber-900">{pendingCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search by name/mobile/aadhaar/ref no', 'பெயர்/தொலைபேசி/ஆதார்/குறிப்பு எண் மூலம் தேடுக')}
              className={cn(theme.input.base, theme.input.size.sm, "pl-8")}
            />
          </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded p-0.5">
              {([
                { key: 'all', label: t('All', 'அனைத்தும்') },
                { key: 'pending', label: t('Pending', 'நிலுவை') },
                { key: 'paid', label: t('Paid', 'செலுத்தப்பட்டது') },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setStatusTab(tab.key); setPage(1); }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${statusTab === tab.key
                      ? 'bg-white border border-gray-300 text-gray-900 shadow-sm text-xs'
                      : 'bg-transparent text-gray-600 hover:text-gray-900 text-xs'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Family Chain Filter */}
            <div className="flex items-center gap-1 bg-orange-50 rounded p-0.5 border border-orange-200">
              {([
                { key: 'all', label: t('All Users', 'அனைத்து பயனர்கள்') },
                { key: 'family', label: '👨‍👩‍👧‍👦 ' + t('Family Chain', 'குடும்ப சங்கிலி') },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setFamilyFilter(tab.key); setPage(1); }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${familyFilter === tab.key
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm text-xs'
                      : 'bg-transparent text-orange-700 hover:text-orange-900 text-xs'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions */}
          <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
            <Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => setSearch('')}>
              {t('Clear', 'அழி')}
            </Button>
            <Button size="sm" className="h-8 text-xs" variant="outline" onClick={handleExportAllPdf} disabled={loading || rows.length === 0}>
              <FileDown className="h-3 w-3 mr-1" />
              {t('Export All (PDF)', 'அனைத்தையும் ஏற்றுமதி (PDF)')}
            </Button>
            {canExportPdf && (
              <Button size="sm" className="h-8 text-xs" variant="outline" onClick={handlePrint} disabled={loading || rows.length === 0}>
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
          <Table className={tableClasses.container}>
            <TableHeader className={tableClasses.header}>
              <TableRow className={tableClasses.row}>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <TableHead
                        key={col.key}
                        className={cn(
                          tableClasses.headerCell,
                          col.align === 'right' ? 'text-right' :
                          col.align === 'center' ? 'text-center' :
                          'text-left'
                        )}
                      >
                        {col.label}
                      </TableHead>
                    )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow  className="whitespace-nowrap">
                  <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                    <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">{t('Loading...', 'ஏற்றுகிறது...')}</p>
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                 <TableRow  className="whitespace-nowrap">
                  <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                    {t('No records found', 'பதிவுகள் கிடைக்கவில்லை')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r, index) => (
                  <TableRow key={r.id} className={tableClasses.row}>
                    {visibleCols.sno && (
                      <TableCell className={tableClasses.cellSno}>
                        {(page - 1) * pageSize + index + 1}
                      </TableCell>
                    )}
                    {visibleCols.name && (
                      <TableCell className={tableClasses.cell}>
                        {r.name}
                      </TableCell>
                    )}
                    {visibleCols.mobile_number && (
                      <TableCell className={tableClasses.cell}>
                        {r.mobile_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.aadhaar_number && (
                      <TableCell className={tableClasses.cell}>
                        {r.aadhaar_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.reference_number && (
                      <TableCell className={tableClasses.cell}>
                        {r.reference_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.father_name && (
                      <TableCell className={tableClasses.cell}>
                        {r.father_name || '-'}
                      </TableCell>
                    )}
                    {visibleCols.education && (
                      <TableCell className={tableClasses.cell}>
                        {r.education || '-'}
                      </TableCell>
                    )}
                    {visibleCols.occupation && (
                      <TableCell className={tableClasses.cell}>
                        {r.occupation || '-'}
                      </TableCell>
                    )}
                    {visibleCols.clan && (
                      <TableCell className={tableClasses.cell}>
                        {r.clan || '-'}
                      </TableCell>
                    )}
                    {visibleCols.group && (
                      <TableCell className={tableClasses.cell}>
                        {r.group || '-'}
                      </TableCell>
                    )}
                    {visibleCols.village && (
                      <TableCell className={tableClasses.cell}>
                        {r.village || '-'}
                      </TableCell>
                    )}
                    {visibleCols.address && (
                      <TableCell className={tableClasses.cell}>
                        {r.address || '-'}
                      </TableCell>
                    )}
                    {visibleCols.birth_date && (
                      <TableCell className={tableClasses.cell}>
                        {r.birth_date ? new Date(r.birth_date).toLocaleDateString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}
                      </TableCell>
                    )}
                    {visibleCols.pan_number && (
                      <TableCell className={tableClasses.cell}>
                        {r.pan_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.postal_code && (
                      <TableCell className={tableClasses.cell}>
                        {r.postal_code || '-'}
                      </TableCell>
                    )}
                    {visibleCols.male_heirs && (
                      <TableCell className={cn(tableClasses.cell, 'text-center')}>
                        {r.male_heirs || 0}
                      </TableCell>
                    )}
                    {visibleCols.female_heirs && (
                      <TableCell className={cn(tableClasses.cell, 'text-center')}>
                        {r.female_heirs || 0}
                      </TableCell>
                    )}
                    {visibleCols.member_id && (
                      <TableCell className={cn(tableClasses.cell, 'text-center')}>
                        {r.member_id || '-'}
                      </TableCell>
                    )}
                    {visibleCols.gender && (
                      <TableCell className={tableClasses.cell}>
                        {r.gender === 'male' ? '♂️ Male' : r.gender === 'female' ? '♀️ Female' : '-'}
                      </TableCell>
                    )}
                    {visibleCols.marital_status && (
                      <TableCell className={tableClasses.cell}>
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          r.marital_status === 'married' ? 'bg-green-100 text-green-800' : 
                          r.marital_status === 'unmarried' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        )}>
                          {r.marital_status === 'married' ? '💍 Married' : r.marital_status === 'unmarried' ? 'Single' : '-'}
                        </span>
                      </TableCell>
                    )}
                    {visibleCols.family_chain && (
                      <TableCell className={cn(tableClasses.cell, 'text-center')}>
                        {(() => {
                          // Family chain indicator - debug info
                          const hasParent = !!(r.parent_reference_id && r.parent_reference_id !== 'null' && r.parent_reference_id !== '');
                          const isFamilyHead = !!(r.reference_number && r.family_head_reference && r.family_head_reference === r.reference_number && r.family_head_reference !== 'null');
                          const isInFamily = !!(r.family_head_reference && r.family_head_reference !== 'null' && r.family_head_reference !== '') || hasParent;
                          
                          // Debug logging for first few rows
                          if (r.id <= 25) {
                            console.log(`FamilyChain [${r.name}]: ref=${r.reference_number}, head=${r.family_head_reference}, parent=${r.parent_reference_id}, hasParent=${hasParent}, isHead=${isFamilyHead}`);
                          }
                          
                          if (isFamilyHead) {
                            return (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300" title="Family Head">
                                👑 Head
                              </span>
                            );
                          } else if (hasParent) {
                            return (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300" title={`Parent: ${r.parent_reference_id}`}>
                                🔗 Child
                              </span>
                            );
                          } else if (isInFamily) {
                            return (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                👤 Member
                              </span>
                            );
                          }
                          return <span className="text-gray-400">-</span>;
                        })()}
                      </TableCell>
                    )}
                    {visibleCols.created_at && (
                      <TableCell className={tableClasses.cell}>
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString(language === 'tamil' ? 'ta-IN' : 'en-IN')
                          : '-'}
                      </TableCell>
                    )}
                    {visibleCols.status && (
                      <TableCell className={cn(tableClasses.cell, 'text-center')}>
                        {(() => {
                          const tax = Number(r.tax_amount || 0);
                          const paid = Number(r.amount_paid || 0);
                          const outstanding = Number(r.outstanding_amount ?? Math.max(0, tax - paid));
                          const isPaid = paid > 0 && outstanding <= 0;
                          return (
                            <div className="flex flex-col items-center">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}
                              >
                                {isPaid ? t('Paid', 'செலுத்தப்பட்டது') : t('Pending', 'நிலுவை')}
                              </span>
                              <span className="text-[9px] text-gray-500 mt-0.5">
                                {paid.toFixed(0)} / {tax.toFixed(0)}
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                    )}
                    {visibleCols.actions && (
                      <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPdf(r.id)}
                            className={tableClasses.actionButtonSecondary}
                          >
                            {t('PDF', 'PDF')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(r)}
                            disabled={r.id < 0}
                            className={tableClasses.actionButtonPrimary}
                          >
                            {t('Edit', 'திருத்து')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(r)}
                            disabled={r.id < 0}
                            className={r.id >= 0 ? tableClasses.actionButtonDanger : 'opacity-50 cursor-not-allowed'}
                            title={t('Delete', 'நீக்கு')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      </div> {/* Close scrollContainerWrapper here */}

        {/* Footer */}
        <div className={tableClasses.pagination}>
          <div className="text-xs text-gray-700 flex flex-wrap gap-4">
            <span>
              {t('Showing', 'காட்டப்படுகிறது')} {(page - 1) * pageSize + 1} {t('to', 'இலிருந்து')} {Math.min(page * pageSize, total)} {t('of', 'மொத்தம்')} <span className="font-medium">{total}</span> {t('results', 'முடிவுகள்')}
            </span>
            <span>| {t('Total', 'மொத்தம்')}: <span className="font-medium">{total}</span></span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={tableClasses.paginationButton}
            >
              {t('Previous', 'முந்தைய')}
            </Button>
            <span className="text-xs flex items-center">
              {t('Page', 'பக்கம்')} {page} {t('of', 'இல்')} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={tableClasses.paginationButton}
            >
              {t('Next', 'அடுத்தது')}
            </Button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="ml-auto border rounded px-2 py-0.5 text-xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className={formFieldStyles.moneyDonationList.contextMenu.container}
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className={formFieldStyles.moneyDonationList.contextMenu.header}>
            <h3 className={formFieldStyles.moneyDonationList.contextMenu.title}>{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className={formFieldStyles.moneyDonationList.contextMenu.subtitle}>
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
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
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {t('Reset', 'மீட்டமை')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={formFieldStyles.moneyDonationList.contextMenu.closeButton}
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
          </div>
        </div>
      )}

      {/* All Logs Modal (temple scoped) */}
      {allLogsOpen && (
        <div className={formFieldStyles.moneyDonationList.modal.overlay}>
          <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-6xl mx-4">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-6 rounded-t-lg">
              <div className={formFieldStyles.moneyDonationList.modal.header}>
                <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('All Tax Registration Logs', 'அனைத்து வரி பதிவுகள் பதிவுகள்')}</h2>
                <Button variant="ghost" className={formFieldStyles.moneyDonationList.modal.closeButton} onClick={closeAllLogs}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {allLogsLoading ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}
                  </div>
                ) : (
                  <>
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
                              {t('Reg ID', 'பதிவு ஐடி')}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {t('Name', 'பெயர்')}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {t('Ref No', 'குறிப்பு எண்')}
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
                              <td className={formFieldStyles.moneyDonationList.logsTable.tdCenter} colSpan={7}>
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
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.tax_registration_id}</td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.registration_name ?? '-'}</td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.registration_ref ?? '-'}</td>
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
                                  return userId || '-';
                                })()}
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                <div className="text-sm text-gray-600 max-w-md">
                                  {(() => {
                                    const isExpanded = expandedLogs.has(lg.id);
                                    const hasAmountInfo = lg.details && (
                                      lg.details.tax_amount || lg.details.taxAmount || 
                                      lg.details.amount_paid || lg.details.amountPaid ||
                                      lg.details.outstanding_amount || lg.details.outstandingAmount
                                    );
                                    
                                    // Check for before/after amount details in update logs
                                    const hasBeforeAfterAmounts = lg.action === 'update' && lg.details.before && lg.details.after && (
                                      (lg.details.before.tax_amount || lg.details.before.taxAmount) ||
                                      (lg.details.before.amount_paid || lg.details.before.amountPaid) ||
                                      (lg.details.after.tax_amount || lg.details.after.taxAmount) ||
                                      (lg.details.after.amount_paid || lg.details.after.amountPaid)
                                    );
                                    
                                    return (
                                      <div className="space-y-2">
                                        {/* Compact amount display */}
                                        {hasBeforeAfterAmounts ? (
                                          <div className="space-y-2">
                                            {/* Reference ID */}
                                            {(lg.details.before.reference_number || lg.details.after.reference_number) && (
                                              <div className="text-xs text-gray-600 mb-2">
                                                <span className="font-medium">{t('Reference', 'குறிப்பு')}:</span> {lg.details.after.reference_number || lg.details.before.reference_number}
                                              </div>
                                            )}
                                            
                                            {/* Before Amount Details */}
                                            {(() => {
                                              const beforeAmounts = {
                                                tax_amount: lg.details.before.tax_amount || lg.details.before.taxAmount,
                                                amount_paid: lg.details.before.amount_paid || lg.details.before.amountPaid,
                                                outstanding_amount: lg.details.before.outstanding_amount || lg.details.before.outstandingAmount
                                              };
                                              if (beforeAmounts.tax_amount || beforeAmounts.amount_paid || beforeAmounts.outstanding_amount !== undefined) {
                                                return (
                                                  <div className="bg-red-50 p-2 rounded border text-xs">
                                                    <div className="font-medium text-red-700 mb-1">{t('Before Amount Details', 'முன் தொகை விவரங்கள்')}</div>
                                                    <div className="space-y-1">
                                                      <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(beforeAmounts.tax_amount)}</div>
                                                      <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(beforeAmounts.amount_paid)}</div>
                                                      {beforeAmounts.outstanding_amount !== undefined && (
                                                        <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(beforeAmounts.outstanding_amount)}</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                            
                                            {/* After Amount Details */}
                                            {(() => {
                                              const afterAmounts = {
                                                tax_amount: lg.details.after.tax_amount || lg.details.after.taxAmount,
                                                amount_paid: lg.details.after.amount_paid || lg.details.after.amountPaid,
                                                outstanding_amount: lg.details.after.outstanding_amount || lg.details.after.outstandingAmount
                                              };
                                              if (afterAmounts.tax_amount || afterAmounts.amount_paid || afterAmounts.outstanding_amount !== undefined) {
                                                return (
                                                  <div className="bg-green-50 p-2 rounded border text-xs">
                                                    <div className="font-medium text-green-700 mb-1">{t('After Amount Details', 'பின் தொகை விவரங்கள்')}</div>
                                                    <div className="space-y-1">
                                                      <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(afterAmounts.tax_amount)}</div>
                                                      <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(afterAmounts.amount_paid)}</div>
                                                      {afterAmounts.outstanding_amount !== undefined && (
                                                        <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(afterAmounts.outstanding_amount)}</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        ) : hasAmountInfo && (
                                          <div className="text-xs text-gray-600">
                                            {getAmountInfo(lg.details, true)}
                                          </div>
                                        )}
                                        
                                        {/* View All button */}
                                        <button
                                          onClick={() => toggleLogExpansion(lg.id)}
                                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {isExpanded ? t('Hide Details', 'விவரங்களை மறை') : t('View All', 'அனைத்தையும் பார்')}
                                        </button>
                                        
                                        {/* Expanded details */}
                                        {isExpanded && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded border text-xs">
                                            {formatLogDetails(lg.action, lg.details, lg.created_by)}
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
                        {t('Total', 'மொத்தம்')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{allLogsTotal}</span>
                      </div>
                      <div className={formFieldStyles.moneyDonationList.pagination.controls}>
                        <Button variant="outline" disabled={allLogsPage <= 1} onClick={() => loadAllLogs(allLogsPage - 1)} className={formFieldStyles.moneyDonationList.pagination.button}>
                          {t('Previous', 'முந்தைய')}
                        </Button>
                        <span className="text-sm text-gray-600">{t('Page', 'பக்கம்')} {allLogsPage}</span>
                        <Button variant="outline" disabled={allLogsPage * allLogsPageSize >= allLogsTotal} onClick={() => loadAllLogs(allLogsPage + 1)} className={formFieldStyles.moneyDonationList.pagination.button}>
                          {t('Next', 'அடுத்தது')}
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

      {/* Logs Modal */}
      {logsFor !== null && (
        <div className={formFieldStyles.moneyDonationList.modal.overlay}>
          <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeLogs} />
          <div className={formFieldStyles.moneyDonationList.modal.container}>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-6 rounded-t-lg">
              <div className={formFieldStyles.moneyDonationList.modal.header}>
                <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('Activity Log', 'செயல்பாட்டு பதிவு')} #{logsFor}</h2>
                <Button variant="ghost" className={formFieldStyles.moneyDonationList.modal.closeButton} onClick={closeLogs}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {logsLoading ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}
                  </div>
                ) : logs.length === 0 ? (
                  <div className={formFieldStyles.moneyDonationList.modal.loading}>
                    {t('No logs found for this registration.', 'இந்த பதிவுக்கான பதிவுகள் கிடைக்கவில்லை.')}
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
                                return userId || '-';
                              })()}
                            </td>
                            <td className="py-3 px-4 border-b">
                              <div className="text-sm text-gray-600 max-w-md">
                                {(() => {
                                  const isExpanded = expandedLogs.has(lg.id);
                                  const hasAmountInfo = lg.details && (
                                    lg.details.tax_amount || lg.details.taxAmount || 
                                    lg.details.amount_paid || lg.details.amountPaid ||
                                    lg.details.outstanding_amount || lg.details.outstandingAmount
                                  );
                                  
                                  // Check for before/after amount details in update logs
                                  const hasBeforeAfterAmounts = lg.action === 'update' && lg.details.before && lg.details.after && (
                                    (lg.details.before.tax_amount || lg.details.before.taxAmount) ||
                                    (lg.details.before.amount_paid || lg.details.before.amountPaid) ||
                                    (lg.details.after.tax_amount || lg.details.after.taxAmount) ||
                                    (lg.details.after.amount_paid || lg.details.after.amountPaid)
                                  );
                                  
                                  return (
                                    <div className="space-y-2">
                                      {/* Compact amount display */}
                                      {hasBeforeAfterAmounts ? (
                                        <div className="space-y-2">
                                          {/* Reference ID */}
                                          {(lg.details.before.reference_number || lg.details.after.reference_number) && (
                                            <div className="text-xs text-gray-600 mb-2">
                                              <span className="font-medium">{t('Reference', 'குறிப்பு')}:</span> {lg.details.after.reference_number || lg.details.before.reference_number}
                                            </div>
                                          )}
                                          
                                          {/* Before Amount Details */}
                                          {(() => {
                                            const beforeAmounts = {
                                              tax_amount: lg.details.before.tax_amount || lg.details.before.taxAmount,
                                              amount_paid: lg.details.before.amount_paid || lg.details.before.amountPaid,
                                              outstanding_amount: lg.details.before.outstanding_amount || lg.details.before.outstandingAmount
                                            };
                                            if (beforeAmounts.tax_amount || beforeAmounts.amount_paid || beforeAmounts.outstanding_amount !== undefined) {
                                              return (
                                                <div className="bg-red-50 p-2 rounded border text-xs">
                                                  <div className="font-medium text-red-700 mb-1">{t('Before Amount Details', 'முன் தொகை விவரங்கள்')}</div>
                                                  <div className="space-y-1">
                                                    <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(beforeAmounts.tax_amount)}</div>
                                                    <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(beforeAmounts.amount_paid)}</div>
                                                    {beforeAmounts.outstanding_amount !== undefined && (
                                                      <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(beforeAmounts.outstanding_amount)}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                          
                                          {/* After Amount Details */}
                                          {(() => {
                                            const afterAmounts = {
                                              tax_amount: lg.details.after.tax_amount || lg.details.after.taxAmount,
                                              amount_paid: lg.details.after.amount_paid || lg.details.after.amountPaid,
                                              outstanding_amount: lg.details.after.outstanding_amount || lg.details.after.outstandingAmount
                                            };
                                            if (afterAmounts.tax_amount || afterAmounts.amount_paid || afterAmounts.outstanding_amount !== undefined) {
                                              return (
                                                <div className="bg-green-50 p-2 rounded border text-xs">
                                                  <div className="font-medium text-green-700 mb-1">{t('After Amount Details', 'பின் தொகை விவரங்கள்')}</div>
                                                  <div className="space-y-1">
                                                    <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(afterAmounts.tax_amount)}</div>
                                                    <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(afterAmounts.amount_paid)}</div>
                                                    {afterAmounts.outstanding_amount !== undefined && (
                                                      <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(afterAmounts.outstanding_amount)}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                      ) : hasAmountInfo && (
                                        <div className="text-xs text-gray-600">
                                          {getAmountInfo(lg.details, true)}
                                        </div>
                                      )}
                                      
                                      {/* View All button */}
                                      <button
                                        onClick={() => toggleLogExpansion(lg.id)}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                      >
                                        {isExpanded ? t('Hide Details', 'விவரங்களை மறை') : t('View All', 'அனைத்தையும் பார்')}
                                      </button>
                                      
                                      {/* Expanded details */}
                                      {isExpanded && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded border text-xs">
                                          {formatLogDetails(lg.action, lg.details, lg.created_by)}
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

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative bg-white rounded shadow-lg w-full max-w-md mx-2 p-3">
            <h2 className="text-sm font-semibold mb-2">{t('Edit Tax Registration', 'வரி பதிவை திருத்து')}</h2>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label className="text-xs">{t('Name', 'பெயர்')}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => { setEditForm({ ...editForm, name: e.target.value }); validateEdit('name', e.target.value); }}
                  onBlur={(e) => validateEdit('name', e.target.value)}
                  className={`text-xs py-1 ${editErrors.name ? 'border-red-500' : ''}`}
                />
                {editErrors.name && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.name}</p>}
              </div>
              <div>
                <Label className="text-xs">{t('Mobile', 'தொலைபேசி')}</Label>
                <Input
                  value={editForm.mobile_number}
                  onChange={(e) => { setEditForm({ ...editForm, mobile_number: e.target.value }); validateEdit('mobile_number', e.target.value); }}
                  onBlur={(e) => validateEdit('mobile_number', e.target.value)}
                  className={`text-xs py-1 ${editErrors.mobile_number ? 'border-red-500' : ''}`}
                />
                {editErrors.mobile_number && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.mobile_number}</p>}
              </div>
              <div>
                <Label className="text-xs">{t('Aadhaar', 'ஆதார்')}</Label>
                <Input
                  value={editForm.aadhaar_number ?? ''}
                  onChange={(e) => { setEditForm({ ...editForm, aadhaar_number: e.target.value }); validateEdit('aadhaar_number', e.target.value); }}
                  onBlur={(e) => validateEdit('aadhaar_number', e.target.value)}
                  className={`text-xs py-1 ${editErrors.aadhaar_number ? 'border-red-500' : ''}`}
                />
                {editErrors.aadhaar_number && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.aadhaar_number}</p>}
              </div>
              <div>
                <Label className="text-xs">{t('Reference Number', 'குறிப்பு எண்')}</Label>
                <Input
                  value={editForm.reference_number}
                  onChange={(e) => { setEditForm({ ...editForm, reference_number: e.target.value }); validateEdit('reference_number', e.target.value); }}
                  onBlur={(e) => validateEdit('reference_number', e.target.value)}
                  className={`text-xs py-1 ${editErrors.reference_number ? 'border-red-500' : ''}`}
                />
                {editErrors.reference_number && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.reference_number}</p>}
              </div>
              <div>
                <Label className="text-xs">{t('Village', 'கிராமம்')}</Label>
                <Input value={editForm.village} onChange={(e) => setEditForm({ ...editForm, village: e.target.value })} className="text-xs py-1" />
              </div>
              <div>
                <Label className="text-xs">{t('Father Name', 'தந்தை பெயர்')}</Label>
                <Input value={editForm.father_name} onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })} className="text-xs py-1" />
              </div>
              <div>
                <Label className="text-xs">{t('Education', 'கல்வி')}</Label>
                <Input value={editForm.education} onChange={(e) => setEditForm({ ...editForm, education: e.target.value })} className="text-xs py-1" />
              </div>
              <div>
                <Label className="text-xs">{t('Occupation', 'தொழில்')}</Label>
                <Input value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} className="text-xs py-1" />
              </div>
              <div>
                <Label className="text-xs">{t('Address', 'முகவரி')}</Label>
                <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="text-xs py-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t('Tax Amount', 'வரி தொகை')}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={editForm.tax_amount}
                    onChange={(e) => { setEditForm({ ...editForm, tax_amount: e.target.value }); validateEdit('tax_amount', e.target.value); }}
                    onBlur={(e) => validateEdit('tax_amount', e.target.value)}
                    className={`text-xs py-1 ${editErrors.tax_amount ? 'border-red-500' : ''}`}
                  />
                  {editErrors.tax_amount && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.tax_amount}</p>}
                </div>
                <div>
                  <Label className="text-xs">{t('Amount Paid', 'செலுத்திய தொகை')}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={editForm.amount_paid}
                    onChange={(e) => { setEditForm({ ...editForm, amount_paid: e.target.value }); validateEdit('amount_paid', e.target.value); }}
                    onBlur={(e) => validateEdit('amount_paid', e.target.value)}
                    className={`text-xs py-1 ${editErrors.amount_paid ? 'border-red-500' : ''}`}
                  />
                  {editErrors.amount_paid && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.amount_paid}</p>}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" className="text-xs py-1 px-2" onClick={closeEdit}>{t('Cancel', 'ரத்து செய்')}</Button>
              <Button className="text-xs py-1 px-2" onClick={saveEdit} disabled={!isEditValid}>{t('Save', 'சேமிக்க')}</Button>
            </div>
          </div>
        </div>
      )}
      </Card>
    </div>
  );
}