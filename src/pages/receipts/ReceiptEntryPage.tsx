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
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { token } = useAuth();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<ReceiptFormData>();
  const [ledgerNames, setLedgerNames] = useState<string[]>([]);
  const [fromBalance, setFromBalance] = useState<number | null>(null);

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

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
      const res = await fetch('/api/receipts/next-number', {
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
      // Receipt number will be generated on the server
      setValue('receiptNumber', '');
      setValue('type', 'income');
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
          const res = await fetch(`/api/receipts/${id}`, {
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
            title: t('Error', 'பிழை'),
            description: t('Failed to load receipt', 'ரசீது தரவை ஏற்ற முடியவில்லை'),
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
        toast({ title: t('Validation', 'சரிபார்ப்பு'), description: t('Please select a date', 'தேதியைத் தேர்ந்தெடுக்கவும்'), variant: 'destructive' });
        return;
      }
      if (!data.amount || Number(data.amount) <= 0) {
        toast({ title: t('Validation', 'சரிபார்ப்பு'), description: t('Amount must be greater than 0', 'தொகை 0-ஐ விட அதிகமாக இருக்க வேண்டும்'), variant: 'destructive' });
        return;
      }

      // Validate balance for expense entries
      if (data.type === 'expense') {
        const amt = Number(data.amount);
        if (!data.donor) {
          toast({ title: t('Validation', 'சரிபார்ப்பு'), description: t('Please select a From category for expense', 'செலவிற்கு வரவு (From) வகையைத் தேர்ந்தெடுக்கவும்'), variant: 'destructive' });
          return;
        }
        // Always fetch latest balance for donor (from journal)
        try {
          const latestBal = await journalService.getBalance(data.donor);
          if (!Number.isNaN(latestBal)) setFromBalance(latestBal);
          if (!Number.isNaN(latestBal)) {
            if (latestBal === 0) {
              toast({ title: t('No balance', 'இருப்பு இல்லை'), description: t('Selected account has zero balance', 'தேர்ந்தெடுத்த கணக்கில் இருப்பு இல்லை'), variant: 'destructive' });
              return;
            }
            if (amt > latestBal) {
              toast({ title: t('Insufficient balance', 'போதுமான இருப்பு இல்லை'), description: t('Expense amount exceeds available balance', 'செலவு தொகை கிடைக்கும் இருப்பை விட அதிகமாக உள்ளது'), variant: 'destructive' });
              return;
            }
          }
        } catch (err) {
          toast({ title: t('Error', 'பிழை'), description: t('Unable to verify balance. Please try again.', 'இருப்பை சரிபார்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'), variant: 'destructive' });
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

      const url = id ? `/api/receipts/${id}` : '/api/receipts';
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
        throw new Error(err.error || 'Failed to save receipt');
      }
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to save receipt');

      // Note: Journal entry will be created by backend mirror logic. Avoid creating here to prevent duplicates.

      toast({ title: t('Success', 'வெற்றி'), description: id ? t('Receipt updated', 'ரசீது புதுப்பிக்கப்பட்டது') : t('Receipt created', 'ரசீது உருவாக்கப்பட்டது') });

      if (!id) {
        reset();
        await fetchNextReceiptNumber();
        setValue('type', 'income');
      } else {
        navigate('/dashboard/receipts');
      }
    } catch (e) {
      console.error(e);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to submit receipt', 'ரசீதுவை சமர்ப்பிக்க முடியவில்லை'), variant: 'destructive' });
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

  if (isLoading) return <div className="p-8">Loading receipt...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded-md shadow text-sm">
      <Card className="w-full">
        <CardHeader className="py-2">
          <CardTitle className="text-xl font-semibold text-center">
            {t('Receipt Entry', 'வரவு/செலவு பதிவு')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="receiptNumber">{t('Receipt Number', 'ரசீது எண்')}</Label>
                <Input 
                  id="receiptNumber" 
                  readOnly 
                  className="bg-gray-100 h-8 px-2 text-sm" 
                  placeholder={t('Auto-generated', 'தானாக உருவாக்கப்படும்')} 
                  {...register('receiptNumber')} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">{t('Date', 'தேதி')} *</Label>
                <Input id="date" type="date" className="h-8 px-2 text-sm" {...register('date', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">{t('Type', 'Type')} *</Label>
                <select id="type" className="border rounded h-8 px-2 text-sm" {...register('type', { required: true, onChange: (e) => {
                  // If switching to expense, warn if amount already exceeds balance
                  const v = (document.getElementById('amount') as HTMLInputElement | null)?.value || '';
                  const amt = Number(v);
                  if (e?.target?.value === 'expense' && fromBalance !== null && amt > 0 && amt > fromBalance) {
                    toast({ title: t('Insufficient balance', 'போதுமான இருப்பு இல்லை'), description: t('Expense amount exceeds available balance', 'செலவு தொகை கிடைக்கும் இருப்பை விட அதிகமாக உள்ளது') });
                  }
                } })}>
                  <option value="income">{t('Income', 'வரவு')}</option>
                  <option value="expense">{t('Expense', 'செலவு')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">{t('Amount', 'தொகை')} *</Label>
                <Input id="amount" type="number" step="0.01" min="0" className="h-8 px-2 text-sm" placeholder={t('Enter amount', 'தொகையை உள்ளிடவும்')} {...register('amount', { required: true, onBlur: (e) => {
                  const amt = Number(e?.target?.value || 0);
                  const type = (document.getElementById('type') as HTMLSelectElement | null)?.value || 'income';
                  if (type === 'expense' && fromBalance !== null && amt > fromBalance) {
                    toast({ title: t('Insufficient balance', 'போதுமான இருப்பு இல்லை'), description: t('Expense amount exceeds available balance', 'செலவு தொகை கிடைக்கும் இருப்பை விட அதிகமாக உள்ளது') });
                  }
                } })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="donor">{t('From', 'வரவு பெயர்')}</Label>
                <select
                  id="donor"
                  className="border rounded h-8 px-2 w-full text-sm"
                  {...register('donor', {
                    onChange: async (e) => {
                      const under = e?.target?.value as string;
                      setFromBalance(null);
                      if (!under) return;
                      try {
                        const bal = await journalService.getBalance(under);
                        if (!Number.isNaN(bal)) {
                          setFromBalance(bal);
                          if (bal === 0) {
                            toast({
                              title: t('No balance', 'இருப்பு இல்லை'),
                              description: t('Selected account has zero balance', 'தேர்ந்தெடுத்த கணக்கில் இருப்பு இல்லை'),
                              variant: 'destructive',
                            });
                          }
                        }
                      } catch (err) {
                        // Silently ignore but reset balance view
                        setFromBalance(null);
                      }
                    }
                  })}
                >
                  <option value="">{t('Select name', 'பெயரைத் தேர்ந்தெடுக்கவும்')}</option>
                  {ledgerNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {fromBalance !== null && (
                  <p className="text-xs text-gray-600">
                    {t('Balance', 'இருப்பு')}: {fromBalance}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="receiver">{t('To', 'பெற்றவர்')}</Label>
                <select
                  id="receiver"
                  className="border rounded h-8 px-2 w-full text-sm"
                  {...register('receiver')}
                >
                  <option value="">{t('Select name', 'பெயரைத் தேர்ந்தெடுக்கவும்')}</option>
                  {ledgerNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* No datalist needed; both fields use select dropdowns */}
            <div className="space-y-1">
              <Label htmlFor="remarks">{t('Remarks', 'குறிப்பு')}</Label>
              <Textarea id="remarks" rows={2} className="text-sm" placeholder={t('Enter any remarks', 'கூடுதல் குறிப்புகள்')} {...register('remarks')} />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" className="h-8 px-3 text-sm" onClick={handleCancel} disabled={isSubmitting}>{t('Cancel', 'ரத்து செய்')}</Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-sm"
                onClick={() => {
                  // Read selected date field from the form inputs via DOM or fallback to today
                  const input = document.getElementById('date') as HTMLInputElement | null;
                  const d = input?.value || new Date().toISOString().slice(0,10);
                  navigate(`/dashboard/reports/daily?date=${d}`);
                }}
              >
                {t('Go to Daily Report', 'தினசரி அறிக்கைக்கு செல்ல')}
              </Button>
              <Button type="submit" disabled={isSubmitting || isSaveDisabledByBalance || isDonorMissingForExpense} className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed h-8 px-4 text-sm">
                {isSubmitting ? t('Saving...', 'சேமிக்கிறது...') : id ? t('Update Receipt', 'ரசீது புதுப்பிக்க') : t('Save Receipt', 'ரசீது சேமிக்க')}
              </Button>
              {(isSaveDisabledByBalance || isDonorMissingForExpense) && (
                <div className="text-sm text-red-600 flex items-center">
                  {isDonorMissingForExpense
                    ? t('Please select a From category for expense', 'செலவிற்கு வரவு (From) வகையைத் தேர்ந்தெடுக்கவும்')
                    : (isZeroBalance
                        ? t('Selected account has zero balance', 'தேர்ந்தெடுத்த கணக்கில் இருப்பு இல்லை')
                        : t('Expense amount exceeds available balance', 'செலவு தொகை கிடைக்கும் இருப்பை விட அதிகமாக உள்ளது'))}
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
