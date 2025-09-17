import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    if (user && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, navigate]);

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <Card className="p-8 space-y-6 shadow-lg rounded-xl">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-gray-900">{t[lang].title}</h1>
              <p className="mt-2 text-sm text-gray-600">{t[lang].subtitle}</p>
            </div>

            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
                <p>{error}</p>
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
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
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
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {isLoading ? t[lang].signingIn : t[lang].signIn}
              </Button>
            </form>

            <div className="text-sm text-center">
              <a href="/register" className="font-medium text-orange-600 hover:text-orange-700">
                {t[lang].noAccountRegister}
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

