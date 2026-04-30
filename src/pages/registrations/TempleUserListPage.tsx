import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn, pageContainerStyles, formFieldStyles } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';

type Registration = {
  id: number;
  name: string;
  mobile_number?: string;
  aadhaar_number?: string | null;
  reference_number?: string;
  village?: string;
  created_at?: string;
  status?: 'active' | 'blocked' | 'inactive';
};

type ColKey = 'name' | 'mobile_number' | 'aadhaar_number' | 'reference_number' | 'village' | 'created_at' | 'actions';

const t = {
  tamil: {
    searchPlaceholder: 'Search by name, mobile or village',
    exportButton: 'Export CSV',
    title:"Landowners Tax List",
    name: 'Name',
    mobile: 'Mobile',
    aadhaar: 'Aadhaar',
    refNo: 'Ref No',
    village: 'Village',
    created: 'Created',
    actions: 'Actions',
    block: 'Block',
    unblock: 'Unblock',
    blockSuccess: 'User blocked',
    unblockSuccess: 'User unblocked',
    blockError: 'Failed to block/unblock',
    loading: 'Loading...',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    reset: 'Reset',
    close: 'Close',
    noRecords: 'No records found',
    page: 'Page',
    of: 'of',
    records: 'records',
    edit: 'Edit'
  },
  english: {
    searchPlaceholder: 'பெயர், தொலைபேசி அல்லது கிராமம் மூலம் தேடு',
    exportButton: 'ஏற்றுமதி CSV',
    title:"காணியாளர்கள் வரி பட்டியல்",
    name: 'பெயர்',
    mobile: 'தொலைபேசி',
    aadhaar: 'ஆதார்',
    refNo: 'குறிப்பு எண்',
    village: 'கிராமம்',
    created: 'உருவாக்கப்பட்டது',
    actions: 'செயல்கள்',
    block: 'தடு',
    unblock: 'தடை நீக்கு',
    blockSuccess: 'பயனர் தடை செய்யப்பட்டார்',
    unblockSuccess: 'பயனர் தடை நீக்கப்பட்டார்',
    blockError: 'தடை செயல்படுத்தப்படவில்லை',
    loading: 'ஏற்றுகிறது...',
    selectAll: 'அனைத்தையும் தெரிவு செய்',
    deselectAll: 'தேர்வால் நீக்கு',
    reset: 'மீட்டமை',
    close: 'மூடு',
    noRecords: 'பதிவுகள் இல்லை',
    page: 'பக்கம்',
    of: 'அ',
    records: 'பதிவுகள்',
    edit: 'திருத்து'
  }
} as const;

