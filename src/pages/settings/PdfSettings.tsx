import React, { useEffect, useState } from 'react';
import { pdfSettingsService, PdfSettings } from '@/services/pdfSettingsService';
import { useLanguage } from '@/lib/language';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
    } catch (err) {
      setMessage(t('Upload failed', 'பதிவேற்றம் தோல்வி'));
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
    } catch (err) {
      setMessage(t('Save failed', 'சேமிப்பு தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  const logoSrc = form.logo_url ? (form.logo_url.startsWith('http') ? form.logo_url : form.logo_url) : '';

  if (loading) {
    return <div className="p-4">{t('Loading...', 'ஏற்றுகிறது...')}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{t('PDF Settings', 'PDF அமைப்புகள்')}</h1>
      {message && (
        <div className="mb-3 text-sm text-green-700">{message}</div>
      )}
      <form onSubmit={onSave} className="grid grid-cols-1 gap-4">
        <Tabs defaultValue="general">
          <TabsList className="mb-2">
            <TabsTrigger value="general">{t('General', 'பொது')}</TabsTrigger>
            <TabsTrigger value="tax">{t('Tax', 'வரி')}</TabsTrigger>
            <TabsTrigger value="annadhanam">{t('Annadhanam', 'அன்னதானம்')}</TabsTrigger>
            <TabsTrigger value="hall">{t('Hall', 'மண்டபம்')}</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-1">{t('Main Title', 'முதன்மை தலைப்பு')}</label>
              <input name="title_main" value={form.title_main || ''} onChange={onChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('Sub Title', 'துணை தலைப்பு')}</label>
              <input name="title_sub" value={form.title_sub || ''} onChange={onChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('Title Line 2', 'தலைப்பு வரி 2')}</label>
              <textarea name="title_line2" value={form.title_line2 || ''} onChange={onChange} className="w-full border p-2 rounded" rows={2} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('Sub-header', 'துணை தலைப்பு (பெட்டி)')}</label>
              <input name="subheader" value={form.subheader || ''} onChange={onChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('Watermark Text', 'நீர்த்துளி உரை')}</label>
              <input name="watermark_text" value={(form as any).watermark_text || ''} onChange={onChange} className="w-full border p-2 rounded" />
              <p className="text-xs text-gray-500 mt-1">{t('Optional faint text printed near the footer.', 'அடிக்குறிப்புக்கு அருகில் அச்சிடப்படும் விருப்ப நீர்த்துளி உரை.')}</p>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('Logo', 'லோகோ')}</label>
              <div className="flex items-center gap-4">
                <input type="file" accept="image/*" onChange={onUploadLogo} />
                {logoSrc && (
                  <img src={logoSrc} alt="logo" className="h-16 w-auto border rounded" />
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="tax" className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-1">{t('Tax Sub-header', 'வரி துணை தலைப்பு')}</label>
              <input name="tax_subheader" value={(form as any).tax_subheader || ''} onChange={onChange} className="w-full border p-2 rounded" />
              <p className="text-xs text-gray-500 mt-1">{t('Used only in tax receipts. If empty, default sub-header is used.', 'வரி ரசீதுகளில் மட்டும் பயன்படுத்தப்படும். காலியாக இருந்தால் பொதுத் துணை தலைப்பு பயன்படுத்தப்படும்.')}</p>
            </div>
          </TabsContent>
          <TabsContent value="annadhanam" className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-1">{t('Annadhanam Sub-header', 'அன்னதானம் துணை தலைப்பு')}</label>
              <input name="annadhanam_subheader" value={(form as any).annadhanam_subheader || ''} onChange={onChange} className="w-full border p-2 rounded" />
              <p className="text-xs text-gray-500 mt-1">{t('Used only in Annadhanam receipts. If empty, default sub-header is used.', 'அன்னதானம் ரசீதுகளில் மட்டும் பயன்படுத்தப்படும். காலியாக இருந்தால் பொதுத் துணை தலைப்பு பயன்படுத்தப்படும்.')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">{t('Receipt Label', 'ரசீது தலைப்பு')}</label>
                <input name="annadhanam_receipt_label" value={(form as any).annadhanam_receipt_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Date Label', 'தேதி தலைப்பு')}</label>
                <input name="annadhanam_date_label" value={(form as any).annadhanam_date_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Year Label', 'வருடம் தலைப்பு')}</label>
                <input name="annadhanam_year_label" value={(form as any).annadhanam_year_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Cell Label', 'செல் தலைப்பு')}</label>
                <input name="annadhanam_cell_label" value={(form as any).annadhanam_cell_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Collector Label', 'வசூலிப்பாளர் தலைப்பு')}</label>
                <input name="annadhanam_collector_label" value={(form as any).annadhanam_collector_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="hall" className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-1">{t('Hall Sub-header', 'மண்டபம் துணை தலைப்பு')}</label>
              <input name="hall_subheader" value={(form as any).hall_subheader || ''} onChange={onChange} className="w-full border p-2 rounded" />
              <p className="text-xs text-gray-500 mt-1">{t('Used only in Hall Booking receipts. If empty, default sub-header is used.', 'மண்டப முன்பதிவு ரசீதுகளில் மட்டும் பயன்படுத்தப்படும். காலியாக இருந்தால் பொதுத் துணை தலைப்பு பயன்படுத்தப்படும்.')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">{t('Receipt Label', 'ரசீது தலைப்பு')}</label>
                <input name="hall_receipt_label" value={(form as any).hall_receipt_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Date Label', 'தேதி தலைப்பு')}</label>
                <input name="hall_date_label" value={(form as any).hall_date_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Year Label', 'வருடம் தலைப்பு')}</label>
                <input name="hall_year_label" value={(form as any).hall_year_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Cell Label', 'செல் தலைப்பு')}</label>
                <input name="hall_cell_label" value={(form as any).hall_cell_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('Collector Label', 'வசூலிப்பாளர் தலைப்பு')}</label>
                <input name="hall_collector_label" value={(form as any).hall_collector_label || ''} onChange={onChange} className="w-full border p-2 rounded" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex gap-2 justify-center mt-2">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save Settings', 'அமைப்புகளை சேமிக்க')}
          </button>
        </div>
      </form>
    </div>
  );
}
