import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

export default function TaxSettingsPage() {
  const { user, token } = useAuth();
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
      const response = await fetch('/api/tax-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || []);
      } else {
        setErr('Failed to load tax settings');
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
      setErr('Error loading tax settings');
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
      setErr('Tax amount is required and must be greater than 0');
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const response = await fetch('/api/tax-settings', {
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
        setMsg(`Tax setting ${data.action} successfully for year ${form.year}`);
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
        setErr(data.error || 'Failed to save tax setting');
      }
    } catch (error) {
      console.error('Error saving tax setting:', error);
      setErr('Error saving tax setting');
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
    if (!confirm(`Are you sure you want to delete tax setting for year ${year}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tax-settings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setMsg(`Tax setting for year ${year} deleted successfully`);
        loadSettings();
        setTimeout(() => setMsg(null), 3000);
      } else {
        const data = await response.json();
        setErr(data.error || 'Failed to delete tax setting');
      }
    } catch (error) {
      console.error('Error deleting tax setting:', error);
      setErr('Error deleting tax setting');
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
    if (!confirm(`Are you sure you want to ${action} outstanding calculation for ALL tax years?`)) {
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const response = await fetch('/api/tax-settings/bulk-toggle', {
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
        setMsg(`Successfully ${enableOutstanding ? 'enabled' : 'disabled'} outstanding calculation for all years`);
        loadSettings();
        setTimeout(() => setMsg(null), 3000);
      } else {
        setErr(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating bulk settings:', error);
      setErr('Error updating bulk settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tax settings...</p>
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
            Tax Settings <span className="text-lg text-gray-600">/ வரி அமைப்புகள்</span>
          </h1>
          <p className="text-gray-600 mt-2">Configure tax amounts for different years</p>
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
              📊 Outstanding Calculation Preview / நிலுவை கணக்கீடு முன்னோட்டம்
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">For New User Joining in {new Date().getFullYear()}:</h4>
                <div className="space-y-1 text-sm">
                  {settings
                    .filter(s => s.include_previous_years && s.is_active && s.year < new Date().getFullYear())
                    .sort((a, b) => a.year - b.year)
                    .map(setting => (
                      <div key={setting.id} className="flex justify-between text-red-700">
                        <span>{setting.year} Outstanding:</span>
                        <span className="font-semibold">₹{setting.tax_amount.toLocaleString()}</span>
                      </div>
                    ))}
                  {settings.find(s => s.year === new Date().getFullYear() && s.is_active) && (
                    <div className="flex justify-between text-blue-700">
                      <span>{new Date().getFullYear()} Current:</span>
                      <span className="font-semibold">
                        ₹{settings.find(s => s.year === new Date().getFullYear())?.tax_amount.toLocaleString() || '0'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-700 font-bold border-t pt-1">
                    <span>Total Due:</span>
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
                <h4 className="font-medium text-blue-800 mb-2">Years Included in Outstanding:</h4>
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
                    <span className="text-gray-500 text-sm">No years enabled for outstanding calculation</span>
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
                {editingId ? 'Edit Tax Setting' : 'Add Tax Setting'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year / வருடம் *
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
                    Tax Amount / வரி தொகை * (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.taxAmount}
                    onChange={e => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                    placeholder="Enter tax amount"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description / விளக்கம்
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
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
                      Active / செயலில்
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
                      Include in Previous Years Calculation / முந்தைய ஆண்டு கணக்கீட்டில் சேர்க்க
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 If enabled, this year's tax will be added to new registrations if user didn't pay in this year
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update' : 'Add Setting'}
                  </button>
                  
                  {editingId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-500 text-white font-medium rounded-md shadow hover:bg-gray-600"
                    >
                      Cancel
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
                  Tax Settings List / வரி அமைப்புகள் பட்டியல்
                </h2>
                {settings.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkToggle(true)}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      title="Enable all years for outstanding calculation"
                    >
                      🔴 Enable All Outstanding
                    </button>
                    <button
                      onClick={() => handleBulkToggle(false)}
                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                      title="Disable all years from outstanding calculation"
                    >
                      ⚫ Disable All Outstanding
                    </button>
                  </div>
                )}
              </div>

              {settings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tax settings configured yet</p>
                  <p className="text-sm">Add your first tax setting using the form</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year / வருடம்
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tax Amount / வரி தொகை
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description / விளக்கம்
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status / நிலை
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Include Previous / முந்தைய ஆண்டு
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions / செயல்கள்
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
                              {setting.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              setting.include_previous_years 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {setting.include_previous_years ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(setting)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(setting.id, setting.year)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
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