import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/language';
import { ShieldIcon } from './icons';
import { translations } from '../lib/translations';

const LANGUAGES = [
  { code: 'english', label: 'English', nativeLabel: 'English' },
  { code: 'tamil', label: 'தமிழ்', nativeLabel: 'தமிழ்' }
] as const;

type HeaderProps = { children?: React.ReactNode; pageTitle?: string };

export function Header({ children, pageTitle }: HeaderProps) {
  const { user, logout, isSuperAdmin, temple } = useAuth();
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
      <div className="w-full">
        {children ? (
          <div>{children}</div>
        ) : (
          <div className="flex justify-between items-center py-2">
            {/* Page Title in center when provided */}
            {pageTitle && (
              <div className="ml-2">
                <h2 className="text-lg font-semibold text-gray-700">{pageTitle}</h2>
              </div>
            )}
            
            {/* Logo and temple name when no page title */}
            {!pageTitle && (
              <Link to="/" className="flex items-center space-x-2 ml-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">🕉️</span>
                </div>
                <h1 className="text-xl font-bold text-black">
                  {temple?.name || 'Temple Trust'}
                </h1>
              </Link>
            )}


            {!user ? (
              <div className="flex items-center gap-2 pr-2">
                <Link to="/" className="text-black hover:text-orange-600 transition-colors text-sm">
                  {t.home}
                </Link>
                <Link to="/login" className="text-black hover:text-orange-600 transition-colors text-sm">
                  {t.login}
                </Link>
                <Link to="/register" className="text-black hover:text-orange-600 transition-colors text-sm">
                  {t.register}
                </Link>
                <button 
                  onClick={toggleLanguage}
                  className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-xs min-w-[50px]"
                >
                  {LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pr-2">
                <button 
                  onClick={toggleLanguage}
                  className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-xs min-w-[50px]"
                >
                  {LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}
                </button>
                <div className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-center gap-1">
                  <span className="font-medium">{user.name}</span>
                  <span className="opacity-60">·</span>
                  <span className="capitalize opacity-80">{user.role}</span>
                  {isSuperAdmin && (
                    <span className="flex items-center gap-1 text-2xs text-amber-500">
                      <ShieldIcon className="h-2.5 w-2.5" />
                      SUPERADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 rounded-md bg-orange-500 text-white hover:bg-orange-600 text-sm"
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
