'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { type FirebaseApp } from 'firebase/app';
import { type Auth } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { type FirebaseStorage } from 'firebase/storage';
import { type Database } from 'firebase/database';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  storage: FirebaseStorage | null;
  database: Database | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices>({
    firebaseApp: null,
    auth: null,
    firestore: null,
    storage: null,
    database: null
  });

  useEffect(() => {
    // Monkeypatch console.error to prevent Firebase SDK console logging from triggering the Next.js dev overlay
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const isFirestoreAssertion = args.some(arg => 
        (typeof arg === 'string' && (
          arg.includes('ca9') || 
          arg.includes('b815') || 
          arg.includes('INTERNAL ASSERTION FAILED')
        )) || 
        (arg instanceof Error && arg.message && (
          arg.message.includes('ca9') || 
          arg.message.includes('b815') || 
          arg.message.includes('INTERNAL ASSERTION FAILED')
        ))
      );
      if (isFirestoreAssertion) {
        console.warn("[SYSTEM] Suppressed console.error for Firestore watch stream assertion:", ...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Intercept and suppress Firestore internal assertion errors (like ca9 / b815)
    // which occur asynchronously inside watch streams and bubble up as uncaught rejections.
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && reason.message && (
        reason.message.includes('ca9') || 
        reason.message.includes('b815') || 
        reason.message.includes('INTERNAL ASSERTION FAILED')
      )) {
        console.warn("[SYSTEM] Suppressed Firestore internal watch stream assertion:", reason.message);
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes('ca9') || 
        event.message.includes('b815') || 
        event.message.includes('INTERNAL ASSERTION FAILED')
      )) {
        console.warn("[SYSTEM] Suppressed Firestore internal watch stream error:", event.message);
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // This effect runs only on the client, after the component has mounted.
    const firebaseServices = initializeFirebase();
    setServices(firebaseServices);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
      storage={services.storage}
      database={services.database}
    >
      {children}
    </FirebaseProvider>
  );
}
