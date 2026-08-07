import React, { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';

export default function Chat() {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState([{ role: 'assistant', text: t.chat_welcome }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const scrollRef = useRef(null);
  const sessionId = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const mensaje = input.trim();
    setMessages((m) => [...m, { role: 'user', text: mensaje }]);
    setInput('');
    setLoading(true);
    try {
      const { respuesta } = await api.chat({
        mensaje,
        lat: userLoc?.lat,
        lng: userLoc?.lng,
        idioma: lang,
        session_id: sessionId.current,
      });
      setMessages((m) => [...m, { role: 'assistant', text: respuesta }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: '⚠️ ' + err.message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-malbec text-white rounded-br-sm' : 'bg-white text-ink rounded-bl-sm shadow-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm text-sm text-ink-soft">…</div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-paper border-t border-black/5 flex gap-2 flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t.chat_placeholder}
          className="flex-1 bg-stone rounded-full px-4 py-3 text-sm outline-none"
        />
        <button
          onClick={send}
          disabled={loading}
          className="bg-malbec text-white rounded-full px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          {t.chat_send}
        </button>
      </div>
      <div className="bottomnav-space bg-paper" />
    </div>
  );
}
