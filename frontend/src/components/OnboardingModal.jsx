import React, { useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { useOnboarding } from '../i18n/OnboardingContext';
import logo from '../assets/logo.png';

const TOOLS = [
  { icon: '🗺️', key: 'onboarding_map' },
  { icon: '📖', key: 'onboarding_guide' },
  { icon: '💬', key: 'onboarding_chat' },
  { icon: '🧭', key: 'onboarding_go' },
  { icon: '🍇', key: 'onboarding_places' },
];

const SEEN_KEY = 'mendozapp_onboarding_seen';

export default function OnboardingModal() {
  const { t } = useLang();
  const { open, show, hide } = useOnboarding();

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) {
      show();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    localStorage.setItem(SEEN_KEY, '1');
    hide();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center px-5">
      <div className="w-full max-w-[420px] bg-paper rounded-3xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex flex-col items-center text-center mb-4">
          <img src={logo} alt="Mendozapp" className="h-14 mb-3" />
          <div className="font-display text-xl font-bold text-malbec-deep">{t.onboarding_title}</div>
          <div className="text-xs text-sun font-bold uppercase tracking-wide mt-1">{t.onboarding_sub}</div>
        </div>

        <p className="text-sm text-ink leading-relaxed mb-5">{t.onboarding_intro}</p>

        <div className="space-y-3 mb-6">
          {TOOLS.map((tool) => (
            <div key={tool.key} className="flex items-start gap-3 bg-stone rounded-xl p-3">
              <span className="text-xl flex-shrink-0">{tool.icon}</span>
              <span className="text-xs text-ink leading-relaxed pt-0.5">{t[tool.key]}</span>
            </div>
          ))}
        </div>

        <button
          onClick={close}
          className="w-full bg-malbec text-white font-bold py-3.5 rounded-xl text-sm shadow-[0_0_18px_rgba(107,30,60,0.4)]"
        >
          {t.onboarding_cta}
        </button>
      </div>
    </div>
  );
}
