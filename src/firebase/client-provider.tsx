'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { type FirebaseApp } from 'firebase/app';
import { type Auth } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { type Storage } from 'firebase/storage';
import { type Database } from 'firebase/database';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  storage: Storage | null;
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
    // This effect runs only on the client, after the component has mounted.
    const firebaseServices = initializeFirebase();
    setServices(firebaseServices);
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
