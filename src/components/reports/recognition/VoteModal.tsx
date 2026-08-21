"use client"

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Star, Loader2, Trophy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { UserProfile, AccoladeCategory, AccoladeVote } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { startOfDay } from 'date-fns';

interface VoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: UserProfile;
    nominee: { id: string; name: string };
}

/**
 * Tactical Voting Interface for Daily Accolades.
 * Enforces a strict "one vote per category per day" rule.
 */
export function VoteModal({ isOpen, onClose, currentUser, nominee }: VoteModalProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [todayVotes, setTodayVotes] = useState<string[]>([]); // categoryIds
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isVotingId, setIsVotingId] = useState<string | null>(null);

    // 1. Fetch Active Accolade Categories
    const categoriesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'accolade_categories'), where('orgId', '==', currentUser.orgId), where('isActive', '==', true)) : null
    , [firestore, currentUser.orgId]);
    const { data: categories } = useCollection<AccoladeCategory>(categoriesQuery);

    // 2. Sync Daily Voting State
    useEffect(() => {
        const fetchTodayVotes = async () => {
            if (!firestore || !currentUser.id) return;
            setIsInitialLoading(true);
            try {
                const start = startOfDay(new Date());
                const q = query(
                    collection(firestore, 'accolade_votes'),
                    where('nominatorId', '==', currentUser.id),
                    where('timestamp', '>=', start.toISOString())
                );

                const snapshot = await getDocs(q);
                const votedIds = snapshot.docs.map(doc => (doc.data() as AccoladeVote).categoryId);
                setTodayVotes(votedIds);
            } catch (e) {
                console.error("Voting sync failed:", e);
            } finally {
                setIsInitialLoading(false);
            }
        };
        if (isOpen) fetchTodayVotes();
    }, [firestore, currentUser.id, isOpen]);

    const handleVote = async (category: AccoladeCategory) => {
        if (!firestore || todayVotes.includes(category.id)) return;

        setIsVotingId(category.id);
        try {
            const vote: Omit<AccoladeVote, 'id'> = {
                orgId: currentUser.orgId,
                nominatorId: currentUser.id,
                nominatorName: currentUser.fullName,
                nomineeId: nominee.id,
                nomineeName: nominee.name,
                categoryId: category.id,
                categoryTitle: category.title,
                timestamp: new Date().toISOString()
            };

            await addDoc(collection(firestore, 'accolade_votes'), vote);

            setTodayVotes(prev => [...prev, category.id]);
            toast({ title: "Star Dispatched", description: `You've awarded ${nominee.name} a star for ${category.title}!` });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Voting Error", description: e.message });
        } finally {
            setIsVotingId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md apple-glass-darker border-none rounded-[2rem] p-8 overflow-hidden shadow-3xl">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-xl font-black font-headline tracking-tighter uppercase truncate text-white">Award Accolade</DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60 truncate">Target: {nominee.name}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-3">
                    {isInitialLoading ? (
                        <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" /></div>
                    ) : !categories || categories.length === 0 ? (
                        <div className="py-10 text-center opacity-20"><Info className="w-10 h-10 mx-auto mb-3" /><p className="text-[10px] font-black uppercase tracking-widest">No active accolade categories defined.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {categories.map(cat => {
                                const hasVoted = todayVotes.includes(cat.id);
                                const isBusy = isVotingId === cat.id;

                                return (
                                    <Button
                                        key={cat.id}
                                        variant="outline"
                                        disabled={hasVoted || !!isVotingId}
                                        onClick={() => handleVote(cat)}
                                        className={cn(
                                            "h-14 px-6 rounded-xl flex items-center justify-between border-white/5 transition-all group",
                                            hasVoted
                                                ? "bg-black/40 opacity-40 grayscale cursor-not-allowed"
                                                : "bg-white/5 hover:bg-primary/10 hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{cat.icon || '⭐'}</span>
                                            <span className="text-[11px] font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{cat.title}</span>
                                        </div>
                                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Star className={cn("w-4 h-4", hasVoted ? "fill-muted-foreground" : "text-amber-500 group-hover:scale-110 transition-transform")} />}
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-30">
                        Operational reset at 00:00. <br />Maximum 1 star per category per cycle.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
