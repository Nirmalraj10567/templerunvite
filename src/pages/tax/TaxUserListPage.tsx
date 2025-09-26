import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown } from 'lucide-react';

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
};

export default function TaxUserListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TaxRegistration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'paid'>('all');
  const [currentYearTax, setCurrentYearTax] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [paidCount, setPaidCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Column Keys
  type ColKey = 'name' | 'mobile_number' | 'aadhaar_number' | 'reference_number' | 'village' | 'created_at' | 'status' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'mobile_number', label: t('Mobile', 'தொலைபேசி') },
    { key: 'aadhaar_number', label: t('Aadhaar', 'ஆதார்') },
    { key: 'reference_number', label: t('Ref No', 'குறிப்பு எண்') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'created_at', label: t('Created', 'உருவாக்கப்பட்டது') },
    { key: 'status', label: t('Status', 'நிலை'), align: 'center' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'tax_user_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    name: true,
    mobile_number: true,
    aadhaar_number: true,
    reference_number: true,
    village: true,
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
      const res = await fetch(`http://localhost:4000/api/tax-registrations/${row.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load logs');
      setLogs(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      alert((e as Error).message);
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
    await loadAllLogs(1);
  };

  const loadAllLogs = async (pageNum: number) => {
    setAllLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), pageSize: String(allLogsPageSize) });
      const res = await fetch(`http://localhost:4000/api/tax-registrations/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load logs');
      setAllLogs(Array.isArray(data.data) ? data.data : []);
      setAllLogsTotal(Number(data.total || 0));
      setAllLogsPage(Number(data.page || pageNum));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
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
  });
  const [editErrors, setEditErrors] = useState<{
    name?: string;
    mobile_number?: string;
    aadhaar_number?: string;
    reference_number?: string;
    village?: string;
    tax_amount?: string;
    amount_paid?: string;
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
      };
      // include numeric fields if provided
      const taxN = editForm.tax_amount?.trim() ? Number(editForm.tax_amount) : undefined;
      const paidN = editForm.amount_paid?.trim() ? Number(editForm.amount_paid) : undefined;
      if (typeof taxN === 'number' && Number.isFinite(taxN)) payload.tax_amount = taxN;
      if (typeof paidN === 'number' && Number.isFinite(paidN)) payload.amount_paid = paidN;
      const res = await fetch(`http://localhost:4000/api/tax-registrations/${editing.id}`, {
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
      const res = await fetch(`http://localhost:4000/api/tax-registrations/${row.id}`, {
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
        const res = await fetch(`http://localhost:4000/api/tax-settings/year/${year}`, {
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
      const taxSettingsRes = await fetch(`http://localhost:4000/api/tax-settings/year/${currentYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const taxSettings = await taxSettingsRes.json();
      const currentYearTax = taxSettings?.data?.tax_amount ? toNum(taxSettings.data.tax_amount) : 0;

      // Always fetch all tax registrations matching search (no tab filter; we will filter client-side)
      const taxParams = new URLSearchParams({ page: '1', pageSize: '1000' });
      if (search) taxParams.set('search', search);
      const taxRes = await fetch(`http://localhost:4000/api/tax-registrations?${taxParams.toString()}`, {
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
        } as TaxRegistration;
      });

      // Fetch base registrations to include users without a tax registration yet
      const regParams = new URLSearchParams({ page: '1', pageSize: '1000' });
      if (search) regParams.set('search', search);
      const regRes = await fetch(`http://localhost:4000/api/registrations?${regParams.toString()}`, {
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

      // Sort by created_at desc (fallback name)
      merged.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da || String(a.name).localeCompare(String(b.name));
      });

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
  }, [page, pageSize, statusTab, search]);

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
      const res = await fetch(`http://localhost:4000/api/tax-registrations/${id}/pdf`, {
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
        `http://localhost:4000/api/tax-registrations/export/pdf?${params.toString()}`,
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
    <div className="p-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 px-1">
        <h1 className="text-lg font-bold text-gray-800">{t('Tax Registrations', 'வரி பதிவுகள்')}</h1>
      </div>

      {/* Summary Stats */}
      <Card className="mb-3">
        <CardContent className="p-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="text-[11px] text-blue-700 font-medium">{t('Total Users', 'மொத்த பயனர்கள்')}</div>
              <div className="text-lg font-bold text-blue-900">{totalUsers}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="text-[11px] text-green-700 font-medium">{t('Paid', 'செலுத்தப்பட்டது')}</div>
              <div className="text-lg font-bold text-green-900">{paidCount}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <div className="text-[11px] text-yellow-700 font-medium">{t('Pending', 'நிலுவை')}</div>
              <div className="text-lg font-bold text-yellow-900">{pendingCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-3">
        <CardContent className="p-2">
          <div className="flex flex-col md:flex-row gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search by name/mobile/aadhaar/ref no', 'பெயர்/தொலைபேசி/ஆதார்/குறிப்பு எண் மூலம் தேடுக')}
                className="pl-8 text-sm py-1"
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

            {/* Actions */}
            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              <Button onClick={load} className="text-xs py-1 px-2">{t('Search', 'தேடு')}</Button>
              <Button variant="outline" onClick={() => setSearch('')} className="text-xs py-1 px-2">
                {t('Clear', 'அழி')}
              </Button>
              <Button variant="outline" onClick={openAllLogs} className="text-xs py-1 px-2">
                {t('All Logs', 'அனைத்து பதிவுகள்')}
              </Button>
              <Button variant="outline" onClick={handleExportAllPdf} className="text-xs py-1 px-2">
                <FileDown className="h-3 w-3 mr-1" />
                {t('Export All (PDF)', 'அனைத்தையும் ஏற்றுமதி (PDF)')}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="text-xs py-1 px-2">
                <FileDown className="h-3 w-3 mr-1" />
                {t('Export PDF', 'PDF ஏற்றுமதி')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div
        className="bg-white rounded border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto text-xs max-h-[50vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider ${col.align === 'right'
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

      {/* All Logs Modal (temple scoped) */}
      {allLogsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeAllLogs} />
          <div className="relative bg-white rounded shadow-lg w-full max-w-5xl mx-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">{t('All Tax Registration Logs', 'அனைத்து வரி பதிவுகள் பதிவுகள்')}</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="text-xs py-1 px-2" onClick={closeAllLogs}>{t('Close', 'மூடு')}</Button>
              </div>
            </div>
            {allLogsLoading ? (
              <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</div>
            ) : (
              <>
                <div className="max-h-[70vh] overflow-y-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                        <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                        <th className="text-left px-2 py-1">{t('Reg ID', 'பதிவு ஐடி')}</th>
                        <th className="text-left px-2 py-1">{t('Name', 'பெயர்')}</th>
                        <th className="text-left px-2 py-1">{t('Ref No', 'குறிப்பு எண்')}</th>
                        <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                        <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLogs.length === 0 ? (
                        <tr>
                          <td className="px-2 py-2 text-center text-gray-500" colSpan={7}>{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td>
                        </tr>
                      ) : allLogs.map((lg) => (
                        <tr key={lg.id} className="border-t align-top">
                          <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                          <td className="px-2 py-1">{lg.action}</td>
                          <td className="px-2 py-1">{lg.tax_registration_id}</td>
                          <td className="px-2 py-1">{lg.registration_name ?? '-'}</td>
                          <td className="px-2 py-1">{lg.registration_ref ?? '-'}</td>
                          <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                          <td className="px-2 py-1">
                            <pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">
{JSON.stringify(lg.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <div className="text-gray-700">{t('Total', 'மொத்தம்')}: <span className="font-medium">{allLogsTotal}</span></div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={allLogsPage <= 1} onClick={() => loadAllLogs(allLogsPage - 1)} className="text-xs py-1 px-2">{t('Previous', 'முந்தைய')}</Button>
                    <span>{t('Page', 'பக்கம்')} {allLogsPage}</span>
                    <Button variant="outline" disabled={allLogsPage * allLogsPageSize >= allLogsTotal} onClick={() => loadAllLogs(allLogsPage + 1)} className="text-xs py-1 px-2">{t('Next', 'அடுத்தது')}</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-2 py-2 text-center text-xs text-gray-500"
                  >
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-2 py-2 text-center text-xs text-gray-500"
                  >
                    {t('No records found', 'பதிவுகள் கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols.name && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.name}
                      </TableCell>
                    )}
                    {visibleCols.mobile_number && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.mobile_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.aadhaar_number && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.aadhaar_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.reference_number && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.reference_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.village && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.village || '-'}
                      </TableCell>
                    )}
                    {visibleCols.created_at && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString(language === 'tamil' ? 'ta-IN' : 'en-IN')
                          : '-'}
                      </TableCell>
                    )}
                    {visibleCols.status && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs text-center">
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
                                ₹{paid.toFixed(0)} / ₹{tax.toFixed(0)}
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                    )}
                    {visibleCols.actions && (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs font-medium text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(r.id)}
                          className="text-xs py-0.5 px-1.5 h-auto"
                        >
                          {t('PDF', 'PDF')}
                        </Button>
                        <div className="inline-flex gap-1 ml-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLogs(r)}
                            disabled={r.id < 0}
                            className="text-xs py-0.5 px-1.5 h-auto"
                          >
                            {t('Logs', 'பதிவுகள்')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(r)}
                            disabled={r.id < 0}
                            className="text-xs py-0.5 px-1.5 h-auto"
                          >
                            {t('Edit', 'திருத்து')}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(r)}
                            disabled={r.id < 0}
                            className="text-xs py-0.5 px-1.5 h-auto"
                          >
                            {t('Delete', 'நீக்கு')}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-gray-200 text-xs">
          <div className="text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{(page - 1) * pageSize + 1}</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{Math.min(page * pageSize, total)}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{total}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="text-gray-700">
            {t('Total', 'மொத்தம்')}: <span className="font-medium">{total}</span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 mt-2 text-xs">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="text-xs py-1 px-2"
        >
          {t('Previous', 'முந்தைய')}
        </Button>
        <span className="text-xs">
          {t('Page', 'பக்கம்')} {page} {t('of', 'இல்')} {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="text-xs py-1 px-2"
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
              className="text-xs py-0.5 px-1.5 h-auto"
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
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {t('Reset', 'மீட்டமை')}
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

      {/* Logs Modal */}
      {logsFor !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeLogs} />
          <div className="relative bg-white rounded shadow-lg w-full max-w-2xl mx-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">{t('Change Logs', 'மாற்றுப் பதிவுகள்')} #{logsFor}</h2>
              <Button variant="ghost" className="text-xs py-1 px-2" onClick={closeLogs}>{t('Close', 'மூடு')}</Button>
            </div>
            {logsLoading ? (
              <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</div>
            ) : logs.length === 0 ? (
              <div className="p-3 text-xs text-gray-600">{t('No logs found for this registration.', 'இந்த பதிவுக்கான பதிவுகள் கிடைக்கவில்லை.')}</div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                      <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                      <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                      <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((lg) => (
                      <tr key={lg.id} className="border-t">
                        <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                        <td className="px-2 py-1">{lg.action}</td>
                        <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                        <td className="px-2 py-1">
                          <pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border">
{JSON.stringify(lg.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
    </div>
  );
}