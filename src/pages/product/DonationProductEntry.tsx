import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { donationService, DonationFormData } from '@/services/donationService';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { DonationProductManager, DonationProduct } from '@/components/product/DonationProductManager';

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
  reason: '',
  transferTo: ''
};

export default function DonationProductEntry() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [form, setForm] = useState<DonationFormData>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [products, setProducts] = useState<DonationProduct[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);
  const [nextRegisterNo, setNextRegisterNo] = useState<string>('');

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const generateNextRegisterNo = () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const daysSince = Math.floor((Date.now() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${currentYear}-${String(daysSince).padStart(4, '0')}`;
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const resp = await axios.get<{ data: DonationProduct[] }>('/api/donation-products', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const data = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
        setProducts(data);
      } catch { setProducts([]); }
    };
    const loadAccounts = async () => {
      try {
        const resp = await axios.get<any>('/api/ledger/accounts', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const data =
          (resp?.data && Array.isArray(resp.data.data)) ? resp.data.data :
          (Array.isArray(resp?.data) ? resp.data : []);
        setAccounts((data || []).map((item: any, i: number) => {
          if (typeof item === 'string') return { id: i+1, value: item, label: item };
          return { id: item.id ?? i+1, value: item.value || item.label, label: item.label || item.value };
        }));
      } catch { setAccounts([]); }
    };
    const loadRegisterNo = async () => {
      try {
        const resp = await axios.get<any>('/api/donations/next-register-no', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const nextNo = resp.data?.nextRegisterNo || generateNextRegisterNo();
        setNextRegisterNo(nextNo);
        setForm(prev => ({ ...prev, registerNo: nextNo }));
      } catch {
        const nextNo = generateNextRegisterNo();
        setNextRegisterNo(nextNo);
        setForm(prev => ({ ...prev, registerNo: nextNo }));
      }
    };
    loadProducts(); loadAccounts(); loadRegisterNo();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMessage(undefined);
    try {
      await donationService.createDonation(token, form);
      const nextNo = generateNextRegisterNo();
      setNextRegisterNo(nextNo);
      setForm({ ...initialState, registerNo: nextNo });
      setMessage(t('Saved successfully','வெற்றிகரமாக சேமிக்கப்பட்டது'));
    } catch {
      setMessage(t('Save failed','சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-3 rounded shadow text-xs">
      <h1 className="text-sm font-semibold mb-2 text-center">
        {t('Donation Entry','பொருள் நன்கொடைக் பதிவு')}
      </h1>
      <div className="flex justify-end mb-2">
        <DonationProductManager products={products} setProducts={setProducts} />
      </div>
      {message && <div className="mb-2 text-blue-600 text-xs">{message}</div>}

      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-2">
        <input name="registerNo" value={form.registerNo} readOnly className="col-span-1 border px-2 py-1 rounded bg-gray-100" placeholder={t('Register No','பதிவு எண்')} />
        <input type="date" name="date" value={form.date} onChange={onChange} className="border px-2 py-1 rounded" />
        
        <input name="name" value={form.name} onChange={onChange} placeholder={t('Name','பெயர்')} className="col-span-2 border px-2 py-1 rounded" />
        <input name="fatherName" value={form.fatherName} onChange={onChange} placeholder={t('Father Name','தந்தை பெயர்')} className="col-span-2 border px-2 py-1 rounded" />
        <textarea name="address" value={form.address} onChange={onChange} rows={2} placeholder={t('Address','முகவரி')} className="col-span-2 border px-2 py-1 rounded" />
        
        <input name="village" value={form.village} onChange={onChange} placeholder={t('Village','ஊர்')} className="border px-2 py-1 rounded" />
        <input name="phone" value={form.phone} onChange={onChange} placeholder={t('Phone','கைபேசி')} className="border px-2 py-1 rounded" />
        
        <input name="amount" value={form.amount} onChange={onChange} placeholder={t('Amount','தொகை')} className="border px-2 py-1 rounded" />
        <select name="transferTo" value={form.transferTo} onChange={e=>setForm(prev=>({...prev,transferTo:e.target.value}))} className="border px-2 py-1 rounded">
          <option value="">{t('Select Account','கணக்கு')}</option>
          {accounts.map(acc=>(
            <option key={acc.id} value={acc.value}>{acc.label}</option>
          ))}
        </select>

        <select name="product" value={form.product} onChange={e=> {
          const val=e.target.value;
          const sel=products.find(p=>p.value===val||p.label===val);
          setForm(prev=>({...prev, product:val, unit:sel?.unit||''}));
        }} className="border px-2 py-1 rounded">
          <option value="">{t('Select Product','பொருள் தேர்வு')}</option>
          {products.map(p=><option key={p.id} value={p.value||p.label}>{p.label}</option>)}
        </select>
        <input name="unit" value={form.unit} onChange={onChange} placeholder={t('Unit','அளவு')} className="border px-2 py-1 rounded" />

        <textarea name="reason" value={form.reason} onChange={onChange} rows={2} placeholder={t('Reason','காரணம்')} className="col-span-2 border px-2 py-1 rounded" />

        <div className="col-span-2 flex gap-2 justify-center mt-1">
          <button disabled={saving} type="submit" className="bg-orange-600 text-white px-3 py-1 rounded">
            {saving ? t('Saving...','சேமிக்கிறது...'):t('Save','சேமி')}
          </button>
          <button type="button" className="border px-3 py-1 rounded" onClick={()=>{
            const nextNo=generateNextRegisterNo();
            setForm({ ...initialState, registerNo: nextNo });
          }}>
            {t('Clear','அழி')}
          </button>
        </div>
      </form>
    </div>
  );
}
