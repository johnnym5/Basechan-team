
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { logErrorToFirestore } from '@/lib/error-logger';
import type { UserProfile } from '@/lib/types';


export function FirebaseErrorListener() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() =>
      firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Avoid infinite loop if the error is about error_logs itself
      if (error.request.path.includes('error_logs')) {
        console.error("Critical: Could not log error to Firestore due to permission error on error_logs:", error);
        return;
      }

      // Log the full error to the backend for admin review
      if (firestore) {
        logErrorToFirestore(firestore, error, null, userProfile);
      } else {
        console.error("Firestore not available to log permission error:", error);
      }

      // Show a generic, non-blocking toast to the user
      toast({
        variant: 'destructive',
        title: 'Action Denied',
        description: 'You do not have permission to perform this action.',
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [firestore, toast, userProfile]);

  // This component now renders nothing, it only listens and acts.
  return null;
}
