import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

interface TaxSetting {
  id: number;
  temple_id: number;
  year: number;
  tax_amount: number;
  description: string;
  is_active: boolean;
  include_previous_years?: boolean;
  created_at: string;
  updated_at: string;
}

const t = {
  english: {
    taxSettings: "வரி அமைப்புகள்",
    currentYearTax: "தற்போதைய ஆண்டு வரி",
    taxAmount: "வரி தொகை",
    description: "விளக்கம்",
    isActive: "செயலில் உள்ளது",
    includePreviousYears: "முந்தைய ஆண்டுகளை உள்ளடக்கு",
    save: "சேமி",
    cancel: "ரத்து செய்",
    edit: "திருத்து",
    delete: "நீக்கு",
    confirmDelete: "ஆண்டு {{year}}க்கான வரி அமைப்பை நீக்க வேண்டுமா?",
    taxAmountRequired: "வரி தொகை தேவை மற்றும் 0க்கு மேல் இருக்க வேண்டும்",
    saveSuccess: "வரி அமைப்பு {{year}} ஆண்டுக்கு வெற்றிகரமாக {{action}} செய்யப்பட்டது",
    saveError: "வரி அமைப்பை சேமிக்க பிழை",
    loadError: "வரி அமைப்புகளை ஏற்ற பிழை",
    deleteSuccess: "{{year}} ஆண்டுக்கான வரி அமைப்பு வெற்றிகரமாக நீக்கப்பட்டது",
    deleteError: "வரி அமைப்பை நீக்க பிழை"
  },
  tamil: {
    taxSettings: "Tax Settings",
    currentYearTax: "Current Year Tax",
    taxAmount: "Tax Amount",
    description: "Description",
    isActive: "Is Active",
    includePreviousYears: "Include Previous Years",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete tax setting for year {{year}}?",
    taxAmountRequired: "Tax amount is required and must be greater than 0",
    saveSuccess: "Tax setting {{action}} successfully for year {{year}}",
    saveError: "Error saving tax setting",
    loadError: "Error loading tax settings",
    deleteSuccess: "Tax setting for year {{year}} deleted successfully",
    deleteError: "Error deleting tax setting"
  }
} as const;

