import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { ledgerService } from '@/services/ledgerService';
import { journalService } from '@/services/journalService';

// Receipt number will be generated on the server in YYYY-XXXX format

interface ReceiptFormData {
  receiptNumber: string;
  date: string;
  type: 'income' | 'expense';
  donor?: string; // தந்தவர்
  receiver?: string; // பெற்றவர்
  amount: string;
  remarks?: string;
}

export default function ReceiptEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { token } = useAuth();

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
      cancel: 'ரத்து செய்',
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
      remarksLabel: 'குறிப்பு'
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
      cancel: 'Cancel',
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
      remarksLabel: 'Remarks'
    }
  };

  // Translation function
  const t = (key: keyof typeof translations.english): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.english;
    return currentTranslations[key] || translations.english[key] || key;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<ReceiptFormData>();
  const [ledgerNames, setLedgerNames] = useState<string[]>([]);
  const [fromBalance, setFromBalance] = useState<number | null>(null);
  
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

  // Reusable helper to fetch the next receipt number from backend
  const fetchNextReceiptNumber = useCallback(async () => {
    try {
      if (id) return;
      const res = await fetch('https://tmsapi.xesstechlink.com/api/receipts/next-number', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const nextNo = data?.data?.nextNumber || data?.nextNumber || data?.number || '';
        if (nextNo) setValue('receiptNumber', String(nextNo));
      }
    } catch (e) {
      // Silently ignore; backend will still assign on save
      console.warn('Failed to fetch next receipt number');
    }
  }, [id, token, setValue]);

  useEffect(() => {
    if (!id) {
      // Set default values for new receipt
      setValue('receiptNumber', '');
      setValue('type', 'income');
      setValue('date', getTodayDate());
    }
  }, [id, setValue]);

  useEffect(() => {
    // For new receipt, fetch next number from backend (DB-derived)
    fetchNextReceiptNumber();
    setValue('type', 'income');

    if (id) {
      const fetchReceipt = async () => {
        try {
          setIsLoading(true);
          const res = await fetch(`https://tmsapi.xesstechlink.com/api/receipts/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to fetch receipt');
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch receipt');

          const d = result.data;
          const formData: ReceiptFormData = {
            // Backend column is register_no
            receiptNumber: d.register_no || d.receipt_number || '',
            date: d.date?.slice(0, 10) || '',
            // Backend stores 'receipt' for income and 'payment' for expense
            type: d.type === 'payment' ? 'expense' : 'income',
            // Backend columns are from_person/to_person
            donor: d.from_person || d.donor || '',
            receiver: d.to_person || d.receiver || '',
            amount: String(d.amount ?? ''),
            remarks: d.remarks || '',
          };
          reset(formData);
        } catch (e) {
          console.error(e);
          toast({
            title: t('saveError'),
            description: t('saveError'),
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchReceipt();
    }

    // Load distinct account names (journal accounts preferred)
    (async () => {
      try {
        let names: string[] = [];
        try {
          names = await journalService.getAccounts();
        } catch {
          names = await ledgerService.getNames();
        }
        setLedgerNames(names);
      } catch (e) {
        console.warn('Failed to load ledger names', e);
      }
    })();
  }, [id, reset, setValue, token, language]);

  const onSubmit = async (data: ReceiptFormData) => {
    try {
      setIsSubmitting(true);
      if (!data.date) {
        toast({ 
          title: t('saveError'), 
          description: t('requiredField'), 
          variant: 'destructive' 
        });
        return;
      }
      if (!data.amount || Number(data.amount) <= 0) {
        toast({ 
          title: t('saveError'), 
          description: t('invalidAmount'), 
          variant: 'destructive' 
        });
        return;
      }

      // Validate balance for expense entries
      if (data.type === 'expense') {
        const amt = Number(data.amount);
        if (!data.donor) {
          toast({ 
            title: t('saveError'), 
            description: t('requiredField'), 
            variant: 'destructive' 
          });
          return;
        }
        // Always fetch latest balance for donor (from journal)
        try {
          const latestBal = await journalService.getBalance(data.donor);
          if (!Number.isNaN(latestBal)) setFromBalance(latestBal);
          if (!Number.isNaN(latestBal)) {
            if (latestBal === 0) {
              toast({ 
                title: t('saveError'), 
                description: t('zeroBalance'), 
                variant: 'destructive' 
              });
              return;
            }
            if (amt > latestBal) {
              toast({ 
                title: t('saveError'), 
                description: t('exceedsBalance'), 
                variant: 'destructive' 
              });
              return;
            }
          }
        } catch (err) {
          toast({ 
            title: t('saveError'), 
            description: t('saveError'), 
            variant: 'destructive' 
          });
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

      const url = id ? `https://tmsapi.xesstechlink.com/api/receipts/${id}` : 'https://tmsapi.xesstechlink.com/api/receipts';
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

      // Note: Journal entry will be created by backend mirror logic. Avoid creating here to prevent duplicates.

      toast({ title: t('saveSuccess') });

      if (!id) {
        reset();
        await fetchNextReceiptNumber();
        setValue('type', 'income');
        setValue('date', getTodayDate()); // Set today's date after reset
      } else {
        navigate('/dashboard/receipts');
      }
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('saveError'), 
        description: t('saveError'), 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate('/dashboard/receipts');
    } else {
      reset();
      void fetchNextReceiptNumber();
      setValue('type', 'income');
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // If switching to expense, warn if amount already exceeds balance
    const amountInput = document.getElementById('amount') as HTMLInputElement | null;
    const v = amountInput?.value || '';
    const amt = Number(v);
    if (e?.target?.value === 'expense' && fromBalance !== null && amt > 0 && amt > fromBalance) {
      toast({ 
        title: t('saveError'), 
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
        title: t('saveError'), 
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
            title: t('saveError'),
            description: t('zeroBalance'),
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      // Silently ignore but reset balance view
      setFromBalance(null);
    }
  };

  const handleGoToDailyReport = () => {
    // Read selected date field from the form inputs via DOM or fallback to today
    const input = document.getElementById('date') as HTMLInputElement | null;
    const d = input?.value || new Date().toISOString().slice(0, 10);
    navigate(`/dashboard/reports/daily?date=${d}`);
  };

  if (isLoading) return <div className="p-8">{t('loading')}</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded-md shadow text-sm">
      <Card className="w-full">
        <CardHeader className="py-2">
          <CardTitle className="text-xl font-semibold text-center">
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="receiptNumber">{t('receiptNumber')}</Label>
                <Input 
                  id="receiptNumber" 
                  readOnly 
                  className="bg-gray-100 h-8 px-2 text-sm" 
                  placeholder={t('receiptNumber')} 
                  {...register('receiptNumber')} 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="date">{t('date')}</Label>
                <Input 
                  id="date" 
                  type="date" 
                  className="h-8 px-2 text-sm" 
                  {...register('date', { required: t('requiredField') })} 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="type">{t('type')}</Label>
                <select 
                  id="type" 
                  className="border rounded h-8 px-2 text-sm w-full" 
                  {...register('type', { 
                    required: t('requiredField'), 
                    onChange: handleTypeChange 
                  })}
                >
                  <option value="income">{t('income')}</option>
                  <option value="expense">{t('expense')}</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="amount">{t('amount')}</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  className="h-8 px-2 text-sm" 
                  placeholder={t('amount')} 
                  {...register('amount', { 
                    required: t('requiredField'), 
                    onBlur: handleAmountBlur 
                  })} 
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="donor">{t('donor')}</Label>
                <select
                  id="donor"
                  className="border rounded h-8 px-2 w-full text-sm"
                  {...register('donor', { onChange: handleDonorChange })}
                >
                  <option value="">{t('selectName')}</option>
                  {ledgerNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {fromBalance !== null && (
                  <p className="text-xs text-gray-600">
                    {t('balance')}: {fromBalance}
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="receiver">{t('receiver')}</Label>
                <select
                  id="receiver"
                  className="border rounded h-8 px-2 w-full text-sm"
                  {...register('receiver')}
                >
                  <option value="">{t('selectName')}</option>
                  {ledgerNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="remarks">{t('remarksLabel')}</Label>
              <Textarea 
                id="remarks" 
                rows={2} 
                className="text-sm" 
                placeholder={t('additionalRemarks')} 
                {...register('remarks')} 
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                className="h-8 px-3 text-sm" 
                onClick={handleCancel} 
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-sm"
                onClick={handleGoToDailyReport}
              >
                {t('goToDailyReport')}
              </Button>
              
              <Button 
                type="submit" 
                disabled={isSubmitting || isSaveDisabledByBalance || isDonorMissingForExpense} 
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed h-8 px-4 text-sm"
              >
                {isSubmitting 
                  ? t('saving')
                  : id 
                    ? t('updateReceipt')
                    : t('saveReceipt')}
              </Button>
              
              {(isSaveDisabledByBalance || isDonorMissingForExpense) && (
                <div className="text-sm text-red-600 flex items-center">
                  {isDonorMissingForExpense
                    ? t('selectFromCategory')
                    : (isZeroBalance
                        ? t('zeroBalance')
                        : t('exceedsBalance'))}
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
