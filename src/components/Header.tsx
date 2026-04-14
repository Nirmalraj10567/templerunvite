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
            {/* Empty left side - no logo or temple name */}
            <div className="ml-2"></div>

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
