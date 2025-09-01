'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Member } from '@/types/member';
import MemberListView from './MemberListView';
import MemberEntryView from './MemberEntryView';
import { toast } from '@/hooks/use-toast';
import { Modal } from '@/components/ui/modal';

export default function MembersPage() {
  const [activeTab, setActiveTab] = useState<'view' | 'entry'>('view');
  const { language } = useLanguage();
  const { user, token, userPermissions } = useAuth();
  
  const hasFullAccess = (userPermissions || []).some(p => 
    p.permission_id === 'member_entry' && p.access_level === 'full'
  );
  
  const hasViewAccess = (userPermissions || []).some(p => 
    p.permission_id === 'member_entry' && p.access_level !== 'view' ? true : p.access_level === 'view'
  );

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
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

  const canAddMembers = hasFullAccess;

  const canViewMembers = hasViewAccess;

  // Enhanced permission checks
  const isSuperadmin = user?.role === 'superadmin';
  const canEditMembers = isSuperadmin || (userPermissions || []).some(p => 
    p.permission_id === 'member_edit' && p.access_level === 'full'
  );

  const canDeleteMembers = isSuperadmin || (userPermissions || []).some(p => 
    p.permission_id === 'member_delete' && p.access_level === 'full'
  );

  const canBlockMembers = isSuperadmin;
  const canResetPasswords = isSuperadmin;

  if (!canViewMembers) {
    return <div>You don't have permission to view members</div>;
  }

  const filteredMembers = members.filter(member => 
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredByRole = filterRole === 'all' 
    ? filteredMembers 
    : filteredMembers.filter(member => member.role === filterRole);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members', {
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
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newMember.fullName,
          username: newMember.username,
          mobile: newMember.mobile,
          email: newMember.email,
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
        title: language === 'tamil' ? 'உறுப்பினர் உருவாக்கப்பட்டது' : 'Member created',
        description: `${language === 'tamil' ? 'செயல்பாடு பதிவு செய்யப்பட்டது.' : 'Activity logged.'} ` + (data.createdUserId ? (language === 'tamil' ? 'உள்நுழைவு உருவாக்கப்பட்டது.' : 'Login created.') : '')
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
      const response = await fetch(`/api/users/${editingMember.id}`, {
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
      const response = await fetch(`/api/users/${memberToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberToDelete));
        toast({
          title: language === 'tamil' ? 'உறுப்பினர் நீக்கப்பட்டார்' : 'Member deleted',
          description: language === 'tamil'
            ? 'உறுப்பினர் வெற்றிகரமாக நீக்கப்பட்டார்'
            : 'Member was successfully deleted'
        });
      } else {
        throw new Error('Failed to delete member');
      }
    } catch (error) {
      toast({
        title: language === 'tamil' ? 'பிழை' : 'Error',
        description: language === 'tamil'
          ? 'உறுப்பினரை நீக்க முடியவில்லை'
          : 'Failed to delete member',
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        {language === 'tamil' ? 'உறுப்பினர்கள் நிர்வாகம்' : 'Members Management'}
      </h1>
      
      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'view' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('view')}
        >
          {language === 'tamil' ? 'காட்சி' : 'View Members'}
        </button>
        {canAddMembers && (
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'entry' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('entry')}
          >
            {language === 'tamil' ? 'நுழைவு' : 'Member Entry'}
          </button>
        )}
      </div>
      
      {activeTab === 'view' ? (
        <MemberListView
          members={filteredByRole}
          searchTerm={searchTerm}
          filterRole={filterRole}
          language={language}
          canEditMembers={canEditMembers}
          canDeleteMembers={canDeleteMembers}
          canBlockMembers={canBlockMembers}
          canResetPasswords={canResetPasswords}
          onEdit={handleEditMember}
          onDelete={handleDeleteMember}
          onBlock={async (id, userId) => {
            try {
              // Optimistic update
              setMembers(prev => prev.map(m => 
                m.id === id ? {...m, isBlocked: true} : m
              ));
              
              const response = await fetch(`/api/admin/members/${userId}/block`, {
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
                title: language === 'tamil' ? 'பிழை' : 'Error',
                description: language === 'tamil'
                  ? 'உறுப்பினரை தடுக்க முடியவில்லை'
                  : 'Failed to block member',
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
              
              const response = await fetch(`/api/admin/members/${userId}/block`, {
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
                title: language === 'tamil' ? 'பிழை' : 'Error',
                description: language === 'tamil'
                  ? 'உறுப்பினரை தடைநீக்க முடியவில்லை'
                  : 'Failed to unblock member',
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
      ) : (
        <MemberEntryView
          newMember={newMember}
          setNewMember={setNewMember}
          editingMember={editingMember as Member}
          language={language}
          user={user}
          handleAddMember={handleAddMember}
          handleUpdateMember={handleUpdateMember}
          isEditing={false}
        />
      )}
      {showEditModal && editingMember && (
        <Modal
          title={language === 'tamil' ? 'உறுப்பினர் திருத்தம்' : 'Edit Member'}
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
          title={language === 'tamil' ? 'கடவுச்சொல் மீட்டமை' : 'Reset Password'}
          onClose={() => setShowResetPwModal(false)}
        >
          <div className="space-y-4">
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              minLength={6}
              placeholder={language === 'tamil' ? 'புதிய கடவுச்சொல்' : 'New password'}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setShowResetPwModal(false)}
              >
                {language === 'tamil' ? 'ரத்து செய்' : 'Cancel'}
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={async () => {
                  if (!resetPassword) return;
                  try {
                    await fetch(`/api/admin/members/${resetMemberId}/reset-password`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ newPassword: resetPassword })
                    });
                    toast({
                      title: language === 'tamil' ? 'கடவுச்சொல் மீட்டமைக்கப்பட்டது' : 'Password reset',
                      description: language === 'tamil' ? 'புதிய கடவுச்சொல் அமைக்கப்பட்டது' : 'New password has been set'
                    });
                    setShowResetPwModal(false);
                    setResetPassword('');
                    setResetMemberId(null);
                  } catch (err) {
                    console.error('Error resetting password:', err);
                  }
                }}
              >
                {language === 'tamil' ? 'மீட்டமை' : 'Reset'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showDeleteModal && (
        <Modal
          title={language === 'tamil' ? 'உறுப்பினரை நீக்கவா?' : 'Delete Member?'}
          onClose={() => {
            setShowDeleteModal(false);
            setMemberToDelete(null);
          }}
        >
          <div className="space-y-4">
            <p>
              {language === 'tamil'
                ? 'இந்த உறுப்பினரை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?'
                : 'Are you sure you want to permanently delete this member?'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                }}
              >
                {language === 'tamil' ? 'ரத்து செய்' : 'Cancel'}
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={confirmDeleteMember}
              >
                {language === 'tamil' ? 'நீக்கு' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
