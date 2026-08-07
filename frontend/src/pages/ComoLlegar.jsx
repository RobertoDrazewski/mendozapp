import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

export default function ComoLlegar() {
  const { t, lang } = useLang();
  const [places, setPlaces] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getComercios(), api.getPois()])
      .then(([comercios, pois]) => {
        const merged = [
          ...comercios.map((c) => ({
            id: `comercio-${c.id}`,
            nombre: c.nombre,
            direccion: c.direccion,
            lat: c.lat,
            lng: c.lng,
            google_maps_link: c.google_maps_link,
            icon: '🍇',
          })),
          ...pois.map((p) => ({
            id: `poi-${p.id}`,
            nombre: p[`nombre_${lang}`] || p.nombre_es,
            direccion: p[`sub_${lang}`] || p.sub_es,
            lat: p.lat,
            lng: p.lng,
            google_maps_link: p.google_maps_link,
            icon: p.icono || '📍',
          })),
        ];
        setPlaces(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, [lang]);

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="px-4 pt-4 pb-2">
        <div className="font-display text-xl font-bold text-malbec-deep">{t.go_title}</div>
        <div className="text-xs text-ink-soft mt-1">Elegí un destino y te llevamos con Google Maps o Uber.</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2.5">
        {loading && <div className="text-center text-ink-soft text-sm mt-10">…</div>}

        {!loading && places.length === 0 && (
          <div className="text-center text-ink-soft text-sm mt-10 px-6">
            Todavía no hay lugares cargados. Deberían aparecer acá tanto los comercios adheridos como los
            monumentos, plazas y bodegas históricas públicas — si no ves nada, revisá que el backend esté
            corriendo y que /api/pois y /api/comercios respondan datos.
          </div>
        )}

        {places.map((p) => (
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
  );
}
