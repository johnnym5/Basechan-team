'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Feedback } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bell, UserPlus, Shield } from 'lucide-react';
import { FeedbackViewer } from '@/components/superadmin/FeedbackViewer';
import { DataManagement } from '@/components/superadmin/DataManagement';
import { ErrorLogViewer } from '@/components/superadmin/ErrorLogViewer';
import { InviteUserDialog } from '@/components/settings/InviteUserDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';

interface SuperAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuperAdminDialog({ open, onOpenChange }: SuperAdminDialogProps) {
    const firestore = useFirestore();
    const [showFeedback, setShowFeedback] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    
    const newFeedbackQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'feedback'), where('status', '==', 'NEW'));
    }, [firestore]);
    const { data: newFeedback } = useCollection<Feedback>(newFeedbackQuery);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent position="top" className="flex flex-col p-0">
                    <PanelSwitcher />
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold font-headline">
                            <Shield className="h-6 w-6 text-primary" />
                            Super Admin Console
                        </DialogTitle>
                        <DialogDescription>
                            Global data management, error logging, and system oversight.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="px-6 py-2 flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4"/>
                            Create User
                        </Button>
                        <Button variant="outline" onClick={() => setShowFeedback(true)} className="relative">
                            <Bell className="mr-2 h-4 w-4"/>
                            Feedback
                            {newFeedback && newFeedback.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                                    {newFeedback.length}
                                </span>
                            )}
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <main className="p-6 space-y-8">
                            <DataManagement />
                            <ErrorLogViewer />
                        </main>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <FeedbackViewer open={showFeedback} onOpenChange={setShowFeedback} />
            <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
        </>
    );
}
