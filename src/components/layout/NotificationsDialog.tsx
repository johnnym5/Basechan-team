'use client';

import { useUser, useMemoFirebase, useCollection, updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import type { UserProfile, Notification } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Skeleton } from '../ui/skeleton';

export function NotificationsDialog({ open, onOpenChange, userProfile }: { open: boolean, onOpenChange: (open: boolean) => void, userProfile: UserProfile }) {
    const firestore = useFirestore();
    const router = useRouter();

    const notificationsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'notifications'), where('userId', '==', userProfile.id), orderBy('createdAt', 'desc'), limit(30)) : null
    , [firestore, userProfile.id]);

    const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

    const handleNotificationClick = (n: Notification) => {
        if (firestore) updateDocumentNonBlocking(doc(firestore, 'notifications', n.id), { isRead: true });
        onOpenChange(false);
        router.push(n.href);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent position="left" className="flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-8 pb-4 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <Bell className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black font-headline tracking-tighter">Alert Center</DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">System & Organizational Telemetry</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 bg-background/20">
                    <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-2">
                        {isLoading ? (
                            Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                        ) : notifications?.length === 0 ? (
                            <div className="py-32 flex flex-col items-center justify-center text-center opacity-30 uppercase font-black tracking-widest">
                                <Inbox className="h-16 w-16 mb-4" />
                                <p>Operational Inbox Clear</p>
                            </div>
                        ) : (
                            notifications?.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleNotificationClick(n)}
                                    className={cn(
                                        "p-5 rounded-3xl border border-white/5 transition-all cursor-pointer group active:scale-[0.98]",
                                        n.isRead ? "bg-background/40 opacity-50 grayscale" : "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{n.title}</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{n.description}</p>
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap pt-1">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
