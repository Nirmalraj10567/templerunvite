import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Eye, Edit, Trash2, Calendar, IndianRupee, ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
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

// API response interface
interface ApiReceipt {
  id: number;
  register_no: string;
  date: string;
  type: 'receipt' | 'payment';
  from_person?: string;
  to_person?: string;
  amount: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper function to convert API response to frontend format
const mapApiReceiptToFrontend = (apiReceipt: ApiReceipt): Receipt => {
  return {
    id: apiReceipt.id,
    receipt_number: apiReceipt.register_no,
    date: apiReceipt.date,
    type: apiReceipt.type === 'payment' ? 'expense' : 'income',
    donor: apiReceipt.from_person,
    receiver: apiReceipt.to_person,
    amount: parseFloat(apiReceipt.amount),
    remarks: apiReceipt.remarks,
    created_at: apiReceipt.created_at,
    updated_at: apiReceipt.updated_at
  };
};

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
  const { token, user } = useAuth();
  const { language } = useLanguage();

  // Unified translation object
  const translations = {
    english: {
      title: 'ரசீது பட்டியல்',
      search: 'ரசீது எண், தந்தவர், பெற்றவர் மூலம் தேடவும்...',
      addReceipt: 'புதிய ரசீது',
      receiptNumber: 'ரசீது எண்',
      date: 'தேதி',
      type: 'வகை',
      amount: 'தொகை',
      actions: 'செயல்கள்',
      income: 'வரவு',
      expense: 'செலவு',
      donor: 'தந்தவர்',
      receiver: 'பெற்றவர்',
      view: 'பார்க்க',
      edit: 'திருத்து',
      delete: 'நீக்கு',
      noReceipts: 'ரசீது எதுவும் கிடைக்கவில்லை',
      loading: 'ஏற்றுகிறது...',
      deleteConfirmation: 'நீங்கள் உறுதியாகவா?',
      deleteDescription: 'இது ரசீதுவை நிரந்தரமாக நீக்கும்.',
      cancel: 'ரத்து செய்',
      confirm: 'நீக்கு',
      deleteSuccess: 'ரசீது நீக்கப்பட்டது',
      deleteError: 'ரசீது நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
      updateSuccess: 'ரசீது வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
      updateError: 'ரசீது புதுப்பிப்பு தோல்வி. மீண்டும் முயற்சிக்கவும்.',
      fetchError: 'ரசீது தரவைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
      exportError: 'CSV ஏற்றுமதி தோல்வி',
      printReceipt: 'ரசீதை அச்சிடு',
      remarks: 'குறிப்புகள்',
      print: 'அச்சிடு',
      close: 'மூடு',
      from: 'இருந்து',
      to: 'வரை',
      all: 'அனைத்தும்',
      exportCsv: 'CSV ஏற்றுமதி',
      viewReceipt: 'ரசீது பார்க்க',
      editReceipt: 'ரசீது திருத்தம்',
      viewDescription: 'கீழே உள்ள ரசீது விவரங்களை பார்க்கவும்',
      editDescription: 'கீழே உள்ள ரசீது விவரங்களை திருத்தவும்',
      saveChanges: 'மாற்றங்களை சேமிக்க',
      showing: 'காட்டப்படுகிறது',
      of: 'இல்',
      items: 'உருப்படிகள்',
      balance: 'இருப்பு',
      previous: 'முந்தைய',
      next: 'அடுத்து',
      success: 'வெற்றி',
      error: 'பிழை'
    },
    tamil: {
      title: 'Receipt List',
      search: 'Search by receipt no, donor, receiver...',
      addReceipt: 'Add Receipt',
      receiptNumber: 'Receipt No',
      date: 'Date',
      type: 'Type',
      amount: 'Amount',
      actions: 'Actions',
      income: 'Income',
      expense: 'Expense',
      donor: 'Donor',
      receiver: 'Receiver',
      view: 'View',
      edit: 'Edit',
      delete: 'Delete',
      noReceipts: 'No receipts found',
      loading: 'Loading...',
      deleteConfirmation: 'Are you sure?',
      deleteDescription: 'This will permanently delete the receipt.',
      cancel: 'Cancel',
      confirm: 'Delete',
      deleteSuccess: 'Receipt deleted',
      deleteError: 'Failed to delete receipt. Please try again.',
      updateSuccess: 'Receipt updated successfully',
      updateError: 'Failed to update receipt. Please try again.',
      fetchError: 'Failed to fetch receipts. Please try again.',
      exportError: 'Failed to export CSV',
      printReceipt: 'Print Receipt',
      remarks: 'Remarks',
      print: 'Print',
      close: 'Close',
      from: 'From',
      to: 'To',
      all: 'All',
      exportCsv: 'Export CSV',
      viewReceipt: 'View Receipt',
      editReceipt: 'Edit Receipt',
      viewDescription: 'View the receipt details below',
      editDescription: 'Edit the receipt details below',
      saveChanges: 'Save Changes',
      showing: 'Showing',
      of: 'of',
      items: 'items',
      balance: 'Balance',
      previous: 'Previous',
      next: 'Next',
      success: 'Success',
      error: 'Error'
    }
  };

