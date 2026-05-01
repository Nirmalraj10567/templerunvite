import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { accountService, CreateAccountPayload } from '@/services/accountService';

export default function AccountCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateAccountPayload>({
    accountName: '',
    accountType: 'bank',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    openingBalance: 0,
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'openingBalance' ? Number(value || 0) : value,
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await accountService.create(token, form);
      navigate('/dashboard/donations/entry');
    } catch (err: any) {
      setError(err?.message || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Create Bank / UPI Account</h1>
        {error ? <p className="text-red-600 text-sm mb-3">{error}</p> : null}
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Account Name</label>
            <input
              name="accountName"
              value={form.accountName}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Account Type</label>
            <select
              name="accountType"
              value={form.accountType}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="bank">Bank</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Bank Name</label>
            <input name="bankName" value={form.bankName || ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Account Number</label>
            <input name="accountNumber" value={form.accountNumber || ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">IFSC Code</label>
            <input name="ifscCode" value={form.ifscCode || ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">UPI ID (optional)</label>
            <input name="upiId" value={form.upiId || ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Opening Balance</label>
            <input
              type="number"
              name="openingBalance"
              value={form.openingBalance || 0}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/dashboard/donations/entry')} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button disabled={saving} type="submit" className="px-4 py-2 bg-orange-600 text-white rounded">
              {saving ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
