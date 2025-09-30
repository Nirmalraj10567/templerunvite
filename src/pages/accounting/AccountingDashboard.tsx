import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/language';
import { accountingService, Account } from '@/services/accountingService';
import { integratedAccountingService } from '@/services/integratedAccountingService';
import { initializeBasicAccounts, checkAccountingSetup } from '@/utils/initializeAccounting';
import { pageContainerStyles } from '@/styles/formStyles';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  FileText,
  Settings,
  Plus,
  BarChart3,
  Calculator,
  BookOpen
} from 'lucide-react';

interface DashboardStats {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  cashBalance: number;
  accountsCount: number;
}

export default function AccountingDashboard() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netIncome: 0,
    cashBalance: 0,
    accountsCount: 0
  });
  const [recentAccounts, setRecentAccounts] = useState<Account[]>([]);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Check if accounting system is properly set up
      const setupCheck = await checkAccountingSetup();
      if (!setupCheck.isSetup) {
        console.log('Accounting system not fully set up, initializing...');
        await initializeBasicAccounts();
      }

      // Load accounts
      const accounts = await accountingService.getAccounts();
      setRecentAccounts(accounts.slice(0, 5)); // Show recent 5 accounts

      // Calculate stats
      const assets = accounts.filter(acc => acc.type === 'ASSET');
      const liabilities = accounts.filter(acc => acc.type === 'LIABILITY');
      const equity = accounts.filter(acc => acc.type === 'EQUITY');

      const totalAssets = assets.reduce((sum, acc) => sum + acc.current_balance, 0);
      const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.current_balance, 0);
      const totalEquity = equity.reduce((sum, acc) => sum + acc.current_balance, 0);

      // Get cash balance
      const cashAccount = accounts.find(acc => acc.code === 'CASH' || acc.name.toLowerCase().includes('cash'));
      const cashBalance = cashAccount ? cashAccount.current_balance : 0;

      // For demo purposes, calculate monthly income/expenses
      // In real implementation, this would come from journal entries for current month

      // Mock monthly calculations - replace with actual journal entry queries
      const monthlyIncome = totalAssets * 0.05; // Mock calculation
      const monthlyExpenses = totalAssets * 0.03; // Mock calculation
      const netIncome = monthlyIncome - monthlyExpenses;

      setStats({
        totalAssets,
        totalLiabilities,
        totalEquity,
        monthlyIncome,
        monthlyExpenses,
        netIncome,
        cashBalance,
        accountsCount: accounts.length
      });

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setIsError(true);
      setMessage(error.message || t('Failed to load dashboard data', 'டாஷ்போர்டு தரவை ஏற்ற முடியவில்லை'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const syncMoneyDonations = async () => {
    try {
      setSyncing(true);
      setMessage(undefined);
      
      console.log('🔄 Starting money donation sync...');
      const result = await integratedAccountingService.syncExistingMoneyDonations();
      console.log('✅ Sync completed:', result);
      
      setIsError(false);
      setMessage(t(
        `Sync completed: ${result.success} successful, ${result.failed} failed`,
        `ஒத்திசைவு முடிந்தது: ${result.success} வெற்றி, ${result.failed} தோல்வி`
      ));
      
      // Reload dashboard data to reflect changes
      await loadDashboardData();
    } catch (error: any) {
      console.error('❌ Error syncing money donations:', error);
      setIsError(true);
      setMessage(error.message || t('Failed to sync money donations', 'பண நன்கொடைகளை ஒத்திசைக்க முடியவில்லை'));
    } finally {
      setSyncing(false);
    }
  };

  const testIntegration = async () => {
    try {
      console.log('🧪 Testing accounting integration...');
      
      // Test creating a sample journal entry
      const testData = {
        id: 999,
        date: new Date().toISOString().slice(0, 10),
        amount: 100,
        name: 'Test Integration',
        reason: 'Testing accounting integration',
        registerNo: 'TEST-001'
      };
      
      const result = await integratedAccountingService.createMoneyDonationJournalEntry(testData);
      
      if (result) {
        setIsError(false);
        setMessage(t('Integration test successful!', 'ஒருங்கிணைப்பு சோதனை வெற்றிகரமானது!'));
        await loadDashboardData();
      } else {
        setIsError(true);
        setMessage(t('Integration test failed', 'ஒருங்கிணைப்பு சோதனை தோல்வியடைந்தது'));
      }
    } catch (error: any) {
      console.error('❌ Integration test failed:', error);
      setIsError(true);
      setMessage(error.message || t('Integration test failed', 'ஒருங்கிணைப்பு சோதனை தோல்வியடைந்தது'));
    }
  };

  const quickActions = [
    {
      title: t('New Journal Entry', 'புதிய பதிவேட்டு பதிவு'),
      description: t('Create a new journal entry', 'புதிய பதிவேட்டு பதிவை உருவாக்கு'),
      icon: Plus,
      color: 'bg-blue-500',
      onClick: () => navigate('/dashboard/accounting/journal-entry')
    },
    {
      title: t('Manage Accounts', 'கணக்குகளை நிர்வகிக்க'),
      description: t('Add or edit chart of accounts', 'கணக்கு பட்டியலை சேர்க்க அல்லது திருத்த'),
      icon: Settings,
      color: 'bg-green-500',
      onClick: () => navigate('/dashboard/accounting/accounts')
    },
    {
      title: t('View Reports', 'அறிக்கைகளைப் பார்க்க'),
      description: t('Generate financial reports', 'நிதி அறிக்கைகளை உருவாக்கு'),
      icon: FileText,
      color: 'bg-purple-500',
      onClick: () => navigate('/dashboard/accounting/reports')
    },
    {
      title: t('Trial Balance', 'சோதனை இருப்பு'),
      description: t('View trial balance', 'சோதனை இருப்பைப் பார்க்க'),
      icon: Calculator,
      color: 'bg-orange-500',
      onClick: () => navigate('/dashboard/accounting/reports?tab=trial-balance')
    },
    {
      title: t('Sync Donations', 'நன்கொடைகளை ஒத்திசைக்க'),
      description: t('Sync money donations to accounting', 'பண நன்கொடைகளை கணக்கியலுடன் ஒத்திசைக்க'),
      icon: BookOpen,
      color: 'bg-indigo-500',
      onClick: syncMoneyDonations
    },
    {
      title: t('Test Integration', 'ஒருங்கிணைப்பு சோதனை'),
      description: t('Test accounting integration', 'கணக்கியல் ஒருங்கிணைப்பை சோதிக்க'),
      icon: Settings,
      color: 'bg-gray-500',
      onClick: testIntegration
    }
  ];

  const statCards = [
    {
      title: t('Total Assets', 'மொத்த சொத்துக்கள்'),
      value: formatCurrency(stats.totalAssets),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: t('Total Liabilities', 'மொத்த கடன்கள்'),
      value: formatCurrency(stats.totalLiabilities),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: t('Total Equity', 'மொத்த மூலதனம்'),
      value: formatCurrency(stats.totalEquity),
      icon: PieChart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: t('Cash Balance', 'பண இருப்பு'),
      value: formatCurrency(stats.cashBalance),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: t('Monthly Income', 'மாதாந்திர வருமானம்'),
      value: formatCurrency(stats.monthlyIncome),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: t('Monthly Expenses', 'மாதாந்திர செலவுகள்'),
      value: formatCurrency(stats.monthlyExpenses),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: t('Net Income', 'நிகர வருமானம்'),
      value: formatCurrency(stats.netIncome),
      icon: BarChart3,
      color: stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats.netIncome >= 0 ? 'bg-green-50' : 'bg-red-50'
    },
    {
      title: t('Total Accounts', 'மொத்த கணக்குகள்'),
      value: stats.accountsCount.toString(),
      icon: BookOpen,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('Loading dashboard...', 'டாஷ்போர்டை ஏற்றுகிறது...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('Accounting Dashboard', 'கணக்கியல் டாஷ்போர்டு')}
          </h1>
          <p className="text-gray-600">
            {t('Overview of your financial position and quick actions', 'உங்கள் நிதி நிலை மற்றும் விரைவு செயல்களின் கண்ணோட்டம்')}
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
            <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>
                      <p className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {t('Quick Actions', 'விரைவு செயல்கள்')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    const isSyncButton = action.title.includes('Sync') || action.title.includes('ஒத்திசைக்க');
                    const isDisabled = isSyncButton && syncing;
                    
                    return (
                      <button
                        key={index}
                        onClick={action.onClick}
                        disabled={isDisabled}
                        className={`p-4 text-left border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${action.color} text-white`}>
                            {isSyncButton && syncing ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 mb-1">
                              {isSyncButton && syncing ? t('Syncing...', 'ஒத்திசைக்கிறது...') : action.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Accounts */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {t('Recent Accounts', 'சமீபத்திய கணக்குகள்')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {account.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {account.code} • {account.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {formatCurrency(account.current_balance)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {recentAccounts.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">
                        {t('No accounts found', 'கணக்குகள் இல்லை')}
                      </p>
                      <Button
                        onClick={() => navigate('/dashboard/accounting/accounts')}
                        className="mt-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                        size="sm"
                      >
                        {t('Create First Account', 'முதல் கணக்கை உருவாக்கு')}
                      </Button>
                    </div>
                  )}
                </div>

                {recentAccounts.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <Button
                      onClick={() => navigate('/dashboard/accounting/accounts')}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      {t('View All Accounts', 'அனைத்து கணக்குகளையும் பார்க்க')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Financial Health Indicator */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {t('Financial Health', 'நிதி நலம்')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {((stats.totalAssets / (stats.totalLiabilities || 1)) * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('Asset to Liability Ratio', 'சொத்து மற்றும் கடன் விகிதம்')}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.netIncome >= 0 ? '+' : ''}{((stats.netIncome / (stats.monthlyIncome || 1)) * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('Net Profit Margin', 'நிகர லாப விகிதம்')}
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {formatCurrency(stats.cashBalance)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('Available Cash', 'கிடைக்கும் பணம்')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}