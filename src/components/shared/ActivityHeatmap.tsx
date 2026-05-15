
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format, subMonths, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import type { ActivityPoint } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

interface ActivityHeatmapProps {
    userId: string;
    orgId: string;
}

export function ActivityHeatmap({ userId, orgId }: ActivityHeatmapProps) {
    const firestore = useFirestore();
    const sixMonthsAgo = useMemo(() => format(subMonths(new Date(), 5), 'yyyy-MM-dd'), []);

    const activityQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'activity_points'),
            where('userId', '==', userId),
            where('date', '>=', sixMonthsAgo),
            orderBy('date', 'asc')
        );
    }, [firestore, userId, sixMonthsAgo]);

    const { data: points, isLoading } = useCollection<ActivityPoint>(activityQuery);

    const heatmapData = useMemo(() => {
        const endDate = new Date();
        const startDate = subMonths(endDate, 5);
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });

        return allDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const match = points?.find(p => p.date === dateStr);
            return {
                date: day,
                dateStr,
                points: match?.points || 0
            };
        });
    }, [points]);

    const getColorScale = (pts: number) => {
        if (pts === 0) return "bg-secondary/20";
        if (pts < 5) return "bg-emerald-900/40";
        if (pts < 15) return "bg-emerald-700/60";
        if (pts < 30) return "bg-emerald-500";
        return "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.5)]";
    };

    if (isLoading) return <Skeleton className="w-full h-32 rounded-xl" />;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operational Consistency (6 Months)</h4>
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-sm bg-secondary/20" />
                        <div className="h-2 w-2 rounded-sm bg-emerald-900/40" />
                        <div className="h-2 w-2 rounded-sm bg-emerald-700/60" />
                        <div className="h-2 w-2 rounded-sm bg-emerald-500" />
                        <div className="h-2 w-2 rounded-sm bg-emerald-300" />
                    </div>
                    <span>More</span>
                </div>
            </div>

            <TooltipProvider delayDuration={0}>
                <div className="flex flex-wrap gap-1">
                    {heatmapData.map((day) => (
                        <Tooltip key={day.dateStr}>
                            <TooltipTrigger asChild>
                                <div 
                                    className={cn(
                                        "h-3 w-3 rounded-[2px] transition-all hover:scale-125 hover:z-10 cursor-crosshair",
                                        getColorScale(day.points)
                                    )} 
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold uppercase p-2 border-none apple-glass-darker">
                                {day.points} Points • {format(day.date, 'MMM d, yyyy')}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </TooltipProvider>
        </div>
    );
}
