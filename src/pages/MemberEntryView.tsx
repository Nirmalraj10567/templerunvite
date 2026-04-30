'use client';

import { Member } from '@/types/member';
import { User, Phone, Mail, Calendar, Building, CreditCard, Shield, ChevronRight, FileText, Upload, X, Loader2, Hash, Lock } from 'lucide-react';
import { useState, useRef } from 'react';
import { useLanguage } from '@/lib/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

// Custom hook for Enter key navigation
const useEnterKeyNavigation = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return; // allow buttons and textareas to handle Enter normally
    e.preventDefault();
    // Focus the save button
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
    }
  };

  return { formRef, handleKeyDown };
};

export default function MemberEntryForm({
  newMember,
  setNewMember,
  editingMember,
  _language, // kept for backward-compat; actual language comes from context
  user,
  handleAddMember,
  handleUpdateMember,
  isEditing = false,
  isSubmitting = false
}: {
  newMember: any;
  setNewMember: (member: any) => void;
  editingMember?: Member | null;
  _language?: string; // prop ignored; using useLanguage()
  user: any;
  handleAddMember?: (e: React.FormEvent) => Promise<void>;
  handleUpdateMember?: (e: React.FormEvent) => Promise<void>;
  isEditing?: boolean;
  isSubmitting?: boolean;
}) {
  // Get current language and invert mapping for UI
  const { language } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';
  const { formRef, handleKeyDown } = useEnterKeyNavigation();

  const [showSummary, setShowSummary] = useState(false);
  const [showLoginDetails, setShowLoginDetails] = useState(true);

  // Use centralized form styles with theme focus colors
  const fieldStyles = cn(theme.input.base, theme.input.size.md);
  const labelStyles = cn(formFieldStyles.label, "text-base mb-2");
  const selectStyles = cn(theme.select.base, theme.select.size.md);

  // Translation object
  const t = {
    tamil: {
      updateMember: 'உறுப்பினர் விவரங்களை புதுப்பிக்கவும்',
      memberEntry: 'பணியாளர் பதிவு',
      basicDetails: 'அடிப்படை விவரங்கள்',
      fullName: 'முழு பெயர்',
      nameNote: 'அதிகாரப்பூர்வ பதிவுகளில் இருப்பதைப் போல பெயரை உள்ளிடவும்.',
      mobile: 'மொபைல்',
      mobileNote: '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.',
      email: 'மின்னஞ்சல்',
      emailNote: 'விருப்பம். தகவல் மற்றும் ரசீது புதுப்பிப்புகளுக்கு பயன்படுத்தப்படும்.',
      loginAccess: 'உள்நுழைவு அணுகல்',
      createAdmin: 'அட்மின் பேனல் அணுகலை உருவாக்கவும்',
      password: 'கடவுச்சொல் (குறைந்தது 6 எழுத்துகள்)',
      role: 'பங்கு',
      permissionLevel: 'அனுமதி நிலை',
      privileges: 'சிறப்பு அனுமதிகள்',
      selectAll: 'அனைத்தையும் தேர்ந்தெடு',
      clearAll: 'அனைத்தையும் அழி',
      superadminNote: 'அனைத்து அனுமதிகளும் தானாக வழங்கப்படும்',
      permissionSummary: 'அனுமதி சுருக்கம்',
      activePermissions: 'செயலில் உள்ள அனுமதிகள்:',
      noPermissions: 'அனுமதிகள் தேர்ந்தெடுக்கப்படவில்லை',
      update: 'புதுப்பி',
      addMember: 'சேர்',
      username: 'பயனர் பெயர்',
      selectLevel: 'நிலையைத் தேர்ந்தெடுக்கவும்',
      viewOnly: '👁️ பார்வை மட்டும்',
      editAccess: '✏️ தொகுக்கும் அணுகல்',
      fullAccess: '🔓 முழு அணுகல்',
      member: 'உறுப்பினர்',
      admin: 'நிர்வாகி',
      showDetails: 'விவரங்களைக் காட்டு',
      hideDetails: 'விவரங்களை மறை',
    },
    english: {
      updateMember: 'Update Member',
      memberEntry: 'Staff Entry',
      basicDetails: 'Basic Details',
      fullName: 'Full Name',
      //nameNote: 'Enter the name as it appears in official records.',
      mobile: 'Mobile',
     // mobileNote: 'Enter a 10-digit mobile number.',
      email: 'Email',
      //emailNote: 'Optional. Used for communication and receipt updates.',
      loginAccess: 'Login Access',
      createAdmin: 'Create Admin Login',
      password: 'Password (min 6 chars)',
      role: 'Role',
      permissionLevel: 'Permission Level',
      privileges: 'Privileges & Permissions',
      selectAll: 'Select All',
      clearAll: 'Clear All',
      superadminNote: 'All permissions will be granted automatically (Superadmin)',
      permissionSummary: 'Permission Summary',
      activePermissions: 'Active Permissions:',
      noPermissions: 'No permissions selected',
      update: 'Update',
      addMember: 'Member',
      username: 'Username',
      selectLevel: 'Select level',
      viewOnly: '👁️ View Only',
      editAccess: '✏️ Edit Access',
      fullAccess: '🔓 Full Access',
      member: 'Member',
      admin: 'Admin',
      showDetails: 'Show Details',
      hideDetails: 'Hide Details',
    }
  } as const;

  // Permission labels in Tamil (for UI display only)
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

  const member = isEditing ? editingMember : newMember;
  const setMember = isEditing ? 
    (data: any) => setNewMember(data) :
    setNewMember;
  
  const handleSubmit = isEditing ? handleUpdateMember : handleAddMember;

  const clearForm = () => {
    setMember({
      fullName: '',
      mobile: '',
      email: '',
      username: '',
      createLogin: true,
      password: '',
      role: 'member',
      permissionLevel: 'view',
      customPermissions: []
    });
  };

  // Comprehensive permission options aligned with backend permission IDs and routing guards
  const PERMISSION_OPTIONS = [
    // Core modules
    { id: 'dashboard', label: 'Dashboard', description: 'Access overview, summaries and quick actions', icon: '📊', color: 'blue' },
    { id: 'member_entry', label: 'Members', description: 'View and manage members', icon: '👥', color: 'blue' },
    { id: 'master_data', label: 'Master Data', description: 'Manage groups, clans, occupations, villages, educations', icon: '📊', color: 'purple' },
    { id: 'ledger_management', label: 'Ledger Management', description: 'Manage financial records and transactions', icon: '💰', color: 'yellow' },
    { id: 'reports', label: 'Reports', description: 'View financial and operational reports', icon: '📈', color: 'teal' },
    { id: 'balance_sheet', label: 'Balance Sheet', description: 'View balance sheet', icon: '📊', color: 'green' },

    { id: 'dashboard', label: 'Dashboard', description: 'Access overview', icon: '📊' },
    { id: 'member_entry', label: 'Members', description: 'Manage members', icon: '👥' },
    { id: 'master_data', label: 'Master Data', description: 'Data management', icon: '📊' },
    { id: 'ledger_management', label: 'Ledger Management', description: 'Financial records', icon: '💰' },
    { id: 'reports', label: 'Reports', description: 'View reports', icon: '📈' },
    { id: 'balance_sheet', label: 'Balance Sheet', description: 'View balance sheet', icon: '📊' },
    { id: 'setting', label: 'General Settings', description: 'Access settings', icon: '⚙️' },
    { id: 'pdf_settings', label: 'PDF Settings', description: 'PDF export settings', icon: '📄' },
    { id: 'user_registrations', label: 'User Registrations', description: 'User management', icon: '🧑‍💻' },
    { id: 'tax_registrations', label: 'Tax Registrations', description: 'Tax module', icon: '🧾' },
    { id: 'property_registrations', label: 'Properties', description: 'Manage assets', icon: '🏠' },
    { id: 'view_donations', label: 'Donations - View', description: 'View donations', icon: '🎁' },
    { id: 'edit_donations', label: 'Donations - Edit', description: 'Edit donations', icon: '✏️' },
    { id: 'donation_approval', label: 'Donations Approval', description: 'Approve donations', icon: '✅' },
    { id: 'view_events', label: 'Events - View', description: 'View events', icon: '📅' },
    { id: 'edit_events', label: 'Events - Edit', description: 'Edit events', icon: '✏️' },
    { id: 'pooja_registrations', label: 'Pooja Registrations', description: 'Pooja management', icon: '🛕' },
    { id: 'pooja_mobile_submit', label: 'Pooja Mobile', description: 'Mobile requests', icon: '📱' },
    { id: 'pooja_approval', label: 'Pooja Approval', description: 'Approve pooja', icon: '✅' },
    { id: 'annadhanam_registrations', label: 'Annadhanam', description: 'Annadhanam management', icon: '🍛' },
    { id: 'annadhanam_approval', label: 'Annadhanam Approval', description: 'Approve Annadhanam', icon: '✅' },
    { id: 'hall_booking', label: 'Hall Booking', description: 'Hall bookings', icon: '🏨' },
    { id: 'hall_approval', label: 'Hall Approval', description: 'Approve bookings', icon: '✅' },
    { id: 'marriage_register', label: 'Marriage Register', description: 'Marriage records', icon: '💍' },
    { id: 'session_management', label: 'Session Management', description: 'Session control', icon: '🔒' },
    { id: 'activity_logs', label: 'Activity Logs', description: 'System logs', icon: '📝' },
    { id: 'view_session_logs', label: 'Session Logs', description: 'User session logs', icon: '📜' },
  ];

  const togglePermission = (permId: string, enabled: boolean) => {
    const existing = member?.customPermissions || [];
    if (enabled) {
      const defaultAccess = member?.permissionLevel || 'view';
      const updated = existing.some((p: any) => p.id === permId) ? existing : [...existing, { id: permId, access: defaultAccess }];
      setMember({ ...member, customPermissions: updated });
    } else {
      const updated = existing.filter((p: any) => p.id !== permId);
      setMember({ ...member, customPermissions: updated });
    }
  };

  const setPermissionLevel = (permId: string, level: 'view' | 'edit' | 'full') => {
    const existing = member?.customPermissions || [];
    const updated = existing.map((p: any) => (p.id === permId ? { ...p, access: level } : p));
    setMember({ ...member, customPermissions: updated });
  };

  const getPermissionLabel = (id: string, field: 'label' | 'description') => {
    if (lang === 'tamil' && PERMISSION_OPTIONS_TAMIL[id]) return PERMISSION_OPTIONS_TAMIL[id][field];
    const perm = PERMISSION_OPTIONS.find(p => p.id === id);
    return perm ? (field === 'label' ? perm.label : perm.description) : id;
  };

  return (
    <div className={isEditing ? "" : pageContainerStyles.container}>
      <div className={isEditing ? "" : pageContainerStyles.content}>
        <Card className={cn("shadow-lg border-0 bg-white rounded-lg", isEditing && "shadow-none")}>
          {!isEditing && (
            <CardHeader className={theme.header.container}>
              <div className={theme.header.contentSpacing}>
                <CardTitle className={theme.header.main}>{t[lang].memberEntry}</CardTitle>
              </div>
            </CardHeader>
          )}
          
          <CardContent className={cn("p-6", isEditing && "p-2")}>
            <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-8">
              {/* Basic Details Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{t[lang].basicDetails}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block ml-1">{t[lang].fullName}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="fullName" type="text" value={member?.fullName || ''} onChange={(e) => setMember({ ...member, fullName: e.target.value })} className={cn(fieldStyles, "pl-10")} placeholder={t[lang].fullName + ' *'} required autoFocus />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block ml-1">{t[lang].mobile}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="mobile" type="tel" value={member?.mobile || ''} onChange={(e) => setMember({ ...member, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={cn(fieldStyles, "pl-10")} maxLength={10} placeholder={t[lang].mobile + ' *'} required />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block ml-1">{t[lang].email}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="email" type="email" value={member?.email || ''} onChange={(e) => setMember({ ...member, email: e.target.value })} className={cn(fieldStyles, "pl-10")} placeholder={t[lang].email} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block ml-1">{t[lang].username}</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="username" 
                        type="text" 
                        value={member?.username || ''} 
                        onChange={(e) => setMember({ ...member, username: e.target.value })} 
                        className={cn(fieldStyles, "pl-10")} 
                        placeholder={t[lang].username} 
                        required={member?.createLogin}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Login Access Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{t[lang].loginAccess}</h3>
                </div>
                
                <div className="space-y-6 p-6 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-500 ml-1">{t[lang].permissionLevel}</Label>
                      <select 
                        id="permissionLevel" 
                        value={member?.permissionLevel || ''} 
                        onChange={(e) => {
                          const newLevel = e.target.value;
                          
                          // If a level is selected, enable ALL permissions at that level
                          // If level is cleared, we keep current permissions but reset the level
                          let updatedPermissions = member?.customPermissions || [];
                          if (newLevel) {
                            updatedPermissions = PERMISSION_OPTIONS.map(opt => ({
                              id: opt.id,
                              access: newLevel
                            }));
                          }
                          
                          setMember({ 
                            ...member, 
                            permissionLevel: newLevel,
                            customPermissions: updatedPermissions
                          });
                        }} 
                        className={selectStyles}
                      >
                        <option value="">{t[lang].selectLevel}</option>
                        <option value="view">{t[lang].viewOnly}</option>
                        <option value="edit">{t[lang].editAccess}</option>
                        <option value="full">{t[lang].fullAccess}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-500 ml-1">{t[lang].role}</Label>
                      <select id="role" value={member?.role || 'member'} onChange={(e) => setMember({ ...member, role: e.target.value })} className={selectStyles}>
                        <option value="member">{t[lang].member}</option>
                        <option value="admin">{t[lang].admin}</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-500 ml-1">{t[lang].password}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          id="password" 
                          type="password" 
                          value={member?.password || ''} 
                          onChange={(e) => setMember({ ...member, password: e.target.value })} 
                          className={cn(fieldStyles, "pl-10")} 
                          placeholder="******" 
                          required={member?.createLogin}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800">{t[lang].privileges}</h4>
                    <div className="max-h-96 overflow-y-auto border rounded-xl bg-white p-1">
                      <div className="grid grid-cols-1 gap-3 p-3">
                        {PERMISSION_OPTIONS.map((opt) => {
                          const enabled = (member?.customPermissions || []).some((p: any) => p.id === opt.id);
                          const current = (member?.customPermissions || []).find((p: any) => p.id === opt.id);
                          return (
                            <div key={opt.id} className={cn("rounded-xl p-4 transition-all border", enabled ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100')}>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <input type="checkbox" checked={!!enabled} onChange={(e) => togglePermission(opt.id, e.target.checked)} className="w-4 h-4" />
                                  <span className="text-sm font-bold">{getPermissionLabel(opt.id, 'label')}</span>
                                </div>
                                <select disabled={!enabled} value={(current?.access as any) || 'view'} onChange={(e) => setPermissionLevel(opt.id, e.target.value as any)} className="text-xs border rounded-lg px-2 py-1">
                                  <option value="view">View</option>
                                  <option value="edit">Edit</option>
                                  <option value="full">Full</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Permissions Summary */}
                    {(member?.customPermissions || []).length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-blue-900 mb-2">
                          {t[lang].activePermissions}
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {(member?.customPermissions || []).map((perm: any) => {
                            const permOption = PERMISSION_OPTIONS.find(opt => opt.id === perm.id);
                            const accessColor = perm.access === 'full' ? 'bg-red-100 text-red-800 border-red-200' : 
                                              perm.access === 'edit' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                              'bg-green-100 text-green-800 border-green-200';
                            const label = getPermissionLabel(perm.id, 'label');
                            return (
                              <span 
                                key={perm.id}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${accessColor}`}
                              >
                                {permOption?.icon} {label}
                                <span className="ml-1 opacity-75">
                                  ({perm.access})
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  {/* Keyboard shortcut hint */}
                  <div className="text-sm text-gray-500 hidden md:flex items-center">
                    <kbd className={cn(theme.input.base, "px-2 py-1 text-xs bg-gray-100 rounded")}>Enter</kbd>
                    <span className="ml-2">to navigate</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    size="default"
                    disabled={isSubmitting}
                    className="px-8 py-3 text-base bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white font-medium rounded-md min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditing ? t[lang].update : t[lang].addMember}...
                      </div>
                    ) : (
                      isEditing ? t[lang].update : t[lang].addMember
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearForm}
                    className="px-6 py-3 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
