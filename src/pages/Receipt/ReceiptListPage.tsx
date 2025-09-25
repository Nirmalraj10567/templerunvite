import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

interface ReceiptItem {
  id: number;
  registerNo: string;
  date: string;
  type: string;
  name: string;
  amount: string;
  credit: string;
  remarks: string;
}

export default function ReceiptListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`http://localhost:4000/api/receipts?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) setItems(data.data);
      else setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-3 rounded-md shadow text-sm">
      <h1 className="text-lg font-semibold mb-3 text-center">
        {t('Receipt List', 'பதிவு பார்வைக்கும்')}
      </h1>

      <div className="flex flex-wrap gap-3 mb-3 items-end">
        <div>
          <label className="block text-xs mb-1">{t('From Date', 'தேதி இருந்து')}</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="w-full border h-8 px-2 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">{t('To Date', 'தேதி வரை')}</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-full border h-8 px-2 rounded text-sm"
          />
        </div>
        <button
          onClick={load}
          className="bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700 text-sm"
        >
          {t('View', 'பார்வை')}
        </button>
        <button
          onClick={onPrint}
          className="border px-3 py-1.5 rounded text-sm"
        >
          {t('Print', 'அச்சிடு')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-1.5 text-left">{t('Reg No', 'பதிவு எண்')}</th>
              <th className="p-1.5 text-left">{t('Date', 'தேதி')}</th>
              <th className="p-1.5 text-left">{t('Type', 'Type')}</th>
              <th className="p-1.5 text-left">{t('Name', 'பெயர்')}</th>
              <th className="p-1.5 text-left">{t('Amount', 'பரம்')}</th>
              <th className="p-1.5 text-left">{t('Credit', 'கடன்')}</th>
              <th className="p-1.5 text-left">{t('Remarks', 'குறிப்பு')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-1.5" colSpan={7}>{t('Loading...', 'ஏற்றுகிறது...')}</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td className="p-1.5" colSpan={7}>{t('No data', 'தரவு இல்லை')}</td>
              </tr>
            )}
            {!loading && items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-1.5">{item.registerNo}</td>
                <td className="p-1.5">{item.date}</td>
                <td className="p-1.5">{item.type}</td>
                <td className="p-1.5">{item.name}</td>
                <td className="p-1.5">{item.amount}</td>
                <td className="p-1.5">{item.credit}</td>
                <td className="p-1.5">{item.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
