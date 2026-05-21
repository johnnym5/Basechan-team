'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Attendance, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInSeconds } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Timer, Clock, Activity, Coffee, LogOut, Loader2, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LiveStaffMonitorProps {
    userProfile: UserProfile;
}

export function LiveStaffMonitor({ userProfile }: LiveStaffMonitorProps) {
    const firestore = useFirestore();
    const [now, setNow] = useState(new Date());
    const today = format(new Date(), 'yyyy-MM-dd');

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('date', '==', today)
        );
    }, [firestore, userProfile.orgId, today]);

    const { data: records, isLoading } = useCollection<Attendance>(attendanceQuery);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const monitoringData = useMemo(() => {
        if (!records) return [];

        // Group by user to consolidate multiple shifts for the same person
        const userGroups = new Map<string, Attendance[]>();
        records.forEach(r => {
            const list = userGroups.get(r.userId) || [];
            list.push(r);
            userGroups.set(r.userId, list);
        });

        return Array.from(userGroups.values()).map(group => {
            // The record with the latest clock-in represents the current status
            const mainRecord = group.sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())[0];
            
            // Aggregated Metrics for the day
            let totalWorkTime = 0;
            let totalIdleTime = 0;
            let totalSessionTime = 0;
            
            group.forEach(record => {
                const start = new Date(record.clockIn);
                const end = record.clockOut ? new Date(record.clockOut) : now;
                
                // Calculate Current Break if active
                let currentBreakElapsed = 0;
                if (record.onBreak && record.breaks?.length) {
                    const lastBreak = record.breaks[record.breaks.length - 1];
                    if (!lastBreak.end) {
                        currentBreakElapsed = differenceInSeconds(now, new Date(lastBreak.start));
                    }
                }

                const totalElapsed = differenceInSeconds(end, start);
                const totalBreak = (record.totalBreak || 0) + currentBreakElapsed;
                
                // Work Time = Active segments only (minus breaks and idle)
                totalWorkTime += Math.max(0, totalElapsed - totalBreak - (record.idleTime || 0));
                totalIdleTime += (record.idleTime || 0);
                totalSessionTime += Math.max(0, totalElapsed - totalBreak);
            });

            return {
                ...mainRecord,
                workTime: totalWorkTime,
                idleTime: totalIdleTime,
                totalShiftTime: totalSessionTime,
                productivityRatio: totalSessionTime > 0 ? (totalWorkTime / totalSessionTime) * 100 : 0
            };
        }).sort((a, b) => (b.clockOut ? 0 : 1) - (a.clockOut ? 0 : 1));
    }, [records, now]);

    if (isLoading) return <Skeleton className="h-96 w-full rounded-[2rem]" />;

    return (
        <Card className="apple-glass border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            Live Personnel Monitor
                        </CardTitle>
                        <CardDescription>Consolidated performance metrics for the current shift ({today}).</CardDescription>
                    </div>
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Timer className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-secondary/10">
                        <TableRow className="border-white/5">
                            <TableHead className="text-[9px] font-black uppercase tracking-widest pl-6">Personnel</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest">Current Status</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Work Time</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 ml-auto">
                                            Idle Time <Info className="h-2 w-2 opacity-50" />
                                        </TooltipTrigger>
                                        <TooltipContent className="apple-glass-darker border-none p-2 max-w-[200px] text-[8px] font-black uppercase leading-tight">
                                            Calculated based on 5+ minutes of inactivity (no mouse, keyboard, or scroll input detected).
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Total Active</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest pr-6">Daily Ratio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monitoringData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground uppercase font-black text-[9px] tracking-widest opacity-30">
                                    No personnel detected in current cycle
                                </TableCell>
                            </TableRow>
                        ) : (
                            monitoringData.map((record) => (
                                <TableRow key={record.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                                                {record.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm leading-none">{record.userName}</p>
                                                <p className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground mt-1">First In: {format(new Date(record.clockIn), 'p')}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {record.clockOut ? (
                                            <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-muted/20 text-muted-foreground border-white/5">
                                                <LogOut className="h-2.5 w-2.5" /> Signed Out
                                            </Badge>
                                        ) : record.onBreak ? (
                                            <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse">
                                                <Coffee className="h-2.5 w-2.5" /> On Break
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Active
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-primary text-xs">
                                        {formatDuration(record.workTime)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground text-xs">
                                        {formatDuration(record.idleTime)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-black text-foreground text-xs">
                                        {formatDuration(record.totalShiftTime)}
                                    </TableCell>
                                    <TableCell className="pr-6 min-w-[120px]">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[7px] font-black uppercase text-muted-foreground tracking-tighter">
                                                <span>Ratio</span>
                                                <span>{Math.round(record.productivityRatio)}%</span>
                                            </div>
                                            <Progress 
                                                value={record.productivityRatio} 
                                                className="h-1 bg-white/5" 
                                                indicatorClassName={cn(
                                                    record.productivityRatio > 80 ? "bg-emerald-500" :
                                                    record.productivityRatio > 50 ? "bg-primary" : "bg-rose-500"
                                                )}
                                            />
                                        </div>
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