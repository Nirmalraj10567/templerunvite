import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Modal } from '@/components/ui/modal';
import type { LanguageContextType } from '@/lib/language';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

const generateReceiptNo = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface FormState {
  registerNo: string;
  date: string;
  time: string;
  event: string;
  subdivision: string;
  name: string;
  address: string;
  village: string;
  mobile: string;
  advanceAmount: string;
  totalAmount: string;
  balanceAmount: string;
  remarks: string;
  transferTo?: string;
}

const initialState: FormState = {
  registerNo: '',
  date: '',
  time: '',
  event: '',
  subdivision: '',
  name: '',
  address: '',
  village: '',
  mobile: '',
  advanceAmount: '',
  totalAmount: '',
  balanceAmount: '',
  remarks: '',
  transferTo: ''
};

export default function HallEntryPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    registerNo: generateReceiptNo()
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [isError, setIsError] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; value: string; label: string }>>([]);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name !== 'registerNo') {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    if (!form.date || !form.time || !form.name || !form.mobile) return false;
    return true;
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const resp = await axios.get<any>('/api/ledger/categories', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const data = (resp?.data && Array.isArray(resp.data.data)) ? resp.data.data : (Array.isArray(resp?.data) ? resp.data : []);
        const mapped = (data || []).map((item: any, index: number) => {
          if (typeof item === 'string') return { id: index + 1, value: item, label: item };
          return { id: item.id || index + 1, value: item.value || item.label, label: item.label || item.value };
        });
        setCategories(mapped);
      } catch (e) {
        console.error('Failed to load categories', e);
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(undefined);
    if (!validate()) {
      setIsError(true);
      setMessage(t('Please fill required fields', 'தேவையான புலங்களை நிரப்பவும்'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/hall-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const newId = data?.data?.id;
      if (typeof newId === 'number') {
        setLastCreatedId(newId);
        setShowPrintPrompt(true);
      }
      setForm(initialState);
      setForm((prev) => ({ ...prev, registerNo: generateReceiptNo() }));
      setIsError(false);
      setMessage(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));
    } catch (err) {
      setIsError(true);
      setMessage(t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{t('Hall Booking Entry', 'கல்யாண மண்டப பதிவு')}</h1>
      {message && (
        <div className="mb-3">
          <Alert variant={isError ? 'destructive' : 'default'}>
            <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        </div>
      )}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">{t('Receipt No', 'ரசீது எண்')}</label>
          <input 
            className="w-full border p-2 rounded bg-gray-100" 
            name="registerNo" 
            value={form.registerNo} 
            readOnly
          />
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
          <label className="block text-sm mb-1">{t('Function', 'நிகழ்வு')}</label>
          <input className="w-full border p-2 rounded" name="event" value={form.event} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Sub-division', 'உப பிரிவு')}</label>
          <input className="w-full border p-2 rounded" name="subdivision" value={form.subdivision} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Name', 'பெயர்')}</label>
          <input className="w-full border p-2 rounded" name="name" value={form.name} onChange={onChange} />
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
          <label className="block text-sm mb-1">{t('Phone', 'தொலைபேசி')}</label>
          <input className="w-full border p-2 rounded" name="mobile" value={form.mobile} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Advance Amount', 'முன்பணம்')}</label>
          <input className="w-full border p-2 rounded" name="advanceAmount" value={form.advanceAmount} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Total Amount', 'மொத்தம்')}</label>
          <input className="w-full border p-2 rounded" name="totalAmount" value={form.totalAmount} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('Balance Amount', 'மீதம்')}</label>
          <input className="w-full border p-2 rounded" name="balanceAmount" value={form.balanceAmount} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Remarks', 'குறிப்புகள்')}</label>
          <textarea className="w-full border p-2 rounded" name="remarks" value={form.remarks} onChange={onChange} />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button disabled={saving} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700" type="submit">
            {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'சேமிக்க')}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border px-4 py-2 rounded"
              onClick={() => {
                const d = form.date || new Date().toISOString().slice(0,10);
                navigate(`/dashboard/reports/daily?date=${d}`);
              }}
            >
              {t('Go to Daily Report', 'தினசரி அறிக்கைக்கு செல்ல')}
            </button>
            <button
              type="button"
              className="border px-4 py-2 rounded"
              onClick={() => {
                if (lastCreatedId == null) {
                  setIsError(true);
                  setMessage(t('No recent booking to print. Please save first.', 'அச்சிட சமீபத்திய பதிவு இல்லை. முதலில் சேமிக்கவும்.'));
                  return;
                }
                setShowPrintPrompt(true);
              }}
            >
              {t('Print Now', 'இப்போது அச்சிடு')}
            </button>
            <button type="button" className="border px-4 py-2 rounded" onClick={() => setForm(initialState)}>
              {t('Clear', 'அழிக்க')}
            </button>
          </div>
        </div>
      </form>
      {showPrintPrompt && lastCreatedId != null && (
        <Modal
          title={t('Print Receipt', 'ரசீதை அச்சிடவா?')}
          onClose={() => setShowPrintPrompt(false)}
        >
          <p className="mb-4 text-sm">{t('Do you want to open the PDF receipt for printing?', 'PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}</p>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded border" onClick={() => setShowPrintPrompt(false)}>
              {t('No', 'இல்லை')}
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                const q = token ? `?token=${encodeURIComponent(token)}` : '';
                const url = `http://localhost:4000/api/hall-bookings/${lastCreatedId}/receipt.pdf${q}`;
                window.open(url, '_blank');
                setShowPrintPrompt(false);
              }}
            >
              {t('Yes, Print', 'ஆம், அச்சிடு')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
