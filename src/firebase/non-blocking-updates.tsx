'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch((error: FirestoreError) => {
    if (error.code === 'permission-denied') {
        errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
            path: docRef.path,
            operation: options && 'merge' in options ? 'update' : 'create',
            requestResourceData: data,
        })
        )
    } else {
        console.error("Firestore (setDoc) Error:", error);
    }
  })
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch((error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: data,
            })
        )
      } else {
         console.error("Firestore (addDoc) Error:", error);
      }
      // Re-throw the error so the caller's catch block can handle it (e.g., stop a loading spinner)
      throw error;
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch((error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
            })
        )
      } else {
         console.error("Firestore (updateDoc) Error:", error);
      }
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch((error: FirestoreError) => {
       if (error.code === 'permission-denied') {
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
                })
            )
       } else {
          console.error("Firestore (deleteDoc) Error:", error);
       }
    });
}
