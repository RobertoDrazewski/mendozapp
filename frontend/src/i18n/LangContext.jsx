import React, { createContext, useContext, useState } from 'react';
import { dict } from './dict';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('mendozapp_lang') || 'es');

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem('mendozapp_lang', l);
  };

  const t = dict[lang];

  return (
    <LangContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
