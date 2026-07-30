'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Feedback } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bell, UserPlus, Shield, Loader2, Database, AlertCircle } from 'lucide-react';
import { FeedbackViewer } from '@/components/superadmin/FeedbackViewer';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { DataManagement } from '@/components/superadmin/DataManagement';
import { ErrorLogViewer } from '@/components/superadmin/ErrorLogViewer';
import { InviteUserDialog } from '@/components/settings/InviteUserDialog';
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function SuperAdminPageContent() {
    const firestore = useFirestore();
    const { isSuperAdmin, isLoading } = useSuperAdmin();
    const [showFeedback, setShowFeedback] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const newFeedbackQuery = useMemoFirebase(() => {
        if (!firestore || !isSuperAdmin) return null;
        return query(collection(firestore, 'feedback'), where('status', '==', 'NEW'));
    }, [firestore, isSuperAdmin]);
    const { data: newFeedback } = useCollection<Feedback>(newFeedbackQuery);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background">
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold font-headline text-white">Restricted Access</h1>
                <p className="text-muted-foreground mt-2">You do not have the clearance levels required to access the Super Admin Console.</p>
            </div>
        );
    }

    return (
        <ModuleContainer
            title="Super Admin Console"
            subtitle="Global data management, error logging, and system oversight."
            actions={
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setIsInviteOpen(true)} className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-white/5 border-white/5">
                        <UserPlus className="mr-2 h-4 w-4 text-primary"/>
                        Create User
                    </Button>
                    <Button variant="outline" onClick={() => setShowFeedback(true)} className="relative rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-white/5 border-white/5">
                        <Bell className="mr-2 h-4 w-4 text-amber-500"/>
                        Feedback
                        {newFeedback && newFeedback.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-white ring-2 ring-background">
                                {newFeedback.length}
                            </span>
                        )}
                    </Button>
                </div>
            }
        >
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar relative">
                <main className="space-y-12 pb-20">
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Database className="h-5 w-5 text-primary" />
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] opacity-40">System Core Data</h2>
                        </div>
                        <DataManagement />
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-rose-500" />
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] opacity-40">Security & Error Logs</h2>
                        </div>
                        <ErrorLogViewer />
                    </section>
                </main>

                <FeedbackViewer open={showFeedback} onOpenChange={setShowFeedback} />
                <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
            </div>
        </ModuleContainer>
    );
}
