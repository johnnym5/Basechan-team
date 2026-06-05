'use client';
import { useMemo, useState, useEffect } from "react";
import type { UserProfile, Task, DailyReport, Attendance } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BarChart3, Clock, UserCheck, Trophy, Target } from "lucide-react";

interface PerformanceCardProps {
    userProfile: UserProfile | null;
}

type ReportType = 'summary' | 'tasks' | 'attendance' | 'reports';

export function PerformanceCard({ userProfile }: PerformanceCardProps) {
    const firestore = useFirestore();
    const [activeReport, setActiveReport] = useState<ReportType>('summary');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    // 1. DATA ACQUISITION: Filter for current user and organization
    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.id || !userProfile?.orgId) return null;
        return query(
            collection(firestore, 'tasks'), 
            where('orgId', '==', userProfile.orgId),
            where('assignedTo', '==', userProfile.id)
        );
    }, [firestore, userProfile?.id, userProfile?.orgId]);
    
    const reportsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.id || !userProfile?.orgId) return null;
        return query(
            collection(firestore, 'daily_reports'), 
            where('orgId', '==', userProfile.orgId),
            where('userId', '==', userProfile.id)
        );
    }, [firestore, userProfile?.id, userProfile?.orgId]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.id || !userProfile?.orgId) return null;
        return query(
            collection(firestore, 'attendance'), 
            where('orgId', '==', userProfile.orgId),
            where('userId', '==', userProfile.id)
        );
    }, [firestore, userProfile?.id, userProfile?.orgId]);

    const { data: userTasks, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery);
    const { data: userReports, isLoading: isReportsLoading } = useCollection<DailyReport>(reportsQuery);
    const { data: userAttendance, isLoading: isAttLoading } = useCollection<Attendance>(attendanceQuery);

    // 2. ANALYTICS ENGINE: Last 7 days
    const chartData = useMemo(() => {
        if (!userTasks || !userReports || !userAttendance || !mounted) return [];

        const days = eachDayOfInterval({
            start: subDays(new Date(), 6),
            end: new Date()
        });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayLabel = format(day, 'EEE');

            // Task Stats
            const completedToday = userTasks.filter(t => 
                t.status === 'ARCHIVED' && 
                t.activity.some(a => a.toStatus === 'ARCHIVED' && a.timestamp.startsWith(dateStr))
            ).length;

            // Attendance Stats (Convert seconds to hours)
            const attendanceToday = userAttendance.find(a => a.date === dateStr);
            const workHours = attendanceToday ? parseFloat(((attendanceToday.duration || 0) / 3600).toFixed(1)) : 0;

            // Daily Report Stats
            const reportSubmitted = userReports.some(r => r.reportDate === dateStr) ? 100 : 0;

            // Summary Score (Composite)
            const summaryScore = Math.min(100, (completedToday * 20) + (workHours * 10) + (reportSubmitted * 0.1));

            return {
                date: dayLabel,
                summary: Math.round(summaryScore),
                tasks: completedToday,
                attendance: workHours,
                reports: reportSubmitted,
            };
        });
    }, [userTasks, userReports, userAttendance, mounted]);

    const stats = useMemo(() => {
        if (!chartData.length) return { success: 0, tasks: 0, attendance: 0, reporting: 0 };
        const latest = chartData[chartData.length - 1];
        return {
            success: latest.summary,
            tasks: latest.tasks,
            attendance: latest.attendance,
            reporting: latest.reports
        };
    }, [chartData]);

    if (isTasksLoading || isReportsLoading || isAttLoading || !mounted) {
        return <Skeleton className="h-[300px] w-full rounded-2xl" />;
    }

    const reportConfig = {
        summary: { label: 'Summary', color: 'hsl(var(--primary))', unit: '%', icon: Trophy },
        tasks: { label: 'Tasks', color: 'hsl(var(--primary))', unit: '', icon: Target },
        attendance: { label: 'Attendance', color: '#10b981', unit: 'h', icon: Clock },
        reports: { label: 'Reporting', color: '#f59e0b', unit: '%', icon: UserCheck }
    };

    const activeConfig = reportConfig[activeReport];

    return (
        <section className="apple-glass rounded-2xl p-4 md:p-5 h-full flex flex-col animate-slide-up-fade interactive-element">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">My Performance Analytics</h3>
                <div className="flex items-center gap-2">
                    <activeConfig.icon className={cn("h-3 w-3", activeReport === 'summary' ? 'text-primary' : 'text-foreground')} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{activeConfig.label} Report</span>
                </div>
            </div>

            {/* Graph Node */}
            <div className="flex-1 min-h-[160px] w-full py-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeConfig.color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={activeConfig.color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: 900}} 
                        />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                            labelStyle={{ color: 'white', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }}
                            itemStyle={{ color: activeConfig.color, fontSize: '12px', fontWeight: 900 }}
                            formatter={(value: any) => [`${value}${activeConfig.unit}`, activeConfig.label]}
                        />
                        <Area 
                            type="monotone" 
                            dataKey={activeReport} 
                            stroke={activeConfig.color} 
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                            strokeWidth={3}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            {/* Interactive Selector Node */}
            <div className="w-full mt-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-3 text-center opacity-50">Select Operational View</p>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { id: 'summary', label: 'Summary', val: stats.success, icon: BarChart3 },
                        { id: 'tasks', label: 'Tasks', val: stats.tasks, icon: Target },
                        { id: 'attendance', label: 'Attendance', val: stats.attendance, icon: Clock },
                        { id: 'reports', label: 'Daily', val: stats.reporting, icon: UserCheck }
                    ].map((item) => (
                        <div 
                            key={item.id}
                            onClick={() => setActiveReport(item.id as ReportType)}
                            className={cn(
                                "flex flex-col items-center cursor-pointer p-2 rounded-xl transition-all group border border-transparent",
                                activeReport === item.id ? "bg-primary/10 border-primary/20 scale-105" : "hover:bg-white/5"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-black font-mono leading-none mb-1", 
                                activeReport === item.id ? "text-primary" : "text-muted-foreground"
                            )}>
                                {item.val}{item.id === 'summary' || item.id === 'reports' ? '%' : (item.id === 'attendance' ? 'h' : '')}
                            </span>
                            <span className="text-[7px] text-muted-foreground uppercase tracking-tight font-bold text-center leading-tight">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}