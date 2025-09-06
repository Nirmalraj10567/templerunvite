import React, { useEffect, useState } from 'react';
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

const generateReceiptNo = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

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
  const { register, handleSubmit, reset, setValue } = useForm<ReceiptFormData>();

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  useEffect(() => {
    setValue('receiptNumber', generateReceiptNo());
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
            receiptNumber: d.receipt_number,
            date: d.date?.slice(0, 10) || '',
            type: d.type === 'expense' ? 'expense' : 'income',
            donor: d.donor || '',
            receiver: d.receiver || '',
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

      toast({ title: t('Success', 'வெற்றி'), description: id ? t('Receipt updated', 'ரசீது புதுப்பிக்கப்பட்டது') : t('Receipt created', 'ரசீது உருவாக்கப்பட்டது') });

      if (!id) {
        reset();
        setValue('receiptNumber', generateReceiptNo());
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
      setValue('receiptNumber', generateReceiptNo());
      setValue('type', 'income');
    }
  };

  if (isLoading) return <div className="p-8">Loading receipt...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {t('Receipt Entry', 'வரவு/செலவு பதிவு')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="receiptNumber">{t('Receipt Number', 'ரசீது எண்')} *</Label>
                <Input id="receiptNumber" readOnly className="bg-gray-100" {...register('receiptNumber', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t('Date', 'தேதி')} *</Label>
                <Input id="date" type="date" {...register('date', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('Type', 'Type')} *</Label>
                <select id="type" className="border rounded h-10 px-3" {...register('type', { required: true })}>
                  <option value="income">{t('Income', 'வரவு')}</option>
                  <option value="expense">{t('Expense', 'செலவு')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t('Amount', 'தொகை')} *</Label>
                <Input id="amount" type="number" step="0.01" min="0" placeholder={t('Enter amount', 'தொகையை உள்ளிடவும்')} {...register('amount', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donor">{t('Donor', 'தந்தவர்')}</Label>
                <Input id="donor" placeholder={t('Enter donor name', 'தந்தவர் பெயரை உள்ளிடவும்')} {...register('donor')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver">{t('Receiver', 'பெற்றவர்')}</Label>
                <Input id="receiver" placeholder={t('Enter receiver name', 'பெற்றவர் பெயரை உள்ளிடவும்')} {...register('receiver')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">{t('Remarks', 'குறிப்பு')}</Label>
              <Textarea id="remarks" rows={3} placeholder={t('Enter any remarks', 'கூடுதல் குறிப்புகள்')} {...register('remarks')} />
            </div>
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>{t('Cancel', 'ரத்து செய்')}</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                {isSubmitting ? t('Saving...', 'சேமிக்கிறது...') : id ? t('Update Receipt', 'ரசீது புதுப்பிக்க') : t('Save Receipt', 'ரசீது சேமிக்க')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
