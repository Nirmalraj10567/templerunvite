import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { daybookService, DaybookEntry, DaybookLog } from '@/services/daybookService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

export default function DaybookListPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [entries, setEntries] = useState<DaybookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entryType, setEntryType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({
    total_income: 0,
    total_expense: 0,
    current_balance: 0,
  });
  
  // Delete dialog
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Logs dialog
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<DaybookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  const t = (en: string, ta: string) => (language === 'english' ? en : ta);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await daybookService.getEntries({
        q: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        type: entryType || undefined,
        page,
        pageSize,
      });
      
      setEntries(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error(t('Failed to load daybook entries', 'டேபுக் உள்ளீடுகளை ஏற்றுவதில் தோல்வி'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await daybookService.getStats({
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, [search, fromDate, toDate, entryType, page]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      setDeleteLoading(true);
      await daybookService.deleteEntry(deleteId);
      toast.success(t('Entry deleted successfully', 'உள்ளீடு வெற்றிகரமாக நீக்கப்பட்டது'));
      setDeleteId(null);
      fetchEntries();
      fetchStats();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(t('Failed to delete entry', 'உள்ளீட்டை நீக்குவதில் தோல்வி'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewLogs = async (id: number) => {
    try {
      setLogsLoading(true);
      setLogsOpen(true);
      const response = await daybookService.getEntryLogs(id);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error(t('Failed to load logs', 'லோடுகளை ஏற்றுவதில் தோல்வி'));
    } finally {
      setLogsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await daybookService.exportCSV({
        from: fromDate || undefined,
        to: toDate || undefined,
        type: entryType || undefined,
      });
      toast.success(t('Export downloaded successfully', 'ஏற்றுமதி வெற்றிகரமாக பதிவிறக்கம் செய்யப்பட்டது'));
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error(t('Failed to export', 'ஏற்றுமதி செய்வதில் தோல்வி'));
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const getEntryTypeBadge = (type: string) => {
    const variants = {
      income: 'bg-green-100 text-green-800',
      expense: 'bg-red-100 text-red-800',
      journal: 'bg-blue-100 text-blue-800',
    };
    
    const icons = {
      income: <TrendingUp className="h-3 w-3 mr-1" />,
      expense: <TrendingDown className="h-3 w-3 mr-1" />,
      journal: <BookOpen className="h-3 w-3 mr-1" />,
    };
    
    const labels = {
      income: t('Income', 'வருமானம்'),
      expense: t('Expense', 'செலவு'),
      journal: t('Journal', 'ஜர்னல்'),
    };
    
    return (
      <Badge className={variants[type as keyof typeof variants]}>
        {icons[type as keyof typeof icons]}
        {labels[type as keyof typeof labels]}
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          {t('Daybook', 'டேபுக்')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('Manage daily income, expenses, and journal entries', 'தினசரி வருமானம், செலவு மற்றும் ஜர்னல் உள்ளீடுகளை நிர்வகிக்கவும்')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {t('Total Income', 'மொத்த வருமானம்')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatAmount(stats.total_income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              {t('Total Expense', 'மொத்த செலவு')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatAmount(stats.total_expense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              {t('Current Balance', 'தற்போதைய இருப்பு')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.current_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatAmount(stats.current_balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('Search entries...', 'உள்ளீடுகளை தேடுக...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder={t('From Date', 'தேதி முதல்')}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder={t('To Date', 'தேதி வரை')}
              />
            </div>
            
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">{t('All Types', 'அனைத்து வகைகள்')}</option>
              <option value="income">{t('Income', 'வருமானம்')}</option>
              <option value="expense">{t('Expense', 'செலவு')}</option>
              <option value="journal">{t('Journal', 'ஜர்னல்')}</option>
            </select>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => navigate('/daybook/entry')}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('New Entry', 'புதிய உள்ளீடு')}
            </Button>
            
            <Button
              onClick={handleExport}
              variant="outline"
              className="ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('Export CSV', 'CSV ஏற்றுமதி')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Receipt', 'ரசீது')}</TableHead>
                    <TableHead>{t('Date', 'தேதி')}</TableHead>
                    <TableHead>{t('Type', 'வகை')}</TableHead>
                    <TableHead>{t('Description', 'விளக்கம்')}</TableHead>
                    <TableHead>{t('Party', 'தரப்பினர்')}</TableHead>
                    <TableHead>{t('Payment', 'கட்டணம்')}</TableHead>
                    <TableHead className="text-right">{t('Amount', 'தொகை')}</TableHead>
                    <TableHead className="text-right">{t('Balance', 'இருப்பு')}</TableHead>
                    <TableHead className="text-center">{t('Actions', 'நடவடிக்கைகள்')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        {t('No entries found', 'உள்ளீடுகள் எதுவும் கிடைக்கவில்லை')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.receipt_number}</TableCell>
                        <TableCell>{formatDate(entry.entry_date)}</TableCell>
                        <TableCell>{getEntryTypeBadge(entry.entry_type)}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell>
                          {entry.party_name && (
                            <div>
                              <div className="font-medium">{entry.party_name}</div>
                              {entry.party_mobile && (
                                <div className="text-sm text-gray-500">{entry.party_mobile}</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{entry.payment_mode}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(entry.amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={entry.running_balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                            {formatAmount(entry.running_balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLogs(entry.id)}
                              title={t('View Logs', 'லோடுகளை காண்க')}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/daybook/edit/${entry.id}`)}
                              title={t('Edit', 'திருத்து')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(entry.id)}
                              title={t('Delete', 'நீக்கு')}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages >= 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {t('Showing', 'காண்பிப்பு')} {Math.min((page - 1) * pageSize + 1, total)} {t('to', 'to')} {Math.min(page * pageSize, total)} {t('of', 'of')} {total}
                    </div>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={10}>10 {t('per page', 'ஒவ்வொன்று')}</option>
                      <option value={25}>25 {t('per page', 'ஒவ்வொன்று')}</option>
                      <option value={50}>50 {t('per page', 'ஒவ்வொன்று')}</option>
                      <option value={100}>100 {t('per page', 'ஒவ்வொன்று')}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      {t('Previous', 'முந்தையது')}
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      {t('Page', 'பக்கம்')} {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      {t('Next', 'அடுத்தது')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Entry?', 'உள்ளீட்டை நீக்கவா?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone. The entry and all associated logs will be permanently deleted.', 'இந்த செயலை மீண்டும் செய்ய முடியாது. உள்ளீடு மற்றும் அதனுடன் தொடர்புடைய அனைத்து லோடுகளும் நிரந்தரமாக நீக்கப்படும்.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'ரத்து')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('Deleting...', 'நீக்குகிறது...')}
                </>
              ) : (
                t('Delete', 'நீக்கு')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Entry Logs', 'உள்ளீடு லோடுகள்')}</DialogTitle>
          </DialogHeader>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('No logs found', 'லோடுகள் எதுவும் கிடைக்கவில்லை')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Action', 'செயல்')}</TableHead>
                  <TableHead>{t('Date/Time', 'தேதி/நேரம்')}</TableHead>
                  <TableHead>{t('User', 'பயனர்')}</TableHead>
                  <TableHead>{t('Details', 'விவரங்கள்')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge
                        className={
                          log.action === 'created'
                            ? 'bg-green-100 text-green-800'
                            : log.action === 'updated'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                    <TableCell>{log.created_by || '-'}</TableCell>
                    <TableCell className="max-w-sm truncate font-mono text-xs">
                      {log.details ? JSON.stringify(log.details, null, 2) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
