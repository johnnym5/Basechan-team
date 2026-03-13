'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { UserProfile, Task } from "@/lib/types";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { uiEmitter } from "@/lib/ui-emitter";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Skeleton } from "../ui/skeleton";


interface PerformanceCardProps {
    userProfile: UserProfile;
}

export function PerformanceCard({ userProfile }: PerformanceCardProps) {
    const firestore = useFirestore();
    const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'tasks'),
            where('assignedTo', '==', userProfile.id)
        );
    }, [firestore, userProfile]);

    const { data: allTasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

    const { monthlyProgress, isLoading: isProgressLoading } = useMemo(() => {
        if (areTasksLoading || isConfigLoading) return { monthlyProgress: 0, isLoading: true };
        if (!allTasks) return { monthlyProgress: 0, isLoading: false };

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const monthlyTasks = allTasks.filter(task => {
            if (!task.createdAt) return false;
            const taskDate = new Date(task.createdAt);
            return isWithinInterval(taskDate, { start: monthStart, end: monthEnd });
        });

        if (monthlyTasks.length === 0) {
            return { monthlyProgress: 0, isLoading: false };
        }

        const completedTasks = monthlyTasks.filter(task => task.status === 'ARCHIVED').length;
        const progress = Math.round((completedTasks / monthlyTasks.length) * 100);

        return { monthlyProgress: progress, isLoading: false };
    }, [allTasks, areTasksLoading, isConfigLoading]);


    return (
        <Card className="bg-primary/90 text-primary-foreground h-full flex flex-col justify-between">
            <div>
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold tracking-wider uppercase">Performance Overview</CardTitle>
                        <TrendingUp className="h-5 w-5 text-primary-foreground/70" />
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="flex items-end justify-between">
                        {isProgressLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-20 bg-white/20" />
                                <Skeleton className="h-4 w-40 bg-white/20" />
                            </div>
                        ) : (
                            <div>
                                <p className="text-4xl font-bold font-headline">{monthlyProgress}%</p>
                                <p className="text-sm text-primary-foreground/80">Monthly Target</p>
                            </div>
                        )}
                        <Button 
                            size="sm"
                            variant="secondary" 
                            className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                            onClick={() => uiEmitter.emit('open-reports-dialog')}
                        >
                            Details
                        </Button>
                    </div>
                </CardContent>
            </div>
            <CardFooter className="p-4 pt-0">
                 {isProgressLoading ? (
                     <Skeleton className="h-2 w-full bg-white/20" />
                 ) : (
                    <Progress value={monthlyProgress} className="h-2 bg-primary-foreground/20" indicatorClassName="bg-primary-foreground" />
                 )}
            </CardFooter>
        </Card>
    );
}
