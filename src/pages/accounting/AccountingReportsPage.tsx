import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { accountingService, TrialBalance, BalanceSheet, IncomeStatement } from '@/services/accountingService';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { FileDown, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

type ReportType = 'trial-balance' | 'balance-sheet' | 'income-statement';

export default function AccountingReportsPage() {
  const { language } = useLanguage();
  const { token } = useAuth();

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [activeReport, setActiveReport] = useState<ReportType>('trial-balance');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  
  // Date filters
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Report data
  const [trialBalance, setTrialBalance] = useState<TrialBalance[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);

  useEffect(() => {
    loadReport();
  }, [activeReport]);

  const loadReport = async () => {
    setLoading(true);
    setMessage(undefined);
    setIsError(false);

    try {
      switch (activeReport) {
        case 'trial-balance':
          const tbData = await accountingService.getTrialBalance(asOfDate);
          setTrialBalance(tbData);
          break;
        case 'balance-sheet':
          const bsData = await accountingService.getBalanceSheet(asOfDate);
          setBalanceSheet(bsData);
          break;
        case 'income-statement':
          const isData = await accountingService.getIncomeStatement(startDate, endDate);
          setIncomeStatement(isData);
          break;
      }
    } catch (error: any) {
      console.error('Error loading report:', error);
      setIsError(true);
      setMessage(error.message || t('Failed to load report', 'அறிக்கையை ஏற்ற முடியவில்லை'));
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    // Implementation for exporting reports to PDF/Excel
    console.log('Exporting report:', activeReport);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const reportTabs = [
    {
      id: 'trial-balance' as ReportType,
      label: t('Trial Balance', 'சோதனை இருப்பு'),
      icon: BarChart3
    },
    {
      id: 'balance-sheet' as ReportType,
      label: t('Balance Sheet', 'இருப்பு நிலை அறிக்கை'),
      icon: TrendingUp
    },
    {
      id: 'income-statement' as ReportType,
      label: t('Income Statement', 'வருமான அறிக்கை'),
      icon: FileDown
    }
  ];

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white", formFieldStyles.card.header)}>
            <CardTitle className="text-2xl font-bold text-center">
              {t('Accounting Reports', 'கணக்கியல் அறிக்கைகள்')}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {/* Message Display */}
            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Report Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveReport(tab.id)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      activeReport === tab.id
                        ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              {activeReport === 'income-statement' ? (
                <>
                  <div>
                    <Label htmlFor="startDate">{t('Start Date', 'தொடக்க தேதி')}</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={formFieldStyles.input}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">{t('End Date', 'முடிவு தேதி')}</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={formFieldStyles.input}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="asOfDate">{t('As of Date', 'தேதி வரை')}</Label>
                  <Input
                    id="asOfDate"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className={formFieldStyles.input}
                  />
                </div>
              )}
              <div className="flex items-end">
                <Button
                  onClick={loadReport}
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {loading ? t('Loading...', 'ஏற்றுகிறது...') : t('Generate Report', 'அறிக்கையை உருவாக்கு')}
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={exportReport}
                  variant="outline"
                  disabled={loading}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {t('Export', 'ஏற்றுமதி')}
                </Button>
              </div>
            </div>

            {/* Report Content */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('Generating report...', 'அறிக்கையை உருவாக்குகிறது...')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Trial Balance Report */}
                {activeReport === 'trial-balance' && (
                  <TrialBalanceReport data={trialBalance} formatCurrency={formatCurrency} t={t} />
                )}

                {/* Balance Sheet Report */}
                {activeReport === 'balance-sheet' && balanceSheet && (
                  <BalanceSheetReport data={balanceSheet} formatCurrency={formatCurrency} t={t} />
                )}

                {/* Income Statement Report */}
                {activeReport === 'income-statement' && incomeStatement && (
                  <IncomeStatementReport data={incomeStatement} formatCurrency={formatCurrency} t={t} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Trial Balance Report Component
interface TrialBalanceReportProps {
  data: TrialBalance[];
  formatCurrency: (amount: number) => string;
  t: (en: string, ta: string) => string;
}

function TrialBalanceReport({ data, formatCurrency, t }: TrialBalanceReportProps) {
  const totalDebits = data.reduce((sum, item) => sum + item.debit_balance, 0);
  const totalCredits = data.reduce((sum, item) => sum + item.credit_balance, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">
        {t('Trial Balance', 'சோதனை இருப்பு')}
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('Account Code', 'கணக்கு குறியீடு')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('Account Name', 'கணக்கு பெயர்')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('Type', 'வகை')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('Debit Balance', 'பற்று இருப்பு')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('Credit Balance', 'வரவு இருப்பு')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.account_code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.account_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.account_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.debit_balance > 0 ? formatCurrency(item.debit_balance) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.credit_balance > 0 ? formatCurrency(item.credit_balance) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-900">
                {t('Total', 'மொத்தம்')}:
              </td>
              <td className="px-6 py-4 text-right font-semibold text-gray-900">
                {formatCurrency(totalDebits)}
              </td>
              <td className="px-6 py-4 text-right font-semibold text-gray-900">
                {formatCurrency(totalCredits)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Balance Sheet Report Component
interface BalanceSheetReportProps {
  data: BalanceSheet;
  formatCurrency: (amount: number) => string;
  t: (en: string, ta: string) => string;
}

function BalanceSheetReport({ data, formatCurrency, t }: BalanceSheetReportProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">
        {t('Balance Sheet', 'இருப்பு நிலை அறிக்கை')}
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
            {t('Assets', 'சொத்துக்கள்')}
          </h4>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-gray-600 mb-2">{t('Current Assets', 'நடப்பு சொத்துக்கள்')}</h5>
              {data.assets.current_assets.map((asset, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span className="text-sm text-gray-700">{asset.name}</span>
                  <span className="text-sm text-gray-900">{formatCurrency(asset.amount)}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h5 className="font-medium text-gray-600 mb-2">{t('Fixed Assets', 'நிலையான சொத்துக்கள்')}</h5>
              {data.assets.fixed_assets.map((asset, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span className="text-sm text-gray-700">{asset.name}</span>
                  <span className="text-sm text-gray-900">{formatCurrency(asset.amount)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between font-semibold">
                <span>{t('Total Assets', 'மொத்த சொத்துக்கள்')}</span>
                <span>{formatCurrency(data.assets.total_assets)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
            {t('Liabilities & Equity', 'கடன்கள் & மூலதனம்')}
          </h4>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-gray-600 mb-2">{t('Current Liabilities', 'நடப்பு கடன்கள்')}</h5>
              {data.liabilities.current_liabilities.map((liability, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span className="text-sm text-gray-700">{liability.name}</span>
                  <span className="text-sm text-gray-900">{formatCurrency(liability.amount)}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h5 className="font-medium text-gray-600 mb-2">{t('Long-term Liabilities', 'நீண்ட கால கடன்கள்')}</h5>
              {data.liabilities.long_term_liabilities.map((liability, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span className="text-sm text-gray-700">{liability.name}</span>
                  <span className="text-sm text-gray-900">{formatCurrency(liability.amount)}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h5 className="font-medium text-gray-600 mb-2">{t('Equity', 'மூலதனம்')}</h5>
              {data.equity.items.map((equity, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span className="text-sm text-gray-700">{equity.name}</span>
                  <span className="text-sm text-gray-900">{formatCurrency(equity.amount)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between font-semibold">
                <span>{t('Total Liabilities & Equity', 'மொத்த கடன்கள் & மூலதனம்')}</span>
                <span>{formatCurrency(data.liabilities.total_liabilities + data.equity.total_equity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Income Statement Report Component
interface IncomeStatementReportProps {
  data: IncomeStatement;
  formatCurrency: (amount: number) => string;
  t: (en: string, ta: string) => string;
}

function IncomeStatementReport({ data, formatCurrency, t }: IncomeStatementReportProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">
        {t('Income Statement', 'வருமான அறிக்கை')}
      </h3>
      
      <div className="space-y-6">
        {/* Income */}
        <div>
          <h4 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            {t('Income', 'வருமானம்')}
          </h4>
          {data.income.items.map((item, index) => (
            <div key={index} className="flex justify-between py-1">
              <span className="text-sm text-gray-700">{item.name}</span>
              <span className="text-sm text-gray-900">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>{t('Total Income', 'மொத்த வருமானம்')}</span>
              <span>{formatCurrency(data.income.total_income)}</span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div>
          <h4 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            {t('Expenses', 'செலவுகள்')}
          </h4>
          {data.expenses.items.map((item, index) => (
            <div key={index} className="flex justify-between py-1">
              <span className="text-sm text-gray-700">{item.name}</span>
              <span className="text-sm text-gray-900">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>{t('Total Expenses', 'மொத்த செலவுகள்')}</span>
              <span>{formatCurrency(data.expenses.total_expenses)}</span>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="border-t-2 border-gray-300 pt-4">
          <div className={`flex justify-between text-lg font-bold ${
            data.net_income >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{t('Net Income', 'நிகர வருமானம்')}</span>
            <span>{formatCurrency(data.net_income)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}