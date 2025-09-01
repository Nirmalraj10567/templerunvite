import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

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
}

const initialState: FormState = {
  registerNo: '',
  date: '',
  time: '',
  event: '',
  groomName: '',
  brideName: '',
  address: '',
  village: '',
  guardianName: '',
  witnessOne: '',
  witnessTwo: '',
  remarks: ''
};

export default function MarriageEntryPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [form, setForm] = useState<FormState>(initialState);
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
      const res = await fetch('/api/marriages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed');
      setForm(initialState);
      setMessage(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));
    } catch (err) {
      setMessage(t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{t('Marriage Register Entry', 'திருமண பதிவு பதிவு')}</h1>
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
        <div>
          <label className="block text-sm mb-1">{t('Time', 'நேரம்')}</label>
          <input type="time" className="w-full border p-2 rounded" name="time" value={form.time} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Event', 'நிகழ்வு')}</label>
          <input className="w-full border p-2 rounded" name="event" value={form.event} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Groom Name', 'வரன் பெயர்')}</label>
          <input className="w-full border p-2 rounded" name="groomName" value={form.groomName} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Bride Name', 'மணமகள் பெயர்')}</label>
          <input className="w-full border p-2 rounded" name="brideName" value={form.brideName} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Address', 'முகவரி')}</label>
          <textarea className="w-full border p-2 rounded" name="address" value={form.address} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Village', 'கிராமம்')}</label>
          <input className="w-full border p-2 rounded" name="village" value={form.village} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Guardian Name', 'ஊரார்/கவனிப்பாளர்')}</label>
          <input className="w-full border p-2 rounded" name="guardianName" value={form.guardianName} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Witness 1', 'சாட்சி 1')}</label>
          <input className="w-full border p-2 rounded" name="witnessOne" value={form.witnessOne} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Witness 2', 'சாட்சி 2')}</label>
          <input className="w-full border p-2 rounded" name="witnessTwo" value={form.witnessTwo} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Remarks', 'குறிப்புகள்')}</label>
          <textarea className="w-full border p-2 rounded" name="remarks" value={form.remarks} onChange={onChange} />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button disabled={saving} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700" type="submit">
            {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'சேமிக்க')}
          </button>
          <button type="button" className="border px-4 py-2 rounded" onClick={() => setForm(initialState)}>
            {t('Clear', 'அழிக்க')}
          </button>
        </div>
      </form>
    </div>
  );
}
