'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Task, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { Target, TrendingUp, Hourglass, Trophy, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface KPIAnalyticsProps {
    userProfile: UserProfile;
}

export function KPIAnalytics({ userProfile }: KPIAnalyticsProps) {
    const firestore = useFirestore();

    const tasksQuery = useMemoFirebase(() => {
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
                    totalActual: 0 
                };
            }
            acc[name].totalAssigned++;
            
            if (task.status === 'ARCHIVED') {
                acc[name].completed++;
                if (task.estimatedHours) acc[name].totalEstimated += task.estimatedHours;
                if (task.actualHours) acc[name].totalActual += task.actualHours;
            }
            return acc;
        }, {} as Record<string, { totalAssigned: number; completed: number; totalEstimated: number; totalActual: number }>);

        return Object.entries(userStats).map(([name, stats]) => {
            const completionRate = stats.completed / stats.totalAssigned;
            
            // Efficiency Ratio: (Total Estimated / Total Actual)
            // If they complete in exactly estimated time, ratio is 1.0.
            // If they complete faster (Actual < Estimated), ratio is > 1.0.
            let efficiencyRatio = 1.0;
            if (stats.totalActual > 0) {
                efficiencyRatio = stats.totalEstimated / stats.totalActual;
            }

            // HR Score Formula: (CompletionRate * 40) + (EfficiencyRatio * 60)
            // Normalized to a max of 100 (capping efficiency contribution at 60)
            const score = Math.round((completionRate * 40) + (Math.min(1.2, efficiencyRatio) / 1.2 * 60));

            return {
                name,
                tasksGiven: stats.totalAssigned,
                completed: stats.completed,
                estimatedHours: stats.totalEstimated,
                actualDuration: stats.totalActual,
                hrScore: score,
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
            <Card className="h-full">
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                             <Trophy className="h-5 w-5 text-amber-500" />
                             Mission Performance Board
                        </CardTitle>
                        <CardDescription>Advanced HR scoring based on task volume, speed, and standard load efficiency.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <Table>
                    <TableHeader className="bg-secondary/20">
                        <TableRow>
                            <TableHead className="font-bold">Staff Member</TableHead>
                            <TableHead className="text-center font-bold">Missions</TableHead>
                            <TableHead className="text-center font-bold">Standard Load</TableHead>
                            <TableHead className="text-center font-bold">Actual Duration</TableHead>
                            <TableHead className="text-right font-bold">HR Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {kpiData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                    No completed missions found for analysis.
                                </TableCell>
                            </TableRow>
                        ) : (
                            kpiData.map((stat, idx) => (
                                <TableRow key={stat.name} className="hover:bg-primary/5 transition-colors group">
                                    <TableCell className="font-semibold">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                                            {stat.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                                            {stat.completed} / {stat.tasksGiven}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground font-mono">
                                        {stat.estimatedHours}h
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                        <span className={cn(
                                            "flex items-center justify-center gap-1",
                                            stat.actualDuration <= stat.estimatedHours ? "text-emerald-500" : "text-amber-500"
                                        )}>
                                            <Clock className="h-3 w-3" />
                                            {stat.actualDuration}h
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn("text-2xl font-bold font-headline", getScoreColor(stat.hrScore))}>
                                            {stat.hrScore}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
