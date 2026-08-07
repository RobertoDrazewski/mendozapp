import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import PlaceSheet from '../components/PlaceSheet';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

const CATEGORIAS = [
  { tipo: 'todos', icon: '🍇', label: { es: 'Todos', en: 'All', pt: 'Todos' } },
  { tipo: 'bodega', icon: '🍷', label: { es: 'Bodegas', en: 'Wineries', pt: 'Vinícolas' } },
  { tipo: 'restaurante', icon: '🍽️', label: { es: 'Restós', en: 'Restaurants', pt: 'Restaurantes' } },
  { tipo: 'hotel', icon: '🏨', label: { es: 'Hoteles', en: 'Hotels', pt: 'Hotéis' } },
  { tipo: 'turismo_aventura', icon: '🥾', label: { es: 'Aventura', en: 'Adventure', pt: 'Aventura' } },
  { tipo: 'comercio', icon: '🛍️', label: { es: 'Comercios', en: 'Shops', pt: 'Comércios' } },
];

export default function Places() {
  const { t, lang } = useLang();
  const [comercios, setComercios] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getComercios().then(setComercios).catch(() => {});
  }, []);

  const filtered = filtro === 'todos' ? comercios : comercios.filter((c) => c.tipo === filtro);

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="px-4 pt-4 pb-2">
        <div className="font-display text-xl font-bold text-malbec-deep">{t.places_title}</div>
      </div>

      {/* Grilla de categorías tipo app, sin scroll horizontal */}
      <div className="grid grid-cols-3 gap-2.5 px-4 pb-4">
        {CATEGORIAS.map((cat) => {
          const active = filtro === cat.tipo;
          return (
            <button
              key={cat.tipo}
              onClick={() => setFiltro(cat.tipo)}
              className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all ${
                active
                  ? 'bg-malbec text-white shadow-[0_0_16px_rgba(107,30,60,0.45)] scale-[1.03]'
                  : 'bg-white text-ink-soft shadow-sm'
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[11px] font-bold">{cat.label[lang]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center text-ink-soft text-sm mt-10">
            {comercios.length === 0 ? '—' : 'No hay lugares en esta categoría todavía.'}
          </div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected({ ...c, _kind: 'comercio' })}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-stone flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
              {c.foto_url ? <img src={c.foto_url} alt="" className="w-full h-full object-cover" /> : '🍇'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{c.nombre}</div>
              <div className="text-xs text-ink-soft truncate">{c.direccion}</div>
            </div>
            {c.destacado ? <span className="text-[10px] bg-sun text-malbec-deep font-bold px-2 py-1 rounded-full">★</span> : null}
          </button>
        ))}
      </div>
      <div className="bottomnav-space bg-stone" />

      <PlaceSheet place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
