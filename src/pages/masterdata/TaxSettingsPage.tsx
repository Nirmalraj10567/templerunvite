import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

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
    inactive: "செயலில் இல்லை",
    includePreviousYears: "முந்தைய ஆண்டுகளை உள்ளடக்கு",
    notIncluded: "உள்ளடக்கப்படவில்லை",
    save: "சேமி",
    cancel: "ரத்து செய்",
    edit: "திருத்து",
    delete: "நீக்கு",
    actions: "செயல்கள்",
    year: "ஆண்டு",
    confirmDelete: "ஆண்டு {{year}}க்கான வரி அமைப்பை நீக்க வேண்டுமா?",
    taxAmountRequired: "வரி தொகை தேவை மற்றும் 0க்கு மேல் இருக்க வேண்டும்",
    saveSuccess: "வரி அமைப்பு {{year}} ஆண்டுக்கு வெற்றிகரமாக {{action}} செய்யப்பட்டது",
    saveError: "வரி அமைப்பை சேமிக்க பிழை",
    loadError: "வரி அமைப்புகளை ஏற்ற பிழை",
    deleteSuccess: "{{year}} ஆண்டுக்கான வரி அமைப்பு வெற்றிகரமாக நீக்கப்பட்டது",
    deleteError: "வரி அமைப்பை நீக்க பிழை",
    loading: "ஏற்றுகிறது...",
    noDataFound: "வரி அமைப்புகள் கிடைக்கவில்லை",
    addNewSetting: "புதிய வரி அமைப்பை சேர்க்கவும்",
    outstandingCalculation: "நிலுவை கணக்கீடு முன்னோட்டம்",
    outstandingYears: "நிலுவை ஆண்டுகள்",
    totalOutstanding: "மொத்த நிலுவை",
    enableOutstanding: "நிலுவையை செயல்படுத்து",
    disableOutstanding: "நிலுவையை முடக்கு",
    updated: "புதுப்பிக்கப்பட்டது",
    created: "உருவாக்கப்பட்டது",
    enabled: "செயல்படுத்தப்பட்டது",
    disabled: "முடக்கப்பட்டது"
  },
  tamil: {
    taxSettings: "Tax Settings",
    currentYearTax: "Current Year Tax",
    taxAmount: "Tax Amount",
    description: "Description",
    isActive: "Is Active",
    inactive: "Inactive",
    includePreviousYears: "Include Previous Years",
    notIncluded: "Not Included",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    year: "Year",
    confirmDelete: "Are you sure you want to delete tax setting for year {{year}}?",
    taxAmountRequired: "Tax amount is required and must be greater than 0",
    saveSuccess: "Tax setting {{action}} successfully for year {{year}}",
    saveError: "Error saving tax setting",
    loadError: "Error loading tax settings",
    deleteSuccess: "Tax setting for year {{year}} deleted successfully",
    deleteError: "Error deleting tax setting",
    loading: "Loading...",
    noDataFound: "No tax settings found",
    addNewSetting: "Please add a new tax setting",
    outstandingCalculation: "Outstanding Calculation Preview",
    outstandingYears: "Outstanding Years",
    totalOutstanding: "Total Outstanding",
    enableOutstanding: "Enable Outstanding",
    disableOutstanding: "Disable Outstanding",
    updated: "updated",
    created: "created",
    enabled: "enabled",
    disabled: "disabled"
  }
} as const;

