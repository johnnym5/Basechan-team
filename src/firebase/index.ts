'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  CACHE_SIZE_UNLIMITED, 
  Firestore,
  persistentLocalCache
} from 'firebase/firestore';
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
 * Uses a singleton pattern to prevent errors caused by multiple initializations.
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

/**
 * Configures and retrieves individual Firebase service instances.
 * Uses persistent local cache to ensure offline utility.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  // 1. Initialize Firestore with Persistent Local Cache (Single Tab Manager to avoid CA9 errors)
  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        }),
      });
    } catch (e) {
      firestoreInstance = getFirestore(firebaseApp);
    }
  }

  // 2. Initialize Auth with explicit Browser Local Persistence
  if (!authInstance) {
    authInstance = getAuth(firebaseApp);
    setPersistence(authInstance, browserLocalPersistence).catch((err) => {
        console.warn("[SYSTEM] Auth persistence initialization failed:", err.message);
    });
  }

  // 3. Initialize other services as singletons
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
