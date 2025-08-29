// /Volumes/KANINFOTECH/vitejswithandroid/aaascvite/src/lib/language.ts
import React, { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';

type Language = 'tamil' | 'english';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentLanguageName: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('tamil');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('templeLanguage');
    if (savedLanguage === 'தமிழ்') setLanguage('tamil');
    else if (savedLanguage === 'English') setLanguage('english');
  }, []);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem(
      'templeLanguage', 
      newLanguage === 'tamil' ? 'தமிழ்' : 'English'
    );
  };

  const contextValue = {
    language,
    setLanguage: handleLanguageChange,
    currentLanguageName: language === 'tamil' ? 'தமிழ்' : 'English'
  };

  // Use createElement to avoid JSX in a .ts file
  return createElement(LanguageContext.Provider, { value: contextValue }, children);
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}