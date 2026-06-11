'use client';
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

const IMPERSONATION_KEY = 'basechanstaff-impersonation-mode';

interface ImpersonationContextType {
  isImpersonating: boolean;
  setIsImpersonating: (value: boolean) => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  // Default to true (Staff mode) on login for super admins unless they toggle it
  const [isImpersonating, setIsImpersonatingState] = useState(true);

  useEffect(() => {
    // Check if user has a preference, otherwise stay in Staff mode (Safe mode)
    const storedValue = localStorage.getItem(IMPERSONATION_KEY);
    if (storedValue !== null) {
      setIsImpersonatingState(storedValue === 'true');
    }
  }, []);

  const setIsImpersonating = (value: boolean) => {
    localStorage.setItem(IMPERSONATION_KEY, String(value));
    setIsImpersonatingState(value);
  };
  
  const value = useMemo(() => ({
    isImpersonating,
    setIsImpersonating,
  }), [isImpersonating]);

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
