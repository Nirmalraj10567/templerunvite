import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, type CompanyInfo } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Eye, EyeOff, Building2, Phone, ChevronDown, Lock, LogIn, Building, Shield, Cloud
} from 'lucide-react';
import { useLanguage } from '../lib/language';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, lookupCompaniesByMobile, isLoading, error: authError, user, token } = useAuth();
  const { language, setLanguage } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';

  const [mobile, setMobile] = useState('');
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyInfo | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const t = {
    tamil: {
      welcomeBack: 'மீண்டும் வரவேற்கிறோம்',
      signInSubtitle: 'உங்கள் கணக்கில் உள்நுழைக',
      mobileLabel: 'மொபைல் எண்',
      mobilePlaceholder: 'உங்கள் மொபைல் எண்ணை உள்ளிடவும்',
      companyLabel: 'நிறுவனம்',
      companyPlaceholder: 'முதலில் 10 இலக்க மொபைலை உள்ளிடவும்',
      usernameLabel: 'பயனர்பெயர்',
      usernamePlaceholder: 'உங்கள் பயனர்பெயரை உள்ளிடவும்',
      passwordLabel: 'கடவுச்சொல்',
      passwordPlaceholder: 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்',
      signIn: 'உள்நுழை',
      signingIn: 'உள்நுழைகிறது...',
      noAccount: 'கணக்கு இல்லையா?',
      createCompany: 'நிறுவனத்தை உருவாக்கு',
      invalidMobile: 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
      requiredFields: 'அனைத்து புலங்களும் தேவை',
      noAccountFound: 'இந்த மொபைல் எண்ணுடன் கணக்கு எதுவும் இல்லை',
      searching: 'தேடுகிறது...',
      leftSubtitle: 'உங்கள் வணிக நடவடிக்கைகளை எளிதாக்குங்கள்',
      leftBadge: 'நிறுவன வள திட்டமிடல்',
      featureMultiCompany: 'பல நிறுவன ஆதரவு',
      featureSecure: 'பாதுகாப்பான அங்கீகாரம்',
      featureCloud: 'கிளவுட் அடிப்படை',
    },
    english: {
      welcomeBack: 'Welcome Back',
      signInSubtitle: 'Sign in to your account',
      mobileLabel: 'Mobile Number',
      mobilePlaceholder: 'Enter your mobile number',
      companyLabel: 'Company',
      companyPlaceholder: 'Enter 10-digit mobile first',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter your username',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In',
      signingIn: 'Signing In...',
      noAccount: "Don't have an account?",
      createCompany: 'Create Company',
      invalidMobile: 'Please enter a valid 10-digit mobile number',
      requiredFields: 'All fields are required',
      noAccountFound: 'No account found with this mobile number',
      searching: 'Searching...',
      leftSubtitle: 'Manage with focus. Let us handle the administration while you grow your business.',
      leftBadge: 'ENTERPRISE RESOURCE PLANNING',
      featureMultiCompany: 'Multi-Company Support',
      featureSecure: 'Secure Authentication',
      featureCloud: 'Cloud Based',
    },
  } as const;

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  useEffect(() => {
    if (location.state && (location.state as any).message) {
      setSuccessMessage((location.state as any).message);
      // Clear the message state so it doesn't show again on reload/refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (user && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, navigate]);

  const handleMobileChange = async (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 10);
    setMobile(clean);
    setCompaniesLoaded(false);
    setCompanies([]);
    setSelectedCompany(null);
    setError('');

    if (clean.length === 10) {
      setSearching(true);
      try {
        const results = await lookupCompaniesByMobile(clean);
        setCompanies(results);
        setCompaniesLoaded(true);
        if (results.length === 0) {
          setError(t[lang].noAccountFound);
        } else if (results.length === 1) {
          setSelectedCompany(results[0]);
        }
      } catch {
        setError('Failed to lookup. Please try again.');
      } finally {
        setSearching(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!mobile || !selectedCompany || !username || !password) {
      setError(t[lang].requiredFields);
      return;
    }
    if (mobile.length !== 10) {
      setError(t[lang].invalidMobile);
      return;
    }
    try {
      await login(username, password, selectedCompany.templeId);
      localStorage.setItem(`lastSelectedCompany_${mobile}`, String(selectedCompany.templeId));
    } catch {
      // Error handled by authError
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative overflow-hidden bg-gradient-to-br from-[#f4845f] via-[#e85d04] to-[#dc2f02]">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M40 0c22.09 0 40 17.91 40 40s-17.91 40-40 40S0 62.09 0 40 17.91 0 40 0zm0 6a34 34 0 110 68 34 34 0 010-68zm0 6a28 28 0 100 56 28 28 0 000-56zm0 6a22 22 0 110 44 22 22 0 010-44zm0 6a16 16 0 100 32 16 16 0 000-32z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }} />
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 xl:px-20 text-center">
          {/* Logo */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl">
            <Building className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-5 tracking-tight">
            TMS
          </h1>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-px bg-white/40" />
            <div className="w-1.5 h-1.5 rotate-45 bg-white/60" />
            <div className="w-10 h-px bg-white/40" />
          </div>

          {/* Tagline */}
          <p className="text-base text-white/80 leading-relaxed max-w-sm mb-8">
            {t[lang].leftSubtitle}
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {[
              { icon: Building2, text: t[lang].featureMultiCompany },
              { icon: Shield, text: t[lang].featureSecure },
              { icon: Cloud, text: t[lang].featureCloud },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <feature.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Badge */}
          <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
            {t[lang].leftBadge}
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col px-6 py-6 lg:px-16 bg-gradient-to-b from-[#fef7f0] via-white to-[#fef7f0]">
        {/* Language Toggle - Top Right */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLanguage(language === 'english' ? 'tamil' : 'english')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 text-[#e85d04]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            {language === 'english' ? 'தமிழ்' : 'English'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {t[lang].welcomeBack}
              </h1>
              <p className="text-gray-500 text-sm">
                {t[lang].signInSubtitle}
              </p>
            </div>

            {successMessage && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-900 mb-0.5">
                    {language === 'english' ? 'Registration Successful' : 'வெற்றிகரமாக பதிவு செய்யப்பட்டது'}
                  </p>
                  <p className="text-xs text-emerald-700/90 leading-normal">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] border border-gray-100 p-6">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t[lang].mobileLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Phone className="w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder={t[lang].mobilePlaceholder}
                      value={mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-lg border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t[lang].companyLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <select
                      value={selectedCompany?.templeId || ''}
                      onChange={(e) => {
                        const company = companies.find(c => c.templeId === Number(e.target.value));
                        setSelectedCompany(company || null);
                      }}
                      disabled={!companiesLoaded || companies.length === 0}
                      className="w-full h-10 pl-9 pr-8 rounded-lg border-gray-200 text-gray-900 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] transition-all appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">{searching ? t[lang].searching : t[lang].companyPlaceholder}</option>
                      {companies.map((company) => (
                        <option key={company.templeId} value={company.templeId}>
                          {company.templeName}{company.branch ? ` - ${company.branch}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t[lang].usernameLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      placeholder={t[lang].usernamePlaceholder}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-lg border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {t[lang].passwordLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t[lang].passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-9 rounded-lg border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center z-20"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-[#e85d04] transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-[#e85d04] transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading || searching || !mobile || !selectedCompany || !username || !password}
                  className="w-full h-10 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#f4845f] to-[#e85d04] hover:from-[#e85d04] hover:to-[#dc2f02] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-1"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t[lang].signingIn}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      {t[lang].signIn}
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                {t[lang].noAccount}{' '}
                <Link to="/register" className="font-semibold text-[#e85d04] hover:text-[#dc2f02] transition-colors">
                  {t[lang].createCompany}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
