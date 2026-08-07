import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';

const items = [
  { to: '/', icon: '🗺️', key: 'nav_map' },
  { to: '/guia', icon: '📖', key: 'nav_guide' },
  { to: '/asistente', icon: '💬', key: 'nav_chat' },
  { to: '/como-llegar', icon: '🧭', key: 'nav_go' },
  { to: '/lugares', icon: '🍇', key: 'nav_places' },
];

export default function BottomNav() {
  const { t } = useLang();
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-[1100] bg-paper border-t border-black/10 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="max-w-[520px] mx-auto grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-malbec' : 'text-ink-soft'
              }`
            }
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{t[item.key]}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
