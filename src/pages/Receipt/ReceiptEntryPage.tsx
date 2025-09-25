import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { token } = useAuth();
  const { language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<{id: string; name: string}[]>([]);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  // Fetch people list for donor/receiver dropdowns
  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const res = await fetch('https://tmsapi.xesstechlink.com/api/people', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch people');
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setPeople(data.data);
        }
      } catch (err) {
        console.error('Failed to load people:', err);
      }
    };
    fetchPeople();
  }, [token]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`https://tmsapi.xesstechlink.com/api/receipts/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data?.success && data.data) {
          const r = data.data;
          setForm({
            registerNo: r.register_no || '',
            date: r.date?.split('T')[0] || '',
            type: r.type || '',
            fromPerson: r.from_person || '',
            toPerson: r.to_person || '',
            amount: String(r.amount || ''),
            remarks: r.remarks || ''
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);
    try {
      const payload = {
        date: form.date,
        type: form.type?.toLowerCase().includes('expense') ? 'payment' : 'receipt',
        from_person: form.fromPerson,
        to_person: form.toPerson,
        amount: Number(form.amount || 0),
        remarks: form.remarks,
        action: id ? 'update' : 'create',
        changes: JSON.stringify({
          previous: id ? {
            date: form.date,
            type: form.type,
            from_person: form.fromPerson,
            to_person: form.toPerson,
            amount: form.amount,
            remarks: form.remarks
          } : null,
          current: {
            date: form.date,
            type: form.type?.toLowerCase().includes('expense') ? 'payment' : 'receipt',
            from_person: form.fromPerson,
            to_person: form.toPerson,
            amount: Number(form.amount || 0),
            remarks: form.remarks
          }
        })
      };
            const res = await fetch(id ? `https://tmsapi.xesstechlink.com/api/receipts/${id}` : 'https://tmsapi.xesstechlink.com/api/receipts', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed');
      const result = await res.json();
      if (result.success) {
        setMessage(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));
        navigate('/dashboard/receipt');
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (err) {
      setMessage(t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4 text-center">{id ? t('Edit Receipt', 'வரவு/செலவு திருத்தம்') : t('Receipt Entry', 'வரவு/செலவு பதிவு')}</h1>
      {loading && (
        <div className="mb-3 text-sm">{t('Loading...', 'ஏற்றுகிறது...')}</div>
      )}
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
          <select className="w-full border p-2 rounded" name="type" value={form.type} onChange={onChange}>
            <option value="">{t('Select type', 'வகையைத் தேர்ந்தெடுக்கவும்')}</option>
            <option value="receipt">{t('Receipt', 'வரவு')}</option>
            <option value="payment">{t('Payment', 'செலவு')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">{t('From (Giver)', 'தந்தவர்')}</label>
          <select 
            className="w-full border p-2 rounded" 
            name="fromPerson" 
            value={form.fromPerson} 
            onChange={onChange}
          >
            <option value="">{t('Select name', 'பெயரைத் தேர்ந்தெடுக்கவும்')}</option>
            {people.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">{t('To (Receiver)', 'பெற்றவர்')}</label>
          <select 
            className="w-full border p-2 rounded" 
            name="toPerson" 
            value={form.toPerson} 
            onChange={onChange}
          >
            <option value="">{t('Select name', 'பெயரைத் தேர்ந்தெடுக்கவும்')}</option>
            {people.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
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
