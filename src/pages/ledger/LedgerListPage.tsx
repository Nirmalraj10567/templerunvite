import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ledgerService, LedgerEntry } from '@/services/ledgerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { FileDown, Search, RefreshCw, Edit, Trash2, Printer } from 'lucide-react';

export default function LedgerListPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all' as const,
    under: 'all' as const,
    name: ''
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);

  const t = (en: string, ta: string) => language === 'english' ? ta : en;
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
          name: filters.name?.trim() ? filters.name.trim() : undefined,
          page: currentPage,
          limit: itemsPerPage,
        }),
        ledgerService.getCurrentBalance(),
      ]);
      setEntries(entries.data);
      setCurrentBalance(balance);
      setTotalPages(entries.pagination.totalPages);
      setTotalCount(entries.pagination.total);
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
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Date', 'தேதி')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${format(new Date(entry.date), 'dd/MM/yyyy')}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Name', 'பெயர்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${entry.name}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Category', 'வகை')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${entry.under || '-'}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Type', 'வகை')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${entry.type === 'credit' ? t('Credit', 'கடன்') : t('Debit', 'பற்று')}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Amount', 'தொகை')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatAmount(entry.amount)}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Running Balance', 'ஓட்ட இருப்பு')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatAmount(runningBalance)}</td></tr>
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

  const onExportPDF = () => {
    window.print();
  };

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
      if (!editEntry) return;
      if (!validateForm()) return;
      
      const updatedEntry = await ledgerService.updateEntry(editEntry);
      showToast(t('Entry updated successfully', 'உள்ளீடு வெற்றிகரமாக புதுப்பிக்கப்பட்டது'));
      
      await loadData();
      setEditEntry(null);
    } catch (error) {
      console.error('Save error:', error);
      showToast(t('Failed to update entry', 'உள்ளீட்டை புதுப்பிக்க முடியவில்லை'), true);
    }
  };

  return (
    <div className="p-2 bg-gray-50">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-base font-bold text-gray-800">{t('Ledger', 'பதிவேடு')}</h1>
        <div className="text-xs text-gray-600">
          {t('Balance', 'இருப்பு')}:{' '}
          <span className={`font-medium ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatAmount(currentBalance)}
          </span>
        </div>
      </div>

      {/* Compact Filters */}
      <Card className="mb-2">
        <CardContent className="p-2">
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-8 gap-2 items-center">
            {/* Date Range */}
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="text-xs h-7"
              placeholder={t('From', 'முதல்')}
            />
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="text-xs h-7"
              placeholder={t('To', 'வரை')}
            />

            {/* Type */}
            <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Types', 'அனைத்து வகைகள்')}</SelectItem>
                <SelectItem value="credit">{t('Credit', 'கடன்')}</SelectItem>
                <SelectItem value="debit">{t('Debit', 'பற்று')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={filters.under} onValueChange={(v) => handleFilterChange('under', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t('Category', 'வகை')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Categories', 'அனைத்து வகைகள்')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Name Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                placeholder={t('Search name', 'பெயரைத் தேடவும்')}
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className="text-xs h-7 pl-7"
              />
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  type: 'all',
                  under: 'all',
                  name: '',
                });
              }}
              className="text-xs h-7 px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t('Reset', 'மீட்டமை')}
            </Button>

            <Button variant="outline" size="sm" onClick={onExportCSV} className="text-xs h-7 px-2">
              <FileDown className="h-3 w-3 mr-1" />
              CSV
            </Button>

            <Button variant="outline" size="sm" onClick={onExportPDF} className="text-xs h-7 px-2">
              <FileDown className="h-3 w-3 mr-1" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compact Table */}
      <div
        className="bg-white rounded border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto text-xs max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider ${
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
                  <td colSpan={visibleColCount} className="px-2 py-2 text-center text-xs text-gray-500">
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-2 py-2 text-center text-xs text-gray-500">
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
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                          {format(new Date(entry.date), 'dd/MM/yy')}
                        </td>
                      )}
                      {visibleCols.name && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 max-w-32 truncate">
                          {entry.name}
                        </td>
                      )}
                      {visibleCols.category && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500 max-w-24 truncate">
                          {entry.under || '-'}
                        </td>
                      )}
                      {visibleCols.credit && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-green-600 text-right">
                          {entry.type === 'credit' ? `₹${entry.amount.toFixed(2)}` : '-'}
                        </td>
                      )}
                      {visibleCols.debit && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-red-600 text-right">
                          {entry.type === 'debit' ? `₹${entry.amount.toFixed(2)}` : '-'}
                        </td>
                      )}
                      {visibleCols.balance && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-right">
                          ₹{runningBalance.toFixed(2)}
                        </td>
                      )}
                      {visibleCols.actions && (
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPrintEntry(entry)}
                              className="h-6 w-6 p-0"
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(entry.id!)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-gray-200 text-xs">
          <div className="text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span>{' '}
            {t('to', 'இலிருந்து')}{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span>{' '}
            {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{totalCount}</span>
          </div>
          <div className="text-gray-700">
            {t('Balance', 'இருப்பு')}: <span className="font-medium">₹{currentBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="text-xs py-1 px-2 h-7"
          >
            {t('Previous', 'முந்தைய')}
          </Button>
          <span className="text-xs">
            {t('Page', 'பக்கம்')} {currentPage} {t('of', 'இல்')} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="text-xs py-1 px-2 h-7"
          >
            {t('Next', 'அடுத்தது')}
          </Button>
        </div>
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
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() =>
                setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, true])) as any)
              }
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() =>
                setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, false])) as any)
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{t('Confirm Delete', 'நீக்குதலை உறுதிப்படுத்தவும்')}</DialogTitle>
            <DialogDescription className="text-sm">
              {t('Are you sure you want to delete this entry? This action cannot be undone.', 'இந்த உள்ளீட்டை நீக்க விரும்புகிறீர்களா? இந்த செயலை திரும்பப் பெற முடியாது.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} className="text-xs">
              {t('Cancel', 'ரத்து செய்')}
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} className="text-xs">
              {t('Delete', 'நீக்கு')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editEntry && (
        <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">{t('Edit Entry', 'உள்ளீட்டை திருத்து')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-3 items-center gap-2">
                <Label className="text-xs">{t('Date', 'தேதி')}</Label>
                <Input 
                  type="date" 
                  value={editEntry?.date?.split('T')[0] || ''}
                  onChange={(e) => setEditEntry({...editEntry, date: e.target.value})}
                  className="col-span-2 text-xs h-7"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label className="text-xs">{t('Name', 'பெயர்')}</Label>
                <Input 
                  value={editEntry?.name || ''}
                  onChange={(e) => setEditEntry({...editEntry, name: e.target.value})}
                  className="col-span-2 text-xs h-7"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label className="text-xs">{t('Type', 'வகை')}</Label>
                <Select 
                  value={editEntry?.type || 'credit'}
                  onValueChange={(value) => setEditEntry({...editEntry, type: value as any})}
                >
                  <SelectTrigger className="col-span-2 text-xs h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">{t('Credit', 'கடன்')}</SelectItem>
                    <SelectItem value="debit">{t('Debit', 'பற்று')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label className="text-xs">{t('Amount', 'தொகை')}</Label>
                <Input 
                  type="number"
                  value={editEntry?.amount || ''}
                  onChange={(e) => setEditEntry({...editEntry, amount: parseFloat(e.target.value)})}
                  className="col-span-2 text-xs h-7"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditEntry(null)}
                className="text-xs"
              >
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                className="text-xs"
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
