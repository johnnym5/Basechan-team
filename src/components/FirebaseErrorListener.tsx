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
        logErrorToFirestore(firestore, error, undefined, userProfile);
      }

      // Extract the collection name for clearer user feedback
      const pathParts = error.request.path.split('/');
      const nodeName = pathParts[pathParts.length - 1] || 'Mainframe';

      toast({
        variant: 'destructive',
        title: 'Action Denied',
        description: `Authorization failed for node: ${nodeName.toUpperCase()}. Please check organizational permissions.`,
      });
    };

    const handleGenericError = (error: any) => {
      const message = error.message || '';
      
      // IMPROVED INDEX ERROR DETECTION
      const indexMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);

      if (indexMatch || message.toLowerCase().includes('index')) {
        const url = indexMatch ? indexMatch[0] : `https://console.firebase.google.com/v1/r/project/${firestore?.app.options.projectId}/firestore/indexes`;
        
        if (firestore) {
          logErrorToFirestore(firestore, error, undefined, userProfile);
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
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(url).catch(console.error);
                    }
                    window.open(url, '_blank');
                }}
                className="bg-white text-destructive font-black uppercase tracking-widest text-[9px] hover:bg-white/90"
            >
              Initialize Index
            </ToastAction>
          ),
        });
      } else if (firestore) {
        logErrorToFirestore(firestore, error, undefined, userProfile);
      }
    };

    // DEFINITIVE REMEDY FOR CA9 & B815 INTERNAL SDK ASSERTIONS
    // These are internal WebChannel transport race conditions inside the Firestore SDK itself (Issue #9267).
    // By intercepting them globally and calling preventDefault(), we suppress Next.js from throwing its crash overlay.
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';
      const errStr = String(event.error || '').toLowerCase();
      if (msg.includes('ca9') || msg.includes('b815') || errStr.includes('ca9') || errStr.includes('b815')) {
        console.warn("[SYSTEM] Intercepted and suppressed Firestore internal WatchStream assertion (ca9/b815).");
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonStr = String(reason?.message || reason || '').toLowerCase();
      if (reasonStr.includes('ca9') || reasonStr.includes('b815')) {
        console.warn("[SYSTEM] Intercepted and suppressed Firestore internal WatchStream promise rejection (ca9/b815).");
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleGlobalRejection, true);

    errorEmitter.on('permission-error', handlePermissionError);
    errorEmitter.on('firestore-error', handleGenericError);

    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleGlobalRejection, true);
      errorEmitter.off('permission-error', handlePermissionError);
      errorEmitter.off('firestore-error', handleGenericError);
    };
  }, [firestore, toast, userProfile]);

  return null;
}