import { createContext, useContext, useState } from 'react';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (english: string, tamil: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'english',
  setLanguage: () => {},
  t: (english: string, tamil: string) => english
});

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState('english');
  
  // Translation function
  const t = (english: string, tamil: string) => {
    return language === 'tamil' ? tamil : english;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
