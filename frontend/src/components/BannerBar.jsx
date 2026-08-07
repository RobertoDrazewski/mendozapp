import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n/LangContext';

export default function BannerBar() {
  const { lang } = useLang();
  const [banners, setBanners] = useState([]);
  const [closed, setClosed] = useState(() => {
    const stored = sessionStorage.getItem('mendozapp_closed_banners');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    api.getBanners().then(setBanners).catch(() => {});
  }, []);

  const closeBanner = (id) => {
    const updated = [...closed, id];
    setClosed(updated);
    sessionStorage.setItem('mendozapp_closed_banners', JSON.stringify(updated));
  };

  const visible = banners.filter((b) => !closed.includes(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="relative z-[900]">
      {visible.map((b) => (
        <div
          key={b.id}
          style={{ backgroundColor: b.color_fondo || '#6B1E3C' }}
          className="flex items-center justify-between px-4 py-2 text-white text-[12.5px] font-medium"
        >
          <a href={b.link || '#'} className="flex-1 pr-2 truncate">
            {b[`texto_${lang}`] || b.texto_es}
          </a>
          <button onClick={() => closeBanner(b.id)} className="opacity-70 hover:opacity-100 px-2">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
