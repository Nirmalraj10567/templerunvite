import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationFormData } from '@/services/moneyDonationService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { ledgerService } from '@/services/ledgerService';
import { journalService } from '@/services/journalService';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

const createInitialState = (): MoneyDonationFormData => ({
  registerNo: '',
  date: new Date().toISOString().slice(0, 10),
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
  const [searchParams] = useSearchParams();
  const editIdParam = searchParams.get('editId');
  const editId = editIdParam ? Number(editIdParam) : null;
  const isEdit = typeof editId === 'number' && !isNaN(editId);
  const [form, setForm] = useState<MoneyDonationFormData>(createInitialState());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  // Auto-hide success messages after 4 seconds (do not hide error messages)
  const messageTimeoutRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (!message) return;
    if (!isError) {
      if (messageTimeoutRef.current) window.clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = window.setTimeout(() => setMessage(undefined), 4000);
      return () => {
        if (messageTimeoutRef.current) {
          window.clearTimeout(messageTimeoutRef.current);
          messageTimeoutRef.current = null;
        }
      };
    }
  }, [message, isError]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
    };
  }, []);

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);;

  // Function to refresh journal after money donation operations
  const refreshJournal = async () => {
    try {
      await fetch('https://templeapi.agniplay.com/api/journal/sync-pooja', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      console.error('Failed to sync journal logs:', e);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return; // allow buttons and textareas to handle Enter normally
    e.preventDefault();
    // Focus the save button
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
    }
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
        const res = await fetch(`https://templeapi.agniplay.com/api/donations-approval/request/${lastCreatedId}`, {
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
      const dStr = form.date && form.date.length >= 4 ? form.date : new Date().toISOString().slice(0, 10);
      const yyyy = Number(dStr.slice(0, 4));
      const mm = Number(dStr.slice(5, 7));
      if (!yyyy || isNaN(yyyy) || !mm || isNaN(mm)) return null;

      // FY start year: if month >= 4 use current year, else previous year
      const fyStartYear = mm >= 4 ? yyyy : yyyy - 1;
      const fyStart = `${fyStartYear}-04-01`;
      const fyEnd = `${fyStartYear + 1}-03-31`;

      // Fetch existing donations and compute the next sequence for the FY
      const resp = await moneyDonationService.list(token);
      const items = resp?.data || [];
      const sameFY = items.filter((it: any) => {
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
      return `${fyStartYear}-${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      console.warn('Failed to compute register number', e);
      return null;
    }
  }, [form.date, token]);

  // Prefill register no on mount and when date changes
  useEffect(() => {
    if (isEdit) return; // do not auto-generate when editing existing
    (async () => {
      const rn = await computeNextRegisterNo();
      if (rn) {
        setForm(prev => {
          const year = rn.slice(0, 4);
          const prevYear = (prev.registerNo || '').slice(0, 4);
          if (!prev.registerNo || prevYear !== year) return { ...prev, registerNo: rn };
          return prev;
        });
      }
    })();
  }, [computeNextRegisterNo, isEdit]);

  const regenerateRegisterNo = useCallback(async () => {
    if (isEdit) return; // do not regenerate in edit mode
    const rn = await computeNextRegisterNo();
    if (rn) setForm(prev => ({ ...prev, registerNo: rn }));
  }, [computeNextRegisterNo, isEdit]);

  const clearForm = () => {
    if (isEdit) {
      // In edit mode, reload the existing data instead of clearing to new
      if (editId && token) {
        moneyDonationService.getById(token, editId)
          .then(resp => {
            const d = resp.data;
            setForm({
              registerNo: d.register_no || '',
              date: d.date || new Date().toISOString().slice(0, 10),
              name: d.name || '',
              fatherName: d.father_name || '',
              address: d.address || '',
              village: d.village || '',
              phone: d.phone || '',
              amount: String(d.amount ?? ''),
              reason: d.reason || '',
              transferTo: 'INCOME A/C',
            });
          })
          .catch(() => { });
      }
      return;
    }
    setForm(createInitialState());
    computeNextRegisterNo().then(newRegisterNo => {
      if (newRegisterNo) {
        setForm(prev => ({ ...prev, registerNo: newRegisterNo }));
      }
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== DEBUG: onSubmit called ===');
    console.log('Form ', form);
    console.log('Token exists:', !!token);
    console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('isEdit:', isEdit);
    console.log('editId:', editId);
    setSaving(true);
    setMessage(undefined);

    try {
      console.log('DEBUG: Form validation starting...');
      console.log('DEBUG: form.date:', form.date);
      console.log('DEBUG: form.amount:', form.amount);
      console.log('DEBUG: form.name:', form.name);

      if (!form.date) {
        console.log('DEBUG: Date validation failed - no date');
        setIsError(true);
        setMessage(t('Please select a date', 'தேதியைத் தேர்ந்தெடுக்கவும்'));
        return;
      }
      if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
        console.log('DEBUG: Amount validation failed - amount:', form.amount, 'parsed:', Number(form.amount));
        setIsError(true);
        setMessage(t('Enter a valid amount greater than 0', '0-ஐ விட அதிகமான செல்லுபடியான தொகையை உள்ளிடவும்'));
        return;
      }
      console.log('DEBUG: Form validation passed!');
      if (isEdit && editId) {
        // Update existing donation
        const updatePayload: any = { ...form, transfer_to_account: form.transferTo };
        await moneyDonationService.update(token, editId, updatePayload);
        setIsError(false);
        setMessage(t('Updated successfully', 'வெற்றிகரமாக புதுப்பிக்கப்பட்டது'));
        // Trigger logs fetch for this updated record (same behavior as create)
        console.log('DEBUG: Update successful, setting lastCreatedId to fetch logs for id:', editId);
        setLastCreatedId(editId);

        try {
          if (token) {
            const res = await fetch(`https://templeapi.agniplay.com/api/donations-approval/request/${editId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              setApprovalLogs(data?.data?.logs || []);
            }
          }
        } catch (e) {
          console.error('Failed to load approval logs after update:', e);
        }

        // Refresh journal after successful edit
        await refreshJournal();

        // After fetching logs, navigate back to the list page (short delay to allow user to see message)
        setTimeout(() => {
          navigate('/dashboard/donations/money-list');
        }, 300);
      } else {
        // Create new donation
        console.log('DEBUG: Creating new donation');
        const freshRN = await computeNextRegisterNo();
        const payload = { ...form, registerNo: freshRN || form.registerNo, fromAccount: 'DONATION A/C', transferTo: form.transferTo || 'INCOME A/C' } as any;
        console.log('DEBUG: Payload to send:', payload);
        console.log('DEBUG: About to call moneyDonationService.create');
        console.log('DEBUG: Token exists:', !!token);
        console.log('DEBUG: Token length:', token ? token.length : 0);
        console.log('DEBUG: Service method exists:', typeof moneyDonationService.create);

        let resp;
        try {
          resp = await moneyDonationService.create(token, payload);
          console.log('DEBUG: Response received:', resp);
        } catch (apiError) {
          console.error('DEBUG: API call failed:', apiError);
          throw apiError;
        }
        const newId = resp?.data?.id;
        const createdId = typeof newId === 'number' ? newId : null;
        setLastCreatedId(createdId);

        // Journal entry is now created by the backend in /api/money-donations to avoid duplicates
        setForm(createInitialState());
        const newRegisterNo = await computeNextRegisterNo();
        if (newRegisterNo) {
          setForm(prev => ({ ...prev, registerNo: newRegisterNo }));
        }
        setIsError(false);
        setMessage(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));

        // Refresh journal after successful create
        await refreshJournal();

        if (createdId != null) {
          setShowPrintPrompt(true);
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
      setIsError(true);
      setMessage(isEdit ? t('Update failed', 'புதுப்பிப்பில் தோல்வி') : t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  // Load existing donation when in edit mode
  useEffect(() => {
    const loadExisting = async () => {
      if (!isEdit || !editId || !token) return;
      try {
        const resp = await moneyDonationService.getById(token, editId);
        const d = resp.data;
        setForm({
          registerNo: d.register_no || '',
          date: d.date || new Date().toISOString().slice(0, 10),
          name: d.name || '',
          fatherName: d.father_name || '',
          address: d.address || '',
          village: d.village || '',
          phone: d.phone || '',
          amount: String(d.amount ?? ''),
          reason: d.reason || '',
          transferTo: 'INCOME A/C',
        });
        setLastCreatedId(editId); // Set lastCreatedId here
      } catch (e) {
        setMessage(t('Failed to load record for edit', 'திருத்தத்திற்கான பதிவை ஏற்ற முடியவில்லை'));
        setIsError(true);
      }
    };
    loadExisting();
  }, [isEdit, editId, token, language]);

  // Use centralized form styles
  const fieldStyles = cn(theme.input.base, theme.input.size.md);
  const labelStyles = formFieldStyles.label;

  return (
    <div className={pageContainerStyles.container}>
      <div className={cn(pageContainerStyles.content, "max-w-6xl")}>
        <div className={formFieldStyles.card.container}>
          <div className={theme.card.header}>
            <h1 className={formFieldStyles.header.title}>
              {isEdit ? t('Edit Money Donation', 'பண நன்கொடைக் திருத்து') : t('Money Donation Entry', 'பண நன்கொடைக் பதிவு')}
            </h1>
          </div>

          <div className={formFieldStyles.card.content}>
            {message && (
              <div className="mb-6">
                <Alert variant={isError ? 'destructive' : 'default'}>
                  <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              </div>
            )}

            <form
              ref={formRef}
              onSubmit={onSubmit}
              onKeyDown={handleKeyDown}
              className={formFieldStyles.moneyDonationForm.container}
            >
              {/* Register No */}
              <div>
                <label className={labelStyles}>{t('Register No', 'பதிவு எண்')}</label>
                <input
                  className={`${fieldStyles} bg-gray-100`}
                  name="registerNo"
                  value={form.registerNo}
                  readOnly
                />
              </div>

              {/* Date */}
              <div>
                <label className={labelStyles}>{t('Date', 'தேதி')} <span className={formFieldStyles.required}>*</span></label>
                <input
                  type="date"
                  className={fieldStyles}
                  name="date"
                  value={form.date}
                  onChange={onChange}
                  autoFocus
                />
              </div>

              {/* Name */}
              <div>
                <label className={labelStyles}>{t('Name', 'பெயர்')} <span className={formFieldStyles.required}>*</span></label>
                <input
                  className={fieldStyles}
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder={t('Enter name', 'பெயரை உள்ளிடவும்')}
                />
              </div>

              {/* Phone */}
              <div>
                <label className={labelStyles}>{t('Phone', 'கைபேசி எண்')}</label>
                <input
                  className={fieldStyles}
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder={t('Enter phone', 'கைபேசி எண்ணை உள்ளிடவும்')}
                  inputMode="numeric"
                  maxLength={10}
                  onInput={(e) => {
                    const el = e.currentTarget as HTMLInputElement;
                    const cleaned = el.value.replace(/\D/g, '').slice(0, 10);
                    if (el.value !== cleaned) {
                      el.value = cleaned;
                    }
                    setForm(prev => ({ ...prev, phone: cleaned }));
                  }}
                />
              </div>
              {/* Father Name */}
              <div>
                <label className={labelStyles}>{t('Father Name', 'தந்தை பெயர்')}</label>
                <input
                  className={fieldStyles}
                  name="fatherName"
                  value={form.fatherName}
                  onChange={onChange}
                  placeholder={t('Enter father name', 'தந்தை பெயரை உள்ளிடவும்')}
                />
              </div>

              {/* Village */}
              <div>
                <label className={labelStyles}>{t('Village', 'ஊர்')}</label>
                <input
                  className={fieldStyles}
                  name="village"
                  value={form.village}
                  onChange={onChange}
                  placeholder={t('Enter village', 'ஊரை உள்ளிடவும்')}
                />
              </div>


              {/* Address - Full width */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className={labelStyles}>{t('Address', 'முகவரி')}</label>
                <input
                  className={fieldStyles}
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder={t('Enter address', 'முகவரியை உள்ளிடவும்')}
                />
              </div>

              {/* Amount */}
              <div>
                <label className={labelStyles}>{t('Amount', 'தொகை')} <span className={formFieldStyles.required}>*</span></label>
                <input
                  className={fieldStyles}
                  name="amount"
                  value={form.amount}
                  onChange={onChange}
                  placeholder={t('Enter amount', 'தொகையை உள்ளிடவும்')}
                  type="number"
                  min="1"
                />
              </div>

              {/* Reason - Full width */}
              <div className="md:col-span-2 lg:col-span-2">
                <label className={labelStyles}>{t('Reason', 'காரணம்')}</label>
                <input
                  className={fieldStyles}
                  name="reason"
                  value={form.reason}
                  onChange={onChange}
                  placeholder={t('Enter reason', 'காரணத்தை உள்ளிடவும்')}
                />
              </div>

              {/* Action Buttons - Full width */}
              <div className={formFieldStyles.moneyDonationForm.actions}>
                <button
                  disabled={saving}
                  className={formFieldStyles.moneyDonationButton.primary}
                  type="submit"
                >
                  {saving ? (isEdit ? t('Updating...', 'புதுப்பிக்கிறது...') : t('Saving...', 'சேமிக்கிறது...')) : (isEdit ? t('Update', 'புதுப்பிக்க') : t('Save', 'சேமிக்க'))}
                </button>




              </div>
            </form>
          </div>
        </div>

        {showPrintPrompt && lastCreatedId != null && (
          <Modal
            title={t('Print Receipt', 'ரசீதை அச்சிடவா?')}
            onClose={() => setShowPrintPrompt(false)}
          >
            <div className={formFieldStyles.modal.container}>
              <p className={formFieldStyles.modal.content}>
                {t('Do you want to open the PDF receipt for printing?', 'PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}
              </p>
              <div className={formFieldStyles.modal.actions}>
                <button
                  className={formFieldStyles.modal.button.cancel}
                  onClick={() => setShowPrintPrompt(false)}
                >
                  {t('No', 'இல்லை')}
                </button>
                <button
                  className={formFieldStyles.modal.button.confirm}
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
                          try { document.body.removeChild(iframe); } catch { }
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
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}