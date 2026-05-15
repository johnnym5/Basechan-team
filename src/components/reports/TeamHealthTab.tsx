
'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { PulseCheck, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Heart, AlertCircle, Smile, Frown, Users } from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

export function TeamHealthTab({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const today = format(new Date(), 'yyyy-MM-dd');
    const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');

    const pulseQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'pulse_checks'),
            where('orgId', '==', userProfile.orgId),
            where('date', '>=', threeDaysAgo),
            orderBy('date', 'desc')
        );
    }, [firestore, userProfile.orgId, threeDaysAgo]);

    const { data: pulses, isLoading } = useCollection<PulseCheck>(pulseQuery);

    const moodAnalytics = useMemo(() => {
        if (!pulses) return null;
        const counts = { SMOOTH: 0, HEAVY: 0, OVERWHELMED: 0 };
        const overwhelmedUsers = new Map<string, number>();

        pulses.forEach(p => {
            counts[p.mood]++;
            if (p.mood === 'OVERWHELMED') {
                overwhelmedUsers.set(p.userId, (overwhelmedUsers.get(p.userId) || 0) + 1);
            }
        });

        const atRiskUsers = Array.from(overwhelmedUsers.entries())
            .filter(([_, count]) => count >= 2)
            .map(([uid, _]) => pulses.find(p => p.userId === uid)?.userName || 'Unknown Personnel');

        return { counts, atRiskUsers };
    }, [pulses]);

    if (isLoading) return <div className="space-y-6"><Skeleton className="h-48 w-full rounded-3xl" /><Skeleton className="h-96 w-full rounded-3xl" /></div>;

    if (!moodAnalytics) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { mood: 'SMOOTH', count: moodAnalytics.counts.SMOOTH, label: 'Optimal Flow', icon: Smile, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                    { mood: 'HEAVY', count: moodAnalytics.counts.HEAVY, label: 'High Load', icon: AlertCircle, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                    { mood: 'OVERWHELMED', count: moodAnalytics.counts.OVERWHELMED, label: 'Critical Burnout', icon: Frown, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
                ].map((stat) => (
                    <Card key={stat.mood} className={cn("apple-glass border-none shadow-lg", stat.color)}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{stat.label}</p>
                                <p className="text-4xl font-black font-headline mt-1">{stat.count}</p>
                            </div>
                            <stat.icon className="h-10 w-10 opacity-40" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-4 apple-glass border-none shadow-xl bg-rose-500/5">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Heart className="h-5 w-5 text-rose-500" />
                            Burnout Radar
                        </CardTitle>
                        <CardDescription>Personnel flagging "Overwhelmed" mood patterns.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {moodAnalytics.atRiskUsers.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground opacity-30 italic text-sm">
                                    Zero units currently at high risk.
                                </div>
                            ) : (
                                moodAnalytics.atRiskUsers.map(name => (
                                    <div key={name} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                        <span className="font-bold text-sm text-rose-600">{name}</span>
                                        <Badge variant="destructive" className="ml-auto text-[8px] font-black tracking-widest">INTERVENTION REQ</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-8 apple-glass border-none shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Recent Pulse Feed
                            </CardTitle>
                            <CardDescription>Real-time organizational mood telemetry.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-96">
                            <div className="divide-y divide-white/5">
                                {pulses?.map(p => (
                                    <div key={p.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs uppercase">
                                                {p.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{p.userName}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {format(new Date(p.timestamp), 'PP p')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                "text-[9px] font-black tracking-widest uppercase py-0.5 px-2",
                                                p.mood === 'SMOOTH' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                p.mood === 'HEAVY' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                            )}
                                        >
                                            {p.mood}
                                        </Badge>
                                    </div>
                                ))}
                                {pulses?.length === 0 && (
                                    <div className="py-24 text-center text-muted-foreground opacity-30 italic text-sm">
                                        No pulse data recorded in the current window.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
