import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { PrintButton } from '@/components/ui/print-button';
import { Modal } from '@/components/ui/modal';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

interface HallBooking {
  id: number;
  register_no: string | null;
  date: string | null;
  time: string | null;
  event: string | null;
  subdivision: string | null;
  name: string | null;
  address: string | null;
  village: string | null;
  mobile: string | null;
  advance_amount: string | null;
  total_amount: string | null;
  balance_amount: string | null;
  remarks: string | null;
}

interface HallBookingLog {
  id: number;
  hall_booking_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  hall_booking_name: string | null;
  receipt_number: string | null;
  details: any;
}

export default function HallListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<HallBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Logs state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<HallBookingLog[]>([]);
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<HallBookingLog[]>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const [allLogsPageSize] = useState(50);

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Logs functions
  const openLogs = async (item: HallBooking) => {
    setLogsFor(item.id);
    setLogsLoading(true);
    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/${item.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        setLogs(result.data || []);
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogs = () => {
    setLogsFor(null);
    setLogs([]);
  };

  const openAllLogs = async () => {
    setAllLogsOpen(true);
    setAllLogsLoading(true);
    await loadAllHallBookingLogs();
  };

  const loadAllHallBookingLogs = async () => {
    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/logs?page=${allLogsPage}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const result = await response.json();
      if (result.success) {
        setAllLogs(result.data || []);
        setAllLogsTotal(result.total || 0);
      }
    } catch (e) {
      console.error('Failed to load all logs:', e);
      setAllLogs([]);
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
    setAllLogsPage(1);
  };

  const handleEdit = (id: number) => {
    navigate(`/dashboard/hall/edit/${id}`);
  };

  type ColKey =
    | 'register_no'
    | 'date'
    | 'time'
    | 'event'
    | 'subdivision'
    | 'name'
    | 'address'
    | 'village'
    | 'mobile'
    | 'advance_amount'
    | 'total_amount'
    | 'balance_amount'
    | 'remarks';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' }> = [
    { key: 'register_no', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'time', label: t('Time', 'நேரம்') },
    { key: 'event', label: t('Function', 'நிகழ்வு') },
    { key: 'subdivision', label: t('Subdivision', 'துணை பிரிவு') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'address', label: t('Address', 'முகவரி') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'mobile', label: t('Phone', 'தொலைபேசி') },
    { key: 'advance_amount', label: t('Advance', 'முன்பணம்'), align: 'right' },
    { key: 'total_amount', label: t('Total', 'மொத்தம்'), align: 'right' },
    { key: 'balance_amount', label: t('Balance', 'இருப்பு'), align: 'right' },
    { key: 'remarks', label: t('Remarks', 'குறிப்புகள்') },
  ];

  const STORAGE_KEY = 'hall_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    register_no: true,
    date: true,
    time: true,
    event: true,
    subdivision: false,
    name: true,
    address: false,
    village: true,
    mobile: true,
    advance_amount: true,
    total_amount: true,
    balance_amount: true,
    remarks: false,
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultVisible, ...JSON.parse(raw) };
    } catch {}
    return defaultVisible;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // Totals
  const toNum = (v: string | null | undefined) => {
    if (!v) return 0;
    const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += toNum(r.total_amount);
        acc.advance += toNum(r.advance_amount);
        acc.balance += toNum(r.balance_amount);
        return acc;
      },
      { total: 0, advance: 0, balance: 0 }
    );
  }, [rows]);

  const fetchData = async (page: number = currentPage) => {
    setLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('sort', 'desc'); // Add descending order parameter
      params.set('page', page.toString());
      params.set('limit', pageSize.toString());
      const url = 'https://tmsapi.xesstechlink.com/api/hall-bookings' + (params.toString() ? `?${params.toString()}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      
      // Handle paginated response
      if (data.data && Array.isArray(data.data)) {
        setRows(data.data);
        setTotalRecords(data.total || data.data.length);
      } else if (Array.isArray(data)) {
        // Fallback for non-paginated response
        const sortedData = data.sort((a: HallBooking, b: HallBooking) => b.id - a.id);
        setRows(sortedData);
        setTotalRecords(sortedData.length);
      } else {
        setRows([]);
        setTotalRecords(0);
      }
      
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  };

  const handleExportCSV = async () => {
    try {
      const qs = buildQueryString();
      const url = 'https://tmsapi.xesstechlink.com/api/hall-bookings/export' + (qs ? `?${qs}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'hall_bookings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const qs = buildQueryString();
      const url = 'https://tmsapi.xesstechlink.com/api/hall-bookings/export-pdf' + (qs ? `?${qs}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to export PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'hall_bookings.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError('Failed to export PDF');
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white p-3 rounded shadow text-xs">
      <h1 className="text-base font-semibold mb-2">{t('Hall Bookings','மண்டப பதிவுகள்')}</h1>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
        <input
          className="border px-2 py-1 rounded text-xs"
          placeholder={t('Search by name/receipt/village/phone', 'பெயர்/ரசீது/கிராமம்/தொலைபேசி மூலம் தேடுக')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input type="date" className="border px-2 py-1 rounded text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="border px-2 py-1 rounded text-xs" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="border px-2 py-1 rounded" onClick={() => { setCurrentPage(1); fetchData(1); }}>{t('Search', 'தேடுக')}</button>
        <button className="border px-2 py-1 rounded" onClick={() => { setQ(''); setFrom(''); setTo(''); setCurrentPage(1); fetchData(1); }}>{t('Clear', 'அழி')}</button>
        <div className="flex gap-1">
          <button className="border px-2 py-1 rounded flex-1" onClick={handleExportCSV}>{t('CSV', 'CSV')}</button>
          <button className="border px-2 py-1 rounded flex-1" onClick={handleExportPDF}>{t('PDF', 'PDF')}</button>
          <button className="border px-2 py-1 rounded flex-1" onClick={openAllLogs}>{t('All Logs', 'அனைத்து பதிவுகள்')}</button>
        </div>
      </div>

      {loading && <div>{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="text-red-600">{error}</div>}

      {/* Table layout */}
      <div 
        className="bg-white rounded border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto text-xs max-h-[50vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider ${col.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                          }`}
                      >
                        {col.label}
                      </th>
                    )
                )}
                <th className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  {t('Actions', 'செயல்கள்')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={Object.values(visibleCols).filter(Boolean).length + 1}
                    className="px-2 py-2 text-center text-xs text-gray-500"
                  >
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Object.values(visibleCols).filter(Boolean).length + 1}
                    className="px-2 py-2 text-center text-xs text-gray-500"
                  >
                    {t('No records found', 'பதிவுகள் கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols.register_no && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.register_no || '-'}
                      </td>
                    )}
                    {visibleCols.date && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.date || '-'}
                      </td>
                    )}
                    {visibleCols.time && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.time || '-'}
                      </td>
                    )}
                    {visibleCols.event && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.event || '-'}
                      </td>
                    )}
                    {visibleCols.subdivision && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.subdivision || '-'}
                      </td>
                    )}
                    {visibleCols.name && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.name || '-'}
                      </td>
                    )}
                    {visibleCols.address && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.address || '-'}
                      </td>
                    )}
                    {visibleCols.village && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.village || '-'}
                      </td>
                    )}
                    {visibleCols.mobile && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.mobile || '-'}
                      </td>
                    )}
                    {visibleCols.advance_amount && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                        ₹{toNum(r.advance_amount).toLocaleString()}
                      </td>
                    )}
                    {visibleCols.total_amount && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                        ₹{toNum(r.total_amount).toLocaleString()}
                      </td>
                    )}
                    {visibleCols.balance_amount && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                        ₹{toNum(r.balance_amount).toLocaleString()}
                      </td>
                    )}
                    {visibleCols.remarks && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {r.remarks || '-'}
                      </td>
                    )}
                    <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-center">
                      <div className="flex gap-1 justify-center">
                        <PrintButton
                          onClick={() => {
                            const pdfUrl = `/api/hall-bookings/${r.id}/receipt.pdf`;
                            // Simple approach: open in new tab
                            window.open(pdfUrl, '_blank');
                          }}
                        />
                        <button 
                          onClick={() => handleEdit(r.id)}
                          className="border px-2 py-1 rounded hover:bg-gray-100 text-xs"
                        >
                          {t('Edit', 'திருத்து')}
                        </button>
                        <button 
                          onClick={() => openLogs(r)}
                          className="border px-2 py-1 rounded hover:bg-green-100 text-green-600 text-xs"
                        >
                          {t('Logs', 'பதிவுகள்')}
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedBookingId(r.id);
                            setShowDeleteModal(true);
                          }}
                          className={`border px-2 py-1 rounded hover:bg-red-100 text-red-600 ${idx === 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                          title={t('Delete', 'நீக்கு')}
                          disabled={idx !== 0}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-gray-200 text-xs">
          <div className="text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{Math.min(currentPage * pageSize, totalRecords)}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{totalRecords}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="text-gray-700">
            {t('Total', 'மொத்தம்')}: <span className="font-medium">{totalRecords}</span>
          </div>
        </div>
      </div>

      {/* Financial Totals */}
      <div className="mt-2 flex justify-end text-xs text-gray-600">
        <div className="flex gap-3">
          <span>{t('Advance', 'முன்பணம்')}: ₹{totals.advance.toLocaleString()}</span>
          <span>{t('Total', 'மொத்தம்')}: ₹{totals.total.toLocaleString()}</span>
          <span>{t('Balance', 'இருப்பு')}: ₹{totals.balance.toLocaleString()}</span>
        </div>
      </div>


      {/* Pagination Controls */}
      {totalRecords >= pageSize && (
        <div className="mt-3 flex justify-center items-center gap-2">
          <button
            onClick={() => {
              const newPage = currentPage - 1;
              setCurrentPage(newPage);
              fetchData(newPage);
            }}
            disabled={currentPage === 1}
            className="border px-3 py-1 rounded text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          >
            {t('Previous', 'முந்தைய')}
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.ceil(totalRecords / pageSize) }, (_, i) => i + 1)
              .filter(page => {
                // Show first page, last page, current page, and pages around current page
                return page === 1 || 
                       page === Math.ceil(totalRecords / pageSize) || 
                       Math.abs(page - currentPage) <= 2;
              })
              .map((page, index, array) => {
                // Add ellipsis if there's a gap
                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                    <button
                      onClick={() => {
                        setCurrentPage(page);
                        fetchData(page);
                      }}
                      className={`border px-2 py-1 rounded text-xs ${
                        page === currentPage 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>
          
          <button
            onClick={() => {
              const newPage = currentPage + 1;
              setCurrentPage(newPage);
              fetchData(newPage);
            }}
            disabled={currentPage >= Math.ceil(totalRecords / pageSize)}
            className="border px-3 py-1 rounded text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          >
            {t('Next', 'அடுத்து')}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedBookingId && (
        <Modal 
          title={t('Confirm Delete', 'நீக்குவதை உறுதிப்படுத்தவும்')} 
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedBookingId(null);
          }}
        >
          <p className="mb-4">{t('Are you sure you want to delete this booking? This action cannot be undone.', 'இந்த பதிவை நீக்க விரும்புகிறீர்களா? இந்த நடவடிக்கையை மாற்ற முடியாது.')}</p>
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedBookingId(null);
              }}
              className="border px-3 py-1 rounded hover:bg-gray-100"
              disabled={deleting}
            >
              {t('Cancel', 'ரத்து')}
            </button>
            <button 
              onClick={async () => {
                if (!selectedBookingId) return;
                setDeleting(true);
                try {
                  const res = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/${selectedBookingId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  });

                  if (!res.ok) {
                    throw new Error('Failed to delete booking');
                  }

                  // Refresh the current page
                  fetchData(currentPage);
                  
                  // Close modal
                  setShowDeleteModal(false);
                  setSelectedBookingId(null);
                } catch (error: any) {
                  setError(error.message || t('Delete failed', 'நீக்குவதில் தோல்வி'));
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
              disabled={deleting}
            >
              {deleting ? t('Deleting...', 'நீக்குகிறது...') : t('Delete', 'நீக்கு')}
            </button>
          </div>
        </Modal>
      )}

      {/* All Hall Booking Logs Modal */}
      {allLogsOpen && (
        <Modal title={t('All Hall Booking Logs', 'அனைத்து மண்டப பதிவு பதிவுகள்')} onClose={closeAllLogs}>
          <div className="max-h-96 overflow-y-auto">
            {allLogsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading logs...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('Action', 'செயல்')}</th>
                      <th className="text-left p-2">{t('Booking', 'பதிவு')}</th>
                      <th className="text-left p-2">{t('Receipt', 'ரசீது')}</th>
                      <th className="text-left p-2">{t('Date', 'தேதி')}</th>
                      <th className="text-left p-2">{t('Details', 'விவரங்கள்')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLogs.length > 0 ? (
                      allLogs.map((log) => (
                        <tr key={log.id} className="border-b">
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
                               log.action}
                            </span>
                          </td>
                          <td className="p-2">{log.hall_booking_name || '-'}</td>
                          <td className="p-2">{log.receipt_number || '-'}</td>
                          <td className="p-2">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="text-xs text-muted-foreground">
                              {log.details ? (
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="h-24 text-center text-muted-foreground">
                          {t('No logs found', 'பதிவுகள் எதுவும் கிடைக்கவில்லை')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {allLogsTotal > allLogsPageSize && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {t('Showing', 'காட்டப்படுகிறது')} {((allLogsPage - 1) * allLogsPageSize) + 1} - {Math.min(allLogsPage * allLogsPageSize, allLogsTotal)} {t('of', 'மொத்தம்')} {allLogsTotal}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAllLogsPage(prev => Math.max(1, prev - 1));
                    loadAllHallBookingLogs();
                  }}
                  disabled={allLogsPage <= 1}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                >
                  {t('Previous', 'முந்தைய')}
                </button>
                <button
                  onClick={() => {
                    setAllLogsPage(prev => prev + 1);
                    loadAllHallBookingLogs();
                  }}
                  disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                >
                  {t('Next', 'அடுத்து')}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Hall Booking Logs Modal */}
      {logsFor && (
        <Modal title={t('Hall Booking Logs', 'மண்டப பதிவு பதிவுகள்')} onClose={closeLogs}>
          <div className="max-h-96 overflow-y-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading logs...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('Action', 'செயல்')}</th>
                      <th className="text-left p-2">{t('Date', 'தேதி')}</th>
                      <th className="text-left p-2">{t('Details', 'விவரங்கள்')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b">
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
                               log.action}
                            </span>
                          </td>
                          <td className="p-2">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="text-xs text-muted-foreground">
                              {log.details ? (
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="h-24 text-center text-muted-foreground">
                          {t('No logs found', 'பதிவுகள் எதுவும் கிடைக்கவில்லை')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded shadow border border-gray-200 w-48 text-xs"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-xs font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1 rounded hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() =>
                    setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                  }
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-xs text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 p-1 border-t border-gray-200">
            <button
              className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </button>
            <button
              className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </button>
            <button
              className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50"
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {t('Reset', 'மீட்டமை')}
            </button>
            <button
              className="text-xs py-0.5 px-1.5 h-auto border rounded hover:bg-gray-50 ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
