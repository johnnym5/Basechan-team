'use client';
import { useUser, useDoc, useMemoFirebase, useCollection, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { UserProfile, Announcement } from "@/lib/types";
import { collection, doc, query, where, orderBy, limit, arrayUnion } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { AnnouncementDetailDialog } from "./AnnouncementDetailDialog";

export function Announcements() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    
    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, "users", authUser.uid) : null,
    [firestore, authUser]);
    
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile || !authUser) return null;
        return query(
            collection(firestore, 'announcements'),
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }, [firestore, userProfile, authUser]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    const sortedAnnouncements = useMemo(() => {
        if (!announcements) return [];
        return [...announcements].sort((a, b) => b.isPinned ? 1 : -1);
    }, [announcements]);

    const handleViewAnnouncement = (ann: Announcement) => {
        if (firestore && authUser && !ann.viewedBy?.includes(authUser.uid)) {
            const annRef = doc(firestore, 'announcements', ann.id);
            updateDocumentNonBlocking(annRef, {
                viewedBy: arrayUnion(authUser.uid)
            });
        }
        setSelectedAnnouncement(ann);
    };

    const isAdmin = userProfile?.role === 'ORG_ADMIN' || userProfile?.role === 'MANAGING_DIRECTOR' || userProfile?.role === 'HR_MANAGER';

    return (
        <>
            <section className="card-bg rounded-2xl p-6 shadow-lg animate-slide-up-fade" style={{ animationDelay: '300ms' }}>
                <h3 className="text-lg font-bold font-headline tracking-tight mb-6">Announcements</h3>
                <div className="space-y-6">
                    {isLoading ? (
                        Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                    ) : sortedAnnouncements.map((ann, idx) => (
                        <div 
                            key={ann.id} 
                            className="pb-6 border-b last:border-0 last:pb-0 cursor-pointer group interactive-element"
                            onClick={() => handleViewAnnouncement(ann)}
                            style={{ animationDelay: `${350 + (idx * 50)}ms` }}
                        >
                            <span className="text-[0.625rem] text-primary font-bold uppercase tracking-widest mb-1 block group-hover:text-blue-400 transition-colors">
                                {ann.isPinned ? '📌 Pinned Update' : 'Recent Update'}
                            </span>
                            <h4 className="text-sm font-bold mb-1 text-foreground group-hover:text-primary transition-colors">{ann.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{ann.content}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[0.625rem] text-muted-foreground uppercase tracking-widest font-bold">
                                    {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                                </span>
                                {isAdmin && (
                                    <span className="text-[0.625rem] text-muted-foreground flex items-center gap-1 bg-primary/5 px-1.5 py-0.5 rounded font-bold">
                                        <span className="material-symbols-outlined text-[0.75rem]">visibility</span>
                                        {ann.viewedBy?.length || 0}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {!isLoading && sortedAnnouncements.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-4 italic">No active broadcasts.</p>
                    )}
                </div>
            </section>

            {selectedAnnouncement && userProfile && (
                <AnnouncementDetailDialog
                    announcement={selectedAnnouncement}
                    isOpen={!!selectedAnnouncement}
                    onOpenChange={(open) => !open && setSelectedAnnouncement(null)}
                    userProfile={userProfile}
                />
            )}
        </>
    );
}
