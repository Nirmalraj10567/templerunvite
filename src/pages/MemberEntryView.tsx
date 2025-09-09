'use client';

import { Member } from '@/types/member';
import { User, Phone, Mail, Calendar, Building, CreditCard, Shield, ChevronRight, FileText, Upload } from 'lucide-react';
import { useState } from 'react';

export default function MemberEntryForm({
  newMember,
  setNewMember,
  editingMember,
  language,
  user,
  handleAddMember,
  handleUpdateMember,
  isEditing = false
}: {
  newMember: any;
  setNewMember: (member: any) => void;
  editingMember?: Member | null;
  language: string;
  user: any;
  handleAddMember?: (e: React.FormEvent) => Promise<void>;
  handleUpdateMember?: (e: React.FormEvent) => Promise<void>;
  isEditing?: boolean;
}) {
  const member = isEditing ? editingMember : newMember;
  const setMember = isEditing ? 
    (data: any) => setNewMember(data) : // You might need a setEditingMember function
    setNewMember;
  
  const handleSubmit = isEditing ? handleUpdateMember : handleAddMember;

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
      // default to view if added
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

  // local state if needed in future

  // Simplified temple member entry form (no banking UI)
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h2 className="text-2xl md:text-3xl font-semibold mb-5 tracking-tight text-slate-800">
        {isEditing
          ? (language === 'tamil' ? 'உறுப்பினர் விவரங்களை புதுப்பிக்கவும்' : 'Update Member')
          : (language === 'tamil' ? 'உறுப்பினர் பதிவு' : 'Member Entry')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div>
          <label className="block text-sm font-medium mb-1">{language === 'tamil' ? 'முழு பெயர்' : 'Full Name'} *</label>
          <input
            type="text"
            value={member?.fullName || ''}
            onChange={(e) => setMember({ ...member, fullName: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{language === 'tamil' ? 'மொபைல்' : 'Mobile'} *</label>
          <input
            type="tel"
            value={member?.mobile || ''}
            onChange={(e) => setMember({ ...member, mobile: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{language === 'tamil' ? 'மின்னஞ்சல்' : 'Email'} </label>
          <input
            type="email"
            value={member?.email || ''}
            onChange={(e) => setMember({ ...member, email: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            value={member?.username || ''}
            onChange={(e) => setMember({ ...member, username: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required={member?.createLogin}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Privilege Access</h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={member?.createLogin || false}
              onChange={(e) => setMember({ ...member, createLogin: e.target.checked })}
            />
            <span className="text-sm font-medium">
              {language === 'tamil' ? 'அட்மின் பேனல் அணுகலை உருவாக்கவும்' : 'Create Admin Login'}
            </span>
          </div>

          {member?.createLogin && (
            <div className="space-y-4 pl-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'tamil' ? 'கடவுச்சொல் (குறைந்தது 6 எழுத்துகள்)' : 'Password (min 6 chars)'}
                </label>
                <input
                  type="password"
                  value={member?.password || ''}
                  onChange={(e) => setMember({ ...member, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'tamil' ? 'பங்கு' : 'Role'}
                </label>
                <select
                  value={member?.role || 'member'}
                  onChange={(e) => setMember({ ...member, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'tamil' ? 'அனுமதி நிலை' : 'Permission Level'}
                </label>
                <select
                  value={member?.permissionLevel || ''}
                  onChange={(e) => {
                    const level = e.target.value as 'view' | 'edit' | 'full' | '';
                    // Update top-level permissionLevel
                    const base = { ...member, permissionLevel: level } as any;
                    // Also sync to customPermissions for 'member_entry'
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
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select level</option>
                  <option value="view">View Only</option>
                  <option value="edit">Edit Access</option>
                  <option value="full">Full Access</option>
                </select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    {language === 'tamil' ? 'சிறப்பு அனுமதிகள்' : 'Privileges & Permissions'}
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
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setMember({ ...member, customPermissions: [] })}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
                {member?.mobile === '9999999999' ? (
                  <div className="text-sm text-gray-500 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    {language === 'tamil' ? 'அனைத்து அனுமதிகளும் தானாக வழங்கப்படும்' : 'All permissions will be granted automatically (Superadmin)'}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Permissions Container with Modern Scrollbar */}
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
                            {/* Permission Card Content */}
                            <div className="flex items-start gap-4">
                              {/* Permission Icon & Checkbox */}
                              <div className="flex items-center gap-3">
                                {/* Permission Icon */}
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

                                {/* Custom Checkbox */}
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

                              {/* Permission Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-base font-semibold ${enabled ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {opt.label}
                                      </span>
                                      {enabled && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                                          ✓ Active
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-sm leading-relaxed ${enabled ? 'text-blue-700' : 'text-gray-500'}`}>
                                      {opt.description}
                                    </p>
                                  </div>

                                  {/* Access Level Selector */}
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
                                      <option value="view">👁️ View Only</option>
                                      <option value="edit">✏️ Edit Access</option>
                                      <option value="full">🔓 Full Control</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Permission Number Badge */}
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

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
                    
                    {/* Permission Summary */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📊</span>
                          <span className="text-sm font-semibold text-gray-700">
                            Permission Summary
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
                          <div className="text-xs text-gray-600 mb-2">Active Permissions:</div>
                          <div className="flex flex-wrap gap-2">
                            {(member?.customPermissions || []).map((perm: any) => {
                              const permOption = PERMISSION_OPTIONS.find(opt => opt.id === perm.id);
                              const accessColor = perm.access === 'full' ? 'bg-red-100 text-red-800' : 
                                                perm.access === 'edit' ? 'bg-yellow-100 text-yellow-800' : 
                                                'bg-green-100 text-green-800';
                              return (
                                <span 
                                  key={perm.id}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${accessColor}`}
                                >
                                  {permOption?.icon} {permOption?.label}
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
                          <span className="text-gray-500 text-sm">No permissions selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded">
            {isEditing ? (language === 'tamil' ? 'புதுப்பி' : 'Update') : (language === 'tamil' ? 'சேர்' : 'Add Member')}
          </button>
        </div>
      </form>
    </div>
  );
}
