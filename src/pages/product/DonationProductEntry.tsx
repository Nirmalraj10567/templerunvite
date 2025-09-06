import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { donationService, DonationFormData } from '@/services/donationService';

const initialState: DonationFormData = {
  registerNo: '',
  date: '',
  name: '',
  fatherName: '',
  address: '',
  village: '',
  phone: '',
  amount: '',
  product: '',
  unit: '',
  reason: ''
};

export default function DonationProductEntry() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [form, setForm] = useState<DonationFormData>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|undefined>();

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);
    
    try {
      await donationService.createDonation(token, form);
      setForm(initialState);
      setMessage(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));
    } catch (err) {
      console.error('Save failed:', err);
      setMessage(t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4 text-center">
        {t('Donation Entry', 'பொருள் நன்கொடைக் பதிவு')}
      </h1>
      {message && (
        <div className="mb-3 text-sm text-blue-700">{message}</div>
      )}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">{t('Register No', 'பதிவு எண்')}</label>
          <input className="w-full border p-2 rounded" name="registerNo" value={form.registerNo} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Date', 'தேதி')}</label>
          <input type="date" className="w-full border p-2 rounded" name="date" value={form.date} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Name', 'பெயர்')}</label>
          <input className="w-full border p-2 rounded" name="name" value={form.name} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Father Name', 'தந்தை பெயர்')}</label>
          <input className="w-full border p-2 rounded" name="fatherName" value={form.fatherName} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Address', 'முகவரி')}</label>
          <textarea className="w-full border p-2 rounded" name="address" value={form.address} onChange={onChange} rows={2} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Village', 'ஊர்')}</label>
          <input className="w-full border p-2 rounded" name="village" value={form.village} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Phone', 'கைபேசி எண்')}</label>
          <input className="w-full border p-2 rounded" name="phone" value={form.phone} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Amount', 'வருமானம்')}</label>
          <input className="w-full border p-2 rounded" name="amount" value={form.amount} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Product', 'பொருள்')}</label>
          <input className="w-full border p-2 rounded" name="product" value={form.product} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Unit', 'அளவு')}</label>
          <input className="w-full border p-2 rounded" name="unit" value={form.unit} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Reason', 'காரணம்')}</label>
          <textarea className="w-full border p-2 rounded" name="reason" value={form.reason} onChange={onChange} rows={2} />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-center">
          <button disabled={saving} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700" type="submit">
            {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'பதிவு')}
          </button>
          <button type="button" className="border px-4 py-2 rounded" onClick={() => setForm(initialState)}>
            {t('Clear', 'வெளியே')}
          </button>
        </div>
      </form>
    </div>
  );
}
