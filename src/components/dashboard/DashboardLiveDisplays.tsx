'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
<<<<<<< Updated upstream
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
=======
import { collection, query, where, or, and } from 'firebase/firestore';
>>>>>>> Stashed changes
import type { ExternalDisplay, UserProfile } from '@/lib/types';
import { MonitorDot, ChevronRight, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { uiEmitter } from '@/lib/ui-emitter';
import { ORG_ID } from '@/lib/config';

interface DashboardLiveDisplaysProps {
    userProfile: UserProfile | null;
}

export function DashboardLiveDisplays({ userProfile }: DashboardLiveDisplaysProps) {
    const firestore = useFirestore();
    const orgId = userProfile?.orgId || ORG_ID;

    const displaysQuery = useMemoFirebase(() => {
<<<<<<< Updated upstream
        if (!firestore) return null;
        return query(
            collection(firestore, 'external_displays'),
            where('orgId', '==', orgId),
            orderBy('createdAt', 'desc'),
            limit(3)
        );
    }, [firestore, orgId]);
=======
        if (!firestore || !userProfile?.orgId) return null;
        if (permissions.canManageDisplays) {
            return query(
                collection(firestore, 'external_displays'),
                where('orgId', '==', userProfile.orgId)
            );
        } else {
            return query(
                collection(firestore, 'external_displays'),
                and(
                    where('orgId', '==', userProfile.orgId),
                    or(
                        where('displayMode', '==', 'GLOBAL'),
                        where('createdBy', '==', userProfile.id)
                    )
                )
            );
        }
    }, [firestore, userProfile?.orgId, userProfile?.id, permissions.canManageDisplays]);
>>>>>>> Stashed changes

    const { data: displays, isLoading } = useCollection<ExternalDisplay>(displaysQuery);

    const handleJumpToDisplay = (displayId: string) => {
        uiEmitter.emit('open-displays-dialog', { displayId });
    };

    if (isLoading) {
        return (
            <section className="apple-glass rounded-2xl p-4 shadow-lg">
                <Skeleton className="h-5 w-1/2 mb-3" />
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            </section>
        );
    }

    return (
        <section className="apple-glass rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-500 interactive-element">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold font-headline flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    Shared Dashboards
                </h3>
                {displays && displays.length > 0 && (
                    <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                        {displays.length} Links
                    </span>
                )}
            </div>

            <div className="space-y-2">
                {!displays || displays.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center opacity-40 grayscale">
                        <MonitorDot className="h-6 w-6 mb-2" />
                        <p className="font-bold text-[9px] uppercase tracking-[0.1em]">No shared dashboards</p>
                    </div>
                ) : (
                    displays.map((display) => (
                        <div 
                            key={display.id}
                            onClick={() => handleJumpToDisplay(display.id)}
                            className="flex items-center justify-between p-2 rounded-xl border border-white/5 bg-background/30 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                                    <MonitorDot className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-[10px] truncate leading-none">{display.title}</p>
                                    <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground mt-1 truncate">
                                        From: {new URL(display.url).hostname}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-3 pt-2 border-t border-white/5">
                <button 
                    onClick={() => uiEmitter.emit('open-displays-dialog')}
                    className="w-full text-[7px] font-black text-primary hover:underline uppercase tracking-[0.2em] text-center"
                >
                    View All Dashboards
                </button>
            </div>
        </section>
    );
}
