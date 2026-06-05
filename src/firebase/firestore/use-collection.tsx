'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let unsubscribe: () => void;

    try {
        unsubscribe = onSnapshot(
          memoizedTargetRefOrQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const results: ResultItemType[] = [];
            for (const doc of snapshot.docs) {
              results.push({ ...(doc.data() as T), id: doc.id });
            }
            setData(results);
            setError(null);
            setIsLoading(false);
          },
          (error: FirestoreError) => {
            if (error.code === 'permission-denied') {
                const path: string =
                memoizedTargetRefOrQuery.type === 'collection'
                    ? (memoizedTargetRefOrQuery as CollectionReference).path
                    : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

                const contextualError = new FirestorePermissionError({
                    operation: 'list',
                    path,
                })

                setError(contextualError);
                errorEmitter.emit('permission-error', contextualError);
            } else if (error.message?.includes('ca9') || error.message?.includes('b815')) {
                // Silently handle internal assertion failures to prevent UI crash
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
        console.warn("[SYSTEM] Failed to establish listener:", e.message);
        setIsLoading(false);
        return;
    }

    return () => {
        try {
            // AGGRESSIVE DEFENSIVE UNMOUNT: 
            // In high-velocity dev environments, the SDK aggregator (ca9/b815) 
            // can throw during unsubscribe. We must suppress this to prevent React crashes.
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        } catch (e) {
            console.warn("[SYSTEM] Suppressed SDK assertion during listener cleanup.");
        }
    };
  }, [memoizedTargetRefOrQuery]);
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}
