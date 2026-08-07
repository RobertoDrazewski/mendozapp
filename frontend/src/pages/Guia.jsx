import React, { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

const INTERESES = [
  { key: 'Vino', icon: '🍷' },
  { key: 'Historia', icon: '🏛️' },
  { key: 'Trekking', icon: '🥾' },
  { key: 'Gastronomía', icon: '🍽️' },
  { key: 'Familia', icon: '👨‍👩‍👧' },
  { key: 'Relax', icon: '🧘' },
];

export default function Guia() {
  const { t, lang } = useLang();
  const [dias, setDias] = useState(2);
  const [intereses, setIntereses] = useState([]);
  const [itinerario, setItinerario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  function toggleInteres(i) {
    setIntereses((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  function startFakeProgress() {
    setProgress(4);
    progressTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p; // se queda esperando cerca del final hasta que la IA responda de verdad
        const step = p < 40 ? 6 : p < 70 ? 3 : 1;
        return Math.min(90, p + step);
      });
    }, 220);
  }

  function stopFakeProgress(success) {
    clearInterval(progressTimer.current);
    if (success) {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    } else {
      setProgress(0);
    }
  }

  useEffect(() => () => clearInterval(progressTimer.current), []);

  async function generar() {
    setLoading(true);
    setItinerario(null);
    startFakeProgress();
    try {
      const agrupar = dias > 4
        ? ' Como es una estadía larga, agrupá los días por zona geográfica (ej: Ciudad + Godoy Cruz, después Maipú, después Luján de Cuyo / Valle de Uco, después alta montaña) para no cruzar la provincia de un lado a otro cada día.'
        : '';
      const mensaje = `Armá un itinerario de ${dias} día(s) en Mendoza (ciudad y provincia) para alguien interesado en: ${
        intereses.join(', ') || 'lo más representativo de la zona'
      }. Organizalo día por día, con horarios sugeridos.${agrupar} Priorizá los comercios/bodegas reales de Mendozapp cuando existan opciones cargadas, y completá con lugares públicos, miradores o zonas de trekking reales de la provincia cuando haga falta.`;
      const { respuesta } = await api.chat({ mensaje, idioma: lang });
      setItinerario(respuesta);
      stopFakeProgress(true);
    } catch (err) {
      setItinerario('⚠️ ' + err.message);
      stopFakeProgress(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <div className="font-display text-xl font-bold text-malbec-deep">{t.guide_title}</div>
        <div className="text-xs text-ink-soft mt-1 mb-5">{t.guide_sub}</div>

        <div className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">Días</div>
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 7, 10, 14].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`flex-shrink-0 w-10 h-10 rounded-full text-sm font-bold transition-all ${
                dias === d ? 'bg-malbec text-white shadow-[0_0_14px_rgba(107,30,60,0.4)]' : 'bg-white text-ink-soft shadow-sm'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs text-ink-soft">¿Más días? Escribí la cantidad exacta:</span>
          <input
            type="number"
            min={1}
            max={60}
            value={dias}
            onChange={(e) => setDias(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            className="w-16 bg-white rounded-lg px-2 py-1.5 text-sm text-center outline-none shadow-sm"
          />
        </div>
        {dias > 6 && (
          <div className="text-xs text-ink-soft mb-5 bg-white rounded-xl p-3 shadow-sm">
            Para estadías de {dias} días, el itinerario va a agrupar zonas por cercanía (ej: unos días en Ciudad +
            Godoy Cruz, otros en Maipú, otros en Luján/Valle de Uco) para no cruzar la provincia de un lado a otro
            cada día.
          </div>
        )}

        {/* Intereses en grilla de íconos, mismo estilo que las categorías de Lugares */}
        <div className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">Intereses</div>
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {INTERESES.map((int) => {
            const active = intereses.includes(int.key);
            return (
              <button
                key={int.key}
                onClick={() => toggleInteres(int.key)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all ${
                  active
                    ? 'bg-sun text-malbec-deep shadow-[0_0_16px_rgba(232,163,61,0.5)] scale-[1.03]'
                    : 'bg-white text-ink-soft shadow-sm'
                }`}
              >
                <span className="text-xl">{int.icon}</span>
                <span className="text-[11px] font-bold">{int.key}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={generar}
          disabled={loading}
          className="w-full bg-malbec text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-90 relative overflow-hidden"
        >
          {loading && (
            <span
              className="absolute inset-y-0 left-0 bg-white/25 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          )}
          <span className="relative">{loading ? `Generando... ${progress}%` : 'Generar itinerario'}</span>
        </button>

        {itinerario && (
          <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm text-sm leading-relaxed whitespace-pre-line">
            {itinerario}
          </div>
        )}
      </div>
      <div className="bottomnav-space bg-stone" />
    </div>
  );
}
