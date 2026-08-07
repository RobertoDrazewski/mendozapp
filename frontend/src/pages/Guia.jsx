import React, { useState } from 'react';
import Header from '../components/Header';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

const INTERESES = ['Vino', 'Historia', 'Trekking', 'Gastronomía', 'Familia', 'Relax'];

export default function Guia() {
  const { t, lang } = useLang();
  const [dias, setDias] = useState(2);
  const [intereses, setIntereses] = useState([]);
  const [itinerario, setItinerario] = useState(null);
  const [loading, setLoading] = useState(false);

  function toggleInteres(i) {
    setIntereses((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  async function generar() {
    setLoading(true);
    setItinerario(null);
    try {
      const agrupar = dias > 4
        ? ' Como es una estadía larga, agrupá los días por zona geográfica (ej: Ciudad + Godoy Cruz, después Maipú, después Luján de Cuyo / Valle de Uco, después alta montaña) para no cruzar la provincia de un lado a otro cada día.'
        : '';
      const mensaje = `Armá un itinerario de ${dias} día(s) en Mendoza (ciudad y provincia) para alguien interesado en: ${
        intereses.join(', ') || 'lo más representativo de la zona'
      }. Organizalo día por día, con horarios sugeridos.${agrupar} Priorizá los comercios/bodegas reales de Mendozapp cuando existan opciones cargadas, y completá con lugares públicos, miradores o zonas de trekking reales de la provincia cuando haga falta.`;
      const { respuesta } = await api.chat({ mensaje, idioma: lang });
      setItinerario(respuesta);
    } catch (err) {
      setItinerario('⚠️ ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <div className="font-display text-xl font-bold text-malbec-deep">{t.guide_title}</div>
        <div className="text-xs text-ink-soft mt-1 mb-5">{t.guide_sub}</div>

        <div className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">Días</div>
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 7, 10, 14].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`flex-shrink-0 w-10 h-10 rounded-full text-sm font-bold ${
                dias === d ? 'bg-malbec text-white' : 'bg-stone text-ink-soft'
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
            className="w-16 bg-stone rounded-lg px-2 py-1.5 text-sm text-center outline-none"
          />
        </div>
        <div className="text-xs text-ink-soft mb-5">
          Para estadías de {dias > 6 ? `${dias} días` : 'varios días'}, el itinerario va a agrupar zonas por cercanía
          (ej: unos días en Ciudad + Godoy Cruz, otros en Maipú, otros en Luján/Valle de Uco) para no cruzar la
          provincia de un lado a otro cada día.
        </div>

        <div className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">Intereses</div>
        <div className="flex flex-wrap gap-2 mb-6">
          {INTERESES.map((i) => (
            <button
              key={i}
              onClick={() => toggleInteres(i)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-full ${
                intereses.includes(i) ? 'bg-sun text-malbec-deep' : 'bg-stone text-ink-soft'
              }`}
            >
              {i}
            </button>
          ))}
        </div>

        <button
          onClick={generar}
          disabled={loading}
          className="w-full bg-malbec text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
        >
          {loading ? '…' : 'Generar itinerario'}
        </button>

        {itinerario && (
          <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm text-sm leading-relaxed whitespace-pre-line">
            {itinerario}
          </div>
        )}
      </div>
    </div>
  );
}
