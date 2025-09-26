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


  
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

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
        </div>
      </div>

      {loading && <div>{t('Loading...', 'ஏற்றுகிறது...')}</div>}
      {error && <div className="text-red-600">{error}</div>}

      {/* Grid layout */}
      <div className="grid border border-gray-300">
        {/* Header */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] bg-gray-100 text-gray-700 font-medium">
          {allColumns.map(c => visibleCols[c.key] && (
            <div key={c.key} className={`px-2 py-1 border-b border-r ${c.align === 'right' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
              {c.label}
            </div>
          ))}
          <div className="px-2 py-1 border-b text-right">{t('Actions', 'செயல்கள்')}</div>
        </div>

        {/* Rows */}
        {rows.map((r, idx) => (
          <div key={r.id} className={`grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            {visibleCols.register_no && (<div className="px-2 py-1 border-b truncate">{r.register_no || ''}</div>)}
            {visibleCols.date && (<div className="px-2 py-1 border-b truncate">{r.date || ''}</div>)}
            {visibleCols.time && (<div className="px-2 py-1 border-b truncate">{r.time || ''}</div>)}
            {visibleCols.event && (<div className="px-2 py-1 border-b truncate">{r.event || ''}</div>)}
            {visibleCols.subdivision && (<div className="px-2 py-1 border-b truncate">{r.subdivision || ''}</div>)}
            {visibleCols.name && (<div className="px-2 py-1 border-b truncate">{r.name || ''}</div>)}
            {visibleCols.address && (<div className="px-2 py-1 border-b truncate">{r.address || ''}</div>)}
            {visibleCols.village && (<div className="px-2 py-1 border-b truncate">{r.village || ''}</div>)}
            {visibleCols.mobile && (<div className="px-2 py-1 border-b truncate">{r.mobile || ''}</div>)}
            {visibleCols.advance_amount && (<div className="px-2 py-1 border-b text-right">{toNum(r.advance_amount).toLocaleString()}</div>)}
            {visibleCols.total_amount && (<div className="px-2 py-1 border-b text-right">{toNum(r.total_amount).toLocaleString()}</div>)}
            {visibleCols.balance_amount && (<div className="px-2 py-1 border-b text-right">{toNum(r.balance_amount).toLocaleString()}</div>)}
            {visibleCols.remarks && (<div className="px-2 py-1 border-b truncate">{r.remarks || ''}</div>)}
            <td className="border px-2 py-1 text-right">
              <div className="flex gap-1 justify-end">
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
          </div>
        ))}

        {!rows.length && !loading && (
          <div className="col-span-full text-center px-2 py-2">{t('No records', 'பதிவுகள் இல்லை')}</div>
        )}
      </div>

      {/* Totals */}
      <div className="mt-2 flex justify-between text-xs text-gray-600">
        <div>
          {t('Showing', 'காட்டப்படுகிறது')} {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRecords)} {t('of', 'இல்')} {totalRecords} {t('records', 'பதிவுகள்')}
        </div>
        <div className="flex gap-3">
          <span>{t('Advance', 'முன்பணம்')}: {totals.advance.toLocaleString()}</span>
          <span>{t('Total', 'மொத்தம்')}: {totals.total.toLocaleString()}</span>
          <span>{t('Balance', 'இருப்பு')}: {totals.balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Debug info - remove this later */}
      <div className="mt-2 text-xs text-gray-500">
        Debug: totalRecords={totalRecords}, pageSize={pageSize}, currentPage={currentPage}, showPagination={totalRecords >= pageSize}
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
    </div>
  );
}
