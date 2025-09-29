'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  
  const [activeTab, setActiveTab] = useState<'clans' | 'groups' | 'occupations' | 'educations' | 'halls' | 'hall-events'>('clans');
  const [masterData, setMasterData] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

 
  // Language translations
  const translations = {
    tamil: {
      title: 'Master Data Management',
      subtitle: 'Manage clans, groups, occupations, and education levels',
      clans: 'Clans',
      groups: 'Groups',
      occupations: 'Occupations',
      educations: 'Educations',
      halls: 'Halls',
      hallEvents: 'Hall Events',
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
      actions: 'Actions',
      name: 'Name',
      created: 'Created',
      updated: 'Updated',
      enterName: 'Enter name'
    },
    english: {
      title: 'மாஸ்டர் டேட்டா மேலாண்மை',
      subtitle: 'குலங்கள், குழுக்கள், தொழில்கள் மற்றும் கல்வி நிலைகளை நிர்வகிக்கவும்',
      clans: 'குலங்கள்',
      groups: 'குழுக்கள்',
      occupations: 'தொழில்கள்',
      educations: 'கல்வி நிலைகள்',
      halls: 'மண்டபங்கள்',
      hallEvents: 'மண்டப நிகழ்வுகள்',
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
      actions: 'செயல்கள்',
      name: 'பெயர்',
      created: 'உருவாக்கப்பட்டது',
      updated: 'புதுப்பிக்கப்பட்டது',
      enterName: 'பெயரை உள்ளிடவும்'
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
    { key: 'clans', label: t.clans, endpoint: 'clans' },
    { key: 'groups', label: t.groups, endpoint: 'groups' },
    { key: 'occupations', label: t.occupations, endpoint: 'occupations' },
    { key: 'educations', label: t.educations, endpoint: 'educations' },
    { key: 'halls', label: t.halls, endpoint: 'halls' },
    { key: 'hall-events', label: t.hallEvents, endpoint: 'hall-events' }
  ];


  // Load data when tab changes
  useEffect(() => {
    if (user?.templeId && token) {
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


  // Focus input when modal opens
  useEffect(() => {
    if ((showAddModal || editingItem) && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [showAddModal, editingItem]);


  const loadData = async () => {
    if (!user?.templeId || !token) return;

    setLoading(true);
    try {
      const currentTab = tabs.find(t => t.key === activeTab);
      if (!currentTab) return;

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/master/${currentTab.endpoint}/${user.templeId}`, {
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

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/master/${currentTab.endpoint}`, {
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

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/master/${currentTab.endpoint}/${editingItem.id}`, {
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

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/master/${currentTab.endpoint}/${id}`, {
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


  // Handle Enter key in modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingItem) {
        handleEdit();
      } else {
        handleAdd();
      }
    } else if (e.key === 'Escape') {
      closeModals();
    }
  };


  // Extra safety: don't render page if unauthenticated (route is protected, but prevents flicker/HMR logs)
  if (!user || !token) {
    return null;
  }

  // Consistent styling classes
  const fieldStyles = "text-base py-2.5 px-3 h-11 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-md w-full transition-all duration-200";
  const buttonStyles = "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200";
  const primaryButton = "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white";
  const outlineButton = "border border-gray-300 hover:bg-gray-50 text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 py-6 px-6">
            <h1 className="text-2xl font-bold text-center text-white">
              {t.title}
            </h1>
            <p className="text-center text-orange-100 mt-2 text-sm">
              {t.subtitle}
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="px-6 py-3 bg-green-50 border-b border-green-200">
              <div className="text-green-800 text-sm font-medium">{successMessage}</div>
            </div>
          )}

          {/* Tab navigation */}
          <div className="border-b border-gray-200 px-6">
            <nav className="flex space-x-1 py-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-md transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {tabs.find(t => t.key === activeTab)?.label}
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className={`${buttonStyles} ${primaryButton}`}
              >
                {t?.addNew || 'Add New'}
              </button>
            </div>

            {/* Master Data Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <p className="mt-3 text-gray-600 text-base">{t?.loading || 'Loading...'}</p>
                </div>
              ) : masterData.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-lg">{t?.noData || 'No data found'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          {t.name}
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          {t.created}
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          {t.updated}
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          {t?.actions || 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {masterData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(item.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(item.updated_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={() => openEditModal(item)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
                              >
                                {t?.edit || 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                              >
                                {t?.delete || 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingItem ? `${t?.edit || 'Edit'} ${tabs.find(t => t.key === activeTab)?.label}` : `${t?.add || 'Add'} ${tabs.find(t => t.key === activeTab)?.label}`}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.name}
                </label>
                <input
                  ref={modalInputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={handleModalKeyDown}
                  placeholder={t.enterName}
                  className={fieldStyles}
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModals}
                  className={`${buttonStyles} ${outlineButton}`}
                >
                  {t?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={editingItem ? handleEdit : handleAdd}
                  className={`${buttonStyles} ${primaryButton}`}
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