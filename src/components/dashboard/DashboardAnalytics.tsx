'use client';

import React, { useMemo, useState, useEffect } from "react";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { UserProfile, Task, Attendance, LeaveRequest } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Users, Clock, Calendar, CheckCircle2, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { uiEmitter } from "@/lib/ui-emitter";
import { OperationsIntelligenceBrief } from "./OperationsIntelligenceBrief";

// Dummy data for Staff Graph
const staffWeeklyData = [
  { name: 'Mon', hours: 8.2 },
  { name: 'Tue', hours: 7.5 },
  { name: 'Wed', hours: 8.0 },
  { name: 'Thu', hours: 8.5 },
  { name: 'Fri', hours: 6.0 },
];

export function DashboardAnalytics() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
        [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile || null);

    const isAdmin = permissions.canManageStaff || permissions.canManageCompany;

    if (isProfileLoading) {
        return <Skeleton className="h-[350px] w-full rounded-[2rem]" />;
    }

    if (isAdmin && userProfile) {
        return <AdminOperationsPanel userProfile={userProfile} />;
    }

    if (userProfile) {
        return <StaffPerformanceGraph userProfile={userProfile} />;
    }

    return null;
}

function AdminOperationsPanel({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const router = useRouter();
    const today = format(new Date(), 'yyyy-MM-dd');

    // 1. Fetch Today's Attendance
    const attQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'attendance'), where('orgId', '==', userProfile.orgId), where('date', '==', today))
    , [firestore, userProfile.orgId, today]);
    const { data: attendance } = useCollection<Attendance>(attQuery);

    // 2. Fetch Pending Leaves
    const leaveQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'leave_requests'), where('orgId', '==', userProfile.orgId), where('status', '==', 'PENDING'), limit(10))
    , [firestore, userProfile.orgId]);
    const { data: pendingLeaves } = useCollection<LeaveRequest>(leaveQuery);

    // 3. Fetch Pending Tasks (Awaiting Review)
    const taskQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'tasks'), where('orgId', '==', userProfile.orgId), where('status', '==', 'AWAITING_REVIEW'), limit(10))
    , [firestore, userProfile.orgId]);
    const { data: pendingTasks } = useCollection<Task>(taskQuery);

    // 4. Fetch All Staff for Intelligence Analysis
    const usersQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'users'), where('orgId', '==', userProfile.orgId))
    , [firestore, userProfile.orgId]);
    const { data: allStaff } = useCollection<UserProfile>(usersQuery);

    const stats = useMemo(() => {
        const clockedIn = attendance?.filter(a => a.clockIn && !a.clockOut).length || 0;
        const onLeave = attendance?.filter(a => a.remarks?.includes('LATE')).length || 0; // Simplified for dummy
        return { clockedIn, onLeave, absent: 2 }; // Absent is hardcoded as demo
    }, [attendance]);

    return (
        <Card className="bg-card border border-border/60 shadow-lg rounded-[2.5rem] overflow-hidden flex flex-col h-full">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Operations Command Overview
                </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* LIVE ROSTER STATUS */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Force Readiness</h3>
                        <div className="space-y-3">
                            <div
                                onClick={() => uiEmitter.emit('open-attendance-dialog')}
                                className="flex justify-between items-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold uppercase tracking-tight text-emerald-600">Clocked In</span>
                                </div>
                                <span className="text-xl font-black font-mono text-emerald-500">{stats.clockedIn}</span>
                            </div>
                            <div
                                onClick={() => uiEmitter.emit('open-attendance-dialog')}
                                className="flex justify-between items-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl cursor-pointer hover:bg-rose-500/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Users className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold uppercase tracking-tight text-rose-500">Absent</span>
                                </div>
                                <span className="text-xl font-black font-mono text-rose-500">{stats.absent}</span>
                            </div>
                            <div
                                onClick={() => uiEmitter.emit('open-leave-dialog')}
                                className="flex justify-between items-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl cursor-pointer hover:bg-amber-500/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold uppercase tracking-tight text-amber-500">On Leave</span>
                                </div>
                                <span className="text-xl font-black font-mono text-amber-500">{stats.onLeave}</span>
                            </div>
                        </div>
                    </div>

                    {/* ACTION QUEUE */}
                    <div className="space-y-4 md:border-l border-border/50 md:pl-8">
                        <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Awaiting Authorization</h3>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                            {pendingLeaves?.map(leave => (
                                <div
                                    key={leave.id}
                                    onClick={() => uiEmitter.emit('open-leave-dialog')}
                                    className="p-3 border border-border rounded-xl bg-background/50 text-[10px] font-bold uppercase flex justify-between items-center group hover:border-primary/50 transition-all cursor-pointer"
                                >
                                    <span className="truncate max-w-[120px]">{leave.userName} - {leave.leaveType}</span>
                                    <span className="text-[8px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black">LEAVE</span>
                                </div>
                            ))}
                            {pendingTasks?.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => router.push('/tasks')}
                                    className="p-3 border border-border rounded-xl bg-background/50 text-[10px] font-bold uppercase flex justify-between items-center group hover:border-primary/50 transition-all cursor-pointer"
                                >
                                    <span className="truncate max-w-[120px]">{task.title}</span>
                                    <span className="text-[8px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-black">REVIEW</span>
                                </div>
                            ))}
                            {(!pendingLeaves?.length && !pendingTasks?.length) && (
                                <div className="py-12 text-center opacity-20 uppercase font-black text-[10px]">Queue Sterile</div>
                            )}
                        </div>
                    </div>

                    {/* PERFORMANCE PULSE */}
                    <div className="md:border-l border-border/50 md:pl-8">
                        <OperationsIntelligenceBrief
                            attendanceData={attendance || []}
                            taskData={pendingTasks || []}
                            staffData={allStaff || []}
                        />
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}

function StaffPerformanceGraph({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const router = useRouter();
    const [chartData, setChartData] = useState(staffWeeklyData);

    const tasksQuery = useMemoFirebase(() =>
        query(collection(firestore!, 'tasks'), where('orgId', '==', userProfile.orgId), where('assignedTo', '==', userProfile.id), where('status', '==', 'ARCHIVED'))
    , [firestore, userProfile.id, userProfile.orgId]);
    const { data: archivedTasks } = useCollection<Task>(tasksQuery);

    return (
        <Card className="bg-card border border-border/60 shadow-lg rounded-[2.5rem] overflow-hidden flex flex-col h-full">
            <CardHeader className="bg-secondary/10 border-b border-border/50 py-4 px-8 flex flex-row justify-between items-center">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    My Weekly Operational Hours
                </CardTitle>
                <div className="flex gap-6 items-center">
                    <div
                        onClick={() => router.push('/tasks')}
                        className="flex flex-col items-end cursor-pointer group active:scale-95 transition-all"
                    >
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50 group-hover:text-primary transition-colors">Missions Deployed</span>
                        <span className="text-sm font-black font-mono text-primary">{archivedTasks?.length || 0}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            fontWeight={900}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.5 }}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            fontWeight={900}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.5 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '1rem', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                        />
                        <Bar
                            dataKey="hours"
                            fill="hsl(var(--primary))"
                            radius={[6, 6, 0, 0]}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
