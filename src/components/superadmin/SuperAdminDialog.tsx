'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Feedback } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bell, UserPlus, Shield } from 'lucide-react';
import { FeedbackViewer } from '@/components/superadmin/FeedbackViewer';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { DataManagement } from '@/components/superadmin/DataManagement';
import { ErrorLogViewer } from '@/components/superadmin/ErrorLogViewer';
import { InviteUserDialog } from '@/components/settings/InviteUserDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SuperAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
}

export function SuperAdminDialog({ open, onOpenChange, modal = false }: SuperAdminDialogProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();
    const [showFeedback, setShowFeedback] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    
    // Only query feedback if the user is actually a super admin — 
    // Firestore rules restrict read access to super admins only
    const newFeedbackQuery = useMemoFirebase(() => {
        if (!firestore || !isSuperAdmin) return null;
        return query(collection(firestore, 'feedback'), where('status', '==', 'NEW'));
    }, [firestore, isSuperAdmin]);
    const { data: newFeedback } = useCollection<Feedback>(newFeedbackQuery);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
                <DialogContent position={modal ? "center" : "left"} className="flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold font-headline">
                            <Shield className="h-6 w-6 text-primary" />
                            Super Admin Console
                        </DialogTitle>
                        <DialogDescription>
                            Global data management, error logging, and system oversight.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="px-6 py-4 flex items-center gap-2 border-b bg-secondary/10 flex-shrink-0">
                        <Button variant="outline" onClick={() => setIsInviteOpen(true)} className="rounded-xl">
                            <UserPlus className="mr-2 h-4 w-4"/>
                            Create User
                        </Button>
                        <Button variant="outline" onClick={() => setShowFeedback(true)} className="relative rounded-xl">
                            <Bell className="mr-2 h-4 w-4"/>
                            Feedback
                            {newFeedback && newFeedback.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-white ring-2 ring-background">
                                    {newFeedback.length}
                                </span>
                            )}
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-background/50">
                        <main className="p-6 space-y-12 pb-32">
                            <DataManagement />
                            <ErrorLogViewer />
                        </main>
                    </div>
                </DialogContent>
            </Dialog>

            <FeedbackViewer open={showFeedback} onOpenChange={setShowFeedback} />
            <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
        </>
    );
}
