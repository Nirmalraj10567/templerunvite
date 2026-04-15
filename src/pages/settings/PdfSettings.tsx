import React, { useEffect, useState } from 'react';
import { pdfSettingsService, PdfSettings } from '@/services/pdfSettingsService';
import { useLanguage } from '@/lib/language';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { theme } from '@/styles/theme';
import { cn } from '@/lib/utils';

export default function PdfSettingsPage() {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [form, setForm] = useState<PdfSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await pdfSettingsService.get();
        setForm(data || {});
      } catch (e) {
        setMessage(t('Failed to load settings', 'அமைப்புகளை ஏற்ற முடியவில்லை'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const data = await pdfSettingsService.uploadLogo(file);
      setForm((prev) => ({ ...prev, logo_url: data.logo_url }));
      setMessage(t('Logo uploaded', 'லோகோ பதிவேற்றப்பட்டது'));
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(t('Upload failed', 'பதிவேற்றம் தோல்வி'));
      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const data = await pdfSettingsService.update(form);
      setForm(data || {});
      setMessage(t('Saved', 'சேமிக்கப்பட்டது'));
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(t('Save failed', 'சேமிப்பு தோல்வி'));
      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const logoSrc = form.logo_url ? (form.logo_url.startsWith('http') ? form.logo_url : form.logo_url) : '';

  if (loading) {
    return <div className="p-4">{t('Loading...', 'ஏற்றுகிறது...')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className={theme.card.header}>
            <h1 className="text-2xl font-bold text-center">
              {t('PDF Settings', 'PDF அமைப்புகள்')}
            </h1>
          </div>
          
          <div className="p-6">
            {message && (
              <div className="mb-6">
                <div className={`p-4 rounded-md ${message.includes('failed') || message.includes('தோல்வி') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {message}
                </div>
              </div>
            )}
            
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Tabs defaultValue="general" className="md:col-span-2 lg:col-span-3">
                <TabsList className="mb-6 grid w-full grid-cols-5">
                  <TabsTrigger value="general">{t('General', 'பொது')}</TabsTrigger>
                  <TabsTrigger value="tax">{t('Tax', 'வரி')}</TabsTrigger>
                  <TabsTrigger value="annadhanam">{t('Annadhanam', 'அன்னதானம்')}</TabsTrigger>
                  <TabsTrigger value="hall">{t('Hall', 'மண்டபம்')}</TabsTrigger>
                  <TabsTrigger value="pooja">{t('Pooja', 'பூஜை')}</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Main Title */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Main Title', 'முதன்மை தலைப்பு')}</label>
                    <input 
                      name="title_main" 
                      value={form.title_main || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Sub Title */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Sub Title', 'துணை தலைப்பு')}</label>
                    <input 
                      name="title_sub" 
                      value={form.title_sub || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Sub-header */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Sub-header', 'துணை தலைப்பு (பெட்டி)')}</label>
                    <input 
                      name="subheader" 
                      value={form.subheader || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Title Line 2 - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Title Line 2', 'தலைப்பு வரி 2')}</label>
                    <textarea 
                      name="title_line2" 
                      value={form.title_line2 || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 rounded-md w-full transition-all duration-200")}
                      rows={2} 
                    />
                  </div>
                  
                  {/* Watermark Text */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Watermark Text', 'நீர்த்துளி உரை')}</label>
                    <input 
                      name="watermark_text" 
                      value={(form as any).watermark_text || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('Optional faint text printed near the footer.', 'அடிக்குறிப்புக்கு அருகில் அச்சிடப்படும் விருப்ப நீர்த்துளி உரை.')}</p>
                  </div>
                  
                  {/* Logo Upload - Full width */}
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Logo', 'லோகோ')}</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={onUploadLogo}
                        className={cn(theme.input.base, "text-base py-2.5 px-3 rounded-md transition-all duration-200")}
                      />
                      {logoSrc && (
                        <img src={logoSrc} alt="logo" className="h-16 w-auto border rounded" />
                      )}
                    </div>
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Logo URL (optional)', 'லோகோ URL (விருப்ப)')}</label>
                      <input
                        name="logo_url"
                        value={form.logo_url || ''}
                        onChange={onChange}
                        placeholder={t('Paste an image URL or use Upload above', 'பட URL ஒன்றை ஒட்டவும் அல்லது மேலே உள்ள பதிவேற்றத்தை பயன்படுத்தவும்')}
                        className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t('If set, this URL will be used for the logo. Upload sets a /public path automatically.', 'URL அமைக்கப்பட்டால், இந்த லோகோ பயன்படுத்தப்படும். பதிவேற்றம் தானாகவே /public பாதையை அமைக்கும்.')}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="pooja" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Pooja Sub-header - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Pooja Sub-header', 'பூஜை துணை தலைப்பு')}</label>
                    <input 
                      name="pooja_subheader" 
                      value={(form as any).pooja_subheader || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('Used only in Pooja receipts. If empty, default sub-header is used.', 'பூஜை ரசீதுகளில் மட்டும் பயன்படுத்தப்படும். காலியாக இருந்தால் பொதுத் துணை தலைப்பு பயன்படுத்தப்படும்.')}</p>
                  </div>
                  
                  {/* Receipt Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Receipt Label', 'ரசீது தலைப்பு')}</label>
                    <input 
                      name="pooja_receipt_label" 
                      value={(form as any).pooja_receipt_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Date Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Date Label', 'தேதி தலைப்பு')}</label>
                    <input 
                      name="pooja_date_label" 
                      value={(form as any).pooja_date_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Year Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Year Label', 'வருடம் தலைப்பு')}</label>
                    <input 
                      name="pooja_year_label" 
                      value={(form as any).pooja_year_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Cell Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Cell Label', 'செல் தலைப்பு')}</label>
                    <input 
                      name="pooja_cell_label" 
                      value={(form as any).pooja_cell_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Collector Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Collector Label', 'வசூலிப்பாளர் தலைப்பு')}</label>
                    <input 
                      name="pooja_collector_label" 
                      value={(form as any).pooja_collector_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="tax" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Tax Sub-header - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Tax Sub-header', 'வரி துணை தலைப்பு')}</label>
                    <input 
                      name="tax_subheader" 
                      value={(form as any).tax_subheader || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('Used only in tax receipts. If empty, default sub-header is used.', 'வரி ரசீதுகளில் மட்டும் பயன்படுத்தப்படும். காலியாக இருந்தால் பொதுத் துணை தலைப்பு பயன்படுத்தப்படும்.')}</p>
                  </div>
                  
                  {/* Receipt Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Receipt Label', 'ரசீது தலைப்பு')}</label>
                    <input 
                      name="tax_receipt_label" 
                      value={(form as any).tax_receipt_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Date Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Date Label', 'தேதி தலைப்பு')}</label>
                    <input 
                      name="tax_date_label" 
                      value={(form as any).tax_date_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Year Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Year Label', 'வருடம் தலைப்பு')}</label>
                    <input 
                      name="tax_year_label" 
                      value={(form as any).tax_year_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Cell Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Cell Label', 'செல் தலைப்பு')}</label>
                    <input 
                      name="tax_cell_label" 
                      value={(form as any).tax_cell_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Collector Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Collector Label', 'வசூலிப்பாளர் தலைப்பு')}</label>
                    <input 
                      name="tax_collector_label" 
                      value={(form as any).tax_collector_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="annadhanam" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Annadhanam Sub-header - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Annadhanam Sub-header', 'அன்னதானம் துணை தலைப்பு')}</label>
                    <input 
                      name="annadhanam_subheader" 
                      value={(form as any).annadhanam_subheader || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('Used only in Annadhanam receipts. If empty, default sub-header is used.', 'அன்னதானம் ரசீதுகளில் மட்டும் பயன்படுத்தப்படும். காலியாக இருந்தால் பொதுத் துணை தலைப்பு பயன்படுத்தப்படும்.')}</p>
                  </div>
                  
                  {/* Receipt Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Receipt Label', 'ரசீது தலைப்பு')}</label>
                    <input 
                      name="annadhanam_receipt_label" 
                      value={(form as any).annadhanam_receipt_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Date Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Date Label', 'தேதி தலைப்பு')}</label>
                    <input 
                      name="annadhanam_date_label" 
                      value={(form as any).annadhanam_date_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Year Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Year Label', 'வருடம் தலைப்பு')}</label>
                    <input 
                      name="annadhanam_year_label" 
                      value={(form as any).annadhanam_year_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Cell Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Cell Label', 'செல் தலைப்பு')}</label>
                    <input 
                      name="annadhanam_cell_label" 
                      value={(form as any).annadhanam_cell_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Collector Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Collector Label', 'வசூலிப்பாளர் தலைப்பு')}</label>
                    <input 
                      name="annadhanam_collector_label" 
                      value={(form as any).annadhanam_collector_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="hall" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Hall Sub-header - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Hall Sub-header', 'மண்டபம் துணை தலைப்பு')}</label>
                    <input 
                      name="hall_subheader" 
                      value={(form as any).hall_subheader || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('Used only in Hall Booking receipts. If empty, default sub-header is used.', 'மண்டப முன்பதிவு ரசீதுகளில் மட்டும் பயன்படுத்தப்படும். காலியாக இருந்தால் பொதுத் துணை தலைப்பு பயன்படுத்தப்படும்.')}</p>
                  </div>
                  
                  {/* Receipt Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Receipt Label', 'ரசீது தலைப்பு')}</label>
                    <input 
                      name="hall_receipt_label" 
                      value={(form as any).hall_receipt_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Date Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Date Label', 'தேதி தலைப்பு')}</label>
                    <input 
                      name="hall_date_label" 
                      value={(form as any).hall_date_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Year Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Year Label', 'வருடம் தலைப்பு')}</label>
                    <input 
                      name="hall_year_label" 
                      value={(form as any).hall_year_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Cell Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Cell Label', 'செல் தலைப்பு')}</label>
                    <input 
                      name="hall_cell_label" 
                      value={(form as any).hall_cell_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                  
                  {/* Collector Label */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{t('Collector Label', 'வசூலிப்பாளர் தலைப்பு')}</label>
                    <input 
                      name="hall_collector_label" 
                      value={(form as any).hall_collector_label || ''} 
                      onChange={onChange} 
                      className={cn(theme.input.base, "text-base py-2.5 px-3 h-11 rounded-md w-full transition-all duration-200")}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Action Buttons - Full width */}
              <div className="md:col-span-3 flex flex-wrap gap-3 justify-between pt-4 border-t border-gray-200">
                <div></div>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md text-base transition-all duration-200"
                >
                  {saving ? t('Saving...', 'Saving...') : t('Save Settings', 'Save Settings')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
