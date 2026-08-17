import React, { useEffect, useState } from 'react';
import { useLang } from '../i18n/LangContext';

export default function PlaceSheet({ place, onClose }) {
  const { t, lang } = useLang();
  const [bars, setBars] = useState([]);
  const [hablando, setHablando] = useState(false);

  useEffect(() => {
    if (place) {
      setBars(Array.from({ length: 40 }, () => 6 + Math.random() * 24));
    } else {
      window.speechSynthesis?.cancel();
      setHablando(false);
    }
  }, [place]);

  // Si el componente se desmonta mientras narra, cortamos el audio
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!place) return null;

  const isComercio = place._kind === 'comercio';

  /**
   * Toma el texto en el idioma activo y, si está vacío, cae al español.
   *
   * Sin este respaldo, un turista con la app en inglés veía "este comercio no
   * cargó su descripción" aunque el texto en español existiera — solo porque la
   * traducción todavía no se había generado. Mostrar el contenido en otro idioma
   * es mucho mejor que no mostrar nada.
   */
  const conFallback = (prefijo) =>
    place[`${prefijo}_${lang}`]?.trim() || place[`${prefijo}_es`]?.trim() || '';

  const nombre = isComercio ? place.nombre : conFallback('nombre');
  const sub = isComercio ? place.direccion : conFallback('sub');
  const historia = isComercio ? conFallback('descripcion') : conFallback('historia');

  // Si estamos mostrando el español porque falta la traducción, lo avisamos
  const enOtroIdioma = lang !== 'es' && historia && !place[`${isComercio ? 'descripcion' : 'historia'}_${lang}`]?.trim();

  function speak() {
    if (!window.speechSynthesis || !historia) return;
    if (hablando) {
      window.speechSynthesis.cancel();
      setHablando(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(historia.replace(/\n/g, ' '));
    // Si el texto que estamos leyendo quedó en español por falta de traducción,
    // usamos voz española: leerlo con voz inglesa suena incomprensible.
    const idiomaTexto = enOtroIdioma ? 'es' : lang;
    utter.lang = idiomaTexto === 'es' ? 'es-AR' : idiomaTexto === 'en' ? 'en-US' : 'pt-BR';
    utter.rate = 0.98;
    utter.onend = () => setHablando(false);
    utter.onerror = () => setHablando(false);
    window.speechSynthesis.speak(utter);
    setHablando(true);
  }

  const mapsHref =
    place.google_maps_link || `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  return (
    /**
     * z-[1200]: el bottom nav vive en z-[1100]. Con el z-[1000] anterior, la barra
     * de navegación se dibujaba ENCIMA del sheet y tapaba los botones de acción.
     */
    <div className={`fixed left-0 right-0 bottom-0 z-[1200] sheet ${place ? 'open' : ''}`}>
      <div className="max-w-[520px] mx-auto bg-paper rounded-t-[22px] shadow-2xl max-h-[82vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-4 w-8 h-8 rounded-full bg-stone-dark text-ink-soft text-sm flex items-center justify-center z-10"
          aria-label={t.close}
        >
          ✕
        </button>
        <div className="w-9 h-1 bg-black/10 rounded-full mx-auto mt-2.5 mb-1 flex-shrink-0" />

        {/* Contenido con scroll propio */}
        <div className="overflow-y-auto px-5 pt-1 pb-4 flex-1 min-h-0">
          {isComercio && place.foto_url && (
            <img
              src={place.foto_url}
              alt={nombre}
              className="w-full h-40 object-cover rounded-2xl mt-2 mb-1"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="text-[11px] uppercase tracking-wide text-sun font-bold mt-1.5">
            {isComercio ? `${place.icon || '🍇'} ${place.tipo}` : `${ICONS_LABEL[place.tipo] || '📍'} ${place.tipo}`}
          </div>
          <div className="font-display text-2xl font-bold mt-1 mb-0.5 text-malbec-deep leading-tight pr-8">
            {nombre}
          </div>
          <div className="text-[13px] text-ink-soft mb-4">{sub}</div>

          {historia && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={speak}
                className="w-[52px] h-[52px] rounded-full bg-malbec text-white flex items-center justify-center flex-shrink-0 shadow-lg"
                aria-label={hablando ? 'Detener' : t.listen}
              >
                {hablando ? (
                  <svg viewBox="0 0 24 24" fill="#fff" className="w-5 h-5">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="#fff" className="w-5 h-5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div className="flex-1 h-8 flex items-center gap-[3px]">
                {bars.map((h, i) => (
                  <i
                    key={i}
                    style={{
                      height: h,
                      width: 3,
                      background: '#E8A33D',
                      opacity: hablando ? 0.9 : 0.5,
                      borderRadius: 2,
                      transition: 'opacity .3s',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {historia && (
            <div className="text-[15px] leading-relaxed">
              {historia.split('\n\n').map((p, i) => (
                <p key={i} className="mb-3">{p}</p>
              ))}
              {enOtroIdioma && (
                <div className="text-[11px] text-ink-soft italic mb-2">
                  Traducción no disponible — mostrando el texto original en español.
                </div>
              )}
            </div>
          )}

          {/* Comercio sin descripción cargada: evitamos que la ficha se vea vacía */}
          {isComercio && !historia && (
            <div className="text-sm text-ink-soft bg-stone rounded-xl p-3 mb-2">
              Este comercio todavía no cargó su descripción.
            </div>
          )}

          {isComercio && (
            <div className="flex flex-wrap gap-2 mt-4">
              {place.horario_texto && (
                <span className="text-xs bg-stone text-ink-soft px-3 py-1.5 rounded-full font-semibold">
                  🕐 {place.horario_texto}
                </span>
              )}
              {place.telefono && (
                <a
                  href={`tel:${place.telefono}`}
                  className="text-xs bg-stone text-ink-soft px-3 py-1.5 rounded-full font-semibold"
                >
                  📞 {place.telefono}
                </a>
              )}
              {place.whatsapp && (
                <a
                  href={`https://wa.me/${place.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-green-50 text-green-800 px-3 py-1.5 rounded-full font-semibold"
                >
                  WhatsApp
                </a>
              )}
              {place.instagram && (
                <a
                  href={`https://instagram.com/${place.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-stone text-ink-soft px-3 py-1.5 rounded-full font-semibold"
                >
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>

        {/* Botones SIEMPRE visibles, fuera del área con scroll, con espacio
            reservado para que el bottom nav no los tape. */}
        <div className="flex-shrink-0 px-5 pt-3 border-t border-black/5 bg-paper rounded-b-none">
          <div className="flex gap-2.5">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-stone text-ink">
              {t.close}
            </button>
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-malbec text-white text-center"
            >
              {t.go_title}
            </a>
          </div>
          <div className="bottomnav-space" />
        </div>
      </div>
    </div>
  );
}

const ICONS_LABEL = {
  monumento: '🗿', plaza: '🌳', historia: '⛪', mirador: '⛰️',
  museo: '🏛️', iglesia: '⛪', emergencia: '🚨', transporte: '🚊',
};
