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
import { formFieldStyles, cn, pageContainerStyles } from '@/styles/formStyles';

const PAGE_SIZE = 20;

export default function JournalLogPage() {
  const { language } = useLanguage();
  const { token } = useAuth();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);
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
        const response = await fetch('https://tmsapi.xesstechlink.com/api/journal/sync-pooja', {
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
  const startDate = params.get('startDate') || thirtyDaysAgo.toISOString().slice(0,10);
  const endDate = params.get('endDate') || today.toISOString().slice(0,10);
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
         <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 text-center", formFieldStyles.card.header)}>
           <CardTitle className="text-lg font-bold w-full">
           {t('Journal Log', 'ஜர்னல் பதிவு')}
           </CardTitle>
         </CardHeader>
       
      <Card>
       
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="space-y-1">
              <Label htmlFor="startDate">{t('Start Date', 'தொடக்க தேதி')}</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => onFilterChange('startDate', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">{t('End Date', 'முடிவு தேதி')}</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => onFilterChange('endDate', e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="account">{t('Account (optional)', 'கணக்கு (விருப்பம்)')}</Label>
              <Input id="account" placeholder={t('Search account name', 'கணக்கு பெயர்')} value={account} onChange={(e) => onFilterChange('account', e.target.value)} />
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
            
              <Button 
                variant="outline" 
                onClick={exportToCSV}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('Export CSV', 'CSV ஏற்றுமதி')}
              </Button>
              <Button 
                variant="outline" 
                onClick={exportToPDF}
                disabled={isLoading}
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('Export PDF', 'PDF ஏற்றுமதி')}
              </Button>
<Button variant="outline" onClick={() => navigate(-1)}>{t('Back', 'பின் செல்ல')}</Button>
              <Button onClick={load} disabled={isLoading}>{t('Refresh', 'புதுப்பிக்க')}</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">{t('Date', 'தேதி')}</th>
                  <th className="text-left px-3 py-2 border-b">{t('From Account', 'வரவு கணக்கு')}</th>
                  <th className="text-left px-3 py-2 border-b">{t('To Account', 'பெறுகை கணக்கு')}</th>
                  <th className="text-right px-3 py-2 border-b">{t('Amount', 'தொகை')}</th>
                  <th className="text-left px-3 py-2 border-b">{t('Reference', 'குறிப்பு')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">{t('No entries found', 'பதிவுகள் இல்லை')}</td>
                  </tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border-b whitespace-nowrap">{e.date?.slice(0,10)}</td>
                    <td className="px-3 py-2 border-b">{e.from_account}</td>
                    <td className="px-3 py-2 border-b">{e.to_account}</td>
                    <td className="px-3 py-2 border-b text-right">{Number(e.amount).toFixed(2)}</td>
                    <td className="px-3 py-2 border-b text-sm text-gray-700">
                      {(e.reference_type && e.reference_id) ? `${e.reference_type}#${e.reference_id}` : (e.remarks || '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