export default function TempleUserListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Registration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'name', label: t[language].name },
    { key: 'mobile_number', label: t[language].mobile },
    { key: 'aadhaar_number', label: t[language].aadhaar },
    { key: 'reference_number', label: t[language].refNo },
    { key: 'village', label: t[language].village },
    { key: 'created_at', label: t[language].created },
    { key: 'actions', label: t[language].actions, align: 'center' },
  ];

  const STORAGE_KEY = 'temple_user_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    name: true,
    mobile_number: true,
    aadhaar_number: true,
    reference_number: true,
    village: true,
    created_at: true,
    actions: true,
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`https://templeapi.agniplay.com/api/registrations/export/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export CSV');
      }
      const blob = await res.blob();
      downloadBlob(blob, 'temple-registrations.csv');
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/dashboard/registrations/edit/${id}`);
  };

  const handleToggleBlock = async (r: Registration) => {
    const next = r.status === 'blocked' ? 'active' : 'blocked';
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/registrations/${r.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      load();
      alert(t[language][`${next === 'active' ? 'unblock' : 'block'}Success`]);
    } catch (err) {
      console.error(err);
      alert(t[language].blockError);
    }
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

      const res = await fetch(`https://templeapi.agniplay.com/api/registrations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');

      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load temple registrations:', e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, search]);

  // Export helpers
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
      const res = await fetch(`https://templeapi.agniplay.com/api/registrations/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export PDF');
      }
      const blob = await res.blob();
      downloadBlob(blob, `registration-${id}.pdf`);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const handleExportAllPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`https://templeapi.agniplay.com/api/registrations/export/pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export all PDFs');
      }
      const blob = await res.blob();
      downloadBlob(blob, 'temple-registrations.pdf');
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        {/* Header */}
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
              {t[language].title}
            </CardTitle>
          </div>
        </CardHeader>

        {/* Filters */}
        <div className={formFieldStyles.moneyDonationList.filters.container}>
          <div className={formFieldStyles.moneyDonationList.filters.form}>
            {/* Search */}
            <div className={formFieldStyles.moneyDonationList.filters.searchContainer}>
              <div className={formFieldStyles.moneyDonationList.filters.searchIcon}>
                <svg className={formFieldStyles.moneyDonationList.filters.searchIconSvg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(theme.input.base, theme.input.size.md, formFieldStyles.moneyDonationList.filters.searchInput)}
                placeholder={t[language].searchPlaceholder}
              />
            </div>

            {/* Actions */}
            <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
              <Button onClick={load} className={formFieldStyles.moneyDonationList.filters.button}>
                {t[language].searchPlaceholder}
              </Button>
              <Button variant="outline" onClick={handleExportCsv} className={formFieldStyles.moneyDonationList.filters.button}>
                <FileDown className="h-3 w-3 mr-1" />
                {t[language].exportButton}
              </Button>
              <Button variant="outline" onClick={handleExportAllPdf} className={formFieldStyles.moneyDonationList.filters.button}>
                <FileDown className="h-3 w-3 mr-1" />
                {t[language].exportButton} PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={tableClasses.scrollContainerWrapper} onContextMenu={onContextMenu}>
          <div className={tableClasses.scrollContainer}>
            <Table className={tableClasses.container}>
              <TableHeader className={tableClasses.header}>
                <TableRow className={tableClasses.row}>
                  {allColumns.map(
                    (col) =>
                      visibleCols[col.key] && (
                        <TableHead
                          key={col.key}
                          className={cn(
                            tableClasses.headerCell,
                            col.align === 'right' ? 'text-right' :
                            col.align === 'center' ? 'text-center' :
                            'text-left'
                          )}
                        >
                          {col.label}
                        </TableHead>
                      )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                      {t[language].loading}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                      {t[language].noRecords}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} className={tableClasses.row}>
                      {visibleCols.name && (
                        <TableCell className={tableClasses.cell}>
                          {r.name}
                        </TableCell>
                      )}
                      {visibleCols.mobile_number && (
                        <TableCell className={tableClasses.cell}>
                          {r.mobile_number || '-'}
                        </TableCell>
                      )}
                      {visibleCols.aadhaar_number && (
                        <TableCell className={tableClasses.cell}>
                          {r.aadhaar_number || '-'}
                        </TableCell>
                      )}
                      {visibleCols.reference_number && (
                        <TableCell className={tableClasses.cell}>
                          {r.reference_number || '-'}
                        </TableCell>
                      )}
                      {visibleCols.village && (
                        <TableCell className={tableClasses.cell}>
                          {r.village || '-'}
                        </TableCell>
                      )}
                      {visibleCols.created_at && (
                        <TableCell className={tableClasses.cell}>
                          {r.created_at
                            ? new Date(r.created_at).toLocaleDateString(language === 'tamil' ? 'ta-IN' : 'en-IN')
                            : '-'}
                        </TableCell>
                      )}
                      {visibleCols.actions && (
                        <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(r.id)} className={tableClasses.actionButtonPrimary}>
                              {t[language].edit}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleBlock(r)} className={tableClasses.actionButtonSecondary}>
                              {r.status === 'blocked' ? t[language].unblock : t[language].block}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(r.id)} className={tableClasses.actionButtonSecondary}>
                              {t[language].exportButton}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer removed (no delete info) */}
        </div>

        {/* Pagination */}
        <div className={tableClasses.pagination}>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={tableClasses.paginationButton}
            >
              {'<'}
            </Button>
            <span className="text-xs flex items-center">
              {t[language].page} {page} {t[language].of} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={tableClasses.paginationButton}
            >
              {'>'}
            </Button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="ml-auto border rounded px-2 py-0.5 text-xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Context Menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className={formFieldStyles.moneyDonationList.contextMenu.container}
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <div className={formFieldStyles.moneyDonationList.contextMenu.header}>
              <h3 className={formFieldStyles.moneyDonationList.contextMenu.title}>{t[language].actions}</h3>
              <p className={formFieldStyles.moneyDonationList.contextMenu.subtitle}>
                {visibleColCount}/{allColumns.length} {t[language].records}
              </p>
            </div>
            <div className={formFieldStyles.moneyDonationList.contextMenu.content}>
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className={formFieldStyles.moneyDonationList.contextMenu.item}
                >
                  <input
                    type="checkbox"
                    checked={!!visibleCols[col.key]}
                    onChange={() =>
                      setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                    }
                    className={formFieldStyles.moneyDonationList.contextMenu.checkbox}
                  />
                  <span className={formFieldStyles.moneyDonationList.contextMenu.label}>{col.label}</span>
                </label>
              ))}
            </div>
            <div className={formFieldStyles.moneyDonationList.contextMenu.actions}>
              <Button
                variant="outline"
                size="sm"
                className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
                onClick={() =>
                  setVisibleCols(
                    Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                  )
                }
              >
                {t[language].selectAll}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
                onClick={() =>
                  setVisibleCols(
                    Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                  )
                }
              >
                {t[language].deselectAll}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={formFieldStyles.moneyDonationList.contextMenu.actionButton}
                onClick={() => setVisibleCols({ ...defaultVisible })}
              >
                {t[language].reset}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={formFieldStyles.moneyDonationList.contextMenu.closeButton}
                onClick={() => setMenuOpen(false)}
              >
                {t[language].close}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
