'use client';
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

const IMPERSONATION_KEY = 'basechanstaff-impersonation-mode';
const IMPERSONATION_TARGET_KEY = 'basechanstaff-impersonation-target-id';

interface ImpersonationContextType {
  isImpersonating: boolean;
  setIsImpersonating: (value: boolean) => void;
  impersonatedUserId: string | null;
  setImpersonatedUserId: (id: string | null) => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  // Default to true (Staff mode) on login for super admins unless they toggle it
  const [isImpersonating, setIsImpersonatingState] = useState(true);
  const [impersonatedUserId, setImpersonatedUserIdState] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has a preference, otherwise stay in Staff mode (Safe mode)
    const storedValue = localStorage.getItem(IMPERSONATION_KEY);
    if (storedValue !== null) {
      setIsImpersonatingState(storedValue === 'true');
    }

    const storedTarget = localStorage.getItem(IMPERSONATION_TARGET_KEY);
    if (storedTarget) {
      setImpersonatedUserIdState(storedTarget);
    }
  }, []);

  const setIsImpersonating = (value: boolean) => {
    localStorage.setItem(IMPERSONATION_KEY, String(value));
    setIsImpersonatingState(value);
    if (!value) {
        setImpersonatedUserId(null);
    }
  };

  const setImpersonatedUserId = (id: string | null) => {
    if (id) {
        localStorage.setItem(IMPERSONATION_TARGET_KEY, id);
    } else {
        localStorage.removeItem(IMPERSONATION_TARGET_KEY);
    }
    setImpersonatedUserIdState(id);
  };
  
  const value = useMemo(() => ({
    isImpersonating,
    setIsImpersonating,
    impersonatedUserId,
    setImpersonatedUserId,
  }), [isImpersonating, impersonatedUserId]);

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
