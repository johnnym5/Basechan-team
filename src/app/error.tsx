'use client';

import { Button } from '@/components/ui/button';
import { ShieldAlert, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { logErrorToFirestore } from '@/lib/error-logger';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const userProfileRef = useMemoFirebase(() =>
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const correlationId = error.digest || `ERR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  useEffect(() => {
    if (firestore) {
      logErrorToFirestore(firestore, error, undefined, userProfile);
    } else {
      console.error("Local Error Boundary:", error);
    }
  }, [error, firestore, userProfile]);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background/50 text-foreground flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-destructive/30 rounded-lg m-4">
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-full mb-6">
            <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Something went wrong.</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
            An error occurred in this module. The issue has been logged.
        </p>
        <p className="text-[10px] font-mono text-muted-foreground opacity-60 mt-1 uppercase">
            Correlation ID: {correlationId}
        </p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
                onClick={() => reset()}
                variant="outline"
            >
                <RotateCw className="mr-2 h-4 w-4" />
                Try Again
            </Button>
             <Button
                onClick={() => window.location.href = '/'}
                variant="destructive"
            >
                Go to Home
            </Button>
        </div>
    </div>
  );
}
