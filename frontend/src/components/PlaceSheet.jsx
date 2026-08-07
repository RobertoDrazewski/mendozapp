import React, { useEffect, useState } from 'react';
import { useLang } from '../i18n/LangContext';

export default function PlaceSheet({ place, onClose }) {
  const { t, lang } = useLang();
  const [bars, setBars] = useState([]);

  useEffect(() => {
    if (place) {
      setBars(Array.from({ length: 40 }, () => 6 + Math.random() * 24));
    } else {
      window.speechSynthesis?.cancel();
    }
  }, [place]);

  if (!place) return null;

  const isComercio = place._kind === 'comercio';
  const nombre = isComercio ? place.nombre : place[`nombre_${lang}`];
  const sub = isComercio ? place.direccion : place[`sub_${lang}`];
  const historia = isComercio ? place[`descripcion_${lang}`] : place[`historia_${lang}`];

  function speak() {
    if (!window.speechSynthesis || !historia) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(historia.replace(/\n/g, ' '));
    utter.lang = lang === 'es' ? 'es-AR' : lang === 'en' ? 'en-US' : 'pt-BR';
    utter.rate = 0.98;
    window.speechSynthesis.speak(utter);
  }

  return (
    <div className={`fixed left-0 right-0 bottom-0 z-[1000] sheet ${place ? 'open' : ''}`}>
      <div className="max-w-[520px] mx-auto bg-paper rounded-t-[22px] shadow-2xl max-h-[78vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-4 w-7 h-7 rounded-full bg-stone-dark text-ink-soft text-sm flex items-center justify-center z-10"
        >
          ✕
        </button>
        <div className="w-9 h-1 bg-black/10 rounded-full mx-auto mt-2.5 mb-1" />

        <div className="overflow-y-auto px-5 pb-7 pt-1">
          {isComercio && place.foto_url && (
            <img src={place.foto_url} alt={nombre} className="w-full h-40 object-cover rounded-2xl mt-2 mb-1" />
          )}
          <div className="text-[11px] uppercase tracking-wide text-sun font-bold mt-1.5">
            {isComercio ? `${place.icon || '🍇'} ${place.tipo}` : `${ICONS_LABEL[place.tipo] || '📍'} ${place.tipo}`}
          </div>
          <div className="font-display text-2xl font-bold mt-1 mb-0.5 text-malbec-deep leading-tight">{nombre}</div>
          <div className="text-[13px] text-ink-soft mb-4">{sub}</div>

          {historia && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={speak}
                className="w-[52px] h-[52px] rounded-full bg-malbec text-white flex items-center justify-center flex-shrink-0 shadow-lg"
              >
                <svg viewBox="0 0 24 24" fill="#fff" className="w-5 h-5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <div className="flex-1 h-8 flex items-center gap-[3px]">
                {bars.map((h, i) => (
                  <i key={i} style={{ height: h, width: 3, background: '#E8A33D', opacity: 0.5, borderRadius: 2 }} />
                ))}
              </div>
            </div>
          )}

          {historia && (
            <div className="text-[15px] leading-relaxed">
              {historia.split('\n\n').map((p, i) => (
                <p key={i} className="mb-3">{p}</p>
              ))}
            </div>
          )}

          {isComercio && (
            <div className="flex flex-wrap gap-2 mt-4">
              {place.horario_texto && <span className="text-xs bg-stone text-ink-soft px-3 py-1.5 rounded-full font-semibold">{place.horario_texto}</span>}
              {place.telefono && <span className="text-xs bg-stone text-ink-soft px-3 py-1.5 rounded-full font-semibold">{place.telefono}</span>}
            </div>
          )}

          <div className="flex gap-2.5 mt-5">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-stone text-ink">
              {t.close}
            </button>
            {isComercio && (
              <a
                href={place.google_maps_link || `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-malbec text-white text-center"
              >
                {t.go_title}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ICONS_LABEL = { monumento: '🗿', plaza: '🌳', historia: '⛪', mirador: '⛰️', museo: '🏛️' };
