import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import logo from '../assets/logo.png';

const LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
];

export default function Header() {
  const { lang, setLang, t } = useLang();
  const isLoggedIn = !!localStorage.getItem('mendozapp_admin_token');

  return (
    <header className="safe-top relative z-[1200] bg-gradient-to-b from-malbec to-malbec-deep text-stone px-4 pt-3 pb-3 flex items-center justify-between shadow-lg">
      <div className="flex flex-col leading-none">
        <img src={logo} alt="Mendozapp" className="h-16 w-auto object-contain object-left" />
        <div className="text-[10px] tracking-[2px] uppercase opacity-65 mt-1">{t.tagline}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-white/10 p-1 rounded-full">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`text-[13px] font-semibold px-2.5 py-1.5 rounded-full transition-colors ${
                lang === l.code ? 'bg-sun text-malbec-deep' : 'text-white/55'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Ícono chiquito de acceso admin - discreto, no es un botón grande */}
        <Link
          to={isLoggedIn ? '/admin' : '/admin/login'}
          title={t.admin_login}
          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[13px] opacity-70 hover:opacity-100 transition-opacity"
        >
          🔑
        </Link>
      </div>
    </header>
  );
}
