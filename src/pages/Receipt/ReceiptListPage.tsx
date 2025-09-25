import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [logOpen, setLogOpen] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logPageSize] = useState(50);
  const [isAllLogs, setIsAllLogs] = useState(false);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`/api/receipts?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        const mapped: ReceiptItem[] = data.data.map((r: any) => ({
          id: r.id,
          registerNo: r.register_no || r.registerNo || '',
          date: r.date || '',
          type: r.type || '',
          name: (r.type === 'receipt' ? (r.from_person || r.fromPerson) : (r.to_person || r.toPerson)) || '',
          amount: String(r.amount ?? ''),
          credit: r.type === 'receipt' ? 'CR' : (r.type === 'payment' ? 'DR' : ''),
          remarks: r.remarks || ''
        }));
        setItems(mapped);
      } else setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openReceiptLogs = async (id: number, registerNo?: string) => {
    setIsAllLogs(false);
    setLogTitle(t('Logs', 'பதிவு பதிவுகள்') + (registerNo ? ` — ${registerNo}` : ''));
    setLogOpen(true);
    setLogLoading(true);
    try {
      const res = await fetch(`/api/receipts/${id}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const arr = Array.isArray(data?.data) ? data.data : [];
      setLogs(arr);
      setLogTotal(arr.length);
      setLogPage(1);
    } catch {
      setLogs([]);
      setLogTotal(0);
    } finally {
      setLogLoading(false);
    }
  };

  const openAllLogs = async (page = 1) => {
    setIsAllLogs(true);
    setLogTitle(t('All Receipt Logs', 'அனைத்து பதிவு பதிவுகள்'));
    setLogOpen(true);
    setLogLoading(true);
    try {
      const res = await fetch(`/api/receipts/logs?page=${page}&pageSize=${logPageSize}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const arr = Array.isArray(data?.data) ? data.data : [];
      setLogs(arr);
      setLogTotal(Number(data?.total || arr.length || 0));
      setLogPage(page);
    } catch {
      setLogs([]);
      setLogTotal(0);
    } finally {
      setLogLoading(false);
    }
  };

  const closeLogs = () => {
    setLogOpen(false);
    setLogs([]);
    setLogPage(1);
    setLogTotal(0);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPrint = () => {
    window.print();
  };

  const onDelete = async (id: number) => {
    if (!confirm(t('Delete this receipt?', 'இந்த பதிவை நீக்கவா?'))) return;
    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      await load();
    } catch (e) {
      alert(t('Delete failed', 'நீக்கு தோல்வியடைந்தது'));
    }
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
          onClick={() => openAllLogs(1)}
          className="border px-3 py-1.5 rounded text-sm"
        >
          {t('All Logs', 'முழு பதிவுகள்')}
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
              <th className="p-1.5 text-left">{t('Actions', 'செயல்கள்')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-1.5" colSpan={8}>{t('Loading...', 'ஏற்றுகிறது...')}</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td className="p-1.5" colSpan={8}>{t('No data', 'தரவு இல்லை')}</td>
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
                <td className="p-1.5">
                  <Link className="text-blue-600 hover:underline mr-3" to={`/dashboard/receipt/entry/${item.id}`}>
                    {t('Edit', 'திருத்தம்')}
                  </Link>
                  <button className="text-indigo-600 hover:underline mr-3" onClick={() => openReceiptLogs(item.id, item.registerNo)}>
                    {t('View Logs', 'பதிவுகளைப் பார்க்க')}
                  </button>
                  <button className="text-red-600 hover:underline" onClick={() => onDelete(item.id)}>
                    {t('Delete', 'நீக்கு')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simple Modal for Logs */}
      {logOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h2 className="text-base font-semibold">{logTitle}</h2>
              <button className="text-sm" onClick={closeLogs}>✕</button>
            </div>
            <div className="p-3">
              {logLoading ? (
                <div className="text-sm">{t('Loading...', 'ஏற்றுகிறது...')}</div>
              ) : logs.length === 0 ? (
                <div className="text-sm">{t('No data', 'தரவு இல்லை')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead>
                      <tr className="bg-gray-100">
                        {isAllLogs && <th className="p-1.5 text-left">{t('Reg No', 'பதிவு எண்')}</th>}
                        <th className="p-1.5 text-left">{t('Date', 'தேதி')}</th>
                        <th className="p-1.5 text-left">{t('Action', 'செயல்')}</th>
                        <th className="p-1.5 text-left">{t('Details', 'விவரங்கள்')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l: any, idx: number) => (
                        <tr key={l.id || idx} className="border-t">
                          {isAllLogs && <td className="p-1.5">{l.register_no || ''}</td>}
                          <td className="p-1.5">{(l.created_at || '').toString().replace('T', ' ').replace('Z','')}</td>
                          <td className="p-1.5 uppercase">{l.action}</td>
                          <td className="p-1.5 whitespace-pre-wrap">
                            {(() => {
                              const d = l.details;
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
              )}
            </div>
            {isAllLogs && (
              <div className="flex items-center justify-between px-4 py-2 border-t text-xs">
                <div>
                  {t('Page', 'பக்கம்')}: {logPage} / {Math.max(1, Math.ceil(logTotal / logPageSize))}
                </div>
                <div className="space-x-2">
                  <button
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    disabled={logPage <= 1}
                    onClick={() => openAllLogs(logPage - 1)}
                  >
                    {t('Prev', 'முன்')}
                  </button>
                  <button
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    disabled={logPage >= Math.max(1, Math.ceil(logTotal / logPageSize))}
                    onClick={() => openAllLogs(logPage + 1)}
                  >
                    {t('Next', 'அடுத்து')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