export default function TaxSettingsPage() {
  const { user, token } = useAuth();
  const { language } = useLanguage();
  
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

  // Get current language translations
  const currentLang = language as 'tamil' | 'english';
  const translations = t[currentLang];

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
        setErr(translations.loadError);
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
      setErr(translations.loadError);
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
      setErr(translations.taxAmountRequired);
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const url = editingId 
        ? `http://localhost:4000/api/tax-settings/${editingId}`
        : 'http://localhost:4000/api/tax-settings';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
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
        const actionText = editingId ? translations.updated : translations.created;
        setMsg(translations.saveSuccess
          .replace('{{action}}', actionText)
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
        setErr(data.error || translations.saveError);
      }
    } catch (error) {
      console.error('Error saving tax setting:', error);
      setErr(translations.saveError);
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
      includePreviousYears: setting.include_previous_years || false
    });
    setEditingId(setting.id);
    setErr(null);
    setMsg(null);
  };

  const handleDelete = async (id: number, year: number) => {
    if (!confirm(translations.confirmDelete.replace('{{year}}', year.toString()))) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/tax-settings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setMsg(translations.deleteSuccess.replace('{{year}}', year.toString()));
        loadSettings();
        setTimeout(() => setMsg(null), 3000);
      } else {
        const data = await response.json();
        setErr(data.error || translations.deleteError);
      }
    } catch (error) {
      console.error('Error deleting tax setting:', error);
      setErr(translations.deleteError);
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
    const actionText = enableOutstanding ? translations.enableOutstanding : translations.disableOutstanding;
    if (!confirm(`${actionText}?`)) {
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
        const actionText = enableOutstanding ? translations.enabled : translations.disabled;
        setMsg(translations.saveSuccess
          .replace('{{action}}', actionText)
          .replace('{{year}}', translations.includePreviousYears));
        loadSettings();
        setTimeout(() => setMsg(null), 3000);
      } else {
        setErr(data.error || translations.saveError);
      }
    } catch (error) {
      console.error('Error updating bulk settings:', error);
      setErr(translations.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{translations.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.card.header}>
          <CardTitle className="text-lg font-bold w-full">
            {translations.taxSettings}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
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
                📊 {translations.outstandingCalculation}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">{translations.totalOutstanding}:</h4>
                  <div className="space-y-1 text-sm">
                    {settings
                      .filter(s => s.include_previous_years && s.is_active && s.year < new Date().getFullYear())
                      .sort((a, b) => a.year - b.year)
                      .map(setting => (
                        <div key={setting.id} className="flex justify-between text-red-700">
                          <span>{setting.year} {translations.taxAmount}:</span>
                          <span className="font-semibold">₹{setting.tax_amount.toLocaleString()}</span>
                        </div>
                      ))}
                    {settings.find(s => s.year === new Date().getFullYear() && s.is_active) && (
                      <div className="flex justify-between text-blue-700">
                        <span>{new Date().getFullYear()} {translations.taxAmount}:</span>
                        <span className="font-semibold">
                          ₹{settings.find(s => s.year === new Date().getFullYear())?.tax_amount.toLocaleString() || '0'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-green-700 font-bold border-t pt-1">
                      <span>{translations.totalOutstanding}:</span>
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
                  <h4 className="font-medium text-blue-800 mb-2">{translations.outstandingYears}:</h4>
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
                      <span className="text-gray-500 text-sm">{translations.noDataFound}</span>
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
                  {editingId ? translations.edit : translations.save}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations.year} *
                    </label>
                    <input
                      type="number"
                      min="2020"
                      max="2050"
                      className={cn(theme.input.base, "w-full px-3 py-2 rounded-md")}
                      value={form.year}
                      onChange={e => setForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations.taxAmount} * (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={cn(theme.input.base, "w-full px-3 py-2 rounded-md")}
                      value={form.taxAmount}
                      onChange={e => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                      placeholder="Enter tax amount"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations.description}
                    </label>
                    <textarea
                      className={cn(theme.input.base, "w-full px-3 py-2 rounded-md")}
                      rows={3}
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        className={cn(theme.input.base, "h-4 w-4 text-blue-600 rounded")}
                        checked={form.isActive}
                        onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                        {translations.isActive}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="includePreviousYears"
                        className={cn(theme.input.base, "h-4 w-4 text-red-600 rounded")}
                        checked={form.includePreviousYears}
                        onChange={e => setForm(prev => ({ ...prev, includePreviousYears: e.target.checked }))}
                      />
                      <label htmlFor="includePreviousYears" className="ml-2 block text-sm text-gray-700">
                        {translations.includePreviousYears}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      💡 Check this to include this year in outstanding calculations
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? translations.loading : editingId ? translations.edit : translations.save}
                    </button>
                    
                    {editingId && (
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-500 text-white font-medium rounded-md shadow hover:bg-gray-600"
                      >
                        {translations.cancel}
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
                    {translations.taxSettings}
                  </h2>
                  {settings.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBulkToggle(true)}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        title={translations.enableOutstanding}
                      >
                        🔴 {translations.enableOutstanding}
                      </button>
                      <button
                        onClick={() => handleBulkToggle(false)}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        title={translations.disableOutstanding}
                      >
                        ⚫ {translations.disableOutstanding}
                      </button>
                    </div>
                  )}
                </div>

                {settings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>{translations.noDataFound}</p>
                    <p className="text-sm">{translations.addNewSetting}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {translations.year}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {translations.taxAmount}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {translations.description}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {translations.isActive}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {translations.includePreviousYears}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {translations.actions}
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
                                {setting.is_active ? translations.isActive : translations.inactive}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                setting.include_previous_years 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {setting.include_previous_years ? translations.includePreviousYears : translations.notIncluded}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(setting)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title={translations.edit}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(setting.id, setting.year)}
                                  className="text-red-600 hover:text-red-900"
                                  title={translations.delete}
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
        </CardContent>
      </Card>
    </div>
  );
}
