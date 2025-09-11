import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { journalService, JournalEntryItem } from '@/services/journalService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const PAGE_SIZE = 20;

export default function JournalLogPage() {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [entries, setEntries] = useState<JournalEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const startDate = params.get('startDate') || new Date().toISOString().slice(0,10);
  const endDate = params.get('endDate') || new Date().toISOString().slice(0,10);
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
      });
      setEntries(res.data || []);
      setTotalCount(res.pagination?.total || 0);
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

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{t('Journal Log', 'ஜர்னல் பதிவு')}</CardTitle>
        </CardHeader>
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
                disabled={isLoading || entries.length < PAGE_SIZE}
              >
                {t('Next', 'அடுத்து')}
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
    </div>
  );
}
