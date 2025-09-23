import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationFormData } from '@/services/moneyDonationService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { ledgerService } from '@/services/ledgerService';
import { journalService } from '@/services/journalService';

const createInitialState = (): MoneyDonationFormData => ({
  registerNo: '',
  date: new Date().toISOString().slice(0,10),
  name: '',
  fatherName: '',
  address: '',
  village: '',
  phone: '',
  amount: '',
  reason: '',
  transferTo: 'INCOME A/C'
});

export default function MoneyDonationEntry() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState<MoneyDonationFormData>(createInitialState());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [isError, setIsError] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);

  // Approval logs state
  interface ApprovalLog {
    id: number;
    action: string;
    performed_by?: number;
    performed_at: string;
    notes?: string;
    old_status?: string;
    new_status?: string;
    performed_by_name?: string; // from backend join
  }
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);

  const t = (en: string, ta: string) => language === 'english' ? ta : en;

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
      } catch (e) {
        console.error('Failed to load ledger names', e);
        setAccounts([]);
      }
    };
    loadAccounts();
  }, []);

  // Load approval logs for the newly created donation (if applicable)
  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (!lastCreatedId || !token) return;
        const res = await fetch(`http://localhost:4000/api/donations-approval/request/${lastCreatedId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setApprovalLogs(data?.data?.logs || []);
      } catch (e) {
        setApprovalLogs([]);
      }
    };
    loadLogs();
  }, [lastCreatedId, token]);

  // Compute next register number by year using existing records (reusable)
  const computeNextRegisterNo = useCallback(async (): Promise<string | null> => {
    try {
      // Determine Financial Year (Apr–Mar) based on selected date or today
      const dStr = form.date && form.date.length >= 4 ? form.date : new Date().toISOString().slice(0,10);
      const yyyy = Number(dStr.slice(0,4));
      const mm = Number(dStr.slice(5,7));
      if (!yyyy || isNaN(yyyy) || !mm || isNaN(mm)) return null;

      // FY start year: if month >= 4 use current year, else previous year
      const fyStartYear = mm >= 4 ? yyyy : yyyy - 1;
      const fyStart = `${fyStartYear}-04-01`;
      const fyEnd = `${fyStartYear + 1}-03-31`;

      // Fetch existing donations and compute the next sequence for the FY
      const resp = await moneyDonationService.list(token);
      const items = resp?.data || [];
      const sameFY = items.filter((it:any) => {
        const d = (it.date || '');
        return d >= fyStart && d <= fyEnd; // compare ISO strings
      });

      // Parse register_no expecting pattern YYYY-XXXX where YYYY is FY start year (fallback to count)
      let maxSeq = 0;
      for (const it of sameFY) {
        const rn = String(it.register_no || '').trim();
        const m = rn.match(new RegExp(`^${fyStartYear}-([0-9]+)$`));
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n)) maxSeq = Math.max(maxSeq, n);
        }
      }
      const nextSeq = maxSeq > 0 ? maxSeq + 1 : sameFY.length + 1;
      return `${fyStartYear}-${String(nextSeq).padStart(4,'0')}`;
    } catch (e) {
      console.warn('Failed to compute register number', e);
      return null;
    }
  }, [form.date, token]);

  // Prefill register no on mount and when date changes
  useEffect(() => {
    (async () => {
      const rn = await computeNextRegisterNo();
      if (rn) {
        setForm(prev => {
          const year = rn.slice(0,4);
          const prevYear = (prev.registerNo || '').slice(0,4);
          if (!prev.registerNo || prevYear !== year) return { ...prev, registerNo: rn };
          return prev;
        });
      }
    })();
  }, [computeNextRegisterNo]);

  const regenerateRegisterNo = useCallback(async () => {
    const rn = await computeNextRegisterNo();
    if (rn) setForm(prev => ({ ...prev, registerNo: rn }));
  }, [computeNextRegisterNo]);

  const clearForm = () => {
    setForm(createInitialState());
    // Regenerate register number after clearing form
    computeNextRegisterNo().then(newRegisterNo => {
      if (newRegisterNo) {
        setForm(prev => ({ ...prev, registerNo: newRegisterNo }));
      }
    });
  };

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
      // transferTo is defaulted to INCOME A/C
      // Finalize register number right before submit to reduce collision risk
      const freshRN = await computeNextRegisterNo();
      const payload = { ...form, registerNo: freshRN || form.registerNo, fromAccount: 'DONATION A/C', transferTo: form.transferTo || 'INCOME A/C' } as any;
      const resp = await moneyDonationService.create(token, payload);
      const newId = resp?.data?.id;
      const createdId = typeof newId === 'number' ? newId : null;
      setLastCreatedId(createdId);

      // Journal entry is now created by the backend in /api/money-donations to avoid duplicates
      setForm(createInitialState());
      // Regenerate register number after successful submission
      const newRegisterNo = await computeNextRegisterNo();
      if (newRegisterNo) {
        setForm(prev => ({ ...prev, registerNo: newRegisterNo }));
      }
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
    <div className="w-full max-w-4xl mx-auto bg-white p-4 rounded shadow text-sm">
      <h1 className="text-lg font-semibold mb-4 text-center">
        {t('Money Donation Entry', 'பண நன்கொடைக் பதிவு')}
      </h1>
      {message && (
        <div className="mb-4">
          <Alert variant={isError ? 'destructive' : 'default'}>
            <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        </div>
      )}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs mb-1">{t('Register No', 'பதிவு எண்')}</label>
          <div className="flex gap-1">
            <input
              className="flex-1 border p-1 rounded bg-gray-50 text-xs"
              name="registerNo"
              value={form.registerNo}
              readOnly
            />
            <button type="button" onClick={regenerateRegisterNo} className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs whitespace-nowrap">
              {t('Regenerate', 'மீண்டும்')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('Auto-generated per FY', 'தானாக உருவாக்கப்படும்')}</p>
        </div>
        <div>
          <label className="block text-xs mb-1">{t('Date', 'தேதி')}</label>
          <input type="date" className="w-full border p-1 rounded text-xs" name="date" value={form.date} onChange={onChange} />
        </div>
        <div>
          <label className="block text-xs mb-1">{t('Name', 'பெயர்')}</label>
          <input className="w-full border p-1 rounded text-xs" name="name" value={form.name} onChange={onChange} />
        </div>
        <div>
          <label className="block text-xs mb-1">{t('Father Name', 'தந்தை பெயர்')}</label>
          <input className="w-full border p-1 rounded text-xs" name="fatherName" value={form.fatherName} onChange={onChange} />
        </div>
        <div>
          <label className="block text-xs mb-1">{t('Village', 'ஊர்')}</label>
          <input className="w-full border p-1 rounded text-xs" name="village" value={form.village} onChange={onChange} />
        </div>
        <div>
          <label className="block text-xs mb-1">{t('Phone', 'கைபேசி எண்')}</label>
          <input className="w-full border p-1 rounded text-xs" name="phone" value={form.phone} onChange={onChange} />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs mb-1">{t('Address', 'முகவரி')}</label>
          <input className="w-full border p-1 rounded text-xs" name="address" value={form.address} onChange={onChange} />
        </div>
        <div>
          <label className="block text-xs mb-1">{t('Amount', 'வருமானம்')}*</label>
          <input className="w-full border p-1 rounded text-xs" name="amount" value={form.amount} onChange={onChange} placeholder={t('Enter amount', 'தொகை')} />
        </div>
        
        {/* Transfer To hidden (defaults to INCOME A/C) */}
        {false && (
        <div>
          <label className="block text-xs mb-1">{t('Transfer To', 'எங்கு')}</label>
          <select
            className="w-full border p-1 rounded text-xs"
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
        )}
        <div className="md:col-span-3">
          <label className="block text-xs mb-1">{t('Reason', 'காரணம்')}</label>
          <input className="w-full border p-1 rounded text-xs" name="reason" value={form.reason} onChange={onChange} />
        </div>
        <div className="md:col-span-3 flex gap-2 justify-center mt-2">
          <button disabled={saving} className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 text-xs" type="submit">
            {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'பதிவு')}
          </button>
          <button
            type="button"
            className="border px-4 py-1 rounded text-xs"
            onClick={() => {
              const d = form.date || new Date().toISOString().slice(0,10);
              navigate(`/dashboard/reports/daily?date=${d}`);
            }}
          >
            {t('Daily Report', 'தினசரி அறிக்கை')}
          </button>
          <button type="button" className="border px-4 py-1 rounded text-xs" onClick={clearForm}>
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
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                iframe.src = url;
                iframe.onload = () => {
                  try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                  } catch (e) {
                    // Fallback to opening in new tab if print cannot be triggered (cross-origin PDFs etc.)
                    window.open(url, '_blank');
                  } finally {
                    setTimeout(() => {
                      try { document.body.removeChild(iframe); } catch {}
                    }, 1000);
                  }
                };
                document.body.appendChild(iframe);
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
