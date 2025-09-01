import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { donationService, DonationItem } from '@/services/donationService';

export default function DonationProductList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  const load = async () => {
    setLoading(true);
    try {
      const params = { q, from, to };
      const response = await donationService.getDonations(token, params);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load donations:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onExport = async () => {
    try {
      const blob = await donationService.exportDonations(token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'donations.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const onPrint = (item?: DonationItem) => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="text-align:center; margin-bottom:20px;">
        <img src="/logo.png" alt="Logo" style="height:80px;">
        <h2 style="margin-top:10px;">${t('Donation Receipt', 'நன்கொடை ரசீது')}</h2>
      </div>
      <div style="margin:20px;">
        ${item ? `
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Donor', 'நன்கொடையாளர்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.donor_name}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Date', 'தேதி')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.donation_date}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Product', 'பொருள்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.product_name}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Description', 'விளக்கம்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.description}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Quantity', 'அளவு')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${item.quantity}</td></tr>
          </table>
        ` : ''}
      </div>
    `;
    
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow?.document.write(printContent.innerHTML);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  return (
    <div className="bg-white p-4 rounded shadow max-w-full">
      <h1 className="text-xl font-semibold mb-4">
        {t('Good Deed Donation List', 'பொருள் நன்கொடைக் பட்டியல்')}
      </h1>

      <div className="flex flex-col md:flex-row gap-2 md:items-end mb-4 flex-wrap">
        <div>
          <label className="block text-sm mb-1">{t('Search', 'தேடுக')}</label>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className="border rounded p-2"
            placeholder={t('Name/Register/Village', 'பெயர்/பதிவு/கிராமம்')}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('From', 'இருந்து')}</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('To', 'வரை')}</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border rounded p-2"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="bg-slate-700 text-white px-4 py-2 rounded">{t('Filter', 'வடிக')}</button>
          <button onClick={onExport} className="border px-4 py-2 rounded">{t('Export CSV', 'CSV ஏற்றுமதி')}</button>
          <button onClick={() => onPrint()} className="border px-4 py-2 rounded">{t('Print', 'அச்சிட')}</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">{t('Contact', 'தொடர்பு')}</th>
              <th className="p-2 text-left">{t('Date', 'தேதி')}</th>
              <th className="p-2 text-left">{t('Donor', 'நன்கொடையாளர்')}</th>
              <th className="p-2 text-left">{t('Category', 'வகை')}</th>
              <th className="p-2 text-left">{t('Product', 'பொருள்')}</th>
              <th className="p-2 text-left">{t('Qty', 'அளவு')}</th>
              <th className="p-2 text-left">{t('Price', 'விலை')}</th>
              <th className="p-2 text-left">{t('Description', 'விளக்கம்')}</th>
              <th className="p-2 text-left">{t('Print', 'அச்சிட')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-2" colSpan={10}>{t('Loading...', 'ஏற்றுகிறது...')}</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td className="p-2" colSpan={10}>{t('No data', 'தரவு இல்லை')}</td>
              </tr>
            )}
            {!loading && items.map((r, idx) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">{r.donor_contact || ''}</td>
                <td className="p-2">{r.donation_date || ''}</td>
                <td className="p-2">{r.donor_name || ''}</td>
                <td className="p-2">{r.category || ''}</td>
                <td className="p-2">{r.product_name || ''}</td>
                <td className="p-2">{r.quantity || ''}</td>
                <td className="p-2">{r.price || ''}</td>
                <td className="p-2">{r.description || ''}</td>
                <td className="p-2">
                  <button 
                    onClick={() => onPrint(r)}
                    className="text-blue-600 hover:text-blue-800"
                    title={t('Print Receipt', 'ரசீது அச்சிட')}
                  >
                    🖨️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
