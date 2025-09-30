import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { accountingService, JournalEntry, JournalEntryLine, Account } from '@/services/accountingService';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { Plus, Trash2, Calculator } from 'lucide-react';

export default function JournalEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { token } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = Boolean(id);
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [formData, setFormData] = useState<Omit<JournalEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    description: '',
    total_amount: 0,
    entries: [
      { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
      { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' }
    ]
  });

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (!formRef.current) return;
      
      const focusableElements = formRef.current.querySelectorAll(
        'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly]), button:not([disabled])'
      );
      
      const currentElement = document.activeElement;
      const currentIndex = Array.from(focusableElements).indexOf(currentElement as Element);
      
      if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
        nextElement.focus();
      }
    }
  };

  useEffect(() => {
    loadAccounts();
    generateReferenceNumber();
    
    if (isEdit && id) {
      loadJournalEntry(parseInt(id));
    }
  }, [id, isEdit]);

  const loadAccounts = async () => {
    try {
      const data = await accountingService.getAccounts();
      setAccounts(data.filter(acc => acc.is_active));
    } catch (error) {
      console.error('Error loading accounts:', error);
      setIsError(true);
      setMessage(t('Failed to load accounts', 'கணக்குகளை ஏற்ற முடியவில்லை'));
    }
  };

  const loadJournalEntry = async (entryId: number) => {
    try {
      setLoading(true);
      const entry = await accountingService.getJournalEntry(entryId);
      setFormData({
        date: entry.date,
        reference_number: entry.reference_number,
        description: entry.description,
        total_amount: entry.total_amount,
        entries: entry.entries
      });
    } catch (error) {
      console.error('Error loading journal entry:', error);
      setIsError(true);
      setMessage(t('Failed to load journal entry', 'பதிவேட்டு பதிவை ஏற்ற முடியவில்லை'));
    } finally {
      setLoading(false);
    }
  };

  const generateReferenceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getTime()).slice(-6);
    setFormData(prev => ({ ...prev, reference_number: `JE${year}${month}${day}${time}` }));
  };

  const addEntryLine = () => {
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' }]
    }));
  };

  const removeEntryLine = (index: number) => {
    if (formData.entries.length <= 2) return; // Minimum 2 lines required
    
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const updateEntryLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map((entry, i) => 
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const calculateTotals = () => {
    const totalDebits = formData.entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = formData.entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01;

    return { totalDebits, totalCredits, difference, isBalanced };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);
    setIsError(false);

    try {
      // Validation
      if (!formData.date || !formData.description) {
        throw new Error(t('Please fill all required fields', 'தேவையான அனைத்து புலங்களையும் நிரப்பவும்'));
      }

      if (formData.entries.length < 2) {
        throw new Error(t('At least 2 entry lines are required', 'குறைந்தது 2 பதிவு வரிகள் தேவை'));
      }

      // Check if all entries have accounts selected
      const invalidEntries = formData.entries.filter(entry => 
        !entry.account_id || (entry.debit_amount === 0 && entry.credit_amount === 0)
      );

      if (invalidEntries.length > 0) {
        throw new Error(t('All entry lines must have an account and amount', 'அனைத்து பதிவு வரிகளிலும் கணக்கு மற்றும் தொகை இருக்க வேண்டும்'));
      }

      const { isBalanced } = calculateTotals();
      if (!isBalanced) {
        throw new Error(t('Journal entry is not balanced. Debits must equal credits.', 'பதிவேட்டு பதிவு சமநிலையில் இல்லை. பற்று மற்றும் வரவு சமமாக இருக்க வேண்டும்.'));
      }

      // Calculate total amount
      const totalAmount = formData.entries.reduce((sum, entry) => sum + entry.debit_amount, 0);
      const entryData = { ...formData, total_amount: totalAmount };

      if (isEdit && id) {
        await accountingService.updateJournalEntry(parseInt(id), entryData);
        setMessage(t('Journal entry updated successfully', 'பதிவேட்டு பதிவு வெற்றிகரமாக புதுப்பிக்கப்பட்டது'));
      } else {
        await accountingService.createJournalEntry(entryData);
        setMessage(t('Journal entry created successfully', 'பதிவேட்டு பதிவு வெற்றிகரமாக உருவாக்கப்பட்டது'));
        
        // Reset form for new entry
        setFormData({
          date: new Date().toISOString().slice(0, 10),
          reference_number: '',
          description: '',
          total_amount: 0,
          entries: [
            { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
            { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' }
          ]
        });
        generateReferenceNumber();
      }

      setIsError(false);
    } catch (error: any) {
      console.error('Error saving journal entry:', error);
      setIsError(true);
      setMessage(error.message || t('Failed to save journal entry', 'பதிவேட்டு பதிவை சேமிக்க முடியவில்லை'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/accounting/journal-entries');
  };

  const { totalDebits, totalCredits, difference, isBalanced } = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('Loading...', 'ஏற்றுகிறது...')}</p>
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
              {isEdit ? t('Edit Journal Entry', 'பதிவேட்டு பதிவைத் திருத்து') : t('New Journal Entry', 'புதிய பதிவேட்டு பதிவு')}
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

            <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="date">{t('Date', 'தேதி')} *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className={formFieldStyles.input}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reference_number">{t('Reference Number', 'குறிப்பு எண்')} *</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    className={formFieldStyles.input}
                    placeholder={t('Enter reference number', 'குறிப்பு எண்ணை உள்ளிடவும்')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t('Description', 'விளக்கம்')} *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={formFieldStyles.input}
                    placeholder={t('Enter description', 'விளக்கத்தை உள்ளிடவும்')}
                    required
                  />
                </div>
              </div>

              {/* Journal Entry Lines */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {t('Journal Entry Lines', 'பதிவேட்டு பதிவு வரிகள்')}
                  </h3>
                  <Button
                    type="button"
                    onClick={addEntryLine}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('Add Line', 'வரி சேர்க்க')}
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Account', 'கணக்கு')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Description', 'விளக்கம்')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Debit', 'பற்று')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Credit', 'வரவு')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Action', 'செயல்')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.entries.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <select
                              value={entry.account_id || ''}
                              onChange={(e) => updateEntryLine(index, 'account_id', parseInt(e.target.value) || 0)}
                              className={cn(formFieldStyles.select, "min-w-[200px]")}
                              required
                            >
                              <option value="">{t('Select Account', 'கணக்கைத் தேர்ந்தெடுக்கவும்')}</option>
                              {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={entry.description || ''}
                              onChange={(e) => updateEntryLine(index, 'description', e.target.value)}
                              className={formFieldStyles.input}
                              placeholder={t('Line description', 'வரி விளக்கம்')}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.debit_amount || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                updateEntryLine(index, 'debit_amount', value);
                                if (value > 0) {
                                  updateEntryLine(index, 'credit_amount', 0);
                                }
                              }}
                              className={cn(formFieldStyles.input, "text-right")}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.credit_amount || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                updateEntryLine(index, 'credit_amount', value);
                                if (value > 0) {
                                  updateEntryLine(index, 'debit_amount', 0);
                                }
                              }}
                              className={cn(formFieldStyles.input, "text-right")}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {formData.entries.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeEntryLine(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right font-semibold">
                          {t('Totals', 'மொத்தம்')}:
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{totalDebits.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{totalCredits.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isBalanced 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <Calculator className="h-3 w-3 mr-1" />
                            {isBalanced ? t('Balanced', 'சமநிலை') : t('Unbalanced', 'சமநிலையற்ற')}
                          </div>
                        </td>
                      </tr>
                      {!isBalanced && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-red-600 text-sm">
                            {t('Difference', 'வேறுபாடு')}: ₹{difference.toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  {t('Cancel', 'ரத்து')}
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !isBalanced}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('Saving...', 'சேமிக்கிறது...')}
                    </div>
                  ) : (
                    isEdit ? t('Update Entry', 'பதிவை புதுப்பிக்க') : t('Create Entry', 'பதிவை உருவாக்க')
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}