import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ledgerService, LedgerEntry } from '@/services/ledgerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

export default function LedgerListPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all' as const,
    under: 'all' as const,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);
  const itemsPerPage = 10;

  // Column Keys
  type ColKey = 'date' | 'name' | 'category' | 'credit' | 'debit' | 'balance' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'date', label: t('Date', 'தேதி') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'category', label: t('Category', 'வகை') },
    { key: 'credit', label: t('Credit', 'கடன்'), align: 'right' },
    { key: 'debit', label: t('Debit', 'பற்று'), align: 'right' },
    { key: 'balance', label: t('Balance', 'இருப்பு'), align: 'right' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'ledger_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    date: true,
    name: true,
    category: true,
    credit: true,
    debit: true,
    balance: true,
    actions: true,
  };

  // Load column visibility from localStorage
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultVisible, ...JSON.parse(saved) } : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  // Save to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // Context Menu for column visibility
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

  const visibleColCount = useMemo(
    () => Object.values(visibleCols).filter(Boolean).length,
    [visibleCols]
  );

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Load data
  useEffect(() => {
    loadData();
    loadCategories();
  }, [currentPage, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [entries, balance] = await Promise.all([
        ledgerService.getEntries({
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          type: filters.type === 'all' ? undefined : filters.type,
          under: filters.under === 'all' ? undefined : filters.under,
          page: currentPage,
          limit: itemsPerPage,
        }),
        ledgerService.getCurrentBalance(),
      ]);
      setEntries(entries.data);
      setCurrentBalance(balance);
      setTotalPages(entries.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to load data', 'தரவை ஏற்ற முடியவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ledgerService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  // Edit/Delete
  const handleEdit = (entry: LedgerEntry) => {
    setEditEntry(entry);
  };

  const handleDelete = async (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await ledgerService.deleteEntry(deleteId);
      await loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    } finally {
      setDeleteId(null);
    }
  };

  // Print single entry (opens print dialog)
  const onPrintEntry = (entry: LedgerEntry) => {
    const runningBalance = entries
      .slice(0, entries.findIndex((e) => e.id === entry.id) + 1)
      .reduce((sum, e) => (e.type === 'credit' ? sum + e.amount : sum - e.amount), 0);

    const printContent = `
      <div style="text-align:center; margin-bottom:20px;">
        <h2>${t('Ledger Entry Receipt', 'பதிவேட்டு உள்ளீட்டு ரசீது')}</h2>
      </div>
      <div style="margin:20px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
            'Date',
            'தேதி'
          )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${format(
      new Date(entry.date),
      'dd/MM/yyyy'
    )}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
            'Name',
            'பெயர்'
          )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${
      entry.name
    }</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
            'Category',
            'வகை'
          )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${
      entry.under || '-'
    }</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
            'Type',
            'வகை'
          )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${
      entry.type === 'credit'
        ? t('Credit', 'கடன்')
        : t('Debit', 'பற்று')
    }</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
            'Amount',
            'தொகை'
          )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatAmount(
      entry.amount
    )}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t(
            'Running Balance',
            'ஓட்ட இருப்பு'
          )}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatAmount(
      runningBalance
    )}</td></tr>
        </table>
      </div>
    `;

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow?.document.write(`
      <html>
        <head><title>Ledger Entry</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  // Export CSV
  const onExportCSV = async () => {
    try {
      const blob = await ledgerService.exportAsCSV({
        startDate: filters.startDate,
        endDate: filters.endDate,
        type: filters.type === 'all' ? undefined : filters.type,
        under: filters.under === 'all' ? undefined : filters.under,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ledger-entries.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV Export failed', e);
    }
  };

  // Export PDF (uses browser print)
  const onExportPDF = () => {
    window.print();
  };

  // Standard toast function with correct argument pattern
  const showToast = (message: string, isError = false) => {
    toast({
      title: isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி'),
      description: message,
      variant: isError ? 'destructive' : 'default'
    });
  };

  const validateForm = () => {
    if (!editEntry?.date) {
      showToast(t('Date is required', 'தேதி தேவை'), true);
      return false;
    }
    if (!editEntry?.name) {
      showToast(t('Name is required', 'பெயர் தேவை'), true);
      return false;
    }
    if (!editEntry?.amount || isNaN(editEntry.amount) || editEntry.amount <= 0) {
      showToast(t('Valid amount is required', 'சரியான தொகை தேவை'), true);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    try {
      console.log('Saving entry:', editEntry);
      
      if (!editEntry) return;
      
      // Validate required fields
      if (!validateForm()) return;
      
      // Send update request
      const updatedEntry = await ledgerService.updateEntry(editEntry);
      console.log('Save response:', updatedEntry);
      
      showToast(t('Entry updated successfully', 'உள்ளீடு வெற்றிகரமாக புதுப்பிக்கப்பட்டது'));
      
      await loadData();
      setEditEntry(null);
    } catch (error) {
      console.error('Save error:', error);
      showToast(t('Failed to update entry', 'உள்ளீட்டை புதுப்பிக்க முடியவில்லை'), true);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('Ledger', 'பதிவேடு')}</h1>
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">
            {t('Balance', 'இருப்பு')}:{' '}
            <span className={currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatAmount(currentBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Date Range */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="text-sm"
              />
              <span className="text-gray-600">{t('to', 'வரை')}</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Type */}
            <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={t('Type', 'வகை')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Types', 'அனைத்து வகைகள்')}</SelectItem>
                <SelectItem value="credit">{t('Credit', 'கடன்')}</SelectItem>
                <SelectItem value="debit">{t('Debit', 'பற்று')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={filters.under} onValueChange={(v) => handleFilterChange('under', v)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('All Categories', 'அனைத்து வகைகள்')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Categories', 'அனைத்து வகைகள்')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    startDate: '',
                    endDate: '',
                    type: 'all',
                    under: 'all',
                  });
                }}
              >
                {t('Reset', 'மீட்டமை')}
              </Button>
              <Button variant="outline" onClick={onExportCSV}>
                {t('Export CSV', 'CSV ஏற்றுமதி')}
              </Button>
              <Button variant="outline" onClick={onExportPDF}>
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
                        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
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
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('No entries found', 'உள்ளீடுகள் கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  let runningBalance = entries
                    .slice(0, index + 1)
                    .reduce((sum, e) => (e.type === 'credit' ? sum + e.amount : sum - e.amount), 0);

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      {visibleCols.date && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(entry.date), 'dd/MM/yyyy')}
                        </TableCell>
                      )}
                      {visibleCols.name && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.name}
                        </TableCell>
                      )}
                      {visibleCols.category && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.under || '-'}
                        </TableCell>
                      )}
                      {visibleCols.credit && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                          {entry.type === 'credit' ? formatAmount(entry.amount) : '-'}
                        </TableCell>
                      )}
                      {visibleCols.debit && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                          {entry.type === 'debit' ? formatAmount(entry.amount) : '-'}
                        </TableCell>
                      )}
                      {visibleCols.balance && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          {formatAmount(runningBalance)}
                        </TableCell>
                      )}
                      {visibleCols.actions && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPrintEntry(entry)}
                            >
                              {t('Print', 'அச்சிட')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              {t('Edit', 'திருத்து')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(entry.id!)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {t('Delete', 'நீக்கு')}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
            {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, entries.length)}
            </span>{' '}
            {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{entries.length}</span>{' '}
            {t('entries', 'உள்ளீடுகள்')}
          </div>
          <div className="text-sm text-gray-700">
            {t('Current Balance', 'தற்போதைய இருப்பு')}: <span className="font-medium">{formatAmount(currentBalance)}</span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            {t('Previous', 'முந்தைய')}
          </Button>
          <span>
            {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            {t('Next', 'அடுத்தது')}
          </Button>
        </div>
      )}

      {/* Column Visibility Context Menu */}
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
                setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, true])) as any)
              }
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, false])) as any)
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Confirm Delete', 'நீக்குதலை உறுதிப்படுத்தவும்')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete this entry? This action cannot be undone.', 'இந்த உள்ளீட்டை நீக்க விரும்புகிறீர்களா? இந்த செயலை திரும்பப் பெற முடியாது.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('Cancel', 'ரத்து செய்')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('Delete', 'நீக்கு')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      {editEntry && (
        <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{t('Edit Ledger Entry', 'பதிவேட்டு உள்ளீட்டை திருத்து')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('Date', 'தேதி')}</Label>
                <Input 
                  type="date" 
                  value={editEntry?.date?.split('T')[0] || ''}
                  onChange={(e) => setEditEntry({...editEntry, date: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('Name', 'பெயர்')}</Label>
                <Input 
                  value={editEntry?.name || ''}
                  onChange={(e) => setEditEntry({...editEntry, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('Type', 'வகை')}</Label>
                <Select 
                  value={editEntry?.type || 'credit'}
                  onValueChange={(value) => setEditEntry({...editEntry, type: value as any})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t('Select type', 'வகையைத் தேர்ந்தெடுக்கவும்')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">{t('Credit', 'கடன்')}</SelectItem>
                    <SelectItem value="debit">{t('Debit', 'பற்று')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('Category', 'வகை')}</Label>
                <Select 
                  value={editEntry?.under || ''}
                  onValueChange={(value) => setEditEntry({...editEntry, under: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t('Select category', 'வகையைத் தேர்ந்தெடுக்கவும்')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('Amount', 'தொகை')}</Label>
                <Input 
                  type="number"
                  value={editEntry?.amount || ''}
                  onChange={(e) => setEditEntry({...editEntry, amount: parseFloat(e.target.value)})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('Remarks', 'குறிப்புகள்')}</Label>
                <Input 
                  value={editEntry?.remarks || ''}
                  onChange={(e) => setEditEntry({...editEntry, remarks: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditEntry(null)}
              >
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button 
                onClick={handleSave}
              >
                {t('Save', 'சேமி')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}