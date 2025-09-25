import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/language';
import { ShieldIcon } from './icons';
import { translations } from '../lib/translations';

const LANGUAGES = [
  { code: 'english', label: 'English', nativeLabel: 'English' },
  { code: 'tamil', label: 'தமிழ்', nativeLabel: 'தமிழ்' }
] as const;

type HeaderProps = { children?: React.ReactNode };

export function Header({ children }: HeaderProps) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const t = translations[language as keyof typeof translations];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const currentIndex = LANGUAGES.findIndex(lang => lang.code === language);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    const newLang = LANGUAGES[nextIndex].code;
    setLanguage(newLang);
    localStorage.setItem('templeLanguage', LANGUAGES[nextIndex].nativeLabel);
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {children ? (
          <div className="py-4">{children}</div>
        ) : (
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-3 mr-4 sm:mr-6">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">🕉️</span>
              </div>
              <h1 className="text-2xl font-bold text-black">Temple Trust</h1>
            </Link>

            {!user ? (
              <div className="flex items-center gap-3">
                <Link to="/" className="text-black hover:text-orange-600 transition-colors">
                  {t.home}
                </Link>
                <Link to="/login" className="text-black hover:text-orange-600 transition-colors">
                  {t.login}
                </Link>
                <Link to="/register" className="text-black hover:text-orange-600 transition-colors">
                  {t.register}
                </Link>
                <button 
                  onClick={toggleLanguage}
                  className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm min-w-[60px]"
                >
                  {LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
               
              
                <button 
                  onClick={toggleLanguage}
                  className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm min-w-[60px]"
                >
                  {LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}
                </button>
                <div className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-sm text-orange-900 flex items-center gap-1">
                  <span className="font-semibold">{user.name}</span>
                  <span className="opacity-60">·</span>
                  <span className="capitalize opacity-80">{user.role}</span>
                  {isSuperAdmin && (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <ShieldIcon className="h-3 w-3" />
                      SUPERADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                >
                  {t.logout}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
