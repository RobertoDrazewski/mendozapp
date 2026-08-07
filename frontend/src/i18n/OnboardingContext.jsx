import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <OnboardingContext.Provider value={{ open, show: () => setOpen(true), hide: () => setOpen(false) }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
