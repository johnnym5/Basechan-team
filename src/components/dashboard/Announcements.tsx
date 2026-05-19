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
            limit(3)
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
            <section className="apple-glass rounded-2xl p-5 animate-slide-up-fade interactive-element">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Recent Updates</h3>
                <div className="space-y-4">
                    {isLoading ? (
                        Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                    ) : sortedAnnouncements.map((ann, idx) => (
                        <div 
                            key={ann.id} 
                            className="pb-4 border-b border-white/5 last:border-0 last:pb-0 cursor-pointer group"
                            onClick={() => handleViewAnnouncement(ann)}
                            style={{ animationDelay: `${350 + (idx * 50)}ms` }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {ann.isPinned && <span className="text-[7px] font-black bg-primary/20 text-primary px-1 rounded uppercase tracking-tighter">PINNED</span>}
                                <h4 className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{ann.title}</h4>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1 mb-1.5">{ann.content}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">
                                    {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {!isLoading && sortedAnnouncements.length === 0 && (
                        <p className="text-center text-[8px] text-muted-foreground py-2 uppercase font-black tracking-widest opacity-30">No new updates</p>
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
