import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { journalService, JournalEntryItem } from '@/services/journalService';
import { useLanguage } from '@/lib/language';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme, tableClasses } from '@/styles/theme';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 20;

export default function JournalLogPage() {
  const { language } = useLanguage();
  const { token } = useAuth();
  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [entries, setEntries] = useState<JournalEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasSynced, setHasSynced] = useState(false);

  // Auto-sync pooja entries on component mount
  useEffect(() => {
    const syncPoojaEntries = async () => {
      if (!token || hasSynced) return;

      try {
        const response = await fetch('https://templeapi.agniplay.com/api/journal/sync-pooja', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const result = await response.json();
        if (result.success) {
          const message = result.details ?
            `Synced ${result.created} entries to journal (${result.skipped} already existed)\n- Pooja: ${result.details.pooja.created} new, ${result.details.pooja.skipped} existing\n- Money Donations: ${result.details.moneyDonations.created} new, ${result.details.moneyDonations.skipped} existing` :
            `Synced ${result.created} entries to journal (${result.skipped} already existed)`;
          console.log(message);
          load(); // Refresh the list
        } else {
          console.error('Sync failed:', result.error);
        }
      } catch (e: any) {
        console.error('Sync failed:', e.message);
      } finally {
        setHasSynced(true);
      }
    };

    syncPoojaEntries();
  }, [token, hasSynced]);

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const startDate = params.get('startDate') || thirtyDaysAgo.toISOString().slice(0, 10);
  const endDate = params.get('endDate') || today.toISOString().slice(0, 10);
  const account = params.get('account') || '';

  const query = useMemo(() => ({ startDate, endDate, account }), [startDate, endDate, account]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await journalService.listEntries({
        startDate: query.startDate,
        endDate: query.endDate,
        account: query.account || undefined,
        page,
        limit: PAGE_SIZE,
        excludeZero: true,
      });
      setEntries(res.data || []);
      setTotalCount(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (e: any) {
      setError(e?.message || 'Failed to load entries');
      setEntries([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.startDate, query.endDate, query.account, page]);

  const onFilterChange = (key: 'startDate' | 'endDate' | 'account', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Export functions
  const exportToCSV = async () => {
    try {
      setIsLoading(true);
      // Get all entries (not just current page) for export
      const res = await journalService.listEntries({
        startDate: query.startDate,
        endDate: query.endDate,
        account: query.account || undefined,
        page: 1,
        limit: 10000, // Get all entries
        excludeZero: true,
      });

      const allEntries = res.data || [];

      // Create CSV content
      const headers = ['Date', 'From Account', 'To Account', 'Amount', 'Reference', 'Remarks'];
      const csvContent = [
        headers.join(','),
        ...allEntries.map(entry => [
          entry.date?.slice(0, 10) || '',
          `"${entry.from_account || ''}"`,
          `"${entry.to_account || ''}"`,
          Number(entry.amount || 0).toFixed(2),
          `"${(entry.reference_type && entry.reference_id) ? `${entry.reference_type}#${entry.reference_id}` : (entry.remarks || '')}"`,
          `"${entry.remarks || ''}"`
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `journal-log-${query.startDate}-to-${query.endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsLoading(true);
      // Get all entries for export
      const res = await journalService.listEntries({
        startDate: query.startDate,
        endDate: query.endDate,
        account: query.account || undefined,
        page: 1,
        limit: 10000,
        excludeZero: true,
      });

      const allEntries = res.data || [];

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Journal Log Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .filters { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .amount { text-align: right; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Journal Log Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="filters">
            <strong>Filters Applied:</strong><br>
            Date Range: ${query.startDate} to ${query.endDate}<br>
            ${query.account ? `Account Filter: ${query.account}<br>` : ''}
            Total Entries: ${allEntries.length}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>From Account</th>
                <th>To Account</th>
                <th>Amount</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              ${allEntries.map(entry => `
                <tr>
                  <td>${entry.date?.slice(0, 10) || ''}</td>
                  <td>${entry.from_account || ''}</td>
                  <td>${entry.to_account || ''}</td>
                  <td class="amount">${Number(entry.amount || 0).toFixed(2)}</td>
                  <td>${(entry.reference_type && entry.reference_id) ? `${entry.reference_type}#${entry.reference_id}` : (entry.remarks || '')}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>Total Amount</strong></td>
                <td class="amount"><strong>${allEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0).toFixed(2)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Create and download PDF using print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
              {t('Journal Log', 'ஜர்னல் பதிவு')}
            </CardTitle>
          </div>
        </CardHeader>

        <Card>

          <CardContent>
            <div className="flex flex-wrap gap-3 items-end mb-4">
              <div className="space-y-1">
                <Label htmlFor="startDate">{t('Start Date', 'தொடக்க தேதி')}</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => onFilterChange('startDate', e.target.value)} className={cn(theme.input.base, theme.input.size.md)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">{t('End Date', 'முடிவு தேதி')}</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => onFilterChange('endDate', e.target.value)} className={cn(theme.input.base, theme.input.size.md)} />
              </div>
              <div className="space-y-1 flex-1">
                <Label htmlFor="account">{t('Account (optional)', 'கணக்கு (விருப்பம்)')}</Label>
                <Input id="account" placeholder={t('Search account name', 'Search account name')} value={account} onChange={(e) => onFilterChange('account', e.target.value)} className={cn(theme.input.base, theme.input.size.md)} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={isLoading}
                  size="sm"
                  className="h-9"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('Export CSV', 'CSV ஏற்றுமதி')}
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToPDF}
                  disabled={isLoading}
                  size="sm"
                  className="h-9"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t('Export PDF', 'PDF ஏற்றுமதி')}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-600">
                {isLoading ? t('Loading...', 'ஏற்றுகிறது...') : t('Total', 'மொத்தம்') + `: ${entries.length} / ${totalCount}`}
                {error && <span className="text-red-600 ml-2">{error}</span>}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={isLoading || page <= 1}
                >
                  {t('Previous', 'முந்தைய')}
                </Button>
                <Button
                  variant="outline"
                  disabled
                >
                  {page}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={isLoading || page >= totalPages}
                >
                  {t('Next', 'அடுத்து')}
                </Button>
              </div>
            </div>
            <div className={tableClasses.scrollContainerWrapper}>
              <div className={tableClasses.scrollContainer}>
                {isLoading ? (
                  <div className={tableClasses.emptyState}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <Table className={tableClasses.container}>
                    <TableHeader className={tableClasses.header}>
                      <TableRow className={tableClasses.row}>
                        <TableHead className={tableClasses.headerCell}>{t('Date', 'தேதி')}</TableHead>
                        <TableHead className={tableClasses.headerCell}>{t('From Account', 'வரவு கணக்கு')}</TableHead>
                        <TableHead className={tableClasses.headerCell}>{t('To Account', 'பெறுகை கணக்கு')}</TableHead>
                        <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t('Amount', 'தொகை')}</TableHead>
                        <TableHead className={tableClasses.headerCell}>{t('Reference', 'குறிப்பு')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className={tableClasses.emptyState}>
                            {t('No entries found', 'பதிவுகள் இல்லை')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        entries.map((e) => (
                          <TableRow key={e.id} className={tableClasses.row}>
                            <TableCell className={tableClasses.cell}>{e.date?.slice(0, 10)}</TableCell>
                            <TableCell className={tableClasses.cell}>{e.from_account}</TableCell>
                            <TableCell className={tableClasses.cell}>{e.to_account}</TableCell>
                            <TableCell className={cn(tableClasses.cell, "text-right")}>{Number(e.amount).toFixed(2)}</TableCell>
                            <TableCell className={tableClasses.cell}>
                              {(e.reference_type && e.reference_id) ? `${e.reference_type}#${e.reference_id}` : (e.remarks || '')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <div className="text-sm text-gray-600">
                {t('Showing', 'காட்டுகிறது')} {entries.length} {t('of', 'இல்')} {totalCount}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>{t('Previous', 'முந்தைய')}</Button>
                <Button onClick={() => handlePageChange(page + 1)} disabled={entries.length < PAGE_SIZE}>{t('Next', 'அடுத்த')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Card>
    </div>
  );
}
