import { createContext, useContext, useState, ReactNode } from "react";
import { translations, Lang } from "./i18n";

interface LanguageContextType {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "english",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(
    (localStorage.getItem("app_language") as Lang) || "english"
  );

  const setLanguage = (lang: Lang) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
    // Update document language for accessibility
    const langMap: Record<Lang, string> = {
      english: "en", spanish: "es", french: "fr", german: "de", hindi: "hi",
    };
    document.documentElement.lang = langMap[lang] || "en";
  };

  const t = (key: string): string =>
    translations[language]?.[key] ?? translations.english[key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
