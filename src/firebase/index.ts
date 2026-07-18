'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  Firestore,
  memoryLocalCache,
  getFirestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';

const isFirebaseConfigAvailable = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

/**
 * Singleton instances attached to globalThis to ensure stable references 
 * across hot reloads in Next.js development mode.
 */
declare global {
  var _firebaseApp: FirebaseApp | undefined;
  var _firestore: Firestore | undefined;
  var _auth: Auth | undefined;
  var _storage: FirebaseStorage | undefined;
  var _database: Database | undefined;
}

/**
 * Initializes the Firebase Client SDKs.
 * Enforces memory cache and standard HTTP polling to eliminate gRPC 'ca9' aggregation errors.
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
  
  if (!globalThis._firebaseApp) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        globalThis._firebaseApp = existingApps[0];
    } else {
        globalThis._firebaseApp = initializeApp(firebaseConfig);
    }
  }

  const app = globalThis._firebaseApp!;

  if (!globalThis._firestore) {
    try {
        globalThis._firestore = initializeFirestore(app, {
            localCache: memoryLocalCache(),
        });
    } catch (e) {
        // If already initialized (e.g. by another library), retrieve the instance
        globalThis._firestore = getFirestore(app);
    }
  }

  if (!globalThis._auth) {
    globalThis._auth = getAuth(app);
    setPersistence(globalThis._auth, browserLocalPersistence).catch(() => {});
  }

  if (!globalThis._storage) globalThis._storage = getStorage(app);
  if (!globalThis._database) globalThis._database = getDatabase(app);

  return {
    firebaseApp: app,
    auth: globalThis._auth,
    firestore: globalThis._firestore,
    storage: globalThis._storage,
    database: globalThis._database,
  };
}

export function getSdks(app: FirebaseApp) {
  return initializeFirebase();
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
