import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

const CATS = [
  { key: 'bodega', icon: '🍷', kind: 'comercio' },
  { key: 'restaurante', icon: '🍽️', kind: 'comercio' },
  { key: 'hotel', icon: '🏨', kind: 'comercio' },
  { key: 'turismo_aventura', icon: '🥾', kind: 'comercio' },
  { key: 'comercio', icon: '🛍️', kind: 'comercio' },
  { key: 'monumento', icon: '🗿', kind: 'poi' },
  { key: 'plaza', icon: '🌳', kind: 'poi' },
  { key: 'historia', icon: '⛪', kind: 'poi' },
  { key: 'mirador', icon: '⛰️', kind: 'poi' },
  { key: 'museo', icon: '🏛️', kind: 'poi' },
  { key: 'emergencia', icon: '🚨', kind: 'poi' },
];

export default function ComoLlegar() {
  const { t, lang } = useLang();
  const [comercios, setComercios] = useState([]);
  const [pois, setPois] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState(null); // null = mostrando grilla de categorías

  useEffect(() => {
    Promise.all([api.getComercios(), api.getPois()])
      .then(([c, p]) => {
        setComercios(c);
        setPois(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  function placesFor(cat) {
    if (cat.kind === 'comercio') {
      return comercios
        .filter((c) => c.tipo === cat.key)
        .map((c) => ({
          id: `comercio-${c.id}`,
          nombre: c.nombre,
          direccion: c.direccion,
          lat: c.lat,
          lng: c.lng,
          google_maps_link: c.google_maps_link,
          icon: cat.icon,
        }));
    }
    return pois
      .filter((p) => p.tipo === cat.key)
      .map((p) => ({
        id: `poi-${p.id}`,
        nombre: p[`nombre_${lang}`] || p.nombre_es,
        direccion: p[`sub_${lang}`] || p.sub_es,
        lat: p.lat,
        lng: p.lng,
        google_maps_link: p.google_maps_link,
        icon: p.icono || cat.icon,
      }));
  }

  const catsWithCount = CATS.map((c) => ({ ...c, count: placesFor(c).length })).filter((c) => c.count > 0);
  const totalPlaces = comercios.length + pois.length;

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="px-4 pt-4 pb-2">
        <div className="font-display text-xl font-bold text-malbec-deep">{t.go_title}</div>
        <div className="text-xs text-ink-soft mt-1">Elegí un destino y te llevamos con Google Maps o Uber.</div>
      </div>

      {loading && <div className="text-center text-ink-soft text-sm mt-10">…</div>}

      {!loading && totalPlaces === 0 && (
        <div className="text-center text-ink-soft text-sm mt-10 px-6">{t.go_empty}</div>
      )}

      {/* Vista 1: grilla de categorías */}
      {!loading && totalPlaces > 0 && !activeCat && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-3 gap-2.5">
            {catsWithCount.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCat(cat)}
                className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-white shadow-sm active:scale-[0.97] transition-transform relative"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-[11px] font-bold text-ink-soft text-center leading-tight">
                  {t[`cat_${cat.key}`]}
                </span>
                <span className="absolute top-2 right-2 text-[9px] bg-stone text-ink-soft font-bold px-1.5 py-0.5 rounded-full">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vista 2: lista de lugares de la categoría elegida */}
      {!loading && activeCat && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <button
            onClick={() => setActiveCat(null)}
            className="flex items-center gap-1.5 text-sm font-bold text-malbec mb-4"
          >
            ← {t.back_label}
          </button>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{activeCat.icon}</span>
            <span className="font-display text-lg font-bold text-malbec-deep">{t[`cat_${activeCat.key}`]}</span>
          </div>

          <div className="space-y-2.5">
            {placesFor(activeCat).length === 0 && (
              <div className="text-center text-ink-soft text-sm mt-6">{t.go_empty_category}</div>
            )}
            {placesFor(activeCat).map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-stone flex items-center justify-center text-base flex-shrink-0">
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{p.nombre}</div>
                    <div className="text-xs text-ink-soft truncate">{p.direccion}</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={
                      p.google_maps_link
                        ? p.google_maps_link
                        : userLoc
                        ? `https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${p.lat},${p.lng}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold bg-malbec text-white px-3 py-2 rounded-lg"
                  >
                    🗺️
                  </a>
                  <a
                    href={`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${p.lat}&dropoff[longitude]=${p.lng}&dropoff[nickname]=${encodeURIComponent(p.nombre)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold bg-stone text-ink px-3 py-2 rounded-lg"
                  >
                    🚕
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bottomnav-space bg-stone" />
    </div>
  );
}
