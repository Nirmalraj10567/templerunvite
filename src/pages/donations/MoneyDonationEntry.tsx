import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationFormData } from '@/services/moneyDonationService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { ledgerService } from '@/services/ledgerService';
import { journalService } from '@/services/journalService';

const initialState: MoneyDonationFormData = {
  registerNo: '',
  date: '',
  name: '',
  fatherName: '',
  address: '',
  village: '',
  phone: '',
  amount: '',
  reason: '',
  transferTo: ''
};

export default function MoneyDonationEntry() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState<MoneyDonationFormData>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [isError, setIsError] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);
  const [fromAccount, setFromAccount] = useState<string>('CASH A/C');
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        // Prefer journal accounts to align with double-entry accounting
        let names: string[] = [];
        try {
          names = await journalService.getAccounts();
        } catch {
          names = await ledgerService.getNames();
        }
        const mapped = (names || []).map((n: string, idx: number) => ({ id: idx + 1, value: n, label: n }));
        setAccounts(mapped);
        // Default sensible from account
        if (names.includes('CASH A/C')) setFromAccount('CASH A/C');
      } catch (e) {
        console.error('Failed to load ledger names', e);
        setAccounts([]);
      }
    };
    loadAccounts();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);

    try {
      if (!form.date) {
        setIsError(true);
        setMessage(t('Please select a date', 'தேதியைத் தேர்ந்தெடுக்கவும்'));
        return;
      }
      if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
        setIsError(true);
        setMessage(t('Enter a valid amount greater than 0', '0-ஐ விட அதிகமான செல்லுபடியான தொகையை உள்ளிடவும்'));
        return;
      }
      if (!form.transferTo || form.transferTo.trim() === '') {
        setIsError(true);
        setMessage(t('Please select an account to transfer to', 'எந்த கணக்கிற்கு மாற்றுவது என்பதைத் தேர்ந்தெடுக்கவும்'));
        return;
      }
      // Include fromAccount so backend can create proper journal entry
      const resp = await moneyDonationService.create(token, { ...form, transferFrom: fromAccount });
      const newId = resp?.data?.id;
      const createdId = typeof newId === 'number' ? newId : null;
      setLastCreatedId(createdId);
      setForm(initialState);
      setIsError(false);
      setMessage(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));
      if (createdId != null) {
        setShowPrintPrompt(true);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setIsError(true);
      setMessage(t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4 text-center">
        {t('Money Donation Entry', 'பண நன்கொடைக் பதிவு')}
      </h1>
      {message && (
        <div className="mb-3">
          <Alert variant={isError ? 'destructive' : 'default'}>
            <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          {/* Print prompt moved to modal */}
        </div>
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
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Amount', 'வருமானம்')}*</label>
          <input className="w-full border p-2 rounded" name="amount" value={form.amount} onChange={onChange} placeholder={t('Enter amount only', 'பணம் மட்டும் உள்ளிடவும்')} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Transfer From Account', 'எந்த கணக்கிலிருந்து மாற்றுவது')}</label>
          <select
            className="w-full border p-2 rounded"
            name="transferFrom"
            value={fromAccount}
            onChange={(e) => setFromAccount(e.target.value)}
          >
            {accounts.map(acc => (
              <option key={acc.id ?? acc.value} value={acc.value}>{acc.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Transfer To Account', 'எந்த கணக்கிற்கு மாற்றுவது')}</label>
          <select
            className="w-full border p-2 rounded"
            name="transferTo"
            value={form.transferTo || ''}
            onChange={(e) => setForm(prev => ({ ...prev, transferTo: e.target.value }))}
          >
            <option value="">{t('Select account', 'கணக்கைத் தேர்ந்தெடுக்கவும்')}</option>
            {accounts.map(acc => (
              <option key={acc.id ?? acc.value} value={acc.value}>{acc.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Reason', 'காரணம்')}</label>
          <textarea className="w-full border p-2 rounded" name="reason" value={form.reason} onChange={onChange} rows={2} />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-center">
          <button disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" type="submit">
            {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'பதிவு')}
          </button>
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
          <button type="button" className="border px-4 py-2 rounded" onClick={() => setForm(initialState)}>
            {t('Clear', 'வெளியே')}
          </button>
        </div>
      </form>
      {showPrintPrompt && lastCreatedId != null && (
        <Modal
          title={t('Print Receipt', 'ரசீதை அச்சிடவா?')}
          onClose={() => setShowPrintPrompt(false)}
        >
          <p className="mb-4 text-sm">
            {t('Do you want to open the PDF receipt for printing?', 'PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}
          </p>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded border"
              onClick={() => setShowPrintPrompt(false)}
            >
              {t('No', 'இல்லை')}
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                const url = moneyDonationService.receiptUrl(lastCreatedId!, token);
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
