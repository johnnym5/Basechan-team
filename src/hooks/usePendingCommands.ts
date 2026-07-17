'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from './use-toast';
import { webRTCService } from '@/services/webrtc-service';

/**
 * This hook listens for pending commands on the current user's document
 * and executes them. This is used for admin-initiated actions like
 * force logout, screen capture, etc.
 */
export function usePendingCommands() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore || !authUser || !auth) return;

        const userRef = doc(firestore, 'users', authUser.uid);

        const unsubscribe = onSnapshot(userRef, async (snapshot) => {
            const command = snapshot.data()?.pendingCommand;

            if (command === 'FORCE_LOGOUT') {
                // Clear the command immediately to prevent re-execution
                await updateDoc(userRef, { pendingCommand: null, activeSessionId: null, status: 'OFFLINE' });
                localStorage.removeItem('basechan-active-session');

                toast({
                    variant: 'destructive',
                    title: 'Remote Sign-Out',
                    description: 'An administrator has signed you out of your session.',
                });

                webRTCService.stopScreenShare();

                setTimeout(() => signOut(auth), 2000);
            }
        });

        return () => unsubscribe();
    }, [firestore, authUser, auth, toast]);
}