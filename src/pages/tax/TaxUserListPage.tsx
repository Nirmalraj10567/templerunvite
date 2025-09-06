import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown } from 'lucide-react';

type TaxRegistration = {
  id: number;
  name: string;
  mobile_number?: string;
  aadhaar_number?: string | null;
  reference_number?: string;
  village?: string;
  created_at?: string;
};

export default function TaxUserListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TaxRegistration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Column Keys
  type ColKey = 'name' | 'mobile_number' | 'aadhaar_number' | 'reference_number' | 'village' | 'created_at' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'mobile_number', label: t('Mobile', 'தொலைபேசி') },
    { key: 'aadhaar_number', label: t('Aadhaar', 'ஆதார்') },
    { key: 'reference_number', label: t('Ref No', 'குறிப்பு எண்') },
    { key: 'village', label: t('Village', 'கிராமம்') },
    { key: 'created_at', label: t('Created', 'உருவாக்கப்பட்டது') },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'tax_user_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    name: true,
    mobile_number: true,
    aadhaar_number: true,
    reference_number: true,
    village: true,
    created_at: true,
    actions: true,
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultVisible, ...JSON.parse(saved) } : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

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

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Load data
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
      });
      if (pendingOnly) params.set('pending', '1');

      const res = await fetch(`http://localhost:4000/api/tax-registrations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load data');

      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load tax registrations:', e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, pendingOnly, search]);

  // Export functions
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/tax-registrations/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export PDF');
      }
      const blob = await res.blob();
      downloadBlob(blob, `tax-registration-${id}.pdf`);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const handleExportAllPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (pendingOnly) params.set('pending', '1');

      const res = await fetch(
        `http://localhost:4000/api/tax-registrations/export/pdf?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export all PDFs');
      }
      const blob = await res.blob();
      downloadBlob(blob, 'tax-registrations.pdf');
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('Tax Registrations', 'வரி பதிவுகள்')}</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'Search by name/mobile/aadhaar/ref no',
                  'பெயர்/தொலைபேசி/ஆதார்/குறிப்பு எண் மூலம் தேடுக'
                )}
                className="pl-10"
              />
            </div>

            {/* Pending Only Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="pendingOnly" className="text-sm">
                {t('Pending only', 'மட்டுமே பெண்டிங்')}
              </Label>
              <Input
                id="pendingOnly"
                type="checkbox"
                checked={pendingOnly}
                onChange={(e) => setPendingOnly(e.target.checked)}
                className="h-4 w-4 rounded"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button onClick={load}>{t('Search', 'தேடு')}</Button>
              <Button variant="outline" onClick={() => setSearch('')}>
                {t('Clear', 'அழி')}
              </Button>
              <Button variant="outline" onClick={handleExportAllPdf}>
                <FileDown className="h-4 w-4 mr-1" />
                {t('Export All (PDF)', 'அனைத்தையும் ஏற்றுமதி (PDF)')}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <FileDown className="h-4 w-4 mr-1" />
                {t('Export PDF', 'PDF ஏற்றுமதி')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {t('No records found', 'பதிவுகள் கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    {visibleCols.name && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.name}
                      </TableCell>
                    )}
                    {visibleCols.mobile_number && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.mobile_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.aadhaar_number && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.aadhaar_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.reference_number && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.reference_number || '-'}
                      </TableCell>
                    )}
                    {visibleCols.village && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.village || '-'}
                      </TableCell>
                    )}
                    {visibleCols.created_at && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString(language === 'tamil' ? 'ta-IN' : 'en-IN')
                          : '-'}
                      </TableCell>
                    )}
                    {visibleCols.actions && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(r.id)}
                        >
                          {t('PDF', 'PDF')}
                        </Button>
                      </TableCell>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{(page - 1) * pageSize + 1}</span> {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{Math.min(page * pageSize, total)}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{total}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex gap-4 text-sm text-gray-700">
            <span>
              {t('Total', 'மொத்தம்')}: <span className="font-medium">{total}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-4 mt-4">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t('Previous', 'முந்தைய')}
        </Button>
        <span className="text-sm">
          {t('Page', 'பக்கம்')} {page} {t('of', 'இல்')} {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          {t('Next', 'அடுத்தது')}
        </Button>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(1);
          }}
          className="ml-auto border rounded px-3 py-1 text-sm"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 w-64"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() =>
                    setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 p-2 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {t('Reset', 'மீட்டமை')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}