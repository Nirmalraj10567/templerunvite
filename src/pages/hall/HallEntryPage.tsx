import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Modal } from '@/components/ui/modal';
import type { LanguageContextType } from '@/lib/language';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

const generateReceiptNo = async (token: string) => {
  try {
    const response = await fetch('/api/hall-bookings/generate-receipt-number', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to generate receipt number');
    const data = await response.json();
    return data.receiptNo;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    // Fallback to local generation if API fails
    const year = new Date().getFullYear();
    const counter = Math.floor(1000 + Math.random() * 9000);
    return `${year}-${counter.toString().padStart(4, '0')}`;
  }
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
  hallType?: string;
  bookingStatus?: string;
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
  transferTo: '',
  hallType: '',
  bookingStatus: 'pending'
};

export default function HallEntryPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [form, setForm] = useState<FormState>({
    ...initialState,
    registerNo: '' // Will be set in useEffect
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [isError, setIsError] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);
  const [hallTypes, setHallTypes] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  // Auto-calculate balance amount
  useEffect(() => {
    const total = parseFloat(form.totalAmount) || 0;
    const advance = parseFloat(form.advanceAmount) || 0;
    const balance = Math.max(0, total - advance);
    
    if (form.totalAmount && form.advanceAmount) {
      setForm(prev => ({ 
        ...prev, 
        balanceAmount: balance > 0 ? balance.toString() : '0'
      }));
    }
  }, [form.totalAmount, form.advanceAmount]);

  // Load existing booking data for edit
  useEffect(() => {
    if (isEdit && id) {
      loadBookingData(id);
    }
  }, [id, isEdit]);

  const loadBookingData = async (bookingId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hall-bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load booking');
      
      const data = await response.json();
      const booking = data.data || data;
      
      setForm({
        registerNo: booking.registerNo || '',
        date: booking.date || '',
        time: booking.time || '',
        event: booking.event || '',
        subdivision: booking.subdivision || '',
        name: booking.name || '',
        address: booking.address || '',
        village: booking.village || '',
        mobile: booking.mobile || '',
        advanceAmount: booking.advanceAmount?.toString() || '',
        totalAmount: booking.totalAmount?.toString() || '',
        balanceAmount: booking.balanceAmount?.toString() || '',
        remarks: booking.remarks || '',
        transferTo: booking.transferTo || '',
        hallType: booking.hallType || '',
        bookingStatus: booking.bookingStatus || 'pending'
      });
    } catch (error) {
      setIsError(true);
      setMessage(t('Failed to load booking data', 'பதிவு தகவலை ஏற்ற முடியவில்லை'));
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name !== 'registerNo' || !isEdit) {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Auto-set price when hall type is selected
    if (name === 'hallType') {
      const selectedHall = hallTypes.find(hall => hall.id === value);
      if (selectedHall && !form.totalAmount) {
        setForm(prev => ({ 
          ...prev, 
          totalAmount: selectedHall.price.toString() 
        }));
      }
    }
  };

  const validate = () => {
    if (!form.date || !form.time || !form.name || !form.mobile) return false;
    
    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(form.mobile)) {
      setIsError(true);
      setMessage(t('Please enter a valid mobile number', 'சரியான மொபைல் எண்ணை உள்ளிடவும்'));
      return false;
    }

    // Validate amounts
    if (form.totalAmount && isNaN(parseFloat(form.totalAmount))) {
      setIsError(true);
      setMessage(t('Please enter valid amount', 'சரியான தொகையை உள்ளிடவும்'));
      return false;
    }

    return true;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load accounts
        const accountsResp = await axios.get<any>('/api/ledger/accounts', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const accountsData = (accountsResp?.data && Array.isArray(accountsResp.data.data)) 
          ? accountsResp.data.data 
          : (Array.isArray(accountsResp?.data) ? accountsResp.data : []);
        
        const mappedAccounts = (accountsData || []).map((item: any, index: number) => {
          if (typeof item === 'string') return { id: index + 1, value: item, label: item };
          return { id: item.id ?? index + 1, value: item.value || item.label, label: item.label || item.value };
        });
        setAccounts(mappedAccounts);

        // Load hall types
        const hallTypesResp = await axios.get<any>('/api/hall-types', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const hallTypesData = hallTypesResp?.data?.data || hallTypesResp?.data || [];
        setHallTypes(hallTypesData);
      } catch (e) {
        console.error('Failed to load data', e);
        setAccounts([]);
        setHallTypes([]);
      }
    };
    loadData();
  }, []);

  // Load or generate receipt number
  useEffect(() => {
    const loadReceiptNumber = async () => {
      const receiptNo = await generateReceiptNo(token);
      setForm(prev => ({ ...prev, registerNo: receiptNo }));
    };
    
    if (!isEdit) {
      loadReceiptNumber();
    }
  }, [isEdit, token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(undefined);
    
    if (!validate()) return;

    setSaving(true);
    try {
      const url = isEdit ? `/api/hall-bookings/${id}` : '/api/hall-bookings';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) throw new Error('Failed');
      
      const data = await res.json();
      const bookingId = data?.data?.id || id;
      
      if (!isEdit) {
        setLastCreatedId(bookingId);
        setShowPrintPrompt(true);
        setForm({...initialState, registerNo: ''});
      }
      
      setIsError(false);
      setMessage(t(
        isEdit ? 'Updated successfully' : 'Saved successfully', 
        isEdit ? 'வெற்றிகரமாக புதுப்பிக்கப்பட்டது' : 'வெற்றிகரமாக சேமிக்கப்பட்டது'
      ));
    } catch (err) {
      setIsError(true);
      setMessage(t(
        isEdit ? 'Update failed' : 'Save failed', 
        isEdit ? 'புதுப்பிப்பில் தோல்வி' : 'சேமிப்பில் தோல்வி'
      ));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/hall-bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      
      setMessage(t('Deleted successfully', 'வெற்றிகரமாக நீக்கப்பட்டது'));
      setTimeout(() => navigate('/dashboard/hall/list'), 1500);
    } catch (error) {
      setIsError(true);
      setMessage(t('Delete failed', 'நீக்குவதில் தோல்வி'));
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-4 rounded shadow">
        <div className="text-center py-8">
          {t('Loading...', 'ஏற்றுகிறது...')}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">
          {isEdit 
            ? t('Edit Hall Booking', 'கல்யாண மண்டப பதிவை திருத்து') 
            : t('Hall Booking Entry', 'கல்யாண மண்டப பதிவு')
          }
        </h1>
        {isEdit && (
          <button
            type="button"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            onClick={() => setShowDeleteModal(true)}
          >
            {t('Delete', 'நீக்கு')}
          </button>
        )}
      </div>

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
          <label className="block text-sm mb-1">{t('Booking Status', 'பதிவு நிலை')}</label>
          <select
            name="bookingStatus"
            className="w-full border p-2 rounded"
            value={form.bookingStatus || 'pending'}
            onChange={onSelectChange}
          >
            <option value="pending">{t('Pending', 'நிலுவையில்')}</option>
            <option value="confirmed">{t('Confirmed', 'உறுதிப்படுத்தப்பட்டது')}</option>
            <option value="cancelled">{t('Cancelled', 'ரத்து செய்யப்பட்டது')}</option>
            <option value="completed">{t('Completed', 'முடிந்தது')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Date', 'தேதி')} *</label>
          <input 
            type="date" 
            className="w-full border p-2 rounded" 
            name="date" 
            value={form.date} 
            onChange={onChange}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Time', 'நேரம்')} *</label>
          <input 
            type="time" 
            className="w-full border p-2 rounded" 
            name="time" 
            value={form.time} 
            onChange={onChange} 
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Hall Type', 'மண்டப வகை')}</label>
          <select
            name="hallType"
            className="w-full border p-2 rounded"
            value={form.hallType || ''}
            onChange={onSelectChange}
          >
            <option value="">{t('Select hall type', 'மண்டப வகையைத் தேர்ந்தெடுக்கவும்')}</option>
            {hallTypes.map(hall => (
              <option key={hall.id} value={hall.id}>
                {hall.name} - ₹{hall.price}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Function', 'நிகழ்வு')}</label>
          <select
            name="event"
            className="w-full border p-2 rounded"
            value={form.event}
            onChange={onSelectChange}
          >
            <option value="">{t('Select function', 'நிகழ்வை தேர்ந்தெடுக்கவும்')}</option>
            <option value="marriage">{t('Marriage', 'திருமணம்')}</option>
            <option value="engagement">{t('Engagement', 'நிச்சயதார்த்தம்')}</option>
            <option value="birthday">{t('Birthday', 'பிறந்தநாள்')}</option>
            <option value="reception">{t('Reception', 'வரவேற்பு')}</option>
            <option value="religious">{t('Religious Function', 'மத நிகழ்வு')}</option>
            <option value="other">{t('Other', 'மற்றவை')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Sub-division', 'உப பிரிவு')}</label>
          <input 
            className="w-full border p-2 rounded" 
            name="subdivision" 
            value={form.subdivision} 
            onChange={onChange} 
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Name', 'பெயர்')} *</label>
          <input 
            className="w-full border p-2 rounded" 
            name="name" 
            value={form.name} 
            onChange={onChange} 
            placeholder={t('Enter full name', 'முழு பெயரை உள்ளிடவும்')}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Address', 'முகவரி')}</label>
          <textarea 
            className="w-full border p-2 rounded" 
            name="address" 
            value={form.address} 
            onChange={onChange}
            rows={2}
            placeholder={t('Enter complete address', 'முழு முகவரியை உள்ளிடவும்')}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Village', 'கிராமம்')}</label>
          <input 
            className="w-full border p-2 rounded" 
            name="village" 
            value={form.village} 
            onChange={onChange} 
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Phone', 'தொலைபேசி')} *</label>
          <input 
            className="w-full border p-2 rounded" 
            name="mobile" 
            value={form.mobile} 
            onChange={onChange}
            placeholder="10-digit mobile number"
            maxLength={10}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Total Amount', 'மொத்தம்')}</label>
          <input 
            type="number"
            className="w-full border p-2 rounded" 
            name="totalAmount" 
            value={form.totalAmount} 
            onChange={onChange}
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Advance Amount', 'முன்பணம்')}</label>
          <input 
            type="number"
            className="w-full border p-2 rounded" 
            name="advanceAmount" 
            value={form.advanceAmount} 
            onChange={onChange}
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t('Balance Amount', 'மீதம்')}</label>
          <input 
            type="number"
            className="w-full border p-2 rounded bg-gray-50" 
            name="balanceAmount" 
            value={form.balanceAmount} 
            readOnly
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Transfer To Account', 'எந்த கணக்கிற்கு மாற்றுவது')}</label>
          <select
            name="transferTo"
            className="w-full border p-2 rounded"
            value={form.transferTo || ''}
            onChange={onSelectChange}
          >
            <option value="">{t('Select account', 'கணக்கைத் தேர்ந்தெடுக்கவும்')}</option>
            {accounts.map(acc => (
              <option key={acc.id ?? acc.value} value={acc.value}>{acc.label}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('Remarks', 'குறிப்புகள்')}</label>
          <textarea 
            className="w-full border p-2 rounded" 
            name="remarks" 
            value={form.remarks} 
            onChange={onChange}
            rows={3}
            placeholder={t('Additional notes...', 'கூடுதல் குறிப்புகள்...')}
          />
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button 
            disabled={saving} 
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed" 
            type="submit"
          >
            {saving 
              ? t('Saving...', 'சேமிக்கிறது...') 
              : t(isEdit ? 'Update' : 'Save', isEdit ? 'புதுப்பிக்க' : 'சேமிக்க')
            }
          </button>

          <button
            type="button"
            className="border px-4 py-2 rounded hover:bg-gray-50"
            onClick={() => {
              const d = form.date || new Date().toISOString().slice(0,10);
              navigate(`/dashboard/reports/daily?date=${d}`);
            }}
          >
            {t('Daily Report', 'தினசரி அறிக்கை')}
          </button>

          <button
            type="button"
            className="border px-4 py-2 rounded hover:bg-gray-50"
            onClick={() => navigate('/dashboard/hall/list')}
          >
            {t('View List', 'பட்டியல் பார்க்க')}
          </button>

          {!isEdit && (
            <button
              type="button"
              className="border px-4 py-2 rounded hover:bg-gray-50"
              onClick={() => {
                if (lastCreatedId == null) {
                  setIsError(true);
                  setMessage(t('No recent booking to print. Please save first.', 'அச்சிட சமீபத்திய பதிவு இல்லை. முதலில் சேமிக்கவும்.'));
                  return;
                }
                setShowPrintPrompt(true);
              }}
            >
              {t('Print Receipt', 'ரசீது அச்சிடு')}
            </button>
          )}

          <button 
            type="button" 
            className="border px-4 py-2 rounded hover:bg-gray-50" 
            onClick={() => setForm({...initialState, registerNo: ''})}
          >
            {t('Clear', 'அழிக்க')}
          </button>
        </div>
      </form>

      {/* Print Receipt Modal */}
      {showPrintPrompt && lastCreatedId != null && (
        <Modal
          title={t('Print Receipt', 'ரசீது அச்சிடு')}
          onClose={() => setShowPrintPrompt(false)}
        >
          <p className="mb-4 text-sm">
            {t('Do you want to open the PDF receipt for printing?', 'PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}
          </p>
          <div className="flex justify-end gap-2">
            <button 
              className="px-4 py-2 rounded border hover:bg-gray-50" 
              onClick={() => setShowPrintPrompt(false)}
            >
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          title={t('Confirm Delete', 'நீக்குவதை உறுதிப்படுத்தவும்')}
          onClose={() => setShowDeleteModal(false)}
        >
          <p className="mb-4 text-sm">
            {t('Are you sure you want to delete this hall booking? This action cannot be undone.', 
               'இந்த மண்டப பதிவை நீக்க விரும்புகிறீர்களா? இந்த செயலை மாற்றியமைக்க முடியாது.')}
          </p>
          <div className="flex justify-end gap-2">
            <button 
              className="px-4 py-2 rounded border hover:bg-gray-50" 
              onClick={() => setShowDeleteModal(false)}
            >
              {t('Cancel', 'ரத்து')}
            </button>
            <button
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? t('Deleting...', 'நீக்குகிறது...') : t('Delete', 'நீக்கு')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
