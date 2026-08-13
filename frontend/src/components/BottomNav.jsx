import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';

const items = [
  { to: '/', icon: '🗺️', key: 'nav_map' },
  { to: '/guia', icon: '📖', key: 'nav_guide' },
  { to: '/asistente', icon: '💬', key: 'nav_chat' },
  { to: '/como-llegar', icon: '🧭', key: 'nav_go' },
  { to: '/lugares', icon: '🍇', key: 'nav_places' },
  { to: '/comercio/dashboard', icon: '🏪', key: 'nav_comercio' }, // Nueva pestaña
];

export default function BottomNav() {
  const { t } = useLang();
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-[1100] bg-gradient-to-b from-[#2B1018] to-[#1A0A0F] border-t border-white/5 shadow-[0_-6px_20px_rgba(0,0,0,0.35)]">
      <div className="max-w-[520px] mx-auto grid grid-cols-6">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-all ${
                isActive ? 'text-sun-soft' : 'text-white/40'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px w-8 h-0.5 rounded-full bg-sun-soft shadow-[0_0_8px_2px_rgba(242,197,114,0.7)]" />
                )}
                <span
                  className="text-xl leading-none transition-all"
                  style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(242,197,114,0.85))', transform: 'scale(1.12)' } : undefined}
                >
                  {item.icon}
                </span>
                <span className="truncate w-full text-center px-0.5">{t[item.key] || 'Socios'}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}