'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Task, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { Target } from 'lucide-react';

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
            if (!acc[task.assignedToName]) {
                acc[task.assignedToName] = { total: 0, completed: 0 };
            }
            acc[task.assignedToName].total++;
            if (task.status === 'ARCHIVED') {
                acc[task.assignedToName].completed++;
            }
            return acc;
        }, {} as Record<string, { total: number; completed: number }>);

        return Object.entries(userStats).map(([name, stats]) => ({
            name: name.split(' ')[0],
            "Success Rate": Math.round((stats.completed / stats.total) * 100),
            "Tasks Assigned": stats.total,
            "Completed": stats.completed,
        })).sort((a, b) => b["Success Rate"] - a["Success Rate"]);
    }, [allTasks]);

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
                        <CardTitle className="text-xl">Mission KPIs</CardTitle>
                        <CardDescription>Task completion rate and success metrics by team member.</CardDescription>
                    </div>
                    <Target className="h-5 w-5 text-emerald-500 opacity-50" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kpiData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                        <XAxis type="number" unit="%" axisLine={false} tickLine={false} domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                        <Tooltip 
                             contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                             cursor={{fill: 'hsl(var(--secondary))'}}
                        />
                        <Legend />
                        <Bar dataKey="Success Rate" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={25} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
