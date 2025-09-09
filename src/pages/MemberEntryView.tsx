'use client';

import { Member } from '@/types/member';
import { User, Phone, Mail, Calendar, Building, CreditCard, Shield, ChevronRight, FileText, Upload } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/lib/language'; // 👈 Added

export default function MemberEntryForm({
  newMember,
  setNewMember,
  editingMember,
  language, // 👈 Already passed, but now used dynamically
  user,
  handleAddMember,
  handleUpdateMember,
  isEditing = false
}: {
  newMember: any;
  setNewMember: (member: any) => void;
  editingMember?: Member | null;
  language: string; // 👈 Will be overridden by hook for consistency
  user: any;
  handleAddMember?: (e: React.FormEvent) => Promise<void>;
  handleUpdateMember?: (e: React.FormEvent) => Promise<void>;
  isEditing?: boolean;
}) {
  // 👇 Override passed `language` with context for consistency
  const { language: currentLanguage } = useLanguage();
  const lang = currentLanguage as 'tamil' | 'english';

  // Translation object
  const t = {
    english: {
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
    },
    tamil: {
      updateMember: 'Update Member',
      memberEntry: 'Member Entry',
      basicDetails: 'Basic Details',
      fullName: 'Full Name',
      nameNote: 'Enter the name as it appears in official records.',
      mobile: 'Mobile',
      mobileNote: 'Enter a 10-digit mobile number.',
      email: 'Email',
      emailNote: 'Optional. Used for communication and receipt updates.',
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
    }
  } as const;

  // Permission labels in Tamil (for UI display only)
  const PERMISSION_OPTIONS_TAMIL: Record<string, { label: string; description: string }> = {
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

  // Professional, consistent control styles
  const inputClass = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition bg-white placeholder:text-slate-400";
  const labelClass = "block text-sm font-medium mb-1 text-slate-700";
  const sectionTitleClass = "text-lg font-semibold text-slate-800";

  // Comprehensive permission options aligned with backend permission IDs and routing guards
  const PERMISSION_OPTIONS = [
    // Core modules
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
    <div className="max-w-3xl mx-auto p-2 md:p-4">
      <h2 className="text-2xl md:text-2xl font-semibold mb-5 tracking-tight text-slate-800">
        {isEditing ? t[lang].updateMember : t[lang].memberEntry}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className={sectionTitleClass}>{t[lang].basicDetails}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t[lang].fullName} *</label>
              <input
                type="text"
                value={member?.fullName || ''}
                onChange={(e) => setMember({ ...member, fullName: e.target.value })}
                className={inputClass}
                required
              />
              <p className="mt-1 text-xs text-slate-500">{t[lang].nameNote}</p>
            </div>
            <div>
              <label className={labelClass}>{t[lang].mobile} *</label>
              <input
                type="tel"
                value={member?.mobile || ''}
                onChange={(e) => setMember({ ...member, mobile: e.target.value })}
                className={inputClass}
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
              <p className="mt-1 text-xs text-slate-500">{t[lang].mobileNote}</p>
            </div>
            <div>
              <label className={labelClass}>{t[lang].email}</label>
              <input
                type="email"
                value={member?.email || ''}
                onChange={(e) => setMember({ ...member, email: e.target.value })}
                className={inputClass}
                placeholder="name@example.com"
              />
              <p className="mt-1 text-xs text-slate-500">{t[lang].emailNote}</p>
            </div>
            <div>
              <label className={labelClass}>{t[lang].username}</label>
              <input
                type="text"
                value={member?.username || ''}
                onChange={(e) => setMember({ ...member, username: e.target.value })}
                className={inputClass}
                required={member?.createLogin}
              />
              <p className="mt-1 text-xs text-slate-500">{t[lang].createAdmin}</p>
            </div>
          </div>
        </div>

        <hr className="border-slate-200" />

        <div className="space-y-4">
          <h3 className={sectionTitleClass}>{t[lang].loginAccess}</h3>
          <label className="flex items-center gap-3 select-none cursor-pointer">
            <input
              type="checkbox"
              className="accent-orange-600 w-4 h-4"
              checked={member?.createLogin || false}
              onChange={(e) => setMember({ ...member, createLogin: e.target.checked })}
            />
            <span className="text-sm font-medium">
              {t[lang].createAdmin}
            </span>
          </label>

          {member?.createLogin && (
            <div className="space-y-4 pl-6">
              <div>
                <label className={labelClass}>
                  {t[lang].password}
                </label>
                <input
                  type="password"
                  value={member?.password || ''}
                  onChange={(e) => setMember({ ...member, password: e.target.value })}
                  className={inputClass}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t[lang].role}
                </label>
                <select
                  value={member?.role || 'member'}
                  onChange={(e) => setMember({ ...member, role: e.target.value })}
                  className={inputClass}
                >
                  <option value="member">{t[lang].member}</option>
                  <option value="admin">{t[lang].admin}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {t[lang].permissionLevel}
                </label>
                <select
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
                  className={inputClass}
                >
                  <option value="">{t[lang].selectLevel}</option>
                  <option value="view">{t[lang].viewOnly}</option>
                  <option value="edit">{t[lang].editAccess}</option>
                  <option value="full">{t[lang].fullAccess}</option>
                </select>
              </div>
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    {t[lang].privileges}
                  </label>
                  {member?.mobile !== '9999999999' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allPermissions = PERMISSION_OPTIONS.map(opt => ({ id: opt.id, access: 'view' }));
                          setMember({ ...member, customPermissions: allPermissions });
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {t[lang].selectAll}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMember({ ...member, customPermissions: [] })}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        {t[lang].clearAll}
                      </button>
                    </div>
                  )}
                </div>
                {member?.mobile === '9999999999' ? (
                  <div className="text-sm text-gray-500 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    {t[lang].superadminNote}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="max-h-80 overflow-y-auto pr-2 space-y-3 scrollbar-thin smooth-scroll">
                      {PERMISSION_OPTIONS.map((opt, index) => {
                        const enabled = (member?.customPermissions || []).some((p: any) => p.id === opt.id);
                        const current = (member?.customPermissions || []).find((p: any) => p.id === opt.id);
                        return (
                          <div 
                            key={opt.id} 
                            className={`
                              permission-card relative border rounded-xl p-4
                              ${enabled 
                                ? 'enabled shadow-sm' 
                                : 'bg-white border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`
                                  w-10 h-10 rounded-lg flex items-center justify-center text-lg
                                  ${enabled 
                                    ? 'bg-blue-100 border-2 border-blue-300' 
                                    : 'bg-gray-100 border-2 border-gray-200'
                                  }
                                  transition-all duration-200
                                `}>
                                  {opt.icon}
                                </div>
                                <div className="relative flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={!!enabled}
                                    onChange={(e) => togglePermission(opt.id, e.target.checked)}
                                    className="sr-only"
                                    id={`perm-${opt.id}`}
                                  />
                                  <label 
                                    htmlFor={`perm-${opt.id}`}
                                    className={`
                                      w-6 h-6 rounded-lg border-2 cursor-pointer transition-all duration-200
                                      flex items-center justify-center shadow-sm
                                      ${enabled 
                                        ? 'bg-blue-500 border-blue-500 text-white shadow-blue-200' 
                                        : 'border-gray-300 hover:border-blue-400 bg-white hover:shadow-md'
                                      }
                                    `}
                                  >
                                    {enabled && (
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </label>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-base font-semibold ${enabled ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {getPermissionLabel(opt.id, 'label')}
                                      </span>
                                      {enabled && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                                          ✓ Active
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-sm leading-relaxed ${enabled ? 'text-blue-700' : 'text-gray-500'}`}>
                                      {getPermissionLabel(opt.id, 'description')}
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <select
                                      disabled={!enabled}
                                      value={(current?.access as any) || 'view'}
                                      onChange={(e) => setPermissionLevel(opt.id, e.target.value as any)}
                                      className={`
                                        px-4 py-2 text-sm border-2 rounded-xl transition-all duration-200
                                        min-w-[130px] font-semibold shadow-sm
                                        ${enabled 
                                          ? 'border-blue-300 bg-white text-blue-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 hover:border-blue-400' 
                                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                        }
                                      `}
                                    >
                                      <option value="view">{t[lang].viewOnly}</option>
                                      <option value="edit">{t[lang].editAccess}</option>
                                      <option value="full">{t[lang].fullAccess}</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span className={`
                                inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full
                                shadow-sm border-2 transition-all duration-200
                                ${enabled 
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-300 shadow-blue-200' 
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                                }
                              `}>
                                {index + 1}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📊</span>
                          <span className="text-sm font-semibold text-gray-700">
                            {t[lang].permissionSummary}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`
                            w-3 h-3 rounded-full 
                            ${(member?.customPermissions || []).length > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}
                          `}></div>
                          <span className="font-bold text-blue-600 text-lg">
                            {(member?.customPermissions || []).length} / {PERMISSION_OPTIONS.length}
                          </span>
                        </div>
                      </div>
                      {(member?.customPermissions || []).length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 mb-2">{t[lang].activePermissions}</div>
                          <div className="flex flex-wrap gap-2">
                            {(member?.customPermissions || []).map((perm: any) => {
                              const permOption = PERMISSION_OPTIONS.find(opt => opt.id === perm.id);
                              const accessColor = perm.access === 'full' ? 'bg-red-100 text-red-800' : 
                                                perm.access === 'edit' ? 'bg-yellow-100 text-yellow-800' : 
                                                'bg-green-100 text-green-800';
                              const label = getPermissionLabel(perm.id, 'label');
                              return (
                                <span 
                                  key={perm.id}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${accessColor}`}
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
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-gray-500 text-sm">{t[lang].noPermissions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-slate-200 -mx-6 px-6 py-4 flex justify-end">
          <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400">
            {isEditing ? t[lang].update : t[lang].addMember}
          </button>
        </div>
      </form>
    </div>
  );
}