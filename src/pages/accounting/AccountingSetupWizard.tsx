import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { accountingService, Account } from '@/services/accountingService';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { CheckCircle, Circle, ArrowRight, ArrowLeft } from 'lucide-react';

interface DefaultAccount {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  category: string;
  initial_balance: number;
  description: string;
}

const defaultAccounts: DefaultAccount[] = [
  // Assets
  { code: 'CASH', name: 'Cash in Hand', type: 'ASSET', category: 'Current Assets', initial_balance: 0, description: 'Physical cash available' },
  { code: 'BANK_CURRENT', name: 'Bank Current Account', type: 'ASSET', category: 'Current Assets', initial_balance: 0, description: 'Current account balance' },
  { code: 'BANK_SAVINGS', name: 'Bank Savings Account', type: 'ASSET', category: 'Current Assets', initial_balance: 0, description: 'Savings account balance' },
  { code: 'ACCOUNTS_RECEIVABLE', name: 'Accounts Receivable', type: 'ASSET', category: 'Current Assets', initial_balance: 0, description: 'Money owed to temple' },
  { code: 'INVENTORY', name: 'Inventory', type: 'ASSET', category: 'Current Assets', initial_balance: 0, description: 'Temple supplies and materials' },
  { code: 'BUILDING', name: 'Temple Building', type: 'ASSET', category: 'Fixed Assets', initial_balance: 0, description: 'Temple building and structures' },
  { code: 'EQUIPMENT', name: 'Equipment', type: 'ASSET', category: 'Fixed Assets', initial_balance: 0, description: 'Temple equipment and fixtures' },
  
  // Liabilities
  { code: 'ACCOUNTS_PAYABLE', name: 'Accounts Payable', type: 'LIABILITY', category: 'Current Liabilities', initial_balance: 0, description: 'Money owed by temple' },
  { code: 'LOANS_PAYABLE', name: 'Loans Payable', type: 'LIABILITY', category: 'Long-term Liabilities', initial_balance: 0, description: 'Outstanding loans' },
  
  // Equity
  { code: 'TEMPLE_FUND', name: 'Temple Fund', type: 'EQUITY', category: 'Owner Equity', initial_balance: 0, description: 'Main temple fund' },
  { code: 'RETAINED_EARNINGS', name: 'Retained Earnings', type: 'EQUITY', category: 'Retained Earnings', initial_balance: 0, description: 'Accumulated earnings' },
  { code: 'OPENING_BALANCE_EQUITY', name: 'Opening Balance Equity', type: 'EQUITY', category: 'Owner Equity', initial_balance: 0, description: 'Opening balance adjustments' },
  
  // Income
  { code: 'DONATION_INCOME', name: 'Donation Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0, description: 'Money donations received' },
  { code: 'POOJA_INCOME', name: 'Pooja Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0, description: 'Income from pooja services' },
  { code: 'HALL_RENTAL_INCOME', name: 'Hall Rental Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0, description: 'Income from hall bookings' },
  { code: 'TAX_INCOME', name: 'Tax Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0, description: 'Tax collection income' },
  { code: 'MISCELLANEOUS_INCOME', name: 'Miscellaneous Income', type: 'INCOME', category: 'Other Income', initial_balance: 0, description: 'Other income sources' },
  
  // Expenses
  { code: 'PRIEST_SALARY', name: 'Priest Salary', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0, description: 'Salary for priests' },
  { code: 'UTILITIES', name: 'Utilities', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0, description: 'Electricity, water, etc.' },
  { code: 'MAINTENANCE', name: 'Maintenance', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0, description: 'Building and equipment maintenance' },
  { code: 'SUPPLIES', name: 'Supplies', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0, description: 'Temple supplies and materials' },
  { code: 'ADMINISTRATIVE', name: 'Administrative Expenses', type: 'EXPENSE', category: 'Administrative Expenses', initial_balance: 0, description: 'Office and admin expenses' },
  { code: 'MISCELLANEOUS_EXPENSE', name: 'Miscellaneous Expenses', type: 'EXPENSE', category: 'Other Expenses', initial_balance: 0, description: 'Other expenses' }
];

export default function AccountingSetupWizard() {
  const { language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  
  const [accounts, setAccounts] = useState<DefaultAccount[]>(defaultAccounts);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(defaultAccounts.map(acc => acc.code))
  );

  const steps = [
    {
      title: t('Welcome', 'வரவேற்பு'),
      description: t('Set up your temple accounting system', 'உங்கள் கோவில் கணக்கியல் அமைப்பை அமைக்கவும்')
    },
    {
      title: t('Select Accounts', 'கணக்குகளைத் தேர்ந்தெடுக்கவும்'),
      description: t('Choose which accounts to create', 'எந்த கணக்குகளை உருவாக்க வேண்டும் என்பதைத் தேர்ந்தெடுக்கவும்')
    },
    {
      title: t('Initial Balances', 'ஆரம்ப இருப்புகள்'),
      description: t('Set opening balances for your accounts', 'உங்கள் கணக்குகளுக்கு ஆரம்ப இருப்புகளை அமைக்கவும்')
    },
    {
      title: t('Complete', 'முடிவு'),
      description: t('Review and finish setup', 'மதிப்பாய்வு செய்து அமைப்பை முடிக்கவும்')
    }
  ];

  const toggleAccount = (accountCode: string) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(accountCode)) {
      newSelected.delete(accountCode);
    } else {
      newSelected.add(accountCode);
    }
    setSelectedAccounts(newSelected);
  };

  const updateAccountBalance = (accountCode: string, balance: number) => {
    setAccounts(prev => prev.map(acc => 
      acc.code === accountCode ? { ...acc, initial_balance: balance } : acc
    ));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setMessage(undefined);
    setIsError(false);

    try {
      const selectedAccountsData = accounts.filter(acc => selectedAccounts.has(acc.code));
      
      // Create accounts
      const createdAccounts: Account[] = [];
      for (const accountData of selectedAccountsData) {
        const account = await accountingService.createAccount({
          code: accountData.code,
          name: accountData.name,
          type: accountData.type,
          category: accountData.category,
          initial_balance: accountData.initial_balance,
          is_active: true
        });
        createdAccounts.push(account);
      }

      // Set initial balances if any are non-zero
      const today = new Date().toISOString().slice(0, 10);
      for (const account of createdAccounts) {
        const accountData = selectedAccountsData.find(acc => acc.code === account.code);
        if (accountData && accountData.initial_balance !== 0) {
          await accountingService.setInitialBalance(account.id, accountData.initial_balance, today);
        }
      }

      setMessage(t(
        `Successfully created ${createdAccounts.length} accounts`,
        `${createdAccounts.length} கணக்குகள் வெற்றிகரமாக உருவாக்கப்பட்டன`
      ));
      setIsError(false);

      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard/accounting');
      }, 2000);

    } catch (error: any) {
      console.error('Error setting up accounts:', error);
      setIsError(true);
      setMessage(error.message || t('Failed to set up accounts', 'கணக்குகளை அமைக்க முடியவில்லை'));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const groupedAccounts = accounts.reduce((groups, account) => {
    if (!groups[account.type]) {
      groups[account.type] = [];
    }
    groups[account.type].push(account);
    return groups;
  }, {} as Record<string, DefaultAccount[]>);

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white", formFieldStyles.card.header)}>
            <CardTitle className="text-2xl font-bold text-center">
              {t('Accounting Setup Wizard', 'கணக்கியல் அமைப்பு வழிகாட்டி')}
            </CardTitle>
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                {steps.map((step, index) => (
                  <React.Fragment key={index}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      index + 1 <= currentStep ? 'bg-white text-orange-600' : 'bg-orange-400 text-white'
                    }`}>
                      {index + 1 < currentStep ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 ${
                        index + 1 < currentStep ? 'bg-white' : 'bg-orange-400'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Message Display */}
            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Step Content */}
            <div className="min-h-[400px]">
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <div className="text-center space-y-6">
                  <div className="text-6xl mb-4">🏛️</div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t('Welcome to Temple Accounting Setup', 'கோவில் கணக்கியல் அமைப்பிற்கு வரவேற்கிறோம்')}
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    {t(
                      'This wizard will help you set up a complete chart of accounts for your temple. We\'ll create the essential accounts needed for proper bookkeeping and financial management.',
                      'இந்த வழிகாட்டி உங்கள் கோவிலுக்கு முழுமையான கணக்கு பட்டியலை அமைக்க உதவும். சரியான புத்தக பராமரிப்பு மற்றும் நிதி மேலாண்மைக்கு தேவையான அத்தியாவசிய கணக்குகளை நாங்கள் உருவாக்குவோம்.'
                    )}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl mb-2">💰</div>
                      <h3 className="font-semibold text-green-800">{t('Assets', 'சொத்துக்கள்')}</h3>
                      <p className="text-sm text-green-600">{t('Cash, Bank, Equipment', 'பணம், வங்கி, உபகரணங்கள்')}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl mb-2">📋</div>
                      <h3 className="font-semibold text-red-800">{t('Liabilities', 'கடன்கள்')}</h3>
                      <p className="text-sm text-red-600">{t('Loans, Payables', 'கடன்கள், செலுத்த வேண்டியவை')}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl mb-2">🏦</div>
                      <h3 className="font-semibold text-blue-800">{t('Equity', 'மூலதனம்')}</h3>
                      <p className="text-sm text-blue-600">{t('Temple Fund, Earnings', 'கோவில் நிதி, வருமானம்')}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl mb-2">📈</div>
                      <h3 className="font-semibold text-purple-800">{t('Income & Expenses', 'வருமானம் & செலவுகள்')}</h3>
                      <p className="text-sm text-purple-600">{t('Donations, Operations', 'நன்கொடைகள், செயல்பாடுகள்')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Select Accounts */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {t('Select Accounts to Create', 'உருவாக்க வேண்டிய கணக்குகளைத் தேர்ந்தெடுக்கவும்')}
                    </h2>
                    <p className="text-gray-600">
                      {t('Choose the accounts that are relevant for your temple', 'உங்கள் கோவிலுக்கு பொருத்தமான கணக்குகளைத் தேர்ந்தெடுக்கவும்')}
                    </p>
                  </div>

                  {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
                    <div key={type} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                        {type === 'ASSET' && t('Assets', 'சொத்துக்கள்')}
                        {type === 'LIABILITY' && t('Liabilities', 'கடன்கள்')}
                        {type === 'EQUITY' && t('Equity', 'மூலதனம்')}
                        {type === 'INCOME' && t('Income', 'வருமானம்')}
                        {type === 'EXPENSE' && t('Expenses', 'செலவுகள்')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {typeAccounts.map((account) => (
                          <div
                            key={account.code}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedAccounts.has(account.code)
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleAccount(account.code)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="mt-1">
                                {selectedAccounts.has(account.code) ? (
                                  <CheckCircle className="h-5 w-5 text-orange-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{account.name}</h4>
                                <p className="text-sm text-gray-600">{account.code}</p>
                                <p className="text-xs text-gray-500 mt-1">{account.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Initial Balances */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {t('Set Initial Balances', 'ஆரம்ப இருப்புகளை அமைக்கவும்')}
                    </h2>
                    <p className="text-gray-600">
                      {t('Enter the current balances for your accounts (leave as 0 if starting fresh)', 'உங்கள் கணக்குகளின் தற்போதைய இருப்புகளை உள்ளிடவும் (புதிதாக தொடங்கினால் 0 ஆக விடவும்)')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {accounts.filter(acc => selectedAccounts.has(acc.code)).map((account) => (
                      <div key={account.code} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{account.name}</h4>
                          <p className="text-sm text-gray-600">{account.code} • {account.category}</p>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.01"
                            value={account.initial_balance}
                            onChange={(e) => updateAccountBalance(account.code, parseFloat(e.target.value) || 0)}
                            className="text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      {t('Balance Summary', 'இருப்பு சுருக்கம்')}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => {
                        const selectedTypeAccounts = typeAccounts.filter(acc => selectedAccounts.has(acc.code));
                        const total = selectedTypeAccounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
                        return (
                          <div key={type} className="text-center">
                            <p className="font-medium text-blue-900">
                              {type === 'ASSET' && t('Assets', 'சொத்துக்கள்')}
                              {type === 'LIABILITY' && t('Liabilities', 'கடன்கள்')}
                              {type === 'EQUITY' && t('Equity', 'மூலதனம்')}
                              {type === 'INCOME' && t('Income', 'வருமானம்')}
                              {type === 'EXPENSE' && t('Expenses', 'செலவுகள்')}
                            </p>
                            <p className="text-blue-700">{formatCurrency(total)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Complete */}
              {currentStep === 4 && (
                <div className="text-center space-y-6">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t('Ready to Complete Setup', 'அமைப்பை முடிக்க தயார்')}
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    {t(
                      `You have selected ${selectedAccounts.size} accounts to create. Click "Complete Setup" to create your chart of accounts and start using the accounting system.`,
                      `நீங்கள் ${selectedAccounts.size} கணக்குகளை உருவாக்க தேர்ந்தெடுத்துள்ளீர்கள். உங்கள் கணக்கு பட்டியலை உருவாக்கி கணக்கியல் அமைப்பைப் பயன்படுத்தத் தொடங்க "அமைப்பை முடிக்கவும்" என்பதைக் கிளிக் செய்யவும்.`
                    )}
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      {t('Summary', 'சுருக்கம்')}
                    </h3>
                    <div className="space-y-2 text-sm">
                      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => {
                        const selectedCount = typeAccounts.filter(acc => selectedAccounts.has(acc.code)).length;
                        if (selectedCount === 0) return null;
                        return (
                          <div key={type} className="flex justify-between">
                            <span>
                              {type === 'ASSET' && t('Assets', 'சொத்துக்கள்')}
                              {type === 'LIABILITY' && t('Liabilities', 'கடன்கள்')}
                              {type === 'EQUITY' && t('Equity', 'மூலதனம்')}
                              {type === 'INCOME' && t('Income', 'வருமானம்')}
                              {type === 'EXPENSE' && t('Expenses', 'செலவுகள்')}:
                            </span>
                            <span className="font-medium">{selectedCount}</span>
                          </div>
                        );
                      })}
                      <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                        <span>{t('Total Accounts', 'மொத்த கணக்குகள்')}:</span>
                        <span>{selectedAccounts.size}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || loading}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('Previous', 'முந்தைய')}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {t('Step', 'படி')} {currentStep} {t('of', 'இல்')} {steps.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {steps[currentStep - 1].description}
                </p>
              </div>

              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex items-center"
                >
                  {t('Next', 'அடுத்த')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={loading || selectedAccounts.size === 0}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('Setting up...', 'அமைக்கிறது...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('Complete Setup', 'அமைப்பை முடிக்கவும்')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}