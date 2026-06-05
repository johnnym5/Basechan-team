'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let unsubscribe: (() => void) | null = null;

    try {
        unsubscribe = onSnapshot(
          memoizedDocRef,
          (snapshot: DocumentSnapshot<DocumentData>) => {
            if (snapshot.exists()) {
              setData({ ...(snapshot.data() as T), id: snapshot.id });
            } else {
              setData(null);
            }
            setError(null);
            setIsLoading(false);
          },
          (error: FirestoreError) => {
            if (error.code === 'permission-denied') {
                const contextualError = new FirestorePermissionError({
                  operation: 'get',
                  path: memoizedDocRef.path,
                })
                setError(contextualError);
                errorEmitter.emit('permission-error', contextualError);
            } else if (error.message?.includes('ca9') || error.message?.includes('b815')) {
                console.warn("[SYSTEM] Suppressed SDK assertion during update:", error.message);
            } else {
                setError(error);
                errorEmitter.emit('firestore-error', error);
            }
            
            setData(null);
            setIsLoading(false);
          }
        );
    } catch (e: any) {
        console.warn("[SYSTEM] Failed to establish doc listener:", e.message);
        setIsLoading(false);
        return;
    }

    return () => {
        try {
            // AGGRESSIVE DEFENSIVE UNMOUNT: 
            // Catch b815 assertion failures during unmount.
            if (unsubscribe) {
                unsubscribe();
            }
        } catch (e) {
            console.warn("[SYSTEM] Suppressed SDK assertion during listener cleanup.");
        }
    };
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}