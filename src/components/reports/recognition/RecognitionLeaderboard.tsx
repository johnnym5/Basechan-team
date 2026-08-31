"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Crown, Sparkles, Heart, Star, User } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format, startOfWeek, startOfMonth, isWithinInterval, parseISO, endOfDay, startOfDay } from "date-fns"
import type { UserProfile, AccoladeVote } from "@/lib/types"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { VoteModal } from "./VoteModal"
import { type ViewScope } from "../../shared/DateScopePicker"
import { useSystemConfigs } from "@/hooks/useSystemConfigs"

interface RecognitionLeaderboardProps {
    currentUser: UserProfile;
    staffList: UserProfile[];
    timeFilter: { mode: ViewScope, referenceDate: Date };
}

/**
 * Dynamic Recognition Leaderboard with Top Performer Hero Banner.
 * Aggregates accolade votes based on tactical time windows.
 */
export function RecognitionLeaderboard({ currentUser, staffList, timeFilter }: RecognitionLeaderboardProps) {
    const firestore = useFirestore();
    const [votingNominee, setVotingNominee] = useState<{ id: string; name: string } | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");

    // 1. Fetch All Accolade Votes & Categories
    const votesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'accolade_votes'), where('orgId', '==', currentUser.orgId)) : null
    , [firestore, currentUser.orgId]);
    const { data: votes = [] } = useCollection<AccoladeVote>(votesQuery);

    // Fetch dynamic award categories from system_configs
    const { data: dynamicCategories, loading: isCategoriesLoading } = useSystemConfigs('award_categories', currentUser.orgId);

    // Legacy Collection Fetching (Migration Support)
    const legacyCategoriesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'accolade_categories'), where('orgId', '==', currentUser.orgId), where('isActive', '==', true)) : null
    , [firestore, currentUser.orgId]);
    const { data: legacyCategories } = useCollection<any>(legacyCategoriesQuery);

    const categories = useMemo(() => {
        const dynamic = (dynamicCategories || []).map(c => ({ id: c.id, title: c.name, icon: c.emoji }));
        const legacy = (legacyCategories || []).map(c => ({ id: c.id, title: c.title, icon: c.icon }));
        return [...dynamic, ...legacy];
    }, [dynamicCategories, legacyCategories]);

    // 2. Tactical Data Aggregation
    const leaderboardData = useMemo(() => {
        let start: Date;
        const now = new Date();

        if (timeFilter.mode === 'WEEK') {
            start = startOfWeek(timeFilter.referenceDate, { weekStartsOn: 1 });
        } else if (timeFilter.mode === 'MONTH') {
            start = startOfMonth(timeFilter.referenceDate);
        } else {
            start = new Date(2000, 0, 1); // Genesis
        }

        const interval = { start: startOfDay(start), end: endOfDay(now) };

        // Filter valid votes in period and category
        const periodVotes = (votes || []).filter(v => {
            const inTime = isWithinInterval(parseISO(v.timestamp), interval);
            const inCategory = selectedCategoryId === "ALL" || v.categoryId === selectedCategoryId;
            return inTime && inCategory;
        });

        // Aggregate by Nominee
        const aggregation = (staffList || [])
            .filter(s => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR'].includes(s.role))
            .map(staff => {
                const myVotes = periodVotes.filter(v => v.nomineeId === staff.id);
                return {
                    id: staff.id,
                    name: staff.fullName,
                    department: staff.departmentName || "Operations",
                    totalStars: myVotes.length,
                    status: staff.status,
                    isArchived: (staff as any).isArchived
                };
            })
            .sort((a, b) => b.totalStars - a.totalStars);

        return aggregation;
    }, [votes, staffList, timeFilter, selectedCategoryId]);

    const topPerformer = leaderboardData[0] && leaderboardData[0].totalStars > 0 ? leaderboardData[0] : null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* 1. THE HERO CHAMPION BANNER */}
            {topPerformer && (
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-black/40 to-primary/5 border border-amber-500/30 rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between group shadow-3xl">

                    {/* Atmospheric Glow */}
                    <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/20 blur-[120px] rounded-full pointer-events-none group-hover:bg-amber-500/30 transition-all duration-1000"></div>
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>

                    <div className="flex items-center gap-8 relative z-10">
                        {/* Avatar / Trophy Portal */}
                        <div className="relative">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-secondary border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.2)] group-hover:scale-105 group-hover:rotate-2 transition-all duration-500">
                                <span className="text-4xl md:text-5xl font-black font-headline text-amber-500">{topPerformer.name.charAt(0)}</span>
                            </div>
                            <div className="absolute -top-4 -right-4 bg-amber-500 text-black p-2.5 rounded-2xl shadow-2xl animate-bounce">
                                <Crown className="w-6 h-6 fill-current" />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">
                                    Most Recognised Staff
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black font-headline text-white tracking-tighter uppercase leading-none">{topPerformer.name}</h1>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-white/10 text-white border-white/10 text-[9px] font-black uppercase tracking-widest px-3">{topPerformer.department}</Badge>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Status: Dominating</span>
                            </div>
                        </div>
                    </div>

                    {/* Elite Score Display */}
                    <div className="mt-8 md:mt-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl border border-amber-500/20 px-10 py-6 rounded-[2rem] relative z-10 shadow-inner group-hover:border-amber-500/40 transition-colors">
                        <span className="text-5xl md:text-6xl font-black font-headline text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700">
                            {topPerformer.totalStars}
                        </span>
                        <div className="flex flex-col items-center gap-1 mt-2">
                            <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.3em]">Recognition Points</span>
                            <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={cn("w-2 h-2", i < topPerformer.totalStars % 6 ? "text-amber-500 fill-amber-500" : "text-white/10")} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. THE LEADERBOARD GRID */}
            <Card className="apple-glass border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col h-auto min-h-[500px]">
                <CardHeader className="border-b border-white/5 pb-4 md:pb-6 shrink-0 bg-white/5 px-8 pt-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-3 text-white">
                                <Trophy className="w-6 h-6 text-primary" /> Performance Standings
                            </CardTitle>
                            <CardDescription className="text-[9px] font-black uppercase tracking-widest opacity-60">Verified peer accolades for {timeFilter.mode.replace('_', ' ')} cycle.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger className="w-full sm:w-[220px] h-10 rounded-xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent className="apple-glass-darker border-none">
                                    <SelectItem value="ALL" className="text-[10px] font-bold uppercase p-3">Most Recognised Staff</SelectItem>
                                    {(categories || []).map(cat => (
                                        <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-bold uppercase p-3">{cat.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[8px] font-black tracking-widest uppercase px-3 py-1">Tactical Stream Active</Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse min-w-[700px]">
                        <thead className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-20">
                            <tr className="border-b border-white/5">
                                <th className="px-8 py-5 tracking-[0.2em]">Rank & Personnel</th>
                                <th className="px-8 py-5 text-center tracking-[0.2em] text-primary">Award Count</th>
                                <th className="px-8 py-5 text-center tracking-[0.2em]">Department</th>
                                <th className="px-8 py-5 text-right tracking-[0.2em]">Accolade Feed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-black/10">
                            {leaderboardData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center opacity-30 italic text-[11px] font-black uppercase tracking-[0.3em]">Awaiting tactical evaluation logs...</td>
                                </tr>
                            ) : leaderboardData.map((staff, idx) => (
                                <tr key={staff.id} className="hover:bg-white/5 transition-all group h-20">
                                    <td className="px-8 py-4 flex items-center gap-5">
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-inner shrink-0 border-2 transition-transform group-hover:scale-110",
                                            idx === 0 ? 'bg-amber-500 border-amber-400 text-black' :
                                            idx === 1 ? 'bg-slate-400 border-slate-300 text-black' :
                                            idx === 2 ? 'bg-orange-700 border-orange-600 text-white' :
                                            'bg-secondary/30 border-white/5 text-muted-foreground'
                                        )}>
                                            {idx === 0 ? <Crown className="w-5 h-5" /> : idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-black text-sm text-white uppercase tracking-tight truncate block group-hover:text-primary transition-colors">
                                                {staff.name} {staff.id === currentUser?.id && <span className="text-primary font-black ml-1">(YOU)</span>}
                                            </span>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest",
                                                staff.status === 'ONLINE' ? "text-emerald-500" : "text-muted-foreground opacity-40"
                                            )}>{staff.status || 'Offline'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={cn(
                                                "text-2xl font-black font-headline group-hover:scale-125 transition-transform",
                                                staff.totalStars > 0 ? "text-white" : "text-muted-foreground opacity-20"
                                            )}>
                                                {staff.totalStars}
                                            </span>
                                            <div className="flex gap-0.5">
                                                {Array.from({ length: 3 }).map((_, i) => (
                                                    <Star key={i} className={cn("w-2 h-2", staff.totalStars > i ? "text-amber-500 fill-amber-500" : "text-white/5")} />
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase border-white/10 opacity-60 px-3">{staff.department}</Badge>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        {staff.id !== currentUser?.id ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setVotingNominee({ id: staff.id, name: staff.name })}
                                                className="h-10 px-4 rounded-xl bg-primary/5 hover:bg-rose-500 hover:text-white text-primary border border-primary/10 hover:border-rose-500 transition-all active:scale-95 group/btn"
                                            >
                                                <Heart className="w-4 h-4 mr-2 group-hover/btn:fill-current" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Award Star</span>
                                            </Button>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2 text-[9px] font-black uppercase text-muted-foreground opacity-20 italic">
                                                <User className="w-3 h-3" /> Self Record Locked
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* 3. VOTE MODAL PORTAL */}
            {votingNominee && (
                <VoteModal
                    isOpen={!!votingNominee}
                    onClose={() => setVotingNominee(null)}
                    currentUser={currentUser}
                    nominee={votingNominee}
                />
            )}
        </div>
    );
}
