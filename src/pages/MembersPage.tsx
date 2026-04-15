'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Member } from '@/types/member';
import MemberListView from './MemberListView';
import MemberEntryView from './MemberEntryView';
import { toast } from '@/hooks/use-toast';
import { Modal } from '@/components/ui/modal';
import { theme } from '@/styles/theme';
import { cn } from '@/lib/utils';
import MemberLogsView from './MemberLogsView';

export default function MembersPage() {
  const { language } = useLanguage();
  const { user, token, userPermissions, isSuperAdmin } = useAuth();
  
  // Translation object
  const t = {
    tamil: {
      management: 'உறுப்பினர்கள் நிர்வாகம்',
      viewMembers: 'காட்சி',
      memberEntry: 'நுழைவு',
      logs: 'பதிவுகள்',
      editMember: 'உறுப்பினர் திருத்தம்',
      resetPassword: 'கடவுச்சொல் மீட்டமை',
      newPassword: 'புதிய கடவுச்சொல்',
      cancel: 'ரத்து செய்',
      reset: 'மீட்டமை',
      deleteConfirm: 'உறுப்பினரை நீக்கவா?',
      deleteMessage: 'இந்த உறுப்பினரை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?',
      delete: 'நீக்கு',
      passwordReset: 'கடவுச்சொல் மீட்டமைக்கப்பட்டது',
      passwordSet: 'புதிய கடவுச்சொல் அமைக்கப்பட்டது',
      memberCreated: 'உறுப்பினர் உருவாக்கப்பட்டது',
      activityLogged: 'செயல்பாடு பதிவு செய்யப்பட்டது.',
      loginCreated: 'உள்நுழைவு உருவாக்கப்பட்டது.',
      memberDeleted: 'உறுப்பினர் நீக்கப்பட்டார்',
      deleteSuccess: 'உறுப்பினர் வெற்றிகரமாக நீக்கப்பட்டார்',
      error: 'பிழை',
      deleteFailed: 'உறுப்பினரை நீக்க முடியவில்லை',
      blockFailed: 'உறுப்பினரை தடுக்க முடியவில்லை',
      unblockFailed: 'உறுப்பினரை தடைநீக்க முடியவில்லை',
      noPermission: 'உறுப்பினர்களைப் பார்க்க உங்களுக்கு அனுமதி இல்லை'
    },
    english: {
      management: 'Members Management',
      viewMembers: 'View Members',
      memberEntry: 'Member Entry',
      logs: 'Member Logs',
      editMember: 'Edit Member',
      resetPassword: 'Reset Password',
      newPassword: 'New password',
      cancel: 'Cancel',
      reset: 'Reset',
      deleteConfirm: 'Delete Member?',
      deleteMessage: 'Are you sure you want to permanently delete this member?',
      delete: 'Delete',
      passwordReset: 'Password reset',
      passwordSet: 'New password has been set',
      memberCreated: 'Member created',
      activityLogged: 'Activity logged.',
      loginCreated: 'Login created.',
      memberDeleted: 'Member deleted',
      deleteSuccess: 'Member was successfully deleted',
      error: 'Error',
      deleteFailed: 'Failed to delete member',
      blockFailed: 'Failed to block member',
      unblockFailed: 'Failed to unblock member',
      noPermission: 'You don\'t have permission to view members'
    }
  } as const;

  const memberEntryPerm = (userPermissions || []).find(p => p.permission_id === 'member_entry');
  const memberEntryLevel = memberEntryPerm?.access_level as ('view' | 'edit' | 'full' | undefined);
  const hasViewAccess = !!memberEntryLevel; // any level grants view
  const hasEditAccess = memberEntryLevel === 'edit' || memberEntryLevel === 'full';
  const hasFullAccess = memberEntryLevel === 'full';

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Number of items per page
  const [newMember, setNewMember] = useState<Member>({ 
    id: 0,
    fullName: '',
    mobile: '',
    email: '',
    gotra: '',
    nakshatra: '',
    role: 'member' as 'member' | 'admin' | 'superadmin'
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [resetMemberId, setResetMemberId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);

  const canAddMembers = hasEditAccess;

  const canViewMembers = hasViewAccess;

  // Enhanced permission checks aligned to standardized IDs
  const canEditMembers = isSuperAdmin || hasEditAccess;
  const canDeleteMembers = isSuperAdmin || hasFullAccess;
  const canBlockMembers = isSuperAdmin;
  const canResetPasswords = isSuperAdmin;
  const canViewLogs = isSuperAdmin || (userPermissions || []).some(p => 
    (p.permission_id === 'view_session_logs' || p.permission_id === 'activity_logs') &&
    (p.access_level === 'view' || p.access_level === 'edit' || p.access_level === 'full')
  );

  if (!canViewMembers) {
    return <div>{t[language].noPermission}</div>;
  }

  const filteredMembers = members.filter(member => 
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredByRole = filterRole === 'all' 
    ? filteredMembers 
    : filteredMembers.filter(member => member.role === filterRole);
    
  // Get current members for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMembers = filteredByRole.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredByRole.length / itemsPerPage);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('https://tmsapi.xesstechlink.com/api/members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      // Map backend fields (name, mobile_number) to frontend Member shape
      const mapped: Member[] = (data.members || []).map((m: any) => ({
        id: m.id,
        fullName: m.name,
        username: m.username,
        mobile: m.mobile_number,
        email: m.email,
        role: (m.role as 'member' | 'admin' | 'superadmin') || 'member',
        isBlocked: m.is_blocked === 'blocked',
        userId: m.userId,
      }));
      console.log('Mapped members:', mapped); // Debug block status
      setMembers(mapped);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('https://tmsapi.xesstechlink.com/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newMember.fullName,
          username: newMember.username,
          mobile: newMember.mobile,
          email: (newMember.email && newMember.email.trim() !== '') ? newMember.email.trim() : null,
          createLogin: newMember.createLogin === true,
          password: newMember.createLogin ? newMember.password : undefined,
          role: newMember.role,
          permissionLevel: newMember.permissionLevel,
          customPermissions: newMember.customPermissions
        })
      });

      if (!response.ok) throw new Error('Failed to add member');

      const data = await response.json();
      toast({
        title: t[language].memberCreated,
        description: `${t[language].activityLogged} ` + (data.createdUserId ? (t[language].loginCreated) : '')
      });
      // Map returned member
      const created = data.member ? {
        id: data.member.id,
        fullName: data.member.name,
        mobile: data.member.mobile_number,
        email: data.member.email,
        role: 'member' as const
      } : undefined;
      setMembers(created ? [...members, created] : members);
      setNewMember({
        id: 0,
        fullName: '',
        mobile: '',
        email: '',
        gotra: '',
        nakshatra: '',
        createLogin: false,
        password: '',
        role: 'member' as 'member' | 'admin' | 'superadmin'
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding member:', err);
    }
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    // Seed edit form with selected member
    setNewMember({
      id: member.id,
      fullName: member.fullName,
      mobile: member.mobile,
      email: member.email,
      role: member.role || 'member',
      username: (member as any).username,
    } as unknown as Member);
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/users/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newMember.email,
          fullName: newMember.fullName,
          role: newMember.role,
          username: (newMember as any).username
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingMember(null);
        fetchMembers();
      }
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const handleDeleteMember = async (id: number) => {
    setMemberToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/users/${memberToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberToDelete));
        toast({
          title: t[language].memberDeleted,
          description: t[language].deleteSuccess
        });
      } else {
        throw new Error('Failed to delete member');
      }
    } catch (error) {
      toast({
        title: t[language].error,
        description: t[language].deleteFailed,
        variant: 'destructive'
      });
      console.error('Error deleting member:', error);
    } finally {
      setShowDeleteModal(false);
      setMemberToDelete(null);
    }
  };
  useEffect(() => {
    fetchMembers();
  }, []);

  // No tabs; separate pages handle entry and logs

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
       
      </h1>
      
      {/* No tabs; navigation happens via sidebar links */}
      
      <MemberListView
        members={currentMembers}
        searchTerm={searchTerm}
        filterRole={filterRole}
        language={language}
        canEditMembers={canEditMembers}
        canDeleteMembers={canDeleteMembers}
        canBlockMembers={canBlockMembers}
        canResetPasswords={canResetPasswords}
        currentPage={currentPage}
        totalPages={totalPages}
        totalMembers={filteredByRole.length}
        onEdit={handleEditMember}
        onDelete={handleDeleteMember}
        onPageChange={paginate}
        onBlock={async (id, userId) => {
            try {
              // Optimistic update
              setMembers(prev => prev.map(m => 
                m.id === id ? {...m, isBlocked: true} : m
              ));
              
              const response = await fetch(`https://tmsapi.xesstechlink.com/api/admin/members/${userId}/block`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ blocked: true })
              });
              
              if (!response.ok) {
                // Revert on error
                setMembers(prev => prev.map(m => 
                  m.id === id ? {...m, isBlocked: false} : m
                ));
                throw new Error('Failed to block member');
              }
              
              // Refresh data to ensure consistency
              fetchMembers();
            } catch (err) {
              toast({
                title: t[language].error,
                description: t[language].blockFailed,
                variant: 'destructive'
              });
              console.error('Error blocking member:', err);
            }
          }}
        onUnblock={async (id, userId) => {
            try {
              // Optimistic update
              setMembers(prev => prev.map(m => 
                m.id === id ? {...m, isBlocked: false} : m
              ));
              
              const response = await fetch(`https://tmsapi.xesstechlink.com/api/admin/members/${userId}/block`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ blocked: false })
              });
              
              if (!response.ok) {
                // Revert on error
                setMembers(prev => prev.map(m => 
                  m.id === id ? {...m, isBlocked: true} : m
                ));
                throw new Error('Failed to unblock member');
              }
              
              // Refresh data to ensure consistency
              fetchMembers();
            } catch (err) {
              toast({
                title: t[language].error,
                description: t[language].unblockFailed,
                variant: 'destructive'
              });
              console.error('Error unblocking member:', err);
            }
          }}
        onResetPassword={async (id) => {
            setResetMemberId(id);
            setResetPassword('');
            setShowResetPwModal(true);
          }}
        onSearch={setSearchTerm}
        onFilter={setFilterRole}
      />
      {showEditModal && editingMember && (
        <Modal
          title={t[language].editMember}
          onClose={() => setShowEditModal(false)}
        >
          <MemberEntryView
            newMember={newMember}
            setNewMember={setNewMember}
            editingMember={editingMember}
            language={language}
            user={user}
            handleUpdateMember={handleUpdateMember}
            isEditing={true}
          />
        </Modal>
      )}
      {showResetPwModal && resetMemberId !== null && (
        <Modal
          title={t[language].resetPassword}
          onClose={() => setShowResetPwModal(false)}
        >
          <div className="space-y-4">
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className={cn(theme.input.base, theme.input.size.md, "w-full")}
              minLength={6}
              placeholder={t[language].newPassword}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setShowResetPwModal(false)}
              >
                {t[language].cancel}
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={async () => {
                  if (!resetPassword) return;
                  try {
                    await fetch(`https://tmsapi.xesstechlink.com/api/admin/members/${resetMemberId}/reset-password`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ newPassword: resetPassword })
                    });
                    toast({
                      title: t[language].passwordReset,
                      description: t[language].passwordSet
                    });
                    setShowResetPwModal(false);
                    setResetPassword('');
                    setResetMemberId(null);
                  } catch (err) {
                    console.error('Error resetting password:', err);
                  }
                }}
              >
                {t[language].reset}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showDeleteModal && (
        <Modal
          title={t[language].deleteConfirm}
          onClose={() => {
            setShowDeleteModal(false);
            setMemberToDelete(null);
          }}
        >
          <div className="space-y-4">
            <p>
              {t[language].deleteMessage}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                }}
              >
                {t[language].cancel}
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={confirmDeleteMember}
              >
                {t[language].delete}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
