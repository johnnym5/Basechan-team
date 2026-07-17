
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { UserProfile, Task, Attendance, DailyReport, Kudos, BadgeType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Medal, Users, Zap, Heart, Sparkles, Target, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const BADGE_CONFIG: Record<BadgeType, { icon: any; color: string; label: string }> = {
    TEAM_PLAYER: { icon: Users, color: "text-blue-500 bg-blue-500/10", label: "Team Player" },
    PROBLEM_SOLVER: { icon: Zap, color: "text-amber-500 bg-amber-500/10", label: "Problem Solver" },
    INNOVATOR: { icon: Sparkles, color: "text-emerald-500 bg-emerald-500/10", label: "Innovator" },
    RELENTLESS: { icon: Heart, color: "text-rose-500 bg-rose-500/10", label: "Relentless" },
};

export function PerformanceDashboard({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();

    // 1. Fetch all telemetry for this user
    const tasksQuery = useMemoFirebase(() => 
        query(collection(firestore!, 'tasks'), where('assignedTo', '==', userProfile.id))
    , [firestore, userProfile.id]);
    
    const kudosQuery = useMemoFirebase(() => 
        query(collection(firestore!, 'kudos'), where('toUserId', '==', userProfile.id))
    , [firestore, userProfile.id]);
    
    const attendanceQuery = useMemoFirebase(() => 
        query(collection(firestore!, 'attendance'), where('userId', '==', userProfile.id))
    , [firestore, userProfile.id]);

    const { data: tasks, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery);
    const { data: kudos, isLoading: isKudosLoading } = useCollection<Kudos>(kudosQuery);
    const { data: attendance, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery);

    const stats = useMemo(() => {
        if (!tasks || !kudos || !attendance) return null;

        const archivedTasks = tasks.filter(t => t.status === 'ARCHIVED');
        const approvedAttendance = attendance.filter(a => a.status === 'APPROVED');

        // Points Engine
        let points = 0;
        
        // Task Points: 10 per task, bonus 5 if LEVEL_3, bonus 5 if early (est > actual)
        archivedTasks.forEach(t => {
            points += 10;
            if (t.priority === 'LEVEL_3') points += 5;
            if (t.estimatedHours && t.actualHours && t.actualHours < t.estimatedHours) points += 5;
        });

        // Kudos Points: 20 per badge
        points += kudos.length * 20;

        // Attendance Points: 5 per day with NO LATE
        const perfectDays = approvedAttendance.filter(a => !a.remarks?.includes('LATE')).length;
        points += perfectDays * 5;

        // Group Kudos by type
        const badgeCounts = kudos.reduce((acc, k) => {
            acc[k.badgeType] = (acc[k.badgeType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalPoints: points,
            taskCount: archivedTasks.length,
            kudosCount: kudos.length,
            perfectDays,
            badgeCounts,
            recentKudos: kudos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3)
        };
    }, [tasks, kudos, attendance]);

    if (isTasksLoading || isKudosLoading || isAttLoading) {
        return <div className="space-y-6"><Skeleton className="h-48 w-full rounded-3xl" /><Skeleton className="h-96 w-full rounded-3xl" /></div>;
    }

    if (!stats) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Elite Identity Card */}
            <Card className="apple-glass border-none shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Medal className="h-48 w-48 text-primary" />
                </div>
                <CardHeader className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-primary to-blue-400 p-1">
                                <div className="h-full w-full rounded-full bg-background flex items-center justify-center font-black text-2xl">
                                    {userProfile.fullName.split(' ').map(n=>n[0]).join('')}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1.5 border-4 border-background">
                                <Trophy className="h-4 w-4 text-white" />
                            </div>
                        </div>
                        <div className="text-center md:text-left flex-1">
                            <h2 className="text-3xl font-black font-headline tracking-tighter">{userProfile.fullName}</h2>
                            <p className="text-sm font-bold uppercase tracking-widest text-primary mt-1">{userProfile.position}</p>
                            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Global Influence</span>
                                    <span className="text-2xl font-black font-mono text-foreground">{stats.totalPoints} <span className="text-sm opacity-50">PTS</span></span>
                                </div>
                                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recognition Level</span>
                                    <span className="text-2xl font-black font-mono text-emerald-500">{stats.kudosCount} <span className="text-sm opacity-50">KUDOS</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="relative z-10 pt-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            <span>Next Milestone Progress</span>
                            <span>{stats.totalPoints % 100}%</span>
                        </div>
                        <Progress value={stats.totalPoints % 100} className="h-2 bg-white/5" indicatorClassName="bg-primary shadow-[0_0_15px_hsl(var(--primary))]" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Identity Badges Grid */}
                <div className="lg:col-span-8 space-y-6">
                    <h3 className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        Mission Medals
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(BADGE_CONFIG).map(([type, config]) => {
                            const count = stats.badgeCounts[type] || 0;
                            const Icon = config.icon;
                            return (
                                <Card key={type} className={cn("apple-glass border-none transition-all hover:bg-white/5", count === 0 && "opacity-40 grayscale")}>
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className={cn("p-3 rounded-2xl shadow-inner", config.color)}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-widest leading-none">{config.label}</p>
                                            <p className="text-2xl font-black font-mono mt-1">{count}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <Card className="apple-glass border-none">
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Comms Feedback</CardTitle>
                            <CardDescription>Recognition comments from your fellow units.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.recentKudos.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground opacity-30 italic text-sm">
                                        No peer reviews recorded yet.
                                    </div>
                                ) : (
                                    stats.recentKudos.map(k => (
                                        <div key={k.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4">
                                            <div className="shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs uppercase">
                                                {k.fromUserName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm">{k.fromUserName}</span>
                                                    <span className="text-[8px] font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase">
                                                        {k.badgeType}
                                                    </span>
                                                </div>
                                                <p className="text-xs italic text-muted-foreground">"{k.message}"</p>
                                                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-2">
                                                    {format(new Date(k.timestamp), 'PP')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Performance Analytics */}
                <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Mission Telemetry
                    </h3>
                    <div className="space-y-4">
                        <Card className="bg-primary/5 border border-primary/20 rounded-3xl">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mission Completion</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black font-mono">{stats.taskCount}</span>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Missions Finalized</span>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Punctuality Score</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-4xl font-black font-mono">{stats.perfectDays}</span>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Perfect Shifts</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-6 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-center gap-3 text-amber-600 mb-2">
                                <ShieldCheck className="h-5 w-5" />
                                <span className="text-xs font-black uppercase tracking-tighter">Node Integrity</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-amber-700/80 font-medium">
                                Scores are generated automatically based on system interaction logs, task deadlines, and peer recognition badges. This record is immutable and contributes to global node rankings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
