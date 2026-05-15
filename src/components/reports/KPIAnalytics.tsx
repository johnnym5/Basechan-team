
'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Task, UserProfile, Kudos, Attendance } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { Trophy, Target, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';

interface KPIAnalyticsProps {
    userProfile: UserProfile;
}

export function KPIAnalytics({ userProfile }: KPIAnalyticsProps) {
    const firestore = useFirestore();

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.orgId) return null;
        return query(collection(firestore, 'tasks'), where('orgId', '==', userProfile.orgId));
    }, [firestore, userProfile?.orgId]);

    const kudosQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.orgId) return null;
        return query(collection(firestore, 'kudos'), where('orgId', '==', userProfile.orgId));
    }, [firestore, userProfile?.orgId]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.orgId) return null;
        return query(collection(firestore, 'attendance'), where('orgId', '==', userProfile.orgId));
    }, [firestore, userProfile?.orgId]);

    const { data: allTasks, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery);
    const { data: allKudos, isLoading: isKudosLoading } = useCollection<Kudos>(kudosQuery);
    const { data: allAttendance, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery);

    const kpiData = useMemo(() => {
        if (!allTasks || !allKudos || !allAttendance) return [];

        const userStats = {} as Record<string, { 
            tasksGiven: number; 
            completed: number; 
            totalEstimated: number; 
            totalActual: number;
            highPriorityCompleted: number;
            kudosCount: number;
            perfectDays: number;
        }>;

        // Collect distinct users from all sets
        const allUserNames = new Set([
            ...allTasks.map(t => t.assignedToName),
            ...allKudos.map(k => k.fromUserName),
            ...allAttendance.map(a => a.userName)
        ]);

        allUserNames.forEach(name => {
            if (name) userStats[name] = { tasksGiven: 0, completed: 0, totalEstimated: 0, totalActual: 0, highPriorityCompleted: 0, kudosCount: 0, perfectDays: 0 };
        });

        allTasks.forEach(task => {
            const name = task.assignedToName;
            if (!userStats[name]) return;
            userStats[name].tasksGiven++;
            if (task.status === 'ARCHIVED') {
                userStats[name].completed++;
                if (task.estimatedHours) userStats[name].totalEstimated += task.estimatedHours;
                if (task.actualHours) userStats[name].totalActual += task.actualHours;
                if (task.priority === 'LEVEL_3') userStats[name].highPriorityCompleted++;
            }
        });

        allKudos.forEach(k => {
            const recipient = allTasks.find(t => t.assignedTo === k.toUserId)?.assignedToName || 
                            allAttendance.find(a => a.userId === k.toUserId)?.userName;
            if (recipient && userStats[recipient]) {
                userStats[recipient].kudosCount++;
            }
        });

        allAttendance.forEach(a => {
            if (userStats[a.userName] && !a.remarks?.includes('LATE')) {
                userStats[a.userName].perfectDays++;
            }
        });

        return Object.entries(userStats).map(([name, stats]) => {
            let efficiencyRatio = 1.0;
            if (stats.totalActual > 0 && stats.totalEstimated > 0) {
                efficiencyRatio = Math.min(1.5, stats.totalEstimated / stats.totalActual);
            }

            // POINT CALCULATION:
            // (Tasks * 10) + (HP Bonus * 5) + (Kudos * 20) + (Perfect Days * 5)
            const score = (stats.completed * 10) + 
                          (stats.highPriorityCompleted * 5) + 
                          (stats.kudosCount * 20) + 
                          (stats.perfectDays * 5);

            return {
                name,
                tasksGiven: stats.tasksGiven,
                completed: stats.completed,
                efficiency: Math.round(efficiencyRatio * 100),
                hrScore: score,
                kudos: stats.kudosCount
            };
        }).sort((a, b) => b.hrScore - a.hrScore);
    }, [allTasks, allKudos, allAttendance]);

    if (isTasksLoading || isKudosLoading || isAttLoading) {
        return (
            <Card className="h-full border-none bg-card/30 backdrop-blur-xl">
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent><div className="space-y-4">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div></CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col border-none bg-card/30 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                             <Trophy className="h-5 w-5 text-amber-500" />
                             Elite Operational Standings
                        </CardTitle>
                        <CardDescription>Personnel influence rankings based on mission success and peer recognition.</CardDescription>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Ratings</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-secondary/10">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="font-black uppercase tracking-[0.2em] text-[10px]">Rank & Unit</TableHead>
                                <TableHead className="text-center font-black uppercase tracking-[0.2em] text-[10px]">Efficiency</TableHead>
                                <TableHead className="text-center font-black uppercase tracking-[0.2em] text-[10px]">Influence</TableHead>
                                <TableHead className="text-right font-black uppercase tracking-[0.2em] text-[10px]">Total Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {kpiData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-24 text-muted-foreground opacity-30">
                                        <AlertCircle className="h-10 w-10 mx-auto mb-4" />
                                        <p className="font-black uppercase tracking-widest">No Intelligence Data</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                kpiData.map((stat, idx) => (
                                    <TableRow key={stat.name} className="hover:bg-primary/5 transition-colors border-white/5 group">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg",
                                                    idx === 0 ? "bg-amber-500 text-amber-950 ring-2 ring-amber-500/20" : 
                                                    idx === 1 ? "bg-slate-300 text-slate-900 ring-2 ring-slate-300/20" :
                                                    idx === 2 ? "bg-amber-700 text-white ring-2 ring-amber-700/20" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm">{stat.name}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{stat.completed} Missions</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-black font-mono text-[10px]">{stat.efficiency}%</span>
                                                <Progress value={stat.efficiency} className="w-16 h-1" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-xs text-primary">{stat.kudos}</span>
                                                <span className="text-[7px] font-black uppercase text-muted-foreground tracking-tighter">Identity Badges</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    "text-3xl font-black font-headline tracking-tighter",
                                                    idx === 0 ? "text-amber-500" : "text-foreground"
                                                )}>
                                                    {stat.hrScore}
                                                </span>
                                                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">Influence Points</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
