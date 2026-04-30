import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { X } from 'lucide-react';
import { ledgerService } from '@/services/ledgerService';
import { journalService } from '@/services/journalService';
import { cn } from "@/lib/utils";
import { formFieldStyles, pageContainerStyles } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

interface ReceiptFormData {
  receiptNumber: string;
  date: string;
  type: 'income' | 'expense';
  donor?: string;
  receiver?: string;
  amount: string;
  remarks?: string;
}

// Custom hook for Enter key navigation
const useEnterKeyNavigation = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return; // allow buttons and textareas to handle Enter normally
    e.preventDefault();
    // Focus the save button
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
    }
  };

  return { formRef, handleKeyDown };
};

export default function ReceiptEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { token } = useAuth();
  const { formRef, handleKeyDown } = useEnterKeyNavigation();

  // Consistent field styling
  const fieldStyles = cn(theme.input.base, theme.input.size.md);
  const labelStyles = formFieldStyles.label;
  const selectStyles = cn(theme.select.base, theme.select.size.md);
  const textareaStyles = cn(theme.textarea.base, theme.textarea.size.md);

  // Unified translation object
  const translations = {
    english: {
      title: id ? 'ரசீதைத் திருத்தவும்' : 'புதிய ரசீது',
      receiptNumber: 'ரசீது எண்',
      date: 'தேதி',
      type: 'வகை',
      income: 'வரவு',
      expense: 'செலவு',
      donor: 'தந்தவர்',
      receiver: 'பெற்றவர்',
      amount: 'தொகை',
      remarks: 'குறிப்புகள்',
      save: 'சேமிக்கவும்',
     
      saveSuccess: 'ரசீது வெற்றிகரமாக சேமிக்கப்பட்டது',
      saveError: 'ரசீதை சேமிக்க முடியவில்லை',
      invalidAmount: 'செல்லுபடியான தொகையை உள்ளிடவும்',
      requiredField: 'இது தேவையான புலம்',
      loading: 'ஏற்றுகிறது...',
      balance: 'இருப்பு',
      selectName: 'பெயரைத் தேர்ந்தெடுக்கவும்',
      additionalRemarks: 'கூடுதல் குறிப்புகள்',
      goToDailyReport: 'தினசரி அறிக்கைக்கு செல்ல',
      saving: 'சேமிக்கிறது...',
      updateReceipt: 'ரசீது புதுப்பிக்க',
      saveReceipt: 'ரசீது சேமிக்க',
      selectFromCategory: 'செலவிற்கு வரவு (From) வகையைத் தேர்ந்தெடுக்கவும்',
      zeroBalance: 'தேர்ந்தெடுத்த கணக்கில் இருப்பு இல்லை',
      exceedsBalance: 'செலவு தொகை கிடைக்கும் இருப்பை விட அதிகமாக உள்ளது',
      remarksLabel: 'குறிப்பு',
      receiptDetails: 'ரசீது விவரங்கள்',
      clear: 'அழி',
      success: 'வெற்றி',
      error: 'பிழை',
      
    },
    tamil: {
      title: id ? 'Edit Receipt' : 'New Receipt',
      receiptNumber: 'Receipt Number',
      date: 'Date',
      type: 'Type',
      income: 'Income',
      expense: 'Expense',
      donor: 'Donor',
      receiver: 'Receiver',
      amount: 'Amount',
      remarks: 'Remarks',
      save: 'Save',
     
      saveSuccess: 'Receipt saved successfully',
      saveError: 'Failed to save receipt',
      invalidAmount: 'Please enter a valid amount',
      requiredField: 'This field is required',
      loading: 'Loading...',
      balance: 'Balance',
      selectName: 'Select name',
      additionalRemarks: 'Enter any remarks',
      goToDailyReport: 'Go to Daily Report',
      saving: 'Saving...',
      updateReceipt: 'Update Receipt',
      saveReceipt: 'Save Receipt',
      selectFromCategory: 'Please select a From category for expense',
      zeroBalance: 'Selected account has zero balance',
      exceedsBalance: 'Expense amount exceeds available balance',
      remarksLabel: 'Remarks',
      receiptDetails: 'Receipt Details',
      clear: 'Clear',
      success: 'Success',
      error: 'Error',
    }
  };

  // Translation function
  const t = (key: keyof typeof translations.english): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.english;
    return currentTranslations[key] || translations.english[key] || key;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<ReceiptFormData>();
  const [ledgerNames, setLedgerNames] = useState<string[]>([]);
  const [fromBalance, setFromBalance] = useState<number | null>(null);
  const [selectedDonor, setSelectedDonor] = useState<string>('');
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');

  const isEdit = Boolean(id);
  
  // Function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Derived UI state to control Save button availability
  const typeValue = watch('type');
  const amountValue = watch('amount');
  const donorValue = watch('donor');
  const isExpense = typeValue === 'expense';
  const amountNum = Number(amountValue || 0);
  const isBalanceKnown = fromBalance !== null && !Number.isNaN(fromBalance as number);
  const exceedsBalance = isExpense && isBalanceKnown && amountNum > 0 && amountNum > (fromBalance as number);
  const isZeroBalance = isExpense && isBalanceKnown && (fromBalance as number) === 0;
  const isDonorMissingForExpense = isExpense && (!donorValue || donorValue.trim() === '');
  const isSaveDisabledByBalance = exceedsBalance || isZeroBalance;

  // Auto-dismiss success messages
  useEffect(() => {
    if (message && !isError) {
      const timer = setTimeout(() => {
        setMessage(undefined);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, isError]);

  // Reusable helper to fetch the next receipt number from backend
  const fetchNextReceiptNumber = useCallback(async () => {
    try {
      if (id) return;
      const res = await fetch('https://templeapi.agniplay.com/api/receipts/next-number', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const nextNo = data?.data?.nextNumber || data?.nextNumber || data?.number || '';
        if (nextNo) setValue('receiptNumber', String(nextNo));
      }
    } catch (e) {
      console.warn('Failed to fetch next receipt number');
    }
  }, [id, token, setValue]);

  useEffect(() => {
    if (!id) {
      setValue('receiptNumber', '');
      setValue('type', 'income');
      setValue('date', getTodayDate());
    }
  }, [id, setValue]);

  useEffect(() => {
    fetchNextReceiptNumber();
    setValue('type', 'income');

    if (id) {
      const fetchReceipt = async () => {
        try {
          setIsLoading(true);
          const res = await fetch(`https://templeapi.agniplay.com/api/receipts/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to fetch receipt');
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch receipt');

          const d = result.data;
          const normalize = (s: any) => String(s ?? '').trim();
          const formData: ReceiptFormData = {
            receiptNumber: d.register_no || d.receipt_number || '',
            date: d.date?.slice(0, 10) || '',
            type: d.type === 'payment' ? 'expense' : 'income',
            donor: normalize(d.from_person || d.donor || ''),
            receiver: normalize(d.to_person || d.receiver || ''),
            amount: String(d.amount ?? ''),
            remarks: d.remarks || '',
          };
          reset(formData);

          const curDonor = formData.donor || '';
          const curReceiver = formData.receiver || '';
          setSelectedDonor(curDonor);
          setSelectedReceiver(curReceiver);
          if (curDonor || curReceiver) {
            setLedgerNames((prev) => {
              const merged = new Set(prev);
              if (curDonor) merged.add(curDonor);
              if (curReceiver) merged.add(curReceiver);
              return Array.from(merged);
            });
          }
          setValue('donor', curDonor as any);
          setValue('receiver', curReceiver as any);
        } catch (e) {
          console.error(e);
          setIsError(true);
          setMessage(t('saveError'));
        } finally {
          setIsLoading(false);
        }
      };
      fetchReceipt();
    }

    // Load distinct account names
    (async () => {
      try {
        let names: string[] = [];
        try {
          names = await journalService.getAccounts();
        } catch {
          names = await ledgerService.getNames();
        }
        const normalize = (s: any) => String(s ?? '').trim();
        const merged = Array.from(new Set([
          ...names.map((n) => normalize(n)),
          ...(selectedDonor ? [normalize(selectedDonor)] : []),
          ...(selectedReceiver ? [normalize(selectedReceiver)] : []),
        ]));
        setLedgerNames(merged);
        if (selectedDonor) setValue('donor', normalize(selectedDonor) as any);
        if (selectedReceiver) setValue('receiver', normalize(selectedReceiver) as any);
      } catch (e) {
        console.warn('Failed to load ledger names', e);
      }
    })();
  }, [id, reset, setValue, token, language]);

  // When ledgerNames update, ensure current selected values are present and selected
  useEffect(() => {
    const normalize = (s: any) => String(s ?? '').trim();
    const curDonor = normalize(selectedDonor);
    const curReceiver = normalize(selectedReceiver);
    if (curDonor && !ledgerNames.includes(curDonor)) {
      setLedgerNames((prev) => Array.from(new Set([...prev, curDonor])));
    }
    if (curReceiver && !ledgerNames.includes(curReceiver)) {
      setLedgerNames((prev) => Array.from(new Set([...prev, curReceiver])));
    }
    if (curDonor) setValue('donor', curDonor as any);
    if (curReceiver) setValue('receiver', curReceiver as any);
  }, [ledgerNames, selectedDonor, selectedReceiver, setValue]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  const onSubmit = async (data: ReceiptFormData) => {
    try {
      setIsSubmitting(true);
      setMessage(undefined);
      setIsError(false);

      if (!data.date) {
        setIsError(true);
        setMessage(t('requiredField'));
        return;
      }
      if (!data.amount || Number(data.amount) <= 0) {
        setIsError(true);
        setMessage(t('invalidAmount'));
        return;
      }

      // Validate balance for expense entries
      if (data.type === 'expense') {
        const amt = Number(data.amount);
        if (!data.donor) {
          setIsError(true);
          setMessage(t('requiredField'));
          return;
        }
        try {
          const latestBal = await journalService.getBalance(data.donor);
          if (!Number.isNaN(latestBal)) setFromBalance(latestBal);
          if (!Number.isNaN(latestBal)) {
            if (latestBal === 0) {
              setIsError(true);
              setMessage(t('zeroBalance'));
              return;
            }
            if (amt > latestBal) {
              setIsError(true);
              setMessage(t('exceedsBalance'));
              return;
            }
          }
        } catch (err) {
          setIsError(true);
          setMessage(t('saveError'));
          return;
        }
      }

      const payload = {
        receiptNumber: data.receiptNumber,
        date: data.date,
        type: data.type,
        donor: data.donor || '',
        receiver: data.receiver || '',
        amount: Number(data.amount),
        remarks: data.remarks || '',
      };

      const url = id ? `https://templeapi.agniplay.com/api/receipts/${id}` : 'https://templeapi.agniplay.com/api/receipts';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('saveError'));
      }
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error || t('saveError'));

      setIsError(false);
      setMessage(t('saveSuccess'));
      toast({ title: t('saveSuccess') });

      if (!id) {
        reset();
        await fetchNextReceiptNumber();
        setValue('type', 'income');
        setValue('date', getTodayDate());
      } else {
        setTimeout(() => {
          navigate('/dashboard/receipt/list');
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      setIsError(true);
      setMessage(t('saveError'));
      toast({ 
        title: t('error'), 
        description: t('saveError'), 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate('/dashboard/receipt/list');
    } else {
      reset();
      void fetchNextReceiptNumber();
      setValue('type', 'income');
    }
  };

  const handleClear = () => {
    reset({
      receiptNumber: '',
      date: getTodayDate(),
      type: 'income',
      donor: '',
      receiver: '',
      amount: '',
      remarks: ''
    });
    void fetchNextReceiptNumber();
    setMessage(undefined);
    setIsError(false);
    setFromBalance(null);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const amountInput = document.getElementById('amount') as HTMLInputElement | null;
    const v = amountInput?.value || '';
    const amt = Number(v);
    if (e?.target?.value === 'expense' && fromBalance !== null && amt > 0 && amt > fromBalance) {
      toast({ 
        title: t('error'), 
        description: t('exceedsBalance'), 
        variant: 'destructive' 
      });
    }
  };

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const amt = Number(e?.target?.value || 0);
    const typeSelect = document.getElementById('type') as HTMLSelectElement | null;
    const type = typeSelect?.value || 'income';
    if (type === 'expense' && fromBalance !== null && amt > fromBalance) {
      toast({ 
        title: t('error'), 
        description: t('exceedsBalance'), 
        variant: 'destructive' 
      });
    }
  };

  const handleDonorChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const under = e?.target?.value as string;
    setFromBalance(null);
    if (!under) return;
    
    try {
      const bal = await journalService.getBalance(under);
      if (!Number.isNaN(bal)) {
        setFromBalance(bal);
        if (bal === 0) {
          toast({
            title: t('error'),
            description: t('zeroBalance'),
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      setFromBalance(null);
    }
  };

  const handleGoToDailyReport = () => {
    const input = document.getElementById('date') as HTMLInputElement | null;
    const d = input?.value || new Date().toISOString().slice(0, 10);
    navigate(`/dashboard/reports/daily?date=${d}`);
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {t('title')}
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Message Display */}
            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertTitle>{isError ? t('error') : t('success')}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-8">
              {/* Receipt Details Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  {t('receiptDetails')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Receipt Number */}
                  <div>
                    <Input
                      id="receiptNumber"
                      readOnly
                      className={`${fieldStyles} bg-gray-100`}
                      placeholder={t('receiptNumber')}
                      {...register('receiptNumber')}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <Input
                      id="date"
                      type="date"
                      className={fieldStyles}
                      placeholder={t('date')}
                      {...register('date', { required: t('requiredField') })}
                      autoFocus
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <div className="relative">
                      <select
                        id="type"
                        className={selectStyles}
                        {...register('type', { 
                          required: t('requiredField'), 
                          onChange: handleTypeChange 
                        })}
                      >
                        <option value="">{t('type')}</option>
                        <option value="income">{t('income')}</option>
                        <option value="expense">{t('expense')}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className={fieldStyles}
                      placeholder={`${t('amount')} (₹)`}
                      {...register('amount', { 
                        required: t('requiredField'), 
                        onBlur: handleAmountBlur 
                      })}
                    />
                  </div>

                  {/* Donor */}
                  <div>
                    <div className="relative">
                      <select
                        id="donor"
                        className={selectStyles}
                        {...register('donor', { onChange: handleDonorChange })}
                      >
                        <option value="">{t('donor')}</option>
                        {ledgerNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {fromBalance !== null && (
                      <p className="mt-1 text-sm text-blue-600 flex items-center">
                        <span className="mr-1">💰</span>
                        {t('balance')}: ₹{fromBalance.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Receiver */}
                  <div>
                    <div className="relative">
                      <select
                        id="receiver"
                        className={selectStyles}
                        {...register('receiver')}
                      >
                        <option value="">{t('receiver')}</option>
                        {ledgerNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Remarks - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <Textarea
                      id="remarks"
                      rows={3}
                      className={textareaStyles}
                      placeholder={t('remarksLabel')}
                      {...register('remarks')}
                    />
                  </div>
                </div>
              </div>

              {/* Validation Messages */}
              {(isSaveDisabledByBalance || isDonorMissingForExpense) && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>{t('error')}</AlertTitle>
                  <AlertDescription>
                    {isDonorMissingForExpense
                      ? t('selectFromCategory')
                      : (isZeroBalance
                          ? t('zeroBalance')
                          : t('exceedsBalance'))}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  {/* Keyboard shortcut hint */}
                  <div className="text-sm text-gray-500 hidden md:flex items-center">
                   
                  </div>
                </div>
                
                <div className="flex gap-3">


                 

                 
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClear}
                      className="px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                  
                  <Button
                    type="submit"
                    size="default"
                    className="px-8 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md min-w-[140px]"
                    disabled={isSubmitting || isSaveDisabledByBalance || isDonorMissingForExpense}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('saving')}
                      </div>
                    ) : (
                      isEdit ? t('updateReceipt') : t('saveReceipt')
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