export default function TaxSettingsPage() {
  const { user, token } = useAuth();
  const { language } = useLanguage(); // Get current language
  const [settings, setSettings] = useState<TaxSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    taxAmount: '',
    description: '',
    isActive: true,
    includePreviousYears: false
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  // Load tax settings
  const loadSettings = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/tax-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || []);
      } else {
        setErr(t[language as 'tamil' | 'english'].loadError);
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
      setErr(t[language as 'tamil' | 'english'].loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.taxAmount || form.taxAmount === '0') {
      setErr(t[language as 'tamil' | 'english'].taxAmountRequired);
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const response = await fetch('http://localhost:4000/api/tax-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          year: form.year,
          taxAmount: parseFloat(form.taxAmount),
          description: form.description,
          isActive: form.isActive,
          includePreviousYears: form.includePreviousYears
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMsg(t[language as 'tamil' | 'english'].saveSuccess
          .replace('{{action}}', editingId ? 'updated' : 'created')
          .replace('{{year}}', form.year.toString()));
        setForm({
          year: new Date().getFullYear(),
          taxAmount: '',
          description: '',
          isActive: true,
          includePreviousYears: false
        });
        setEditingId(null);
        loadSettings();
        setTimeout(() => setMsg(null), 3000);
      } else {
        setErr(data.error || t[language as 'tamil' | 'english'].saveError);
      }
    } catch (error) {
      console.error('Error saving tax setting:', error);
      setErr(t[language as 'tamil' | 'english'].saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (setting: TaxSetting) => {
    setForm({
      year: setting.year,
      taxAmount: setting.tax_amount.toString(),
      description: setting.description || '',
      isActive: setting.is_active,
      includePreviousYears: (setting as any).include_previous_years || false
    });
    setEditingId(setting.id);
    setErr(null);
    setMsg(null);
  };

  const handleDelete = async (id: number, year: number) => {
    if (!confirm(t[language as 'tamil' | 'english'].confirmDelete.replace('{{year}}', year.toString()))) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/tax-settings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setMsg(t[language as 'tamil' | 'english'].deleteSuccess.replace('{{year}}', year.toString()));
        loadSettings();
        setTimeout(() => setMsg(null), 3000);
      } else {
        const data = await response.json();
        setErr(data.error || t[language as 'tamil' | 'english'].deleteError);
      }
    } catch (error) {
      console.error('Error deleting tax setting:', error);
      setErr(t[language as 'tamil' | 'english'].deleteError);
    }
  };

  const cancelEdit = () => {
    setForm({
      year: new Date().getFullYear(),
      taxAmount: '',
      description: '',
      isActive: true,
      includePreviousYears: false
    });
    setEditingId(null);
    setErr(null);
    setMsg(null);
  };

  const handleBulkToggle = async (enableOutstanding: boolean) => {
    const action = enableOutstanding ? 'enable' : 'disable';
    if (!confirm(t[language as 'tamil' | 'english'].confirmDelete.replace('{{year}}', t[language as 'tamil' | 'english'].includePreviousYears).replace('delete', action))) {
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const response = await fetch('http://localhost:4000/api/tax-settings/bulk-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          includePreviousYears: enableOutstanding
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMsg(t[language as 'tamil' | 'english'].saveSuccess
          .replace('{{action}}', enableOutstanding ? 'enabled' : 'disabled')
          .replace('{{year}}', t[language as 'tamil' | 'english'].includePreviousYears));
        loadSettings();
        setTimeout(() => setMsg(null), 3000);
      } else {
        setErr(data.error || t[language as 'tamil' | 'english'].saveError);
      }
    } catch (error) {
      console.error('Error updating bulk settings:', error);
      setErr(t[language as 'tamil' | 'english'].saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t[language as 'tamil' | 'english'].loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {t[language as 'tamil' | 'english'].taxSettings} <span className="text-lg text-gray-600">/ {t[language as 'tamil' | 'english'].taxSettings}</span>
          </h1>
          <p className="text-gray-600 mt-2">{t[language as 'tamil' | 'english'].description}</p>
        </div>

        {/* Status Messages */}
        {msg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded">
            {msg}
          </div>
        )}
        
        {err && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
            {err}
          </div>
        )}

        {/* Outstanding Calculation Preview */}
        {settings.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📊 {t[language as 'tamil' | 'english'].currentYearTax} / {t[language as 'tamil' | 'english'].description}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">{t[language as 'tamil' | 'english'].currentYearTax}:</h4>
                <div className="space-y-1 text-sm">
                  {settings
                    .filter(s => s.include_previous_years && s.is_active && s.year < new Date().getFullYear())
                    .sort((a, b) => a.year - b.year)
                    .map(setting => (
                      <div key={setting.id} className="flex justify-between text-red-700">
                        <span>{setting.year} {t[language as 'tamil' | 'english'].taxAmount}:</span>
                        <span className="font-semibold">₹{setting.tax_amount.toLocaleString()}</span>
                      </div>
                    ))}
                  {settings.find(s => s.year === new Date().getFullYear() && s.is_active) && (
                    <div className="flex justify-between text-blue-700">
                      <span>{new Date().getFullYear()} {t[language as 'tamil' | 'english'].taxAmount}:</span>
                      <span className="font-semibold">
                        ₹{settings.find(s => s.year === new Date().getFullYear())?.tax_amount.toLocaleString() || '0'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-700 font-bold border-t pt-1">
                    <span>{t[language as 'tamil' | 'english'].description}:</span>
                    <span>
                      ₹{(
                        settings
                          .filter(s => s.include_previous_years && s.is_active && s.year < new Date().getFullYear())
                          .reduce((sum, s) => sum + s.tax_amount, 0) +
                        (settings.find(s => s.year === new Date().getFullYear() && s.is_active)?.tax_amount || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">{t[language as 'tamil' | 'english'].includePreviousYears}:</h4>
                <div className="flex flex-wrap gap-1">
                  {settings
                    .filter(s => s.include_previous_years && s.is_active)
                    .sort((a, b) => a.year - b.year)
                    .map(setting => (
                      <span key={setting.id} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        {setting.year}
                      </span>
                    ))}
                  {settings.filter(s => s.include_previous_years && s.is_active).length === 0 && (
                    <span className="text-gray-500 text-sm">{t[language as 'tamil' | 'english'].description}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingId ? t[language as 'tamil' | 'english'].edit : t[language as 'tamil' | 'english'].save}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language as 'tamil' | 'english'].currentYearTax} / {t[language as 'tamil' | 'english'].description} *
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2050"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.year}
                    onChange={e => setForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language as 'tamil' | 'english'].taxAmount} / {t[language as 'tamil' | 'english'].description} * (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.taxAmount}
                    onChange={e => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                    placeholder={t[language as 'tamil' | 'english'].description}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language as 'tamil' | 'english'].description}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t[language as 'tamil' | 'english'].description}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={form.isActive}
                      onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      {t[language as 'tamil' | 'english'].isActive}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includePreviousYears"
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      checked={form.includePreviousYears}
                      onChange={e => setForm(prev => ({ ...prev, includePreviousYears: e.target.checked }))}
                    />
                    <label htmlFor="includePreviousYears" className="ml-2 block text-sm text-gray-700">
                      {t[language as 'tamil' | 'english'].includePreviousYears}
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 {t[language as 'tamil' | 'english'].description}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? t[language as 'tamil' | 'english'].save : editingId ? t[language as 'tamil' | 'english'].edit : t[language as 'tamil' | 'english'].save}
                  </button>
                  
                  {editingId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-500 text-white font-medium rounded-md shadow hover:bg-gray-600"
                    >
                      {t[language as 'tamil' | 'english'].cancel}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Settings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {t[language as 'tamil' | 'english'].taxSettings} / {t[language as 'tamil' | 'english'].description}
                </h2>
                {settings.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkToggle(true)}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      title={t[language as 'tamil' | 'english'].includePreviousYears}
                    >
                      🔴 {t[language as 'tamil' | 'english'].includePreviousYears}
                    </button>
                    <button
                      onClick={() => handleBulkToggle(false)}
                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                      title={t[language as 'tamil' | 'english'].description}
                    >
                      ⚫ {t[language as 'tamil' | 'english'].description}
                    </button>
                  </div>
                )}
              </div>

              {settings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tax settings found.</p>
                  <p className="text-sm">Please add a new tax setting.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language as 'tamil' | 'english'].currentYearTax}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language as 'tamil' | 'english'].taxAmount}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language as 'tamil' | 'english'].description}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language as 'tamil' | 'english'].isActive}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language as 'tamil' | 'english'].includePreviousYears}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language as 'tamil' | 'english'].description}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {settings.map((setting) => (
                        <tr key={setting.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {setting.year}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{setting.tax_amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {setting.description || '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              setting.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {setting.is_active ? t[language as 'tamil' | 'english'].isActive : t[language as 'tamil' | 'english'].description}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              setting.include_previous_years 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {setting.include_previous_years ? t[language as 'tamil' | 'english'].includePreviousYears : t[language as 'tamil' | 'english'].description}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(setting)}
                                className="text-blue-600 hover:text-blue-900"
                                title={t[language as 'tamil' | 'english'].edit}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(setting.id, setting.year)}
                                className="text-red-600 hover:text-red-900"
                                title={t[language as 'tamil' | 'english'].delete}
                              >
                                🗑️
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
    </div>
  );
}