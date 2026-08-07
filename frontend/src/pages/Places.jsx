import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import PlaceSheet from '../components/PlaceSheet';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

const TIPOS = ['todos', 'bodega', 'restaurante', 'comercio', 'hotel', 'turismo_aventura'];

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
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {TIPOS.map((tp) => (
          <button
            key={tp}
            onClick={() => setFiltro(tp)}
            className={`whitespace-nowrap text-xs font-semibold px-3.5 py-2 rounded-full flex-shrink-0 ${
              filtro === tp ? 'bg-malbec text-white' : 'bg-stone text-ink-soft'
            }`}
          >
            {tp}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {filtered.length === 0 && <div className="text-center text-ink-soft text-sm mt-10">—</div>}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected({ ...c, _kind: 'comercio' })}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3"
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

      <PlaceSheet place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
