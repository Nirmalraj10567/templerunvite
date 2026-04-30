import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/language';
import {
  Loader2,
  Save,
  ArrowLeft,
  FileText,
  User,
  Phone,
  CreditCard,
  Calendar,
  DollarSign,
  AlignLeft,
} from 'lucide-react';
import { daybookService, DaybookFormData, DaybookEntry } from '@/services/daybookService';
import { cn, pageContainerStyles, formFieldStyles } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

export default function DaybookEntryPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { language } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [showSavedModal, setShowSavedModal] = useState(false);

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<DaybookFormData>({
    defaultValues: {
      entry_type: 'income',
      payment_mode: 'cash',
      entry_date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      party_name: '',
      party_mobile: '',
      notes: '',
    },
  });

  const watchAmount = watch('amount');
  const watchEntryType = watch('entry_type');
  const watchPaymentMode = watch('payment_mode');

  // Field styles with theme
  const fieldStyles = cn(
    theme.input.base,
    'text-base h-11 py-2.5'
  );
  const labelStyles = formFieldStyles.label;

  // Button variants
  const buttonVariants = {
    primary: cn(
      formFieldStyles.button.primary,
      'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
    ),
    outline: cn(
      theme.input.base,
      'hover:bg-gray-50'
    ),
  };

  // Handle Enter key to move to next field
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

  // Load existing entry for editing
  useEffect(() => {
    if (!isEditMode) return;

    const loadEntry = async () => {
      try {
        setIsLoading(true);
        const response = await daybookService.getEntry(parseInt(id!));
        const entry = response.data;

        setValue('entry_date', entry.entry_date);
        setValue('entry_type', entry.entry_type);
        setValue('description', entry.description);
        setValue('amount', entry.amount.toString());
        setValue('payment_mode', entry.payment_mode);
        setValue('party_name', entry.party_name || '');
        setValue('party_mobile', entry.party_mobile || '');
        setValue('notes', entry.notes || '');
        setReceiptNumber(entry.receipt_number);
      } catch (error) {
        console.error('Error loading entry:', error);
        toast.error(t('Failed to load entry', 'உள்ளீட்டை ஏற்றுவதில் தோல்வி'));
        navigate('/daybook/list');
      } finally {
        setIsLoading(false);
      }
    };

    loadEntry();
  }, [id, isEditMode, setValue, navigate, t]);

  // Fetch next receipt number for new entries
  useEffect(() => {
    if (isEditMode) return;

    const fetchReceiptNumber = async () => {
      try {
        const response = await daybookService.getNextReceiptNumber();
        setReceiptNumber(response.receipt_number);
      } catch (error) {
        console.error('Error fetching receipt number:', error);
      }
    };

    fetchReceiptNumber();
  }, [isEditMode]);

  // Format amount display
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Form submission
  const onSubmit = async (data: DaybookFormData) => {
    try {
      setIsSubmitting(true);

      // Convert amount to number
      const submitData = {
        ...data,
        amount: parseFloat(data.amount),
        party_mobile: data.party_mobile || undefined,
        party_name: data.party_name || undefined,
        notes: data.notes || undefined,
      };

      if (isEditMode) {
        await daybookService.updateEntry(parseInt(id!), submitData);
        toast.success(t('Entry updated successfully', 'உள்ளீடு வெற்றிகரமாக புதுப்பிக்கப்பட்டது'));
      } else {
        await daybookService.createEntry(submitData);
        toast.success(t('Entry created successfully', 'உள்ளீடு வெற்றிகரமாக உருவாக்கப்பட்டது'));
      }

      setShowSavedModal(true);
      setTimeout(() => {
        navigate('/daybook/list');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving entry:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error(
          isEditMode
            ? t('Failed to update entry', 'உள்ளீட்டை புதுப்பிப்பதில் தோல்வி')
            : t('Failed to create entry', 'உள்ளீட்டை உருவாக்குவதில் தோல்வி')
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={pageContainerStyles}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerStyles}>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/daybook/list')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('Back to List', 'பட்டியலுக்கு திரும்பு')}
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          {isEditMode ? t('Edit Daybook Entry', 'டேபுக் உள்ளீட்டை திருத்து') : t('New Daybook Entry', 'புதிய டேபுக் உள்ளீடு')}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode
            ? t('Update daybook transaction details', 'டேபுக் பரிவர்த்தனை விவரங்களை புதுப்பிக்கவும்')
            : t('Record a new income, expense, or journal entry', 'புதிய வருமானம், செலவு அல்லது ஜர்னல் உள்ளீட்டை பதிவு செய்யவும்')}
        </p>
      </div>

      {/* Receipt Number */}
      {receiptNumber && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {t('Receipt Number:', 'ரசீது எண்:')}
              </span>
              <span className="text-lg font-bold text-blue-700">{receiptNumber}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('Transaction Details', 'பரிவர்த்தனை விவரங்கள்')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Entry Date */}
                <div>
                  <Label className={labelStyles}>
                    <Calendar className="h-4 w-4 inline mr-2" />
                    {t('Entry Date *', 'உள்ளீடு தேதி *')}
                  </Label>
                  <Input
                    type="date"
                    {...register('entry_date', { required: t('Date is required', 'தேதி தேவை') })}
                    className={cn(fieldStyles, errors.entry_date && 'border-red-500')}
                  />
                  {errors.entry_date && (
                    <p className="text-sm text-red-600 mt-1">{errors.entry_date.message}</p>
                  )}
                </div>

                {/* Entry Type */}
                <div>
                  <Label className={labelStyles}>
                    {t('Entry Type *', 'உள்ளீடு வகை *')}
                  </Label>
                  <Select
                    value={watchEntryType}
                    onValueChange={(value) => setValue('entry_type', value as any)}
                  >
                    <SelectTrigger className={cn(fieldStyles, errors.entry_type && 'border-red-500')}>
                      <SelectValue placeholder={t('Select type', 'வகையை தேர்ந்தெடுக்கவும்')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {t('Income', 'வருமானம்')}
                        </div>
                      </SelectItem>
                      <SelectItem value="expense">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          {t('Expense', 'செலவு')}
                        </div>
                      </SelectItem>
                      <SelectItem value="journal">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {t('Journal', 'ஜர்னல்')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.entry_type && (
                    <p className="text-sm text-red-600 mt-1">{errors.entry_type.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label className={labelStyles}>
                    <AlignLeft className="h-4 w-4 inline mr-2" />
                    {t('Description *', 'விளக்கம் *')}
                  </Label>
                  <Textarea
                    {...register('description', { required: t('Description is required', 'விளக்கம் தேவை') })}
                    className={cn(fieldStyles, 'resize-none', errors.description && 'border-red-500')}
                    placeholder={t('Enter transaction description...', 'பரிவர்த்தனை விளக்கத்தை உள்ளிடுக...')}
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <Label className={labelStyles}>
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    {t('Amount *', 'தொகை *')}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('amount', {
                      required: t('Amount is required', 'தொகை தேவை'),
                      validate: (value) => {
                        const num = parseFloat(value);
                        if (isNaN(num) || num <= 0) {
                          return t('Amount must be greater than 0', 'தொகை 0 ஐ விட அதிகமாக இருக்க வேண்டும்');
                        }
                        return true;
                      },
                    })}
                    className={cn(fieldStyles, errors.amount && 'border-red-500')}
                    placeholder={t('Enter amount...', 'தொகையை உள்ளிடுக...')}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                  )}
                  {watchAmount && (
                    <p className="text-sm text-gray-600 mt-1">
                      {formatAmount(watchAmount)}
                    </p>
                  )}
                </div>

                {/* Payment Mode */}
                <div>
                  <Label className={labelStyles}>
                    <CreditCard className="h-4 w-4 inline mr-2" />
                    {t('Payment Mode *', 'கட்டண முறை *')}
                  </Label>
                  <Select
                    value={watchPaymentMode}
                    onValueChange={(value) => setValue('payment_mode', value as any)}
                  >
                    <SelectTrigger className={fieldStyles}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t('Cash', 'பணம்')}</SelectItem>
                      <SelectItem value="card">{t('Card', 'அட்டை')}</SelectItem>
                      <SelectItem value="upi">{t('UPI', 'UPI')}</SelectItem>
                      <SelectItem value="cheque">{t('Cheque', 'காசோலை')}</SelectItem>
                      <SelectItem value="bank_transfer">{t('Bank Transfer', 'வங்கி பரிமாற்றம்')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Party Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('Party Details', 'தரப்பினர் விவரங்கள்')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Party Name */}
                <div>
                  <Label className={labelStyles}>
                    <User className="h-4 w-4 inline mr-2" />
                    {t('Party Name', 'தரப்பினர் பெயர்')}
                  </Label>
                  <Input
                    {...register('party_name')}
                    className={fieldStyles}
                    placeholder={t('Enter party name...', 'தரப்பினர் பெயரை உள்ளிடுக...')}
                  />
                </div>

                {/* Party Mobile */}
                <div>
                  <Label className={labelStyles}>
                    <Phone className="h-4 w-4 inline mr-2" />
                    {t('Mobile Number', 'கைபேசி எண்')}
                  </Label>
                  <Input
                    {...register('party_mobile', {
                      validate: (value) => {
                        if (!value) return true;
                        const cleaned = value.replace(/\s/g, '');
                        if (!/^\d{10}$/.test(cleaned)) {
                          return t('Invalid mobile number (must be 10 digits)', 'தவறான கைபேசி எண் (10 இலக்கமாக இருக்க வேண்டும்)');
                        }
                        return true;
                      },
                    })}
                    className={fieldStyles}
                    placeholder={t('10-digit mobile number...', '10-இலக்க கைபேசி எண்...')}
                  />
                  {errors.party_mobile && (
                    <p className="text-sm text-red-600 mt-1">{errors.party_mobile.message}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label className={labelStyles}>
                    <AlignLeft className="h-4 w-4 inline mr-2" />
                    {t('Notes', 'குறிப்புகள்')}
                  </Label>
                  <Textarea
                    {...register('notes')}
                    className={cn(fieldStyles, 'resize-none')}
                    placeholder={t('Additional notes (optional)...', 'கூடுதல் குறிப்புகள் (விருப்பத்தேர்வு)...')}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/daybook/list')}
            className={buttonVariants.outline}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('Cancel', 'ரத்து')}
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className={buttonVariants.primary}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? t('Updating...', 'புதுப்பிக்கிறது...') : t('Saving...', 'சேமிக்கிறது...')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? t('Update Entry', 'உள்ளீட்டை புதுப்பி') : t('Save Entry', 'உள்ளீட்டை சேமி')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
