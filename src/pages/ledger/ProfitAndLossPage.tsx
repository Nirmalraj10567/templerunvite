import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ledgerService, type ProfitAndLossItem as ProfitAndLossRow } from '@/services/ledgerService';

export default function ProfitAndLossPage() {
  const { language } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState<ProfitAndLossRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState<{ income: number; expenses: number; profit: number }>({ 
    income: 0, 
    expenses: 0, 
    profit: 0 
  });
  const [groupBy, setGroupBy] = useState<'month' | 'day'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [category, setCategory] = useState<string>('__ALL__');
  const [categories, setCategories] = useState<string[]>([]);

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  useEffect(() => {
    // Load categories once
    (async () => {
      try {
        const cats = await ledgerService.getCategories();
        setCategories(cats);
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    })();
  }, []);

  useEffect(() => {
    loadReport();
  }, [year, startDate, endDate, typeFilter, category, groupBy]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await ledgerService.getProfitAndLoss({ 
        year,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        under: category === '__ALL__' ? undefined : category,
        groupBy
      });
      setReportData(data);
      
      // Calculate totals
      const totals = data.reduce((acc: { income: number; expenses: number; profit: number }, item) => ({
        income: acc.income + (item.total_income || 0),
        expenses: acc.expenses + (item.total_expenses || 0),
        profit: acc.profit + (item.net_profit_loss || 0)
      }), { income: 0, expenses: 0, profit: 0 });
      
      setTotal(totals);
    } catch (error) {
      console.error('Error loading profit and loss report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Generate years for the dropdown (current year and 5 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('Profit and Loss Report', 'இலாப மற்றும் நட்ட அறிக்கை')}</h1>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'month' | 'day')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t('By Month', 'மாதம்')}</SelectItem>
              <SelectItem value="day">{t('By Day', 'நாள்')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Type */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'credit' | 'debit')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Types', 'அனைத்து')}</SelectItem>
              <SelectItem value="credit">{t('Income (Credit)', 'வருமானம்')}</SelectItem>
              <SelectItem value="debit">{t('Expenses (Debit)', 'செலவுகள்')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Category */}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('Category', 'வகை')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">{t('All Categories', 'அனைத்து வகைகள்')}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="border rounded px-2 py-1"
          />
          <span>-</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="border rounded px-2 py-1"
          />
          <Button onClick={loadReport}>
            {t('Refresh', 'புதுப்பி')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('Profit and Loss Statement', 'இலாப மற்றும் நட்ட அறிக்கை')} - {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              {t('Loading report...', 'அறிக்கை ஏற்றப்படுகிறது...')}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{groupBy === 'day' ? t('Date', 'தேதி') : t('Month', 'மாதம்')}</TableHead>
                      <TableHead className="text-right">{t('Income', 'வருமானம்')}</TableHead>
                      <TableHead className="text-right">{t('Expenses', 'செலவுகள்')}</TableHead>
                      <TableHead className="text-right">{t('Net Profit/Loss', 'நிகர இலாபம்/நட்டம்')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row) => {
                      const label = groupBy === 'day'
                        ? new Date(row.period).toLocaleDateString(language === 'tamil' ? 'ta-IN' : 'en-US', { year: 'numeric', month: 'short', day: '2-digit' })
                        : new Date(row.period + '-01').toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-US', { month: 'long', year: 'numeric' });
                      const isProfit = row.net_profit_loss >= 0;
                      
                      return (
                        <TableRow key={row.period}>
                          <TableCell className="font-medium">{label}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(row.total_income || 0)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(row.total_expenses || 0)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : ''}{formatCurrency(row.net_profit_loss || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('Total Income', 'மொத்த வருமானம்')}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(total.income)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('Total Expenses', 'மொத்தச் செலவுகள்')}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(total.expenses)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('Net Profit/Loss', 'நிகர இலாபம்/நட்டம்')}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${total.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {total.profit >= 0 ? '+' : ''}{formatCurrency(total.profit)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
