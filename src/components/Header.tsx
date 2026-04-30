import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
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
              <div className="flex items-center gap-1 pr-4">
                <div className="flex items-center bg-gray-50 rounded-lg p-1">
                  <Link 
                    to="/" 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                      location.pathname === '/' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-gray-700 hover:text-orange-600 hover:bg-white'
                    }`}
                  >
                    {t.home}
                  </Link>
                  <Link 
                    to="/login" 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                      location.pathname === '/login' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-gray-700 hover:text-orange-600 hover:bg-white'
                    }`}
                  >
                    {t.login}
                  </Link>
                  <Link 
                    to="/register" 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                      location.pathname === '/register' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-gray-700 hover:text-orange-600 hover:bg-white'
                    }`}
                  >
                    {t.register}
                  </Link>
                </div>
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                <button 
                  onClick={toggleLanguage}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md min-w-[60px]"
                >
                  {LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 pr-4">
                <button 
                  onClick={toggleLanguage}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md min-w-[60px]"
                >
                  {LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium transition-all duration-200 ease-in-out"
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
