import React, { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

const INTERESES = [
  { key: 'vino', icon: '🍷', label: { es: 'Vino', en: 'Wine', pt: 'Vinho' } },
  { key: 'historia', icon: '🏛️', label: { es: 'Historia', en: 'History', pt: 'História' } },
  { key: 'trekking', icon: '🥾', label: { es: 'Trekking', en: 'Trekking', pt: 'Trekking' } },
  { key: 'gastronomia', icon: '🍽️', label: { es: 'Gastronomía', en: 'Food', pt: 'Gastronomia' } },
  { key: 'familia', icon: '👨‍👩‍👧', label: { es: 'Familia', en: 'Family', pt: 'Família' } },
  { key: 'relax', icon: '🧘', label: { es: 'Relax', en: 'Relax', pt: 'Relax' } },
  { key: 'clubes', icon: '🚣', label: { es: 'Clubes y remo', en: 'Rowing clubs', pt: 'Clubes e remo' } },
  { key: '4x4', icon: '🚙', label: { es: '4x4', en: '4x4', pt: '4x4' } },
  { key: 'mtb', icon: '🚵', label: { es: 'Mountain bike', en: 'Mountain biking', pt: 'Mountain bike' } },
  { key: 'moto', icon: '🏍️', label: { es: 'Motocross / Enduro', en: 'Motocross / Enduro', pt: 'Motocross / Enduro' } },
  { key: 'ciclismo', icon: '🚴', label: { es: 'Ciclismo', en: 'Cycling', pt: 'Ciclismo' } },
  { key: 'acuaticos', icon: '🏄', label: { es: 'Deportes acuáticos', en: 'Water sports', pt: 'Esportes aquáticos' } },
  { key: 'espectaculos', icon: '🎭', label: { es: 'Espectáculos', en: 'Shows & events', pt: 'Espetáculos' } },
];

function labelFor(key, lang) {
  const found = INTERESES.find((i) => i.key === key);
  return found ? found.label[lang] : key;
}

// Refuerzo explícito de idioma: los modelos a veces "arrastran" el idioma del
// mensaje del usuario aunque el system prompt pida otro. Reforzamos acá con
// una instrucción final bien directa en el idioma de destino.
const LANG_ENFORCE = {
  es: 'Respondé todo el itinerario en español.',
  en: 'IMPORTANT: Write the entire itinerary in English only. Do not use any Spanish.',
  pt: 'IMPORTANTE: Escreva o roteiro inteiro em português. Não use espanhol.',
};

const STORAGE_KEY = 'mendozapp_itinerarios';

function loadHistorial() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveHistorial(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function Guia() {
  const { t, lang } = useLang();
  const [dias, setDias] = useState(2);
  const [intereses, setIntereses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [historial, setHistorial] = useState(loadHistorial);
  const progressTimer = useRef(null);

  function toggleInteres(key) {
    setIntereses((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  function startFakeProgress() {
    setProgress(4);
    progressTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
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
    startFakeProgress();
    try {
      const interesesTexto = intereses.map((k) => labelFor(k, lang)).join(', ');
      const agrupar = dias > 4
        ? ' Como es una estadía larga, agrupá los días por zona geográfica (ej: Ciudad + Godoy Cruz, después Maipú, después Luján de Cuyo / Valle de Uco, después alta montaña) para no cruzar la provincia de un lado a otro cada día.'
        : '';
      const mensaje = `Armá un itinerario de ${dias} día(s) en Mendoza (ciudad y provincia) para alguien interesado en: ${
        interesesTexto || 'lo más representativo de la zona'
      }. Organizalo día por día, con horarios sugeridos.${agrupar} Priorizá los comercios/bodegas reales de Mendozapp cuando existan opciones cargadas, y completá con lugares públicos, miradores o zonas de trekking reales de la provincia cuando haga falta. ${LANG_ENFORCE[lang]}`;
      const { respuesta } = await api.chat({ mensaje, idioma: lang });

      // Partimos la respuesta en ítems (por párrafo) para poder tildarlos individualmente
      const lines = respuesta.split('\n\n').map((s) => s.trim()).filter(Boolean);
      const entry = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        dias,
        intereses: [...intereses], // guardamos las keys, no el texto, así se puede traducir después
        lines,
        checked: lines.map(() => false),
      };
      const updated = [entry, ...historial].slice(0, 20); // guardamos como máximo los últimos 20
      setHistorial(updated);
      saveHistorial(updated);
      stopFakeProgress(true);
    } catch (err) {
      const entry = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        dias,
        intereses: [...intereses],
        lines: ['⚠️ ' + err.message],
        checked: [false],
        error: true,
      };
      setHistorial([entry, ...historial].slice(0, 20));
      stopFakeProgress(false);
    } finally {
      setLoading(false);
    }
  }

  function toggleCheck(entryId, idx) {
    setHistorial((prev) => {
      const updated = prev.map((e) =>
        e.id === entryId ? { ...e, checked: e.checked.map((c, i) => (i === idx ? !c : c)) } : e
      );
      saveHistorial(updated);
      return updated;
    });
  }

  function deleteEntry(entryId) {
    setHistorial((prev) => {
      const updated = prev.filter((e) => e.id !== entryId);
      saveHistorial(updated);
      return updated;
    });
  }

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <div className="font-display text-xl font-bold text-malbec-deep">{t.guide_title}</div>
        <div className="text-xs text-ink-soft mt-1 mb-5">{t.guide_sub}</div>

        <div className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">{t.days_label}</div>
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
          <span className="text-xs text-ink-soft">{t.more_days_label}</span>
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
            {t.long_stay_note(dias)}
          </div>
        )}

        <div className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2">{t.interests_label}</div>
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
                <span className="text-[11px] font-bold text-center leading-tight">{int.label[lang]}</span>
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
          <span className="relative">{loading ? `${t.generating} ${progress}%` : t.generate_itinerary}</span>
        </button>

        {/* Historial de itinerarios guardados, con checkboxes de progreso */}
        {historial.length > 0 && (
          <div className="mt-8">
            <div className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-3">{t.your_itineraries}</div>
            <div className="space-y-4">
              {historial.map((entry) => {
                const total = entry.lines.length;
                const done = entry.checked.filter(Boolean).length;
                const fecha = new Date(entry.createdAt).toLocaleDateString(
                  lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en-US',
                  { day: 'numeric', month: 'short' }
                );
                const interesesTexto = entry.intereses.map((k) => labelFor(k, lang)).join(', ');
                const diaWord = entry.dias > 1 ? t.days_label_plural : t.day_label;
                return (
                  <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold">
                          {entry.dias} {diaWord} · {interesesTexto || t.general_label}
                        </div>
                        <div className="text-[11px] text-ink-soft mt-0.5">{fecha}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!entry.error && (
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                              done === total ? 'bg-green-100 text-green-700' : 'bg-stone text-ink-soft'
                            }`}
                          >
                            {done}/{total}
                          </span>
                        )}
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-ink-soft/50 hover:text-red-500 text-sm px-1"
                          title={t.delete_label}
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {entry.lines.map((line, idx) => (
                        <label
                          key={idx}
                          className={`flex items-start gap-2.5 text-sm leading-relaxed p-2 rounded-lg cursor-pointer transition-colors ${
                            entry.checked[idx] ? 'bg-green-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={entry.checked[idx]}
                            onChange={() => toggleCheck(entry.id, idx)}
                            className="mt-1 w-4 h-4 accent-malbec flex-shrink-0"
                          />
                          <span className={entry.checked[idx] ? 'line-through text-ink-soft' : 'text-ink'}>
                            {line}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="bottomnav-space bg-stone" />
    </div>
  );
}
