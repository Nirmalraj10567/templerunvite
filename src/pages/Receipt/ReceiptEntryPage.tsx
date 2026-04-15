import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

interface ReceiptLog {
  id: number;
  receipt_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  details: any;
}

interface FormState {
  registerNo: string;
  date: string;
  type: string;
  fromPerson: string;
  toPerson: string; 
  amount: string;
  remarks: string;
}

const initialState: FormState = {
  registerNo: '',
  date: '',
  type: '',
  fromPerson: '',
  toPerson: '',
  amount: '',
  remarks: ''
};

export default function ReceiptEntryPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<{id: string; name: string}[]>([]);
  
  // Logs state
  const [logs, setLogs] = useState<ReceiptLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  // Logs functions
  const fetchLogs = async () => {
    if (!id) return;
    try {
      console.log('🔍 Fetching logs for receipt ID:', id);
      setLogsLoading(true);
      const response = await fetch(`http://localhost:4000/api/receipts/${id}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Logs API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Logs API error:', errorText);
        throw new Error('Failed to fetch logs');
      }

      const result = await response.json();
      console.log('📋 Logs API result:', result);
      
      if (result.success) {
        console.log('✅ Logs fetched successfully:', result.data?.length || 0, 'logs');
        setLogs(result.data || []);
      } else {
        console.error('❌ Logs API returned success: false:', result.error);
        throw new Error(result.error || 'Failed to fetch logs');
      }
    } catch (error) {
      console.error("❌ Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch people list for donor/receiver dropdowns
  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/people', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch people');
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setPeople(data.data);
        }
      } catch (err) {
        console.error('Failed to load people:', err);
      }
    };
    fetchPeople();
  }, [token]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/receipts/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data?.success && data.data) {
          const r = data.data;
          setForm({
            registerNo: r.register_no || '',
            date: r.date?.split('T')[0] || '',
            type: r.type || '',
            fromPerson: r.from_person || '',
            toPerson: r.to_person || '',
            amount: String(r.amount || ''),
            remarks: r.remarks || ''
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load logs for the receipt when in edit mode
  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (!id || !token) return;
        await fetchLogs();
      } catch (e) {
        console.error('Failed to load logs on mount:', e);
      }
    };
    loadLogs();
  }, [id, token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);
    try {
      const payload = {
        date: form.date,
        type: form.type?.toLowerCase().includes('expense') ? 'payment' : 'receipt',
        from_person: form.fromPerson,
        to_person: form.toPerson,
        amount: Number(form.amount || 0),
        remarks: form.remarks,
        action: id ? 'update' : 'create',
        changes: JSON.stringify({
          previous: id ? {
            date: form.date,
            type: form.type,
            from_person: form.fromPerson,
            to_person: form.toPerson,
            amount: form.amount,
            remarks: form.remarks
          } : null,
          current: {
            date: form.date,
            type: form.type?.toLowerCase().includes('expense') ? 'payment' : 'receipt',
            from_person: form.fromPerson,
            to_person: form.toPerson,
            amount: Number(form.amount || 0),
            remarks: form.remarks
          }
        })
      };
            const res = await fetch(id ? `http://localhost:4000/api/receipts/${id}` : 'http://localhost:4000/api/receipts', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed');
      const result = await res.json();
      if (result.success) {
        setMessage(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));
        
        // Fetch logs after successful save (for updates)
        if (id) {
          try {
            await fetchLogs();
          } catch (e) {
            console.error('Failed to load logs after save:', e);
          }
        }
        
        navigate('/dashboard/receipt');
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (err) {
      setMessage(t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4 text-center">{id ? t('Edit Receipt', 'வரவு/செலவு திருத்தம்') : t('Receipt Entry', 'வரவு/செலவு பதிவு')}</h1>
      {loading && (
        <div className="mb-3 text-sm">{t('Loading...', 'ஏற்றுகிறது...')}</div>
      )}
      {message && (
        <div className="mb-3 text-sm text-blue-700">{message}</div>
      )}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input className="w-full border p-2 rounded" name="registerNo" value={form.registerNo} onChange={onChange} placeholder={t('Register No', 'Register No')} />
            {t('Clear', 'வெளியே')}
          </button>
          {id && (
            <button 
              type="button" 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? t('Hide Logs', 'பதிவுகளை மறை') : t('Show Logs', 'பதிவுகளைக் காட்டு')}
            </button>
          )}
        </div>
      </form>

      {/* Logs Section */}
      {showLogs && id && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">{t('Receipt Logs', 'பதிவு பதிவுகள்')}</h3>
          {logsLoading ? (
            <div className="text-sm">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகின்றன...')}</div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">{t('Date', 'தேதி')}</th>
                    <th className="p-2 text-left">{t('Action', 'செயல்')}</th>
                    <th className="p-2 text-left">{t('User', 'பயனர்')}</th>
                    <th className="p-2 text-left">{t('Details', 'விவரங்கள்')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="p-2">{(log.created_at || '').toString().replace('T', ' ').replace('Z','')}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.action === 'create' ? 'bg-green-100 text-green-800' :
                          log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                           log.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                           log.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                           log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">{log.created_by ? `User ${log.created_by}` : '-'}</td>
                      <td className="p-2 whitespace-pre-wrap">
                        {(() => {
                          const d = log.details;
                          try {
                            return <code className="text-[10px]">{JSON.stringify(d, null, 2)}</code>;
                          } catch {
                            return <span className="text-[10px]">{String(d || '')}</span>;
                          }
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-500">{t('No logs found', 'பதிவுகள் எதுவும் கிடைக்கவில்லை')}</div>
          )}
        </div>
      )}
    </div>
  );
}
