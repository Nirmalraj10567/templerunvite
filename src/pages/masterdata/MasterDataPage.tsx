'use client';

import React, { useState, useEffect } from 'react';
import AmmavasaiEditPage from './AmmavasaiEditPage';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';


interface MasterDataItem {
  id: number;
  name: string;
  temple_id: number;
  created_at: string;
  updated_at: string;
}


const MasterDataPage = () => {
  const { user, token } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'clans' | 'groups' | 'occupations' | 'educations' | 'halls' | 'hall-events' | 'ammavasai'>('clans');
  const [masterData, setMasterData] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

 
  // Language translations
  const translations = {
    tamil: {
      title: 'Master Data Management',
      subtitle: 'Manage clans, groups, occupations, and education levels',
      clans: 'Clans',
      groups: 'Groups',
      occupations: 'Occupations',
      educations: 'Educations',
      ammavasai: 'Ammavasai',
      addNew: 'Add New',
      edit: 'Edit',
      delete: 'Delete',
      add: 'Add',
      update: 'Update',
      cancel: 'Cancel',
      save: 'Save',
      loading: 'Loading...',
      noData: 'No data found',
      addSuccess: 'Added successfully!',
      updateSuccess: 'Updated successfully!',
      deleteSuccess: 'Deleted successfully!',
      confirmDelete: 'Are you sure you want to delete this item?',
      actions: 'Actions'
    },
    english: {
      title: 'மாஸ்டர் டேட்டா மேலாண்மை',
      subtitle: 'குலங்கள், குழுக்கள், தொழில்கள் மற்றும் கல்வி நிலைகளை நிர்வகிக்கவும்',
      clans: 'குலங்கள்',
      groups: 'குழுக்கள்',
      occupations: 'தொழில்கள்',
      educations: 'கல்வி நிலைகள்',
      ammavasai: 'அமாவாசை',
      addNew: 'புதியதை சேர்க்கவும்',
      edit: 'திருத்து',
      delete: 'அழி',
      add: 'சேர்',
      update: 'புதுப்பி',
      cancel: 'ரத்து',
      save: 'சேமி',
      loading: 'ஏற்றுகிறது...',
      noData: 'தரவு எதுவும் கிடைக்கவில்லை',
      addSuccess: 'வெற்றிகரமாக சேர்க்கப்பட்டது!',
      updateSuccess: 'வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
      deleteSuccess: 'வெற்றிகரமாக நீக்கப்பட்டது!',
      confirmDelete: 'இந்த பொருளை நீக்க விரும்புகிறீர்களா?',
      actions: 'செயல்கள்'
    }
  };


  const t = translations[language];


  // Debug logging (only when authenticated)
  useEffect(() => {
    if (!user || !token) return;
    console.log('MasterDataPage - User:', user);
    console.log('MasterDataPage - User Role:', user?.role);
    console.log('MasterDataPage - Token:', token ? 'Exists' : 'Missing');
  }, [user, token]);


  const tabs = [
    { key: 'clans', label: t?.clans || 'Clans', endpoint: 'clans' },
    { key: 'groups', label: t?.groups || 'Groups', endpoint: 'groups' },
    { key: 'occupations', label: t?.occupations || 'Occupations', endpoint: 'occupations' },
    { key: 'educations', label: t?.educations || 'Educations', endpoint: 'educations' },
    { key: 'halls', label: 'Halls', endpoint: 'halls' },
    { key: 'hall-events', label: 'Hall Events', endpoint: 'hall-events' },
  ];


  // Load data when tab changes
  useEffect(() => {
    if (user?.templeId && token) {
      if (activeTab === 'ammavasai') return; // no master-data API for this tab
      loadData();
    }
  }, [activeTab, user, token]);


  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);


  const loadData = async () => {
    if (!user?.templeId || !token) return;

    if (activeTab === 'ammavasai') return; // guard
    setLoading(true);
    try {
      const currentTab = tabs.find(t => t.key === activeTab);
      if (!currentTab) return;


      const response = await fetch(`/api/master/${currentTab.endpoint}/${user.templeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });


      if (response.ok) {
        const result = await response.json();
        setMasterData(result);
      } else {
        setError(`Failed to load ${activeTab}`);
      }
    } catch (error) {
      setError(`Error loading ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };


  const handleAdd = async () => {
    if (!newItemName.trim()) return;


    try {
      const currentTab = tabs.find(t => t.key === activeTab);
      if (!currentTab) return;


      const response = await fetch(`/api/master/${currentTab.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          templeId: user?.templeId
        })
      });


      if (response.ok) {
        setNewItemName('');
        setShowAddModal(false);
        setSuccessMessage(t?.addSuccess || 'Added successfully!');
        await loadData();
      } else {
        setError(`Failed to add ${currentTab.label}`);
      }
    } catch (error) {
      setError(`Error adding ${activeTab}`);
    }
  };


  const handleEdit = async () => {
    if (!editingItem || !newItemName.trim()) return;


    try {
      const currentTab = tabs.find(t => t.key === activeTab);
      if (!currentTab) return;


      const response = await fetch(`/api/master/${currentTab.endpoint}/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          templeId: user?.templeId
        })
      });


      if (response.ok) {
        setEditingItem(null);
        setNewItemName('');
        setSuccessMessage(t?.updateSuccess || 'Updated successfully!');
        await loadData();
      } else {
        setError(`Failed to update ${currentTab.label}`);
      }
    } catch (error) {
      setError(`Error updating ${activeTab}`);
    }
  };


  const handleDelete = async (id: number) => {
    if (!window.confirm(t?.confirmDelete || 'Are you sure you want to delete this item?')) return;


    try {
      const currentTab = tabs.find(t => t.key === activeTab);
      if (!currentTab) return;


      const response = await fetch(`/api/master/${currentTab.endpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });


      if (response.ok) {
        setSuccessMessage(t?.deleteSuccess || 'Deleted successfully!');
        await loadData();
      } else {
        setError(`Failed to delete ${currentTab.label}`);
      }
    } catch (error) {
      setError(`Error deleting ${activeTab}`);
    }
  };


  const openEditModal = (item: MasterDataItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
  };


  const closeModals = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setNewItemName('');
    setError(null);
  };


  // Extra safety: don't render page if unauthenticated (route is protected, but prevents flicker/HMR logs)
  if (!user || !token) {
    return null;
  }

  return (
    <div className="p-6">
      {/* Debug Info - Remove in production 
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">🐛 Debug Info</h3>
          <div className="text-xs text-yellow-700 space-y-1">
            <p>User Role: {user?.role}</p>
            <p>User Temple ID: {user?.templeId}</p>
            <p>Token exists: {token ? 'Yes' : 'No'}</p>
            <p>Required Roles: admin, superadmin</p>
            <p>Has Permission: {user ? ['admin', 'superadmin'].includes(user.role) : 'No user'}</p>
          </div>
      )}
        </div>
      )}
*/}

      {/* Success and Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <p className="text-sm text-green-800">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-600 hover:text-green-800">×</button>
          </div>
        </div>
      )}


      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">❌</span>
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">×</button>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>


      {/* Content */}
      {activeTab === 'ammavasai' ? (
        // Render the Ammavasai editor as its own page content
        <AmmavasaiEditPage />
      ) : (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {tabs.find(t => t.key === activeTab)?.label}
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t?.addNew || 'Add New'} {tabs.find(t => t.key === activeTab)?.label}
            </button>
          </div>
        </div>


        {/* Master Data Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">{t?.loading || 'Loading...'}</p>
            </div>
          ) : masterData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t?.noData || 'No data found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t?.actions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {masterData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {t?.edit || 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t?.delete || 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}
      {(showAddModal || editingItem) && activeTab !== 'ammavasai' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? `${t?.edit || 'Edit'} ${tabs.find(t => t.key === activeTab)?.label}` : `${t?.add || 'Add'} ${tabs.find(t => t.key === activeTab)?.label}`}
              </h3>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`Enter ${activeTab} name`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={editingItem ? handleEdit : handleAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingItem ? (t?.update || 'Update') : (t?.add || 'Add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default MasterDataPage;
