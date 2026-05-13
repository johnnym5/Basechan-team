'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, enableIndexedDbPersistence, getFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const isFirebaseConfigAvailable = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
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
  
  if (!getApps().length) {
    // Always initialize with the config object.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

let persistenceEnabled = false;

export function getSdks(firebaseApp: FirebaseApp) {
  // Use initializeFirestore with experimentalForceLongPolling to prevent connection timeouts 
  // in Cloud Workstation / IDE environments where WebSockets might be restricted.
  let firestore;
  try {
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
  } catch (e) {
    // Fallback if already initialized
    firestore = getFirestore(firebaseApp);
  }

  // Attempt persistence only in the browser and only once
  if (typeof window !== 'undefined' && !persistenceEnabled) {
    persistenceEnabled = true; 
    enableIndexedDbPersistence(firestore)
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          // This means persistence is already enabled in another tab.
          console.warn('Firestore persistence already active in another tab.');
        } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the features.
          console.warn('Firestore persistence is not supported in this browser.');
        }
      });
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore,
    storage: getStorage(firebaseApp),
    database: getDatabase(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
