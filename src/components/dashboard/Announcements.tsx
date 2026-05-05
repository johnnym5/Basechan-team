'use client';
import { useUser, useDoc, useMemoFirebase, useCollection, useFirestore } from "@/firebase";
import { UserProfile, Announcement } from "@/lib/types";
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

export function Announcements() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    
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

    return (
        <section className="card-bg rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-6">Announcements</h3>
            <div className="space-y-6">
                {isLoading ? (
                    Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                ) : sortedAnnouncements.map(ann => (
                    <div key={ann.id} className="pb-6 border-b border-gray-800 last:border-0 last:pb-0">
                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1 block">
                            {ann.isPinned ? '📌 Pinned Update' : 'Recent Update'}
                        </span>
                        <h4 className="text-sm font-medium mb-1 text-gray-200">{ann.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed mb-2 line-clamp-2">{ann.content}</p>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                            {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                ))}
                {!isLoading && sortedAnnouncements.length === 0 && (
                    <p className="text-center text-xs text-gray-500 py-4">No active broadcasts.</p>
                )}
            </div>
        </section>
    );
}