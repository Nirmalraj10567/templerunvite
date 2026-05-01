import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  PartyPopper, 
  IndianRupee, 
  Hash,
  MessageSquare,
  Users,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { theme } from '@/styles/theme';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';

interface FormState {
  registerNo: string;
  date: string;
  time: string;
  event: string;
  groomName: string;
  brideName: string;
  address: string;
  village: string;
  guardianName: string;
  witnessOne: string;
  witnessTwo: string;
  remarks: string;
  amount: string;
}

const initialState: FormState = {
  registerNo: '',
  date: '',
  time: (() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  })(),
  event: '',
  groomName: '',
  brideName: '',
  address: '',
  village: '',
  guardianName: '',
  witnessOne: '',
  witnessTwo: '',
  remarks: '',
  amount: ''
};

export default function MarriageEntryPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { token } = useAuth();
  const { language } = useLanguage();
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [message, setMessage] = useState<string|undefined>();
  const [isError, setIsError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  // Load existing data for editing
  useEffect(() => {
    if (!isEditMode) return;
    const loadEntry = async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://templeapi.agniplay.com/api/marriages/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const entry = data.data || data;
        setForm({
          registerNo: entry.register_no || '',
          date: entry.date || '',
          time: entry.time || '',
          event: entry.event || '',
          groomName: entry.groom_name || '',
          brideName: entry.bride_name || '',
          address: entry.address || '',
          village: entry.village || '',
          guardianName: entry.guardian_name || '',
          witnessOne: entry.witness_one || '',
          witnessTwo: entry.witness_two || '',
          remarks: entry.remarks || '',
          amount: entry.amount?.toString() || ''
        });
      } catch (err) {
        console.error('Error loading marriage entry:', err);
        setMessage(t('Failed to load entry', 'உள்ளீட்டை ஏற்றுவதில் தோல்வி'));
      } finally {
        setLoading(false);
      }
    };
    loadEntry();
  }, [id, isEditMode, token, t]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    const tag = target.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return;
    e.preventDefault();
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);
    setIsError(false);
    try {
      const url = isEditMode
        ? `https://templeapi.agniplay.com/api/marriages/${id}`
        : 'https://templeapi.agniplay.com/api/marriages';
      const method = isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed');
      if (!isEditMode) {
        setForm({
          ...initialState,
          time: (() => {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          })()
        });
      }
      setMessage(t(
        isEditMode ? 'Updated successfully' : 'Saved successfully',
        isEditMode ? 'வெற்றிகரமாக புதுப்பிக்கப்பட்டது' : 'வெற்றிகரமாக சேமிக்கப்பட்டது'
      ));
      if (isEditMode) {
        setTimeout(() => navigate('/dashboard/marriage/list'), 1500);
      }
    } catch (err) {
      setIsError(true);
      setMessage(t(
        isEditMode ? 'Update failed' : 'Save failed',
        isEditMode ? 'புதுப்பிப்பதில் தோல்வி' : 'சேமிப்பில் தோல்வி'
      ));
    } finally {
      setSaving(false);
    }
  };

  const fieldStyles = cn(
    theme.input.base,
    theme.input.size.md,
    "w-full bg-white transition-all duration-200 pl-10"
  );

  if (loading) {
    return (
      <div className={pageContainerStyles.container}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <div className="flex items-center gap-2">
                {isEditMode && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard/marriage/list')}
                    className="mb-0"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('Back', 'திரும்பு')}
                  </Button>
                )}
                <CardTitle className={theme.header.main}>
                  <PartyPopper className="inline-block mr-2 w-6 h-6" />
                  {isEditMode
                    ? t('Edit Marriage Entry', 'திருமண பதிவை திருத்து')
                    : t('Marriage Register Entry', 'திருமண பதிவு பதிவு')}
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {message && (
              <div className={cn(
                "mb-6 p-4 rounded-lg border flex items-center text-sm font-medium",
                isError ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
              )}>
                {isError ? "❌" : "✅"} {message}
              </div>
            )}

            <form ref={formRef} onSubmit={onSubmit} className="space-y-6" onKeyDown={handleKeyDown}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Register No */}
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="registerNo" 
                    value={form.registerNo} 
                    onChange={onChange} 
                    placeholder={t('Register No *', 'பதிவு எண் *')}
                    required
                    autoFocus 
                  />
                </div>

                {/* Date */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    type="date" 
                    className={fieldStyles} 
                    name="date" 
                    value={form.date} 
                    onChange={onChange}
                    required 
                  />
                </div>

                {/* Time */}
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <input 
                    type="time" 
                    className={fieldStyles} 
                    name="time" 
                    value={form.time} 
                    onChange={onChange} 
                    onClick={(e) => (e.target as any).showPicker?.()} 
                  />
                </div>

                {/* Event */}
                <div className="relative">
                  <PartyPopper className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="event" 
                    value={form.event} 
                    onChange={onChange} 
                    placeholder={t('Event *', 'நிகழ்வு *')}
                    required
                  />
                </div>

                {/* Amount */}
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    type="number" 
                    min="0" 
                    className={fieldStyles} 
                    name="amount" 
                    value={form.amount} 
                    onChange={onChange} 
                    placeholder={t('Amount *', 'தொகை *')}
                    required
                  />
                </div>

                {/* Groom Name */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="groomName" 
                    value={form.groomName} 
                    onChange={onChange} 
                    placeholder={t('Groom Name *', 'வரன் பெயர் *')}
                    required
                  />
                </div>

                {/* Bride Name */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-pink-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="brideName" 
                    value={form.brideName} 
                    onChange={onChange} 
                    placeholder={t('Bride Name *', 'மணமகள் பெயர் *')}
                    required
                  />
                </div>

                {/* Village */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="village" 
                    value={form.village} 
                    onChange={onChange} 
                    placeholder={t('Village', 'கிராமம்')}
                  />
                </div>

                {/* Guardian Name */}
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="guardianName" 
                    value={form.guardianName} 
                    onChange={onChange} 
                    placeholder={t('Guardian Name', 'ஊரார்/கவனிப்பாளர்')}
                  />
                </div>

                {/* Witness 1 */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="witnessOne" 
                    value={form.witnessOne} 
                    onChange={onChange} 
                    placeholder={t('Witness 1', 'சாட்சி 1')}
                  />
                </div>

                {/* Witness 2 */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input 
                    className={fieldStyles} 
                    name="witnessTwo" 
                    value={form.witnessTwo} 
                    onChange={onChange} 
                    placeholder={t('Witness 2', 'சாட்சி 2')}
                  />
                </div>

                {/* Address - Full width */}
                <div className="relative md:col-span-2 lg:col-span-1">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                  <Textarea 
                    className={cn(theme.textarea.base, theme.textarea.size.sm, "pl-10 min-h-[40px] py-2")} 
                    name="address" 
                    value={form.address} 
                    onChange={onChange} 
                    placeholder={t('Address', 'முகவரி')}
                  />
                </div>

                {/* Remarks - Full width */}
                <div className="relative md:col-span-2 lg:col-span-3">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                  <Textarea 
                    className={cn(theme.textarea.base, theme.textarea.size.sm, "pl-10 min-h-[80px] py-2")} 
                    name="remarks" 
                    value={form.remarks} 
                    onChange={onChange} 
                    placeholder={t('Remarks', 'குறிப்புகள்')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setForm(initialState)}
                  className="px-6"
                >
                  {t('Clear', 'அழிக்க')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className={cn(theme.button.primary, "px-10")}
                >
                  {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'சேமிக்க')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
