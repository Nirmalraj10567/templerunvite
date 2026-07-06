import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/language';
import { Building } from 'lucide-react';
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

  const navItems = [
    { path: '/', label: t.home },
    { path: '/login', label: t.login },
    { path: '/register', label: t.register },
  ];

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="w-full">
        {children ? (
          <div>{children}</div>
        ) : (
          <div className="flex justify-between items-center py-3 px-4 sm:px-6">
            {/* Brand / Logo */}
            <Link to="/" className="flex items-center gap-2 ml-1 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm group-hover:shadow-orange-200 transition-shadow">
                <Building className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-extrabold text-gray-800 hidden sm:block">Kanin ERP</span>
            </Link>

            {!user ? (
              <div className="flex items-center gap-1">
                {/* Navigation links */}
                <nav className="flex items-center gap-0.5">
                  {navItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                        location.pathname === item.path
                          ? 'text-orange-600'
                          : 'text-gray-600 hover:text-orange-600'
                      }`}
                    >
                      {item.label}
                      {location.pathname === item.path && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-orange-500 rounded-full" />
                      )}
                    </Link>
                  ))}
                </nav>

                <div className="h-5 w-px bg-gray-200 mx-2" />

                {/* Language toggle - outline style */}
                <button
                  onClick={toggleLanguage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="text-base">🌐</span>
                  <span>{LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLanguage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="text-base">🌐</span>
                  <span>{LANGUAGES.find(lang => lang.code !== language)?.nativeLabel}</span>
                </button>
                <span className="h-5 w-px bg-gray-200" />
                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium transition-all duration-200"
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
