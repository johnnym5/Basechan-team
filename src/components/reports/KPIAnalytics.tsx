
'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Task, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { Trophy, Clock, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

interface KPIAnalyticsProps {
    userProfile: UserProfile;
}

export function KPIAnalytics({ userProfile }: KPIAnalyticsProps) {
    const firestore = useFirestore();

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'tasks'),
            where('orgId', '==', userProfile.orgId)
        )
    }, [firestore, userProfile.orgId]);

    const { data: allTasks, isLoading } = useCollection<Task>(tasksQuery);

    const kpiData = useMemo(() => {
        if (!allTasks) return [];

        const userStats = allTasks.reduce((acc, task) => {
            const name = task.assignedToName;
            if (!acc[name]) {
                acc[name] = { 
                    totalAssigned: 0, 
                    completed: 0, 
                    totalEstimated: 0, 
                    totalActual: 0,
                    highPriorityCompleted: 0
                };
            }
            acc[name].totalAssigned++;
            
            if (task.status === 'ARCHIVED') {
                acc[name].completed++;
                if (task.estimatedHours) acc[name].totalEstimated += task.estimatedHours;
                if (task.actualHours) acc[name].totalActual += task.actualHours;
                if (task.priority === 'LEVEL_3') acc[name].highPriorityCompleted++;
            }
            return acc;
        }, {} as Record<string, { totalAssigned: number; completed: number; totalEstimated: number; totalActual: number, highPriorityCompleted: number }>);

        return Object.entries(userStats).map(([name, stats]) => {
            const completionRate = stats.completed / stats.totalAssigned;
            
            // Efficiency Ratio: (Total Estimated / Total Actual)
            // Capped at 1.5 to prevent outliers skewing the scores too heavily
            let efficiencyRatio = 1.0;
            if (stats.totalActual > 0 && stats.totalEstimated > 0) {
                efficiencyRatio = Math.min(1.5, stats.totalEstimated / stats.totalActual);
            }

            // High Priority Bonus (up to 10 points)
            const hpBonus = Math.min(10, stats.highPriorityCompleted * 2);

            // HR Score Formula: (CompletionRate * 50) + (EfficiencyRatio / 1.5 * 40) + Bonus
            const score = Math.round((completionRate * 50) + ((efficiencyRatio / 1.5) * 40) + hpBonus);

            return {
                name,
                tasksGiven: stats.totalAssigned,
                completed: stats.completed,
                estimatedHours: stats.totalEstimated,
                actualDuration: stats.totalActual,
                efficiency: Math.round(efficiencyRatio * 100),
                hrScore: Math.min(100, score),
            };
        }).sort((a, b) => b.hrScore - a.hrScore);
    }, [allTasks]);

    const getScoreColor = (score: number) => {
        if (score >= 85) return "text-emerald-400";
        if (score >= 70) return "text-amber-400";
        return "text-rose-400";
    };

    if (isLoading) {
        return (
            <Card className="h-full border-white/5 bg-card/30 backdrop-blur-xl">
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                             <Trophy className="h-5 w-5 text-amber-500" />
                             Mission Performance Board
                        </CardTitle>
                        <CardDescription>Personnel efficiency rankings based on mission completion speed and workload weight.</CardDescription>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Live Rankings</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-secondary/10">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Staff Member</TableHead>
                                <TableHead className="text-center font-bold uppercase tracking-widest text-[10px]">Workload</TableHead>
                                <TableHead className="text-center font-bold uppercase tracking-widest text-[10px]">Efficiency</TableHead>
                                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">HR Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {kpiData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-24 text-muted-foreground">
                                        <AlertCircle className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                        <p className="font-semibold">Insufficient Data</p>
                                        <p className="text-xs">Archives must be populated to generate efficiency scores.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                kpiData.map((stat, idx) => (
                                    <TableRow key={stat.name} className="hover:bg-primary/5 transition-colors border-white/5 group">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg",
                                                    idx === 0 ? "bg-amber-500 text-amber-950" : 
                                                    idx === 1 ? "bg-slate-400 text-slate-950" :
                                                    idx === 2 ? "bg-amber-700 text-amber-50" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{stat.name}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{stat.completed} / {stat.tasksGiven} Missions</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-mono text-xs font-bold">{stat.actualDuration}h <span className="text-[10px] text-muted-foreground">ACTUAL</span></span>
                                                <Progress value={(stat.actualDuration / (stat.estimatedHours || 1)) * 100} className="w-16 h-1" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "font-mono text-[10px] border-none px-2 py-0.5",
                                                stat.efficiency >= 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                            )}>
                                                {stat.efficiency}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex flex-col items-end">
                                                <span className={cn("text-3xl font-black font-headline tracking-tighter", getScoreColor(stat.hrScore))}>
                                                    {stat.hrScore}
                                                </span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Rating</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
