import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { ledgerService } from '@/services/ledgerService';
import axios from 'axios';

type LedgerEntry = {
  date: string;
  name: string;
  under: string;
  currentBalance: number;
  address: string;
  city: string;
  phone: string;
  mobile: string;
  email: string;
  note: string;
  type: 'credit' | 'debit';
  amount: number;
};

export default function LedgerEntryPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    formState: { errors } 
  } = useForm<LedgerEntry>({
    defaultValues: {
      type: 'credit',
      currentBalance: 0
    }
  });

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setValue('date', today);
    
    // Fetch current balance when component mounts
    const fetchBalance = async () => {
      try {
        const balance = await ledgerService.getCurrentBalance();
        setCurrentBalance(balance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        toast({
          title: t('Error', 'பிழை'),
          description: t('Failed to load current balance', 'தற்போதைய இருப்பை ஏற்ற முடியவில்லை'),
          variant: 'destructive',
        });
      }
    };
    
    fetchBalance();
  }, [setValue, t]);

  const onSubmit = async (data: LedgerEntry) => {
    setIsSubmitting(true);
    try {
      // Prepare the entry data
      const entryData = {
        date: data.date,
        name: data.name,
        under: data.under,
        address: data.address,
        city: data.city,
        phone: data.phone,
        mobile: data.mobile,
        email: data.email,
        note: data.note,
        type: data.type,
        amount: Number(data.amount)
      };

      // Call the ledger service to create the entry
      await ledgerService.createEntry(entryData);
      
      // Update the current balance
      const newBalance = await ledgerService.getCurrentBalance();
      setCurrentBalance(newBalance);
      
      toast({
        title: t('Success', 'வெற்றி'),
        description: t('Ledger entry saved successfully', 'பதிவேடு பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது'),
      });
      
      // Redirect back to the previous page after a short delay
      setTimeout(() => navigate(-1), 1000);
      
    } catch (error) {
      console.error('Error saving ledger entry:', error);
      let errorMessage = t('Failed to save ledger entry', 'பதிவேடு பதிவை சேமிக்க முடியவில்லை');
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      }
      
      toast({
        title: t('Error', 'பிழை'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="border-b pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">
                {t('Ledger Entry', 'பதிவேடு பதிவு')}
              </CardTitle>
              <div className="flex items-center mt-1">
                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  type="date"
                  {...register('date')}
                  className="w-auto p-0 border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {t('Current Balance', 'தற்போதைய இருப்பு')}
              </div>
              <div className="text-2xl font-bold">
                ₹{currentBalance?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('Basic Information', 'அடிப்படை தகவல்')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Name', 'பெயர்')}*</Label>
                  <Input
                    {...register('name', { required: t('Name is required', 'பெயர் தேவை') })}
                    placeholder={t('Enter name', 'பெயரை உள்ளிடவும்')}
                    className="w-full"
                    autoFocus
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('Under', 'அடியில்')}</Label>
                  <Input
                    {...register('under')}
                    placeholder={t('Enter under', 'அடியில் உள்ளிடவும்')}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Transaction */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium">{t('Transaction', 'பரிவர்த்தனை')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('Transaction Type', 'பரிவர்த்தனை வகை')}*</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={watch('type') === 'credit' ? 'default' : 'outline'}
                      onClick={() => setValue('type', 'credit')}
                      className="h-12"
                    >
                      {t('Credit', 'கடன்')}
                    </Button>
                    <Button
                      type="button"
                      variant={watch('type') === 'debit' ? 'default' : 'outline'}
                      onClick={() => setValue('type', 'debit')}
                      className="h-12"
                    >
                      {t('Debit', 'பற்று')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('Amount', 'தொகை')}*</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      {...register('amount', { 
                        required: t('Amount is required', 'தொகை தேவை'), 
                        min: { value: 0, message: t('Amount must be positive', 'தொகை நேர்மறையாக இருக்க வேண்டும்') }
                      })}
                      placeholder="0.00"
                      className="pl-8 text-xl h-14"
                    />
                  </div>
                  {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium">{t('Contact Information', 'தொடர்பு தகவல்')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Address', 'முகவரி')}</Label>
                  <Input
                    {...register('address')}
                    placeholder={t('Enter address', 'முகவரியை உள்ளிடவும்')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('City/Town', 'ஊர்/நகரம்')}</Label>
                  <Input
                    {...register('city')}
                    placeholder={t('Enter city/town', 'ஊர்/நகரத்தை உள்ளிடவும்')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Phone', 'தொலைபேசி எண்')}</Label>
                  <Input
                    type="tel"
                    {...register('phone')}
                    placeholder={t('Phone number', 'தொலைபேசி எண்')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Mobile', 'கைபேசி எண்')}</Label>
                  <Input
                    type="tel"
                    {...register('mobile')}
                    placeholder={t('Mobile number', 'கைபேசி எண்')}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    {...register('email')}
                    placeholder={t('Email address', 'மின்னஞ்சல் முகவரி')}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 pt-4">
              <Label>{t('Notes', 'குறிப்பு')}</Label>
              <Textarea
                {...register('note')}
                placeholder={t('Enter any additional notes', 'கூடுதல் குறிப்புகளை உள்ளிடவும்')}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button 
                type="submit" 
                className="min-w-[160px] bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('Saving...', 'சேமிக்கிறது...')}
                  </>
                ) : t('Save & Exit', 'பதிவு வெளியே')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
