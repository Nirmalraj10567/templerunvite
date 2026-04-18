'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Member } from '@/types/member';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FileDown, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';

interface Props {
  members: Member[];
  searchTerm: string;
  filterRole: string;
  canEditMembers: boolean;
  canDeleteMembers: boolean;
  canBlockMembers: boolean;
  canResetPasswords: boolean;
  currentPage: number;
  totalPages: number;
  totalMembers: number;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => Promise<void>;
  onBlock: (id: number, userId: number) => Promise<void>;
  onUnblock: (id: number, userId: number) => Promise<void>;
  onResetPassword: (id: number) => Promise<void>;
  onSearch: (term: string) => void;
  onFilter: (role: string) => void;
  onPageChange: (page: number) => void;
}

// Column Keys
type ColKey = 'name' | 'username' | 'mobile' | 'email' | 'role' | 'status' | 'actions';

export default function MemberListView({
  members,
  searchTerm,
  filterRole,
  canEditMembers,
  canDeleteMembers,
  canBlockMembers,
  canResetPasswords,
  currentPage,
  totalPages,
  totalMembers,
  onEdit,
  onDelete,
  onBlock,
  onUnblock,
  onResetPassword,
  onSearch,
  onFilter,
  onPageChange
}: Props) {
  const { language } = useLanguage();
  const { token } = useAuth();
  const t = (en: string, ta: string) => language === 'english' ? ta : en;

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'username', label: t('Username', 'பயனர் பெயர்') },
    { key: 'mobile', label: t('Mobile', 'மொபைல்') },
    { key: 'email', label: t('Email', 'மின்னஞ்சல்') },
    { key: 'role', label: t('Role', 'பங்கு'), align: 'center' },
    { key: 'status', label: t('Status', 'நிலை'), align: 'center' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'member_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    name: true,
    username: true,
    mobile: true,
    email: true,
    role: true,
    status: true,
    actions: canEditMembers || canDeleteMembers || canBlockMembers || canResetPasswords,
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

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  const handleExportPdf = async () => {
    // Add your PDF export logic here
    console.log('Exporting members to PDF...');
  };

  const handlePrint = () => {
    window.print();
  };

  // Permissions editor state
  const [permEditorOpen, setPermEditorOpen] = useState(false);
  const [permMember, setPermMember] = useState<Member | null>(null);
  const [permItems, setPermItems] = useState<Array<{ id: string; access: 'view' | 'edit' | 'full' }>>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [permLoading, setPermLoading] = useState(false);

  // Permission labels (Tamil) for display parity with MemberEntryPage
  const PERMISSION_OPTIONS_TAMIL: Record<string, { label: string; description: string }> = {
    dashboard: { label: 'டாஷ்போர்டு', description: 'ஒதுக்கீடுகள், சுருக்கங்கள் மற்றும் விரைவான அணுகல்கள்' },
    member_entry: { label: 'உறுப்பினர்கள்', description: 'உறுப்பினர்களை பார்க்கவும், நிர்வகிக்கவும்' },
    master_data: { label: 'மாஸ்டர் தரவு', description: 'குழுக்கள், குலங்கள், தொழில்கள், கிராமங்கள், கல்வி பட்டங்கள் மேலாண்மை' },
    ledger_management: { label: 'இருப்பு மேலாண்மை', description: 'நிதி பதிவுகள் மற்றும் பரிவர்த்தனைகள் மேலாண்மை' },
    reports: { label: 'அறிக்கைகள்', description: 'நிதி மற்றும் செயல்பாட்டு அறிக்கைகளைப் பார்க்கவும்' },
    balance_sheet: { label: 'இருப்பு அட்டவணை', description: 'இருப்பு அட்டவணையைப் பார்க்கவும்' },
    setting: { label: 'பொது அமைப்புகள்', description: 'பொது அமைப்புகளுக்கு அணுகல்' },
    pdf_settings: { label: 'PDF அமைப்புகள்', description: 'PDF ஏற்றுமதி அமைப்புகள் மேலாண்மை' },
    user_registrations: { label: 'பயனர் பதிவுகள்', description: 'கோவில் போர்ட்டல் பயனர்களை நிர்வகிக்கவும்' },
    tax_registrations: { label: 'வரி பதிவுகள்', description: 'வரி மாட்யூல் பதிவுகளை நிர்வகிக்கவும்' },
    property_registrations: { label: 'சொத்துக்கள்', description: 'கோவில் சொத்துக்களை நிர்வகிக்கவும்' },
    view_donations: { label: 'நன்கொடை - பார்வை', description: 'நன்கொடை பொருட்கள் மற்றும் பதிவுகளைப் பார்க்கவும்' },
    edit_donations: { label: 'நன்கொடை - தொகு', description: 'நன்கொடை பொருட்கள் மற்றும் பதிவுகளை உருவாக்க/தொகுக்கவும்' },
    donation_approval: { label: 'நன்கொடை அனுமதி', description: 'மொபைல் ஆப்பிலிருந்து சமர்ப்பிக்கப்பட்ட நன்கொடைகளை அனுமதிக்கவும்' },
    view_events: { label: 'நிகழ்வுகள் - பார்வை', description: 'நிகழ்வுகள் மற்றும் நாட்காட்டிகளைப் பார்க்கவும்' },
    edit_events: { label: 'நிகழ்வுகள் - தொகு', description: 'நிகழ்வுகளை உருவாக்க/தொகுக்கவும்' },
    pooja_registrations: { label: 'பூஜை பதிவுகள்', description: 'பூஜைகளை உருவாக்க, தொகு, பார்க்கவும்' },
    pooja_mobile_submit: { label: 'பூஜை மொபைல் கோரிக்கைகள்', description: 'எனது பூஜை கோரிக்கைகளை சமர்ப்பி/பார்க்கவும்' },
    pooja_approval: { label: 'பூஜை அனுமதி', description: 'பூஜை கோரிக்கைகளை அனுமதிக்கவும்' },
    annadhanam_registrations: { label: 'அன்னதானம்', description: 'அன்னதான பதிவுகளை உருவாக்க, தொகு, பார்க்கவும்' },
    annadhanam_approval: { label: 'அன்னதான அனுமதி', description: 'அன்னதான கோரிக்கைகளை அனுமதிக்கவும்' },
    hall_booking: { label: 'மண்டப முன்பதிவு', description: 'மண்டப முன்பதிவுகளை உருவாக்க/தொகுக்கவும்' },
    hall_approval: { label: 'மண்டப அனுமதி', description: 'மண்டப முன்பதிவுகளை அனுமதிக்கவும்' },
    marriage_register: { label: 'திருமண பதிவேடு', description: 'திருமண/மண்டப பட்டியல்களுக்கு அணுகல்' },
    session_management: { label: 'அமர்வு மேலாண்மை', description: 'செயலில் உள்ள அமர்வுகளை நிர்வகிக்கவும்' },
    activity_logs: { label: 'செயல்பாடு பதிவுகள்', description: 'கணினி செயல்பாடு பதிவுகளைப் பார்க்கவும்' },
    view_session_logs: { label: 'அமர்வு பதிவுகள்', description: 'பயனர் அமர்வு பதிவுகளைப் பார்க்கவும்' },
  };

  // English options (labels/descriptions) matching MemberEntryPage
  const PERMISSION_OPTIONS = [
    { id: 'dashboard', label: 'Dashboard', description: 'Access overview, summaries and quick actions' },
    { id: 'member_entry', label: 'Members', description: 'View and manage members' },
    { id: 'master_data', label: 'Master Data', description: 'Manage groups, clans, occupations, villages, educations' },
    { id: 'ledger_management', label: 'Ledger Management', description: 'Manage financial records and transactions' },
    { id: 'reports', label: 'Reports', description: 'View financial and operational reports' },
    { id: 'balance_sheet', label: 'Balance Sheet', description: 'View balance sheet' },
    { id: 'setting', label: 'General Settings', description: 'Access general settings' },
    { id: 'pdf_settings', label: 'PDF Settings', description: 'Manage PDF export settings' },
    { id: 'user_registrations', label: 'User Registrations', description: 'Manage temple portal users' },
    { id: 'tax_registrations', label: 'Tax Registrations', description: 'Manage tax module registrations' },
    { id: 'property_registrations', label: 'Properties', description: 'Manage temple properties' },
    { id: 'view_donations', label: 'Donations - View', description: 'View donation products and entries' },
    { id: 'edit_donations', label: 'Donations - Edit', description: 'Create and modify donation products and entries' },
    { id: 'donation_approval', label: 'Donations Approval', description: 'Approve donations submitted from mobile app' },
    { id: 'view_events', label: 'Events - View', description: 'View events and calendars' },
    { id: 'edit_events', label: 'Events - Edit', description: 'Create and modify events' },
    { id: 'pooja_registrations', label: 'Pooja Registrations', description: 'Create, edit, and view poojas' },
    { id: 'pooja_mobile_submit', label: 'Pooja Mobile Requests', description: 'Submit/view my pooja requests' },
    { id: 'pooja_approval', label: 'Pooja Approval', description: 'Approve pooja requests' },
    { id: 'annadhanam_registrations', label: 'Annadhanam', description: 'Create, edit, and view Annadhanam registrations' },
    { id: 'annadhanam_approval', label: 'Annadhanam Approval', description: 'Approve Annadhanam requests' },
    { id: 'hall_booking', label: 'Hall Booking', description: 'Create or edit hall bookings' },
    { id: 'hall_approval', label: 'Hall Approval', description: 'Approve hall bookings' },
    { id: 'marriage_register', label: 'Marriage Register', description: 'Access marriage/hall lists' },
    { id: 'session_management', label: 'Session Management', description: 'Manage active sessions' },
    { id: 'activity_logs', label: 'Activity Logs', description: 'View system activity logs' },
    { id: 'view_session_logs', label: 'Session Logs', description: 'View user session logs' },
  ];

  const togglePermission = (permId: string, enabled: boolean) => {
    setPermItems((existing) => {
      if (enabled) {
        const has = existing.some((p) => p.id === permId);
        return has ? existing : [...existing, { id: permId, access: 'view' }];
      } else {
        return existing.filter((p) => p.id !== permId);
      }
    });
  };

  const setPermissionLevel = (permId: string, level: 'view' | 'edit' | 'full') => {
    setPermItems((existing) => existing.map((p) => (p.id === permId ? { ...p, access: level } : p)));
  };

  const getPermissionLabel = (id: string, field: 'label' | 'description') => {
    if (language === 'english' && PERMISSION_OPTIONS_TAMIL[id]) {
      // Keep consistent with MemberEntryPage toggle of labels
      return PERMISSION_OPTIONS_TAMIL[id][field];
    }
    const perm = PERMISSION_OPTIONS.find((p) => p.id === id);
    return perm ? (field === 'label' ? perm.label : perm.description) : id;
  };

  const openPermissions = async (member: Member) => {
    try {
      setPermMember(member);
      setPermError(null);
      setPermItems([]);
      setPermEditorOpen(true);
      // preload existing permissions
      setPermLoading(true);
      const targetId = (member as any).userId ?? member.id;
      const res = await fetch(`http://localhost:4000/api/admin/members/${targetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.data?.customPermissions) ? data.data.customPermissions : [];
        // normalize shape to {id, access}
        setPermItems(list.map((p: any) => ({ id: p.id, access: p.access })));
      } else if (res.status === 403) {
        setPermError('Forbidden: missing permission');
      } else if (res.status === 401) {
        setPermError('Unauthorized: please login again');
      } else {
        setPermError(`Failed to load permissions (${res.status})`);
      }
    } catch (e: any) {
      setPermError(e?.message || 'Failed to load permissions');
    } finally {
      setPermLoading(false);
    }
  };

  const addPermRow = () => {
    setPermItems((rows) => [...rows, { id: '', access: 'view' }]);
  };

  const removePermRow = (index: number) => {
    setPermItems((rows) => rows.filter((_, i) => i !== index));
  };

  const updatePermRow = (index: number, patch: Partial<{ id: string; access: 'view' | 'edit' | 'full' }>) => {
    setPermItems((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const savePermissions = async () => {
    if (!permMember) return;
    setSavingPerms(true);
    setPermError(null);
    try {
      const body = { customPermissions: permItems.filter(r => r.id && r.access) };
      const res = await fetch(`http://localhost:4000/api/admin/members/${permMember.userId ?? permMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = res.status === 403 ? 'Forbidden. Requires superadmin.' : `Failed (${res.status})`;
        throw new Error(msg);
      }
      setPermEditorOpen(false);
      setPermMember(null);
      setPermItems([]);
    } catch (e: any) {
      setPermError(e?.message || 'Failed to save');
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
              {t("Members List", "உறுப்பினர் பதிவு")}
            </CardTitle>
          </div>
        </CardHeader>
      {/* Header */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="text-sm text-gray-500">
          {totalMembers} {totalMembers === 1 ? t('member', 'உறுப்பினர்') : t('members', 'உறுப்பினர்கள்')} {t('found', 'கிடைத்தன')}
        </div>
      </div>

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
                  placeholder={t('Search by name/username/mobile/email...', 'பெயர்/பயனர் பெயர்/மொபைல்/மின்னஞ்சல் மூலம் தேடுக')}
                  className={cn(theme.input.base, theme.input.size.sm, "pl-8")}
                  value={searchTerm}
                  onChange={(e) => onSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch(searchTerm)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterRole}
                  onChange={(e) => onFilter(e.target.value)}
                  className={cn(theme.select.base, theme.select.size.sm)}
                >
                  <option value="all">{t('All Roles', 'அனைத்து பங்குகள்')}</option>
                  <option value="member">{t('Member', 'உறுப்பினர்')}</option>
                  <option value="admin">{t('Admin', 'நிர்வாகி')}</option>
                  <option value="superadmin">{t('Super Admin', 'முதன்மை நிர்வாகி')}</option>
                </select>
              </div>
              <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => onSearch('')}>
                  {t('Clear', 'அழி')}
                </Button>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={handleExportPdf}>
                  <FileDown className="h-3 w-3 mr-1" />
                  {t('Export PDF', 'PDF ஏற்றுமதி')}
                </Button>
                <Button size="sm" className="h-8 text-xs" variant="outline" onClick={handlePrint}>
                  <FileDown className="h-3 w-3 mr-1" />
                  {t('Print', 'அச்சிடு')}
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={tableClasses.scrollContainerWrapper} onContextMenu={onContextMenu}>
            <div className={tableClasses.scrollContainer}>
              <Table className={tableClasses.container}>
                <TableHeader className={tableClasses.header}>
                  <TableRow className={tableClasses.row}>
                    <TableHead className={tableClasses.headerCellSno}>{t("S.No", "எண்")}</TableHead>
                    <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Name", "பெயர்")}</TableHead>
                    <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Username", "பயனர் பெயர்")}</TableHead>
                    <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Mobile", "மொபைல்")}</TableHead>
                    <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Email", "மின்னஞ்சல்")}</TableHead>
                    <TableHead className={cn(tableClasses.headerCell, "text-center")}>{t("Role", "பங்கு")}</TableHead>
                    <TableHead className={cn(tableClasses.headerCell, "text-center")}>{t("Status", "நிலை")}</TableHead>
                    <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Actions", "செயல்கள்")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className={tableClasses.emptyState}>
                        {t('No members found', 'உறுப்பினர்கள் இல்லை')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member, index) => (
                      <TableRow key={member.id} className={tableClasses.row}>
                        <TableCell className={tableClasses.cellSno}>
                          {index + 1}
                        </TableCell>
                        <TableCell className={tableClasses.cell}>
                          <div className="font-medium text-gray-900">{member.fullName}</div>
                          {member.username && <div className="text-xs text-gray-500">@{member.username}</div>}
                        </TableCell>
                        <TableCell className={tableClasses.cell}>
                          {member.username || '-'}
                        </TableCell>
                        <TableCell className={tableClasses.cell}>
                          {member.mobile}
                        </TableCell>
                        <TableCell className={tableClasses.cell}>
                          {member.email || '-'}
                        </TableCell>
                        <TableCell className={cn(tableClasses.cell, "text-center")}>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                            member.role === 'superadmin' 
                              ? 'bg-red-100 text-red-800'
                              : member.role === 'admin'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {member.role === 'superadmin' ? t('Super Admin', 'முதன்மை நிர்வாகி') :
                             member.role === 'admin' ? t('Admin', 'நிர்வாகி') :
                             t('Member', 'உறுப்பினர்')}
                          </span>
                        </TableCell>
                        <TableCell className={cn(tableClasses.cell, "text-center")}>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            member.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {member.isBlocked ? t('Blocked', 'தடுக்கப்பட்டது') : t('Active', 'செயலில்')}
                          </span>
                        </TableCell>
                        <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                          <div className="flex items-center justify-end gap-1">
                            {canEditMembers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(member)}
                                className={cn(buttonClasses.actionSecondary, "h-5 w-5 p-0")}
                              >
                                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                            )}
                            {canEditMembers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPermissions(member)}
                                className={cn(buttonClasses.actionSecondary, "h-5 w-5 p-0")}
                              >
                                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                              </Button>
                            )}
                            {canBlockMembers && member.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => member.isBlocked ? onUnblock(member.id, member.userId!) : onBlock(member.id, member.userId!)}
                                className={cn(buttonClasses.actionSecondary, "h-5 w-5 p-0")}
                              >
                                {member.isBlocked ? (
                                  <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                )}
                              </Button>
                            )}
                            {canResetPasswords && member.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onResetPassword(member.id)}
                                className={cn(buttonClasses.actionSecondary, "h-5 w-5 p-0")}
                              >
                                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                              </Button>
                            )}
                            {canDeleteMembers && member.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(member.id)}
                                className={cn(buttonClasses.actionDanger, "h-5 w-5 p-0")}
                              >
                                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className={tableClasses.pagination}>
              <div className="text-sm text-gray-700">
                {t("Showing", "காட்டப்படுகிறது")} {(currentPage - 1) * 20 + 1} {t("to", "இலிருந்து")} {Math.min(currentPage * 20, totalMembers)} {t("of", "இல்")}{" "}
                <span className="font-medium">{totalMembers}</span> {t("items", "உருப்படிகள்")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className={tableClasses.paginationButton}
                >
                  {t('Previous', 'முந்தைய')}
                </Button>
                <span className="text-xs flex items-center">
                  {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className={tableClasses.paginationButton}
                >
                  {t('Next', 'அடுத்தது')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Permissions Editor Modal */}
      {permEditorOpen && permMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow-md w-full max-w-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('Edit Permissions', 'அனுமதிகளை திருத்து')} – {permMember.fullName || permMember.username || permMember.mobile}
              </h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setPermEditorOpen(false)}>✕</button>
            </div>

            <div className="space-y-2">
              {permLoading && (
                <div className="text-xs text-gray-600">{t('Loading permissions...', 'அனுமதிகள் ஏற்றப்படுகிறது...')}</div>
              )}
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-600">
                  {t('Select permissions and levels', 'அனுமதிகள் மற்றும் நிலைகளைத் தேர்ந்தெடுக்கவும்')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-0.5 px-1.5 h-auto"
                    onClick={() => setPermItems(PERMISSION_OPTIONS.map(opt => ({ id: opt.id, access: 'view' })))}
                  >
                    {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-0.5 px-1.5 h-auto"
                    onClick={() => setPermItems([])}
                  >
                    {t('Clear all', 'அனைத்தையும் அழி')}
                  </Button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto grid grid-cols-1 gap-2">
                {PERMISSION_OPTIONS.map((opt) => {
                  const enabled = permItems.some((p) => p.id === opt.id);
                  const current = permItems.find((p) => p.id === opt.id);
                  return (
                    <div key={opt.id} className={`border rounded p-2 ${enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => togglePermission(opt.id, e.target.checked)}
                            />
                            <div className="font-medium text-gray-900">
                              {getPermissionLabel(opt.id, 'label')}
                            </div>
                          </div>
                          <div className="text-gray-600 mt-1">
                            {getPermissionLabel(opt.id, 'description')}
                          </div>
                        </div>
                        <div>
                          <select
                            disabled={!enabled}
                            value={(current?.access as any) || 'view'}
                            onChange={(e) => setPermissionLevel(opt.id, e.target.value as any)}
                            className={cn(theme.select.base, theme.select.size.md)}
                          >
                            <option value="view">{t('View', 'பார்வை')}</option>
                            <option value="edit">{t('Edit', 'திருத்து')}</option>
                            <option value="full">{t('Full', 'முழு')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {permError && (
              <div className="mt-2 text-red-600">{permError}</div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <Button variant="outline" onClick={addPermRow} className="text-xs py-1 px-2">
                {t('Add permission', 'அனுமதி சேர்')}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPermEditorOpen(false)} className="text-xs py-1 px-2">
                  {t('Cancel', 'ரத்து')}
                </Button>
                <Button variant="outline" onClick={savePermissions} disabled={savingPerms} className="text-xs py-1 px-2">
                  {savingPerms ? t('Saving...', 'சேமிக்கப்பட்டு...') : t('Save', 'சேமி')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
    </div>
    
  );
}
