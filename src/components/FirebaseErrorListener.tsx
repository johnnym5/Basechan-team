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
      // Don't log recursive errors for the log collection itself
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
      const message = error.message || '';
      
      // IMPROVED INDEX ERROR DETECTION
      const indexMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);

      if (indexMatch || message.toLowerCase().includes('index')) {
        const url = indexMatch ? indexMatch[0] : `https://console.firebase.google.com/v1/r/project/${firestore?.app.options.projectId}/firestore/indexes`;
        
        if (firestore) {
          logErrorToFirestore(firestore, error, null, userProfile);
        }

        toast({
          variant: 'destructive',
          title: 'Database Index Required',
          description: 'This operational query requires a specialized index. Click below to initialize.',
          duration: 15000,
          action: (
            <ToastAction 
                altText="Fix Index" 
                onClick={() => {
                    navigator.clipboard.writeText(url);
                    window.open(url, '_blank');
                }}
                className="bg-white text-destructive font-black uppercase tracking-widest text-[9px] hover:bg-white/90"
            >
              Initialize Index
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