  // Translation function
  const t = (key: keyof typeof translations.english): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.english;
    return currentTranslations[key] || translations.english[key] || key;
  };

  // State variables
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [data, setData] = useState<Receipt[]>([]);
  const [pagination, setPagination] = useState({ 
    pageIndex: 0, 
    pageSize: 10, 
    total: 0, 
    totalPages: 1 
  });

  // Modal states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewEditReceipt, setViewEditReceipt] = useState<Receipt | null>(null);
  const [isViewEditOpen, setIsViewEditOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Partial<ReceiptFormData>>({});

  // Permission checks
  const isSuperAdmin = user?.role === 'superadmin';
  const canEdit = isSuperAdmin || (user as any)?.permissions?.some((p: any) => 
    p.permission_id === 'receipts' && (p.access_level === 'edit' || p.access_level === 'full')
  );
  const canDelete = isSuperAdmin || (user as any)?.permissions?.some((p: any) => 
    p.permission_id === 'receipts' && p.access_level === 'full'
  );

  // Fetch receipts function
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

      const res = await fetch(`http://localhost:4000/api/receipts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to fetch receipts');
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch receipts');
      
      // Map API response to frontend format
      const mappedData = (result.data || []).map(mapApiReceiptToFrontend);
      setData(mappedData);
      setPagination((prev) => ({ 
        ...prev, 
        total: result.pagination?.total || mappedData.length || 0, 
        totalPages: result.pagination?.totalPages || Math.ceil((result.pagination?.total || mappedData.length || 0) / prev.pageSize) 
      }));
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('error'), 
        description: t('fetchError'), 
        variant: 'destructive' 
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, fromDate, toDate, typeFilter]);

  // Event handlers
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (typeFilter !== 'all') {
        // Map frontend type to API type
        const apiType = typeFilter === 'income' ? 'receipt' : typeFilter === 'expense' ? 'payment' : undefined;
        if (apiType) params.append('type', apiType);
      }

      const res = await fetch(`http://localhost:4000/api/receipts/export?${params.toString()}`, {
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
      toast({ 
        title: t('error'), 
        description: t('exportError'), 
        variant: 'destructive' 
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewClick = (rec: Receipt) => {
    setViewEditReceipt(rec);
    setEditedReceipt({
      date: rec.date?.slice(0, 10) || '',
      type: rec.type,
      donor: rec.donor || '',
      receiver: rec.receiver || '',
      amount: rec.amount,
      remarks: rec.remarks || '',
    });
    setEditMode(false);
    setIsViewEditOpen(true);
  };

  const handleEditClick = (rec: Receipt) => {
    setViewEditReceipt(rec);
    setEditedReceipt({
      date: rec.date?.slice(0, 10) || '',
      type: rec.type,
      donor: rec.donor || '',
      receiver: rec.receiver || '',
      amount: rec.amount,
      remarks: rec.remarks || '',
    });
    setEditMode(true);
    setIsViewEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!viewEditReceipt || !editedReceipt) return;
    
    try {
      // Map frontend data back to API format for update
      const apiReceiptData = {
        date: editedReceipt.date,
        type: editedReceipt.type === 'expense' ? 'payment' : 'receipt',
        donor: editedReceipt.donor,
        receiver: editedReceipt.receiver,
        amount: editedReceipt.amount,
        remarks: editedReceipt.remarks
      };

      const res = await fetch(`http://localhost:4000/api/receipts/${viewEditReceipt.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(apiReceiptData),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update receipt');
      }
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update receipt');
      
      // Map the updated receipt back to frontend format
      const updatedReceipt = mapApiReceiptToFrontend(result.data);
      setData((prev) => prev.map((r) => 
        r.id === viewEditReceipt.id ? { ...r, ...updatedReceipt } : r
      ));
      
      toast({ 
        title: t('success'), 
        description: t('updateSuccess') 
      });
      
      setIsViewEditOpen(false);
      setViewEditReceipt(null);
      setEditedReceipt({});
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('error'), 
        description: t('updateError'), 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      const res = await fetch(`http://localhost:4000/api/receipts/${deleteId}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete receipt');
      }
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete receipt');
      
      setData((prev) => prev.filter((r) => r.id !== deleteId));
      toast({ 
        title: t('success'), 
        description: t('deleteSuccess') 
      });
    } catch (e) {
      console.error(e);
      toast({ 
        title: t('error'), 
        description: t('deleteError'), 
        variant: 'destructive' 
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Utility functions
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
  const formatAmount = (amt: number) => new Intl.NumberFormat(undefined, { 
    style: 'currency', 
    currency: 'INR' 
  }).format(amt || 0);

  // Calculate totals
  const totals = useMemo(() => {
    const total = data.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const income = data.filter(r => r.type === 'income').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expense = data.filter(r => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const balance = income - expense;
    return { total, income, expense, balance };
  }, [data]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Button onClick={() => navigate('/dashboard/receipts/new')} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            {t('addReceipt')}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Filters */}
            <div className="mb-4 flex flex-col gap-3">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('search')}
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
              
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm mb-1">{t('from')}</label>
                  <Input 
                    type="date" 
                    value={fromDate} 
                    onChange={(e) => setFromDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('to')}</label>
                  <Input 
                    type="date" 
                    value={toDate} 
                    onChange={(e) => setToDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t('type')}</label>
                  <select 
                    className="border rounded h-10 px-3" 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                  >
                    <option value="all">{t('all')}</option>
                    <option value="income">{t('income')}</option>
                    <option value="expense">{t('expense')}</option>
                  </select>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" onClick={handlePrint}>
                    {t('print')}
                  </Button>
                  <Button onClick={handleExportCSV}>
                    {t('exportCsv')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('receiptNumber')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('donor')}</TableHead>
                      <TableHead>{t('receiver')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length > 0 ? (
                      data.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell className="font-medium">
                            {rec.receipt_number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(rec.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              rec.type === 'income' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {rec.type === 'income' ? (
                                <ArrowDownCircle className="h-3.5 w-3.5 mr-1" />
                              ) : (
                                <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                              )}
                              {rec.type === 'income' ? t('income') : t('expense')}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {rec.donor || '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {rec.receiver || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center">
                
                              {formatAmount(rec.amount)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewClick(rec)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEditClick(rec)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDeleteClick(rec.id)}
                                >
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
                          {t('noReceipts')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Footer with totals and pagination */}
              <div className="flex flex-col gap-3 px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                  <span>
                    {t('showing')} {data.length} {t('of')} <span className="font-medium">{pagination.total}</span> {t('items')}
                  </span>
                  <span>| {t('income')}: <span className="font-medium">{formatAmount(totals.income)}</span></span>
                  <span>| {t('expense')}: <span className="font-medium">{formatAmount(totals.expense)}</span></span>
                  <span>| {t('balance')}: <span className="font-medium">{formatAmount(totals.balance)}</span></span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ 
                      ...prev, 
                      pageIndex: Math.max(0, prev.pageIndex - 1) 
                    }))}
                    disabled={pagination.pageIndex === 0}
                  >
                    {t('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ 
                      ...prev, 
                      pageIndex: prev.pageIndex + 1 
                    }))}
                    disabled={pagination.pageIndex >= pagination.totalPages - 1}
                  >
                    {t('next')}
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
              <DialogTitle>
                {editMode ? t('editReceipt') : t('viewReceipt')}
              </DialogTitle>
              <DialogDescription>
                {editMode ? t('editDescription') : t('viewDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">{t('date')}</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={editedReceipt.date || ''} 
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, date: e.target.value })} 
                  className="col-span-3" 
                  disabled={!editMode} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">{t('type')}</Label>
                <select 
                  id="type" 
                  className="col-span-3 border rounded h-10 px-3" 
                  value={editedReceipt.type || 'income'} 
                  onChange={(e) => setEditedReceipt({ 
                    ...editedReceipt, 
                    type: e.target.value as 'income' | 'expense' 
                  })} 
                  disabled={!editMode}
                >
                  <option value="income">{t('income')}</option>
                  <option value="expense">{t('expense')}</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="donor" className="text-right">{t('donor')}</Label>
                <Input 
                  id="donor" 
                  value={editedReceipt.donor || ''} 
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, donor: e.target.value })} 
                  className="col-span-3" 
                  disabled={!editMode} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receiver" className="text-right">{t('receiver')}</Label>
                <Input 
                  id="receiver" 
                  value={editedReceipt.receiver || ''} 
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, receiver: e.target.value })} 
                  className="col-span-3" 
                  disabled={!editMode} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">{t('amount')}</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  value={editedReceipt.amount || ''} 
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, amount: Number(e.target.value) || 0 })} 
                  className="col-span-3" 
                  disabled={!editMode} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remarks" className="text-right">{t('remarks')}</Label>
                <Textarea 
                  id="remarks" 
                  value={editedReceipt.remarks || ''} 
                  onChange={(e) => setEditedReceipt({ ...editedReceipt, remarks: e.target.value })} 
                  className="col-span-3" 
                  disabled={!editMode} 
                  rows={3} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => { 
                  setIsViewEditOpen(false); 
                  setViewEditReceipt(null); 
                  setEditedReceipt({}); 
                }}
              >
                {t('cancel')}
              </Button>
              {editMode && (
                <Button 
                  onClick={handleSaveEdit} 
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {t('saveChanges')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        {deleteId !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-[90%] max-w-sm">
              <div className="font-semibold mb-2">{t('deleteConfirmation')}</div>
              <div className="text-sm text-muted-foreground mb-4">
                {t('deleteDescription')}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteId(null)}>
                  {t('cancel')}
                </Button>
                <Button 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  onClick={confirmDelete}
                >
                  {t('confirm')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
