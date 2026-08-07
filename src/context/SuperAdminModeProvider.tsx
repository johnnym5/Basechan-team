'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

interface SuperAdminModeContextType {
  isSuperAdminModeActive: boolean;
  setIsSuperAdminModeActive: (value: boolean) => void;
  canEnableMode: boolean;
}

const SuperAdminModeContext = createContext<SuperAdminModeContextType | undefined>(undefined);

export function SuperAdminModeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { superAdminEmail } = useSuperAdmin();

  const userProfileRef = useMemoFirebase(() =>
    firestore && user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const canEnableMode = useMemo(() => {
    return user?.email === superAdminEmail && userProfile?.role === 'SUPERADMIN';
  }, [user, userProfile, superAdminEmail]);

  const [isSuperAdminModeActive, setIsSuperAdminModeActiveState] = useState(false);

  useEffect(() => {
    if (!canEnableMode) {
      setIsSuperAdminModeActiveState(false);
    }
  }, [canEnableMode]);

  const value = useMemo(() => ({
    isSuperAdminModeActive,
    setIsSuperAdminModeActive: setIsSuperAdminModeActiveState,
    canEnableMode
  }), [isSuperAdminModeActive, canEnableMode]);

  return (
    <SuperAdminModeContext.Provider value={value}>
      {children}
    </SuperAdminModeContext.Provider>
  );
}

export function useSuperAdminMode() {
  const context = useContext(SuperAdminModeContext);
  if (context === undefined) {
    throw new Error('useSuperAdminMode must be used within a SuperAdminModeProvider');
  }
  return context;
}
