'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, enableIndexedDbPersistence, getFirestore, CACHE_SIZE_UNLIMITED, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';

const isFirebaseConfigAvailable = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

// Singleton instances to ensure stable references across hot reloads in Next.js dev mode
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let databaseInstance: Database | null = null;

/**
 * Initializes the Firebase Client SDKs.
 * Uses a singleton pattern to prevent "INTERNAL ASSERTION FAILED" errors 
 * caused by multiple initializations in development environments.
 */
export function initializeFirebase() {
  if (!isFirebaseConfigAvailable) {
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
      storage: null,
      database: null,
    };
  }
  
  let app: FirebaseApp;
  const existingApps = getApps();
  
  if (!existingApps.length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = existingApps[0];
  }

  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // 1. Initialize Firestore as a singleton
  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      });
    } catch (e) {
      // Fallback if already initialized (common in hot-reload scenarios)
      firestoreInstance = getFirestore(firebaseApp);
    }

    // 2. Enable persistence only once per browser session
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (!win.__firebasePersistenceEnabled) {
        win.__firebasePersistenceEnabled = true;
        enableIndexedDbPersistence(firestoreInstance)
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              console.warn('Firestore persistence: already active in another tab.');
            } else if (err.code === 'unimplemented') {
              console.warn('Firestore persistence: not supported by this browser.');
            } else {
                console.warn('Firestore persistence initialization error:', err.message);
            }
          });
      }
    }
  }

  // 3. Initialize other services as singletons
  if (!authInstance) authInstance = getAuth(firebaseApp);
  if (!storageInstance) storageInstance = getStorage(firebaseApp);
  if (!databaseInstance) databaseInstance = getDatabase(firebaseApp);

  return {
    firebaseApp,
    auth: authInstance,
    firestore: firestoreInstance,
    storage: storageInstance,
    database: databaseInstance,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
