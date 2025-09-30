import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { accountingService, Account } from '@/services/accountingService';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

export default function AccountManagementPage() {
  const { language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const accountTypes = [
    { value: 'ALL', label: t('All Types', 'அனைத்து வகைகள்') },
    { value: 'ASSET', label: t('Assets', 'சொத்துக்கள்') },
    { value: 'LIABILITY', label: t('Liabilities', 'கடன்கள்') },
    { value: 'EQUITY', label: t('Equity', 'சொந்த மூலதனம்') },
    { value: 'INCOME', label: t('Income', 'வருமானம்') },
    { value: 'EXPENSE', label: t('Expenses', 'செலவுகள்') }
  ];

  const accountCategories = {
    ASSET: [
      t('Current Assets', 'நடப்பு சொத்துக்கள்'),
      t('Fixed Assets', 'நிலையான சொத்துக்கள்'),
      t('Investments', 'முதலீடுகள்')
    ],
    LIABILITY: [
      t('Current Liabilities', 'நடப்பு கடன்கள்'),
      t('Long-term Liabilities', 'நீண்ட கால கடன்கள்')
    ],
    EQUITY: [
      t('Owner Equity', 'உரிமையாளர் மூலதனம்'),
      t('Retained Earnings', 'தக்கவைக்கப்பட்ட வருமானம்')
    ],
    INCOME: [
      t('Operating Income', 'செயல்பாட்டு வருமானம்'),
      t('Other Income', 'மற்ற வருமானம்')
    ],
    EXPENSE: [
      t('Operating Expenses', 'செயல்பாட்டு செலவுகள்'),
      t('Administrative Expenses', 'நிர்வாக செலவுகள்'),
      t('Other Expenses', 'மற்ற செலவுகள்')
    ]
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm, selectedType]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountingService.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setIsError(true);
      setMessage(t('Failed to load accounts', 'கணக்குகளை ஏற்ற முடியவில்லை'));
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = accounts;

    if (selectedType !== 'ALL') {
      filtered = filtered.filter(account => account.type === selectedType);
    }

    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAccounts(filtered);
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowCreateModal(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowCreateModal(true);
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(t('Are you sure you want to delete this account?', 'இந்த கணக்கை நீக்க விரும்புகிறீர்களா?'))) {
      return;
    }

    try {
      await accountingService.deleteAccount(account.id);
      setMessage(t('Account deleted successfully', 'கணக்கு வெற்றிகரமாக நீக்கப்பட்டது'));
      setIsError(false);
      loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsError(true);
      setMessage(t('Failed to delete account', 'கணக்கை நீக்க முடியவில்லை'));
    }
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      ASSET: 'bg-green-100 text-green-800',
      LIABILITY: 'bg-red-100 text-red-800',
      EQUITY: 'bg-blue-100 text-blue-800',
      INCOME: 'bg-purple-100 text-purple-800',
      EXPENSE: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('Loading accounts...', 'கணக்குகளை ஏற்றுகிறது...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white", formFieldStyles.card.header)}>
            <CardTitle className="text-2xl font-bold text-center">
              {t('Account Management', 'கணக்கு மேலாண்மை')}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {/* Message Display */}
            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={t('Search accounts...', 'கணக்குகளைத் தேடு...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className={formFieldStyles.select}
                >
                  {accountTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleCreateAccount}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('New Account', 'புதிய கணக்கு')}
              </Button>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Code', 'குறியீடு')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Name', 'பெயர்')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Type', 'வகை')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Category', 'பிரிவு')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Initial Balance', 'ஆரம்ப இருப்பு')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Current Balance', 'தற்போதைய இருப்பு')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions', 'செயல்கள்')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {account.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {account.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(account.type)}`}>
                          {account.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {account.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(account.initial_balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(account.current_balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAccount(account)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAccount(account)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {t('No accounts found', 'கணக்குகள் இல்லை')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Account Modal */}
        {showCreateModal && (
          <AccountFormModal
            account={editingAccount}
            accountCategories={accountCategories}
            onClose={() => {
              setShowCreateModal(false);
              setEditingAccount(null);
            }}
            onSave={() => {
              setShowCreateModal(false);
              setEditingAccount(null);
              loadAccounts();
              setMessage(editingAccount 
                ? t('Account updated successfully', 'கணக்கு வெற்றிகரமாக புதுப்பிக்கப்பட்டது')
                : t('Account created successfully', 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது')
              );
              setIsError(false);
            }}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// Account Form Modal Component
interface AccountFormModalProps {
  account: Account | null;
  accountCategories: any;
  onClose: () => void;
  onSave: () => void;
  t: (en: string, ta: string) => string;
}

function AccountFormModal({ account, accountCategories, onClose, onSave, t }: AccountFormModalProps) {
  const [formData, setFormData] = useState({
    code: account?.code || '',
    name: account?.name || '',
    type: account?.type || 'ASSET',
    category: account?.category || '',
    initial_balance: account?.initial_balance || 0,
    is_active: account?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(undefined);

    try {
      if (account) {
        await accountingService.updateAccount(account.id, formData);
      } else {
        await accountingService.createAccount(formData);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || t('Failed to save account', 'கணக்கை சேமிக்க முடியவில்லை'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={account ? t('Edit Account', 'கணக்கைத் திருத்து') : t('Create Account', 'கணக்கை உருவாக்கு')}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="code">{t('Account Code', 'கணக்கு குறியீடு')} *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder={t('Enter account code', 'கணக்கு குறியீட்டை உள்ளிடவும்')}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">{t('Account Name', 'கணக்கு பெயர்')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('Enter account name', 'கணக்கு பெயரை உள்ளிடவும்')}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">{t('Account Type', 'கணக்கு வகை')} *</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any, category: '' }))}
              className={formFieldStyles.select}
              required
            >
              <option value="ASSET">{t('Asset', 'சொத்து')}</option>
              <option value="LIABILITY">{t('Liability', 'கடன்')}</option>
              <option value="EQUITY">{t('Equity', 'சொந்த மூலதனம்')}</option>
              <option value="INCOME">{t('Income', 'வருமானம்')}</option>
              <option value="EXPENSE">{t('Expense', 'செலவு')}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="category">{t('Category', 'பிரிவு')} *</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className={formFieldStyles.select}
              required
            >
              <option value="">{t('Select category', 'பிரிவைத் தேர்ந்தெடுக்கவும்')}</option>
              {accountCategories[formData.type]?.map((category: string) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="initial_balance">{t('Initial Balance', 'ஆரம்ப இருப்பு')}</Label>
            <Input
              id="initial_balance"
              type="number"
              step="0.01"
              value={formData.initial_balance}
              onChange={(e) => setFormData(prev => ({ ...prev, initial_balance: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {t('Active Account', 'செயலில் உள்ள கணக்கு')}
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t('Cancel', 'ரத்து')}
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'சேமிக்க')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}