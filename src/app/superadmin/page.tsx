'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2, LogOut, Bell } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, query, where } from 'firebase/firestore';
import type { Feedback } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { FeedbackViewer } from '@/components/superadmin/FeedbackViewer';
import { DataManagement } from '@/components/superadmin/DataManagement';
import { ErrorLogViewer } from '@/components/superadmin/ErrorLogViewer';


export default function SuperAdminPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { isSuperAdmin } = useSuperAdmin();
    const router = useRouter();
    const firestore = useFirestore();

    const [showFeedback, setShowFeedback] = useState(false);
    
    const newFeedbackQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'feedback'), where('status', '==', 'NEW'));
    }, [firestore]);
    const { data: newFeedback } = useCollection<Feedback>(newFeedbackQuery);

    // Temporarily disabled auth checks for setup.
    // useEffect(() => {
    //     if (!isUserLoading && user && !isSuperAdmin) {
    //         router.replace('/');
    //     }
    //      if (!isUserLoading && !user) {
    //         router.replace('/login');
    //     }
    // }, [user, isUserLoading, isSuperAdmin, router]);

    if (isUserLoading) { // Temporarily removed !isSuperAdmin check
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-12 h-12" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 md:px-6 backdrop-blur-lg">
                <Logo />
                <div className="flex-1 hidden md:block">
                    <h1 className="text-lg font-semibold font-headline">Super Admin Console</h1>
                </div>
                <div className="flex-1 md:hidden" />
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setShowFeedback(true)} className="relative px-2 md:px-4">
                        <Bell className="h-5 w-5 md:mr-2"/>
                        <span className="hidden md:inline">Feedback</span>
                        {newFeedback && newFeedback.length > 0 && (
                            <span className="absolute -top-1 right-0 md:right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                                {newFeedback.length}
                            </span>
                        )}
                    </Button>
                    <Button variant="ghost" onClick={() => user && signOut(auth)} className="px-2 md:px-4">
                        <LogOut className="h-5 w-5 md:mr-2"/>
                        <span className="hidden md:inline">Logout</span>
                    </Button>
                </div>
            </header>
            <main className="p-4 md:p-6 space-y-8">
                <DataManagement />
                <ErrorLogViewer />
            </main>
            <FeedbackViewer open={showFeedback} onOpenChange={setShowFeedback} />
        </div>
    );
}
