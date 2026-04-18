'use client';

import { Member } from '@/types/member';
import { User, Phone, Mail, Calendar, Building, CreditCard, Shield, ChevronRight, FileText, Upload, X } from 'lucide-react';
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
  isEditing = false
}: {
  newMember: any;
  setNewMember: (member: any) => void;
  editingMember?: Member | null;
  _language?: string; // prop ignored; using useLanguage()
  user: any;
  handleAddMember?: (e: React.FormEvent) => Promise<void>;
  handleUpdateMember?: (e: React.FormEvent) => Promise<void>;
  isEditing?: boolean;
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
      memberEntry: 'உறுப்பினர் பதிவு',
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
      memberEntry: 'Member Entry',
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
      addMember: 'Add Member',
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
      createLogin: false,
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

    // Settings
    { id: 'setting', label: 'General Settings', description: 'Access general settings', icon: '⚙️', color: 'orange' },
    { id: 'pdf_settings', label: 'PDF Settings', description: 'Manage PDF export settings', icon: '📄', color: 'indigo' },

    // Registrations and tax
    { id: 'user_registrations', label: 'User Registrations', description: 'Manage temple portal users', icon: '🧑‍💻', color: 'gray' },
    { id: 'tax_registrations', label: 'Tax Registrations', description: 'Manage tax module registrations', icon: '🧾', color: 'pink' },

    // Properties
    { id: 'property_registrations', label: 'Properties', description: 'Manage temple properties', icon: '🏠', color: 'cyan' },

    // Donations
    { id: 'view_donations', label: 'Donations - View', description: 'View donation products and entries', icon: '🎁', color: 'green' },
    { id: 'edit_donations', label: 'Donations - Edit', description: 'Create and modify donation products and entries', icon: '✏️', color: 'yellow' },
    { id: 'donation_approval', label: 'Donations Approval', description: 'Approve donations submitted from mobile app', icon: '✅', color: 'emerald' },

    // Events and calendar
    { id: 'view_events', label: 'Events - View', description: 'View events and calendars', icon: '📅', color: 'blue' },
    { id: 'edit_events', label: 'Events - Edit', description: 'Create and modify events', icon: '✏️', color: 'yellow' },

    // Pooja
    { id: 'pooja_registrations', label: 'Pooja Registrations', description: 'Create, edit, and view poojas', icon: '🛕', color: 'orange' },
    { id: 'pooja_mobile_submit', label: 'Pooja Mobile Requests', description: 'Submit/view my pooja requests', icon: '📱', color: 'violet' },
    { id: 'pooja_approval', label: 'Pooja Approval', description: 'Approve pooja requests', icon: '✅', color: 'green' },

    // Annadhanam
    { id: 'annadhanam_registrations', label: 'Annadhanam', description: 'Create, edit, and view Annadhanam registrations', icon: '🍛', color: 'amber' },
    { id: 'annadhanam_approval', label: 'Annadhanam Approval', description: 'Approve Annadhanam requests', icon: '✅', color: 'green' },

    // Hall / Marriage
    { id: 'hall_booking', label: 'Hall Booking', description: 'Create or edit hall bookings', icon: '🏨', color: 'rose' },
    { id: 'hall_approval', label: 'Hall Approval', description: 'Approve hall bookings', icon: '✅', color: 'green' },
    { id: 'marriage_register', label: 'Marriage Register', description: 'Access marriage/hall lists', icon: '💍', color: 'purple' },

    // Logs
    { id: 'session_management', label: 'Session Management', description: 'Manage active sessions', icon: '🔒', color: 'slate' },
    { id: 'activity_logs', label: 'Activity Logs', description: 'View system activity logs', icon: '📝', color: 'gray' },
    { id: 'view_session_logs', label: 'Session Logs', description: 'View user session logs', icon: '📜', color: 'gray' },
  ];

  const togglePermission = (permId: string, enabled: boolean) => {
    const existing = member?.customPermissions || [];
    if (enabled) {
      const defaultAccess = permId === 'member_entry'
        ? (member?.permissionLevel || 'view')
        : 'view';
      const updated = existing.some((p: any) => p.id === permId)
        ? existing
        : [...existing, { id: permId, access: defaultAccess }];
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

  // Get display label/description based on current language
  const getPermissionLabel = (id: string, field: 'label' | 'description') => {
    if (lang === 'tamil' && PERMISSION_OPTIONS_TAMIL[id]) {
      return PERMISSION_OPTIONS_TAMIL[id][field];
    }
    const perm = PERMISSION_OPTIONS.find(p => p.id === id);
    return perm ? (field === 'label' ? perm.label : perm.description) : id;
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className="shadow-lg border-0 bg-white rounded-lg">
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {isEditing ? t[lang].updateMember : t[lang].memberEntry}
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-8">
              {/* Basic Details Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  {t[lang].basicDetails}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Full Name */}
                  <div>
                    <Input
                      id="fullName"
                      type="text"
                      value={member?.fullName || ''}
                      onChange={(e) => setMember({ ...member, fullName: e.target.value })}
                      className={fieldStyles}
                      placeholder={t[lang].fullName + ' *'}
                      required
                      autoFocus
                    />
                    <p className="mt-1 text-sm text-gray-500">{t[lang].nameNote}</p>
                  </div>

                  {/* Mobile */}
                  <div>
                    <Input
                      id="mobile"
                      type="tel"
                      value={member?.mobile || ''}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMember({ ...member, mobile: cleaned });
                      }}
                      className={fieldStyles}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder={t[lang].mobile + ' *'}
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">{t[lang].mobileNote}</p>
                  </div>

                  {/* Email */}
                  <div>
                    <Input
                      id="email"
                      type="email"
                      value={member?.email || ''}
                      onChange={(e) => setMember({ ...member, email: e.target.value })}
                      className={fieldStyles}
                      placeholder={t[lang].email}
                    />
                    <p className="mt-1 text-sm text-gray-500">{t[lang].emailNote}</p>
                  </div>

                  {/* Username */}
                  <div>
                    <Input
                      id="username"
                      type="text"
                      value={member?.username || ''}
                      onChange={(e) => setMember({ ...member, username: e.target.value })}
                      className={fieldStyles}
                      placeholder={t[lang].username}
                      required={member?.createLogin}
                    />
                  </div>
                </div>
              </div>

              {/* Login Access Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    {t[lang].loginAccess}
                  </h3>
                  {member?.createLogin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLoginDetails(!showLoginDetails)}
                      className="text-sm"
                    >
                      {showLoginDetails ? t[lang].hideDetails : t[lang].showDetails}
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="createLogin"
                    className={cn(theme.input.base, "w-5 h-5 text-orange-600 bg-gray-100 rounded")}
                    checked={member?.createLogin || false}
                    onChange={(e) => setMember({ ...member, createLogin: e.target.checked })}
                  />
                  <Label htmlFor="createLogin" className="text-base font-medium text-gray-700 cursor-pointer">
                    {t[lang].createAdmin}
                  </Label>
                </div>

                {member?.createLogin && showLoginDetails && (
                  <div className="space-y-6 p-6 bg-gray-50 rounded-lg border">
                    {/* Permission Level and Role */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <div className="relative">
                          <select
                            id="permissionLevel"
                            value={member?.permissionLevel || ''}
                            onChange={(e) => {
                              const level = e.target.value as 'view' | 'edit' | 'full' | '';
                              const base = { ...member, permissionLevel: level } as any;
                              if (level) {
                                const existing = member?.customPermissions || [];
                                const hasMemberEntry = existing.some((p: any) => p.id === 'member_entry');
                                const updated = hasMemberEntry
                                  ? existing.map((p: any) => p.id === 'member_entry' ? { ...p, access: level } : p)
                                  : [...existing, { id: 'member_entry', access: level }];
                                setMember({ ...base, customPermissions: updated });
                              } else {
                                setMember(base);
                              }
                            }}
                            className={selectStyles}
                          >
                            <option value="">{t[lang].selectLevel}</option>
                            <option value="view">{t[lang].viewOnly}</option>
                            <option value="edit">{t[lang].editAccess}</option>
                            <option value="full">{t[lang].fullAccess}</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="relative">
                          <select
                            id="role"
                            value={member?.role || 'member'}
                            onChange={(e) => setMember({ ...member, role: e.target.value })}
                            className={selectStyles}
                          >
                            <option value="member">{t[lang].member}</option>
                            <option value="admin">{t[lang].admin}</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Input
                          id="password"
                          type="password"
                          value={member?.password || ''}
                          onChange={(e) => setMember({ ...member, password: e.target.value })}
                          className={fieldStyles}
                          minLength={6}
                          placeholder="Min 6 characters"
                          required
                        />
                      </div>
                    </div>

                    {/* Permissions Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-800">{t[lang].privileges}</h4>
                        {member?.mobile !== '9999999999' && (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const allPermissions = PERMISSION_OPTIONS.map(opt => ({ id: opt.id, access: 'view' }));
                                setMember({ ...member, customPermissions: allPermissions });
                              }}
                              className="text-xs px-3 py-1"
                            >
                              {t[lang].selectAll}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setMember({ ...member, customPermissions: [] })}
                              className="text-xs px-3 py-1"
                            >
                              {t[lang].clearAll}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto border rounded-lg bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                          {PERMISSION_OPTIONS.map((opt, index) => {
                            const enabled = (member?.customPermissions || []).some((p: any) => p.id === opt.id);
                            const current = (member?.customPermissions || []).find((p: any) => p.id === opt.id);
                            
                            return (
                              <div 
                                key={opt.id}
                                className={cn(theme.input.base, `rounded-lg p-4 transition-all duration-200 ${
                                  enabled 
                                    ? 'bg-orange-50 shadow-sm' 
                                    : 'bg-gray-50'
                                }`)}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                                      enabled ? 'bg-orange-100 border-2 border-orange-300' : 'bg-gray-100 border-2 border-gray-200'
                                    }`}>
                                      {opt.icon}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <input
                                          type="checkbox"
                                          checked={!!enabled}
                                          onChange={(e) => togglePermission(opt.id, e.target.checked)}
                                          className={cn(theme.input.base, "w-4 h-4 text-orange-600 bg-gray-100 rounded")}
                                          id={`perm-${opt.id}`}
                                        />
                                        <label 
                                          htmlFor={`perm-${opt.id}`}
                                          className={`text-sm font-semibold cursor-pointer ${
                                            enabled ? 'text-orange-900' : 'text-gray-700'
                                          }`}
                                        >
                                          {getPermissionLabel(opt.id, 'label')}
                                        </label>
                                        {enabled && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-xs leading-relaxed ${
                                        enabled ? 'text-orange-700' : 'text-gray-500'
                                      }`}>
                                        {getPermissionLabel(opt.id, 'description')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex-shrink-0">
                                    <div className="relative">
                                      <select
                                        disabled={!enabled}
                                        value={(current?.access as any) || 'view'}
                                        onChange={(e) => setPermissionLevel(opt.id, e.target.value as any)}
                                        className={cn(theme.select.base, theme.select.size.md, "min-w-[100px]", 
                                          enabled 
                                            ? 'border-orange-300 bg-white text-orange-900 focus:ring-2 focus:ring-orange-200' 
                                            : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                        )}
                                      >
                                        <option value="view">👁️ View</option>
                                        <option value="edit">✏️ Edit</option>
                                        <option value="full">🔓 Full</option>
                                      </select>
                                    </div>
                                  </div>
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
                )}
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
                    className="px-8 py-3 text-base bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white font-medium rounded-md"
                  >
                    {isEditing ? t[lang].update : t[lang].addMember}
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
