import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Eye, Edit, Trash2, Calendar, IndianRupee, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Receipt {
  id: number;
  receipt_number: string;
  date: string; // ISO
  type: 'income' | 'expense';
  donor?: string;
  receiver?: string;
  amount: number;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

interface ReceiptFormData {
  date: string;
  type: 'income' | 'expense';
  donor?: string;
  receiver?: string;
  amount: number;
  remarks?: string;
}

export default function ReceiptListView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { language } = useLanguage();

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [data, setData] = useState<Receipt[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10, total: 0, totalPages: 1 });

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [viewEditReceipt, setViewEditReceipt] = useState<Receipt | null>(null);
  const [isViewEditOpen, setIsViewEditOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Partial<ReceiptFormData>>({});

  const isSuperAdmin = user?.role === 'superadmin';
  const canEdit = isSuperAdmin || (user as any)?.permissions?.some((p: any) => p.permission_id === 'receipts' && (p.access_level === 'edit' || p.access_level === 'full'));
  const canDelete = isSuperAdmin || (user as any)?.permissions?.some((p: any) => p.permission_id === 'receipts' && p.access_level === 'full');

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
      });
      if (searchTerm) params.append('q', searchTerm);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const res = await fetch(`/api/receipts?${params.toString()}` , {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch receipts');
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch receipts');
      setData(result.data);
      setPagination((prev) => ({ ...prev, total: result.data.length, totalPages: Math.ceil(result.data.length / prev.pageSize) }));
    } catch (e) {
      console.error(e);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to fetch receipts. Please try again.', 'ரசீது தரவைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'), variant: 'destructive' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, fromDate, toDate, typeFilter]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const res = await fetch(`/api/receipts/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipts.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to export CSV', 'CSV ஏற்றுமதி தோல்வி'), variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totals = useMemo(() => {
    const total = data.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const income = data.filter(r => r.type === 'income').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expense = data.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const balance = income - expense;
    return { total, income, expense, balance };
  }, [data]);

  const handleViewClick = (rec: Receipt) => {
    setViewEditReceipt(rec);
    setEditedReceipt({
      date: rec.date?.slice(0, 10),
      type: rec.type,
      donor: rec.donor,
      receiver: rec.receiver,
      amount: rec.amount,
      remarks: rec.remarks,
    });
    setEditMode(false);
    setIsViewEditOpen(true);
  };

  const handleEditClick = (rec: Receipt) => {
    setViewEditReceipt(rec);
    setEditedReceipt({
      date: rec.date?.slice(0, 10),
      type: rec.type,
      donor: rec.donor,
      receiver: rec.receiver,
      amount: rec.amount,
      remarks: rec.remarks,
    });
    setEditMode(true);
    setIsViewEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!viewEditReceipt || !editedReceipt) return;
    try {
      const res = await fetch(`/api/receipts/${viewEditReceipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editedReceipt),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update receipt');
      }
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update receipt');
      setData((prev) => prev.map((r) => (r.id === viewEditReceipt.id ? { ...r, ...result.data } : r)));
      toast({ title: t('Success', 'வெற்றி'), description: t('Receipt updated successfully', 'ரசீது வெற்றிகரமாக புதுப்பிக்கப்பட்டது') });
      setIsViewEditOpen(false);
      setViewEditReceipt(null);
      setEditedReceipt({});
    } catch (e) {
      console.error(e);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to update receipt. Please try again.', 'ரசீது புதுப்பிப்பு தோல்வி. மீண்டும் முயற்சிக்கவும்.'), variant: 'destructive' });
    }
  };

  const handleDeleteClick = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/receipts/${deleteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete receipt');
      }
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete receipt');
      setData((prev) => prev.filter((r) => r.id !== deleteId));
      toast({ title: t('Success', 'வெற்றி'), description: t('Receipt deleted', 'ரசீது நீக்கப்பட்டது') });
    } catch (e) {
      console.error(e);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to delete receipt. Please try again.', 'ரசீது நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'), variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
  const formatAmount = (amt: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(amt || 0);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-col gap-3">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('Search by receipt no, donor, receiver...', 'ரசீது எண், தந்தவர், பெற்றவர் மூலம் தேடவும்...')}
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm mb-1">{t('From', 'இருந்து')}</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('To', 'வரை')}</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('Type', 'வகை')}</label>
                  <select className="border rounded h-10 px-3" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                    <option value="all">{t('All', 'அனைத்தும்')}</option>
                    <option value="income">{t('Income', 'வரவு')}</option>
                    <option value="expense">{t('Expense', 'செலவு')}</option>
                  </select>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" onClick={handlePrint}>{t('Print', 'அச்சிடு')}</Button>
                  <Button onClick={handleExportCSV}>{t('Export CSV', 'CSV ஏற்றுமதி')}</Button>
                </div>
              </div>
            </div>

            <div className="rounded-md border">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Receipt No', 'ரசீது எண்')}</TableHead>
                      <TableHead>{t('Date', 'தேதி')}</TableHead>
                      <TableHead>{t('Type', 'வகை')}</TableHead>
                      <TableHead>{t('Donor', 'தந்தவர்')}</TableHead>
                      <TableHead>{t('Receiver', 'பெற்றவர்')}</TableHead>
                      <TableHead className="text-right">{t('Amount', 'தொகை')}</TableHead>
                      <TableHead className="text-right">{t('Actions', 'செயல்கள்')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length > 0 ? (
                      data.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell className="font-medium">{rec.receipt_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(rec.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rec.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {rec.type === 'income' ? (
                                <ArrowDownCircle className="h-3.5 w-3.5 mr-1" />
                              ) : (
                                <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                              )}
                              {rec.type === 'income' ? t('Income', 'வரவு') : t('Expense', 'செலவு')}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{rec.donor || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{rec.receiver || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center">
                              <IndianRupee className="h-4 w-4 mr-1" /> {formatAmount(rec.amount)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewClick(rec)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="sm" onClick={() => handleEditClick(rec)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(rec.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {t('No receipts found', 'ரசீது எதுவும் கிடைக்கவில்லை')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              <div className="flex flex-col gap-3 px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                  <span>
                    {t('Showing', 'காட்டப்படுகிறது')} {data.length} {t('of', 'இல்')} <span className="font-medium">{pagination.total}</span> {t('items', 'உருப்படிகள்')}
                  </span>
                  <span>| {t('Income', 'வரவு')}: <span className="font-medium">{formatAmount(totals.income)}</span></span>
                  <span>| {t('Expense', 'செலவு')}: <span className="font-medium">{formatAmount(totals.expense)}</span></span>
                  <span>| {t('Balance', 'இருப்பு')}: <span className="font-medium">{formatAmount(totals.balance)}</span></span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                    disabled={pagination.pageIndex === 0}
                  >
                    {t('Previous', 'முந்தைய')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                    disabled={pagination.pageIndex >= pagination.totalPages - 1}
                  >
                    {t('Next', 'அடுத்து')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View/Edit Modal */}
        <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editMode ? t('Edit Receipt', 'ரசீது திருத்தம்') : t('View Receipt', 'ரசீது பார்க்க')}</DialogTitle>
              <DialogDescription>
                {editMode ? t('Edit the receipt details below', 'கீழே உள்ள ரசீது விவரங்களை திருத்தவும்') : t('View the receipt details below', 'கீழே உள்ள ரசீது விவரங்களை பார்க்கவும்')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">{t('Date', 'தேதி')}</Label>
                <Input id="date" type="date" value={editedReceipt.date || ''} onChange={(e) => setEditedReceipt({ ...editedReceipt, date: e.target.value })} className="col-span-3" disabled={!editMode} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">{t('Type', 'வகை')}</Label>
                <select id="type" className="col-span-3 border rounded h-10 px-3" value={editedReceipt.type || 'income'} onChange={(e) => setEditedReceipt({ ...editedReceipt, type: e.target.value as 'income' | 'expense' })} disabled={!editMode}>
                  <option value="income">{t('Income', 'வரவு')}</option>
                  <option value="expense">{t('Expense', 'செலவு')}</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="donor" className="text-right">{t('Donor', 'தந்தவர்')}</Label>
                <Input id="donor" value={editedReceipt.donor || ''} onChange={(e) => setEditedReceipt({ ...editedReceipt, donor: e.target.value })} className="col-span-3" disabled={!editMode} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receiver" className="text-right">{t('Receiver', 'பெற்றவர்')}</Label>
                <Input id="receiver" value={editedReceipt.receiver || ''} onChange={(e) => setEditedReceipt({ ...editedReceipt, receiver: e.target.value })} className="col-span-3" disabled={!editMode} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">{t('Amount', 'தொகை')}</Label>
                <Input id="amount" type="number" value={editedReceipt.amount as any as string || ''} onChange={(e) => setEditedReceipt({ ...editedReceipt, amount: Number(e.target.value) })} className="col-span-3" disabled={!editMode} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remarks" className="text-right">{t('Remarks', 'குறிப்புகள்')}</Label>
                <Textarea id="remarks" value={editedReceipt.remarks || ''} onChange={(e) => setEditedReceipt({ ...editedReceipt, remarks: e.target.value })} className="col-span-3" disabled={!editMode} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsViewEditOpen(false); setViewEditReceipt(null); setEditedReceipt({}); }}>{t('Cancel', 'ரத்து செய்')}</Button>
              {editMode && (
                <Button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-700">{t('Save Changes', 'மாற்றங்களை சேமிக்க')}</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Simple inline delete confirm (reuse toast UI) */}
        {deleteId !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-[90%] max-w-sm">
              <div className="font-semibold mb-2">{t('Are you sure?', 'நீங்கள் உறுதியாகவா?')}</div>
              <div className="text-sm text-muted-foreground mb-4">{t('This will permanently delete the receipt.', 'இது ரசீதுவை நிரந்தரமாக நீக்கும்.')}</div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteId(null)}>{t('Cancel', 'ரத்து செய்')}</Button>
                <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>{t('Delete', 'நீக்கு')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
