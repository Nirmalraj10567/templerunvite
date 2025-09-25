import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { donationService, DonationFormData } from '@/services/donationService';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { DonationProductManager, DonationProduct } from '@/components/product/DonationProductManager';

const today = new Date().toISOString().slice(0, 10);
const initialState: DonationFormData = {
  registerNo: '',
  date: today,
  name: '',
  fatherName: '',
  address: '',
  village: '',
  phone: '',
  product: '',
  unit: '',
  reason: '',
};

export default function DonationProductEntry() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [form, setForm] = useState<DonationFormData>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState<boolean>(false);
  const [products, setProducts] = useState<DonationProduct[]>([]);
  const [nextRegisterNo, setNextRegisterNo] = useState<string>('');
  // This page is for new entries; keep flag for future edit mode integration
  const isEdit = false;

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Wrapper to match requested API name/signature
  const generateReceiptNo = async (_token: string) => {
    return await fetchNextRegisterNo();
  };

  const generateNextRegisterNo = () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const daysSince = Math.floor((Date.now() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${currentYear}-${String(daysSince).padStart(4, '0')}`;
  };



  //remove msg
  
  // Centralized loader for next register number
  const fetchNextRegisterNo = async () => {
    try {
      const resp = await axios.get<any>('https://tmsapi.xesstechlink.com/api/donations/next-register-no', {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      const nextNo = resp.data?.nextRegisterNo || generateNextRegisterNo();
      return nextNo as string;
    } catch {
      return generateNextRegisterNo();
    }
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const resp = await axios.get<{ data: DonationProduct[] }>('https://tmsapi.xesstechlink.com/api/donation-products', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const data = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
        // Filter out any null/undefined products and ensure they have required properties
        const validProducts = data.filter(p => p && p.id && p.label);
        setProducts(validProducts);
      } catch { setProducts([]); }
    };
    const loadRegisterNo = async () => {
      const nextNo = await fetchNextRegisterNo();
      setNextRegisterNo(nextNo);
      setForm(prev => ({ ...prev, registerNo: nextNo }));
    };
    loadProducts();
    loadRegisterNo();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMessage(undefined); setIsError(false);
    try {
      await donationService.createDonation(token, form);
      // fetch next receipt number from backend after successful save
      const nextNo = await fetchNextRegisterNo();
      setNextRegisterNo(nextNo);
      setForm({ ...initialState, registerNo: nextNo });
      setMessage(t('Saved successfully','வெற்றிகரமாக சேமிக்கப்பட்டது'));
    } catch {
      setIsError(true);
      setMessage(t('Save failed','சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  // Clear message after 2.5s and refresh receipt number for new entries
  useEffect(() => {
    if (message && !isError) {
      const timer = setTimeout(() => {
        setMessage(undefined);
        // After success message disappears, generate a fresh receipt number for the next entry (only for new entries)
        if (!isEdit) {
          generateReceiptNo(token)
            .then(receipt => setForm(prev => ({ ...prev, registerNo: receipt })))
            .catch(() => { /* ignore, initialState already applied */ });
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message, isError, isEdit, token]);

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

        <select name="product" value={form.product} onChange={e=> {
          const val=e.target.value;
          const sel=products.find(p=>p && (p.value===val||p.label===val));
          setForm(prev=>({...prev, product:val, unit:sel?.unit||''}));
        }} className="border px-2 py-1 rounded">
          <option value="">{t('Select Product','பொருள் தேர்வு')}</option>
          {products.filter(p => p && p.id && p.label).map(p=><option key={p.id} value={p.value||p.label}>{p.label}</option>)}
        </select>
        <input name="unit" value={form.unit} onChange={onChange} placeholder={t('Unit','அளவு')} className="border px-2 py-1 rounded" />

        <textarea name="reason" value={form.reason} onChange={onChange} rows={2} placeholder={t('Reason','காரணம்')} className="col-span-2 border px-2 py-1 rounded" />

        <div className="col-span-2 flex gap-2 justify-center mt-1">
          <button disabled={saving} type="submit" className="bg-orange-600 text-white px-3 py-1 rounded">
            {saving ? t('Saving...','சேமிக்கிறது...'):t('Save','சேமி')}
          </button>
          <button type="button" className="border px-3 py-1 rounded" onClick={async ()=>{
            const nextNo = await fetchNextRegisterNo();
            setNextRegisterNo(nextNo);
            setForm({ ...initialState, registerNo: nextNo });
          }}>
            {t('Clear','அழி')}
          </button>
        </div>
      </form>
    </div>
  );
}
