import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

interface FormState {
  registerNo: string;
  date: string;
  type: string;
  fromPerson: string;
  toPerson: string;
  amount: string;
  remarks: string;
}

const initialState: FormState = {
  registerNo: '',
  date: '',
  type: '',
  fromPerson: '',
  toPerson: '',
  amount: '',
  remarks: ''
};

export default function ReceiptEntryPage() {
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
      const res = await fetch('/api/receipts', {
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
    <div className="max-w-xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4 text-center">{t('Receipt Entry', 'வரவு/செலவு பதிவு')}</h1>
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
          <label className="block text-sm mb-1">{t('Type (Receipt/Payment)', 'Type (வரவு/செலவு)')}</label>
          <input className="w-full border p-2 rounded" name="type" value={form.type} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('From (Giver)', 'தந்தவர்')}</label>
          <input className="w-full border p-2 rounded" name="fromPerson" value={form.fromPerson} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('To (Receiver)', 'பெற்றவர்')}</label>
          <input className="w-full border p-2 rounded" name="toPerson" value={form.toPerson} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Amount', 'தொகை')}</label>
          <input className="w-full border p-2 rounded" name="amount" value={form.amount} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Remarks', 'குறிப்பு')}</label>
          <textarea className="w-full border p-2 rounded" name="remarks" value={form.remarks} onChange={onChange} rows={2} />
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
