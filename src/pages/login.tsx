import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Header } from '../components/Header';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../lib/language';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error: authError, user, token } = useAuth();
  const { language } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';

  const t = {
    tamil: {
      title: 'உங்கள் கணக்கில் உள்நுழைக',
      subtitle: 'மீண்டும் வரவேற்பு!',
      usernameOrMobile: 'பயனர் பெயர் அல்லது மொபைல் எண்',
      password: 'கடவுச்சொல்',
      signIn: 'உள்நுழை',
      signingIn: 'உள்நுழைகிறது...',
      errorRequired: 'பயனர் பெயர்/மொபைல் மற்றும் கடவுச்சொல் தேவை.',
      noAccountRegister: 'கணக்கு இல்லையா? பதிவு செய்யவும்',
    },
    english: {
      title: 'Sign in to your account',
      subtitle: 'Welcome back!',
      usernameOrMobile: 'Username or Mobile Number',
      password: 'Password',
      signIn: 'Sign In',
      signingIn: 'Signing In...',
      errorRequired: 'Username/mobile and password are required.',
      noAccountRegister: "Don't have an account? Register",
    },
  } as const;

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  useEffect(() => {
    const fromRegister = Boolean((location.state as any)?.fromRegister);
    if (user && token && !fromRegister) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, navigate, location.state]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError(t[lang].errorRequired);
      return;
    }

    try {
      await login(identifier, password);
    } catch (err) {
      // Error is handled by the authError effect
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <Card className="p-8 space-y-6 shadow-2xl rounded-2xl border-0 bg-white/95 backdrop-blur-sm">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {t[lang].title}
              </h1>
              <p className="mt-3 text-lg text-gray-600 font-medium">{t[lang].subtitle}</p>
            </div>

            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label htmlFor="identifier" className="sr-only">
                  {t[lang].usernameOrMobile}
                </label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder={t[lang].usernameOrMobile}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:z-10 sm:text-sm transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  {t[lang].password}
                </label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t[lang].password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="appearance-none rounded-xl relative block w-full px-4 py-3 pr-12 border border-gray-200 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:z-10 sm:text-sm transition-all duration-200 bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm leading-5 z-20 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-600 hover:text-orange-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-600 hover:text-orange-600 transition-colors" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                {isLoading ? t[lang].signingIn : t[lang].signIn}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                {t[lang].noAccountRegister.split('?')[0]}?
                <a href="/register" className="ml-1 font-semibold text-transparent bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text hover:from-orange-700 hover:to-amber-700 transition-all duration-200">
                  {t[lang].noAccountRegister.split('?')[1] || t[lang].noAccountRegister}
                </a>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
