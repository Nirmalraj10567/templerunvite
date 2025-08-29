'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { hasPermission } from '@/config/permissions';
import { ALL_PERMISSIONS, getPermissionsForRole } from '@/config/permissions';

interface Member {
  id: number;
  name?: string;
  fullName?: string;
  username: string;
  email?: string;
  mobile: string;
  status: string;
  joinDate?: string;
  lastPayment?: string;
  amount?: string;
  role: string;
  templeName?: string;
}

interface PagePermission {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  access: 'full' | 'view' | 'none';
}

export default function MembersPage() {
  // ... rest of the component implementation ...
  const { language } = useLanguage();
  const { user, token } = useAuth();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    mobile: '',
    username: '',
    password: '',
    email: '',
    fullName: '',
    role: 'member' as 'member' | 'admin' | 'superadmin'
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const canAddMembers = user?.role === 'admin' || user?.role === 'superadmin';
  const canEditMembers = user?.role === 'admin' || user?.role === 'superadmin';
  const canDeleteMembers = user?.role === 'superadmin';

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.mobile?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const loadMembers = async () => {
    // fetch members data
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:4000/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newMember,
          templeId: user?.templeId
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewMember({
          mobile: '',
          username: '',
          password: '',
          email: '',
          fullName: '',
          role: 'member'
        });
        loadMembers();
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const response = await fetch(`http://localhost:4000/api/users/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newMember.email,
          fullName: newMember.fullName,
          role: newMember.role
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingMember(null);
        loadMembers();
      }
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const handleDeleteMember = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        loadMembers();
      }
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  return (
    <ProtectedRoute requiredRole={['member', 'admin', 'superadmin']}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">
          {language === 'tamil' ? 'உறுப்பினர்கள் நிர்வாகம்' : 'Members Management'}
        </h1>
        {canAddMembers && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
          >
            {language === 'tamil' ? '+ புதிய உறுப்பினர்' : '+ Add Member'}
          </button>
        )}

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <input
                  type="text"
                  placeholder={language === 'tamil' ? 'தேடல்...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md flex-1"
                />
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">{language === 'tamil' ? 'அனைத்து நிலை' : 'All Status'}</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">{language === 'tamil' ? 'அனைத்து பங்குகள்' : 'All Roles'}</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {language === 'tamil' ? 'உறுப்பினர்' : 'Member'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {language === 'tamil' ? 'தொடர்பு' : 'Contact'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {language === 'tamil' ? 'நிலை' : 'Status'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {language === 'tamil' ? 'பங்கு' : 'Role'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {language === 'tamil' ? 'செயல்கள்' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-orange-600">👤</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.fullName || member.username}
                              </div>
                              <div className="text-sm text-gray-500">ID: {member.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.email || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{member.mobile}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            member.status === 'active' ? 'bg-green-100 text-green-800' :
                            member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            member.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                            member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {canEditMembers && (
                            <button 
                              onClick={() => handleEditMember(member)}
                              className="text-orange-600 hover:text-orange-900 mr-4"
                            >
                              {language === 'tamil' ? 'திருத்து' : 'Edit'}
                            </button>
                          )}
                          {canDeleteMembers && (
                            <button 
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {language === 'tamil' ? 'நீக்கு' : 'Delete'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {language === 'tamil' ? 'புதிய உறுப்பினர்' : 'Add New Member'}
            </h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'மொபைல்' : 'Mobile'}
                </label>
                <input
                  type="tel"
                  value={newMember.mobile}
                  onChange={(e) => setNewMember({...newMember, mobile: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'பயனர்பெயர்' : 'Username'}
                </label>
                <input
                  type="text"
                  value={newMember.username}
                  onChange={(e) => setNewMember({...newMember, username: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'கடவுச்சொல்' : 'Password'}
                </label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'மின்னஞ்சல்' : 'Email'}
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'முழுப்பெயர்' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={newMember.fullName}
                  onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'பங்கு' : 'Role'}
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value as 'member' | 'admin' | 'superadmin'})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-md"
                >
                  {language === 'tamil' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  {language === 'tamil' ? 'சேமி' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {language === 'tamil' ? 'உறுப்பினரை திருத்தவும்' : 'Edit Member'}
            </h2>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'மொபைல்' : 'Mobile'}
                </label>
                <input
                  type="tel"
                  value={editingMember.mobile}
                  disabled
                  className="w-full px-3 py-2 border rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'முழு பெயர்' : 'Full Name'}
                </label>
                <input
                  type="text"
                  defaultValue={editingMember.fullName || ''}
                  onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block mb-1">
                  {language === 'tamil' ? 'பங்கு' : 'Role'}
                </label>
                <select
                  defaultValue={editingMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value as any})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="member">Member</option>
                  {user?.role === 'superadmin' && <option value="admin">Admin</option>}
                  {user?.role === 'superadmin' && editingMember.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-md"
                >
                  {language === 'tamil' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  {language === 'tamil' ? 'புதுப்பி' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
