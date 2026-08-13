'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, or, and } from 'firebase/firestore';
import type { ExternalDisplay, UserProfile } from '@/lib/types';
import { MonitorDot, ChevronRight, Globe, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ORG_ID } from '@/lib/config';
import { usePermissions } from '@/hooks/usePermissions';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface DashboardLiveDisplaysProps {
    userProfile: UserProfile | null;
}

export function DashboardLiveDisplays({ userProfile }: DashboardLiveDisplaysProps) {
    const firestore = useFirestore();
    const router = useRouter();
    const orgId = userProfile?.orgId || ORG_ID;
    const permissions = usePermissions(userProfile);

    const displaysQuery = useMemoFirebase(() => {
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

    const { data: allDisplays, isLoading } = useCollection<ExternalDisplay>(displaysQuery);

    const displays = useMemo(() => {
        if (!allDisplays) return [];
        return [...allDisplays]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3);
    }, [allDisplays]);

    const handleJumpToDisplay = (displayId: string) => {
        router.push(`/livedisplay?id=${displayId}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-20 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                    Live Displays
                </h3>
                {allDisplays && allDisplays.length > 0 && (
                    <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                        {allDisplays.length} Links
                    </span>
                )}
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {!displays || displays.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center opacity-40 grayscale">
                        <MonitorDot className="h-6 w-6 mb-2 text-muted-foreground" />
                        <p className="font-bold text-[9px] uppercase tracking-[0.1em] text-muted-foreground">No shared dashboards</p>
                    </div>
                ) : (
                    displays.map((display) => (
                        <div 
                            key={display.id}
                            onClick={() => handleJumpToDisplay(display.id)}
                            className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-muted hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0 relative">
                                    <MonitorDot className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                        <p className="font-bold text-[10px] truncate leading-none text-foreground">{display.title}</p>
                                        {display.displayMode === 'PRIVATE' && (
                                            <Lock className="h-2.5 w-2.5 text-muted-foreground ml-1" />
                                        )}
                                    </div>
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
            
            <div className="mt-3 pt-2 border-t border-border/50">
                <button 
                    onClick={() => router.push('/livedisplay')}
                    className="w-full text-[7px] font-black text-primary hover:underline uppercase tracking-[0.2em] text-center"
                >
                    View All Dashboards
                </button>
            </div>
        </div>
    );
}
