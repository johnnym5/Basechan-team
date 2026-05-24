
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { logErrorToFirestore } from '@/lib/error-logger';
import type { UserProfile } from '@/lib/types';
import { ToastAction } from '@/components/ui/toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() =>
      firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      if (error.request.path.includes('error_logs')) return;

      if (firestore) {
        logErrorToFirestore(firestore, error, null, userProfile);
      }

      toast({
        variant: 'destructive',
        title: 'Action Denied',
        description: 'You do not have permission to perform this action.',
      });
    };

    const handleGenericError = (error: any) => {
      // Check for missing index error
      const message = error.message || '';
      const indexMatch = message.match(/(https:\/\/console\.firebase\.google\.com\/v1\/r\/project\/[^\s]*)/);

      if (indexMatch) {
        const url = indexMatch[0];
        toast({
          variant: 'destructive',
          title: 'Index Required',
          description: 'This query requires a composite index. Link copied to clipboard.',
          action: (
            <ToastAction altText="Create Index" onClick={() => {
                navigator.clipboard.writeText(url);
                window.open(url, '_blank');
            }}>
              Fix in Console
            </ToastAction>
          ),
        });
      } else if (firestore) {
        logErrorToFirestore(firestore, error, null, userProfile);
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    errorEmitter.on('firestore-error', handleGenericError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
      errorEmitter.off('firestore-error', handleGenericError);
    };
  }, [firestore, toast, userProfile]);

  return null;
}
