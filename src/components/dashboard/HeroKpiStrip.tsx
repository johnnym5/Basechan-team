"use client";

import React, { useMemo } from "react";
import { Users, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile, Attendance, Task, LeaveRequest } from "@/lib/types";
import { format } from "date-fns";

interface HeroKpiStripProps {
    staffList?: UserProfile[];
    attendanceLogs?: Attendance[];
    tasks?: Task[];
    leaveRequests?: LeaveRequest[];
}

export function HeroKpiStrip({
    staffList = [],
    attendanceLogs = [],
    tasks = [],
    leaveRequests = []
}: HeroKpiStripProps) {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 1. Attendance & Active Staff Rate
    const stats = useMemo(() => {
        const totalStaff = staffList.length || 1;
        const todayAttendance = attendanceLogs.filter(a => a.date === todayStr);
        const activeClocked = todayAttendance.filter(a => a.clockIn && !a.clockOut).length;
        const attendanceRate = Math.min(100, Math.round((todayAttendance.length / totalStaff) * 100));

        // 2. Pending Approvals & Actions
        const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING').length;
        const pendingReviewTasks = tasks.filter(t => t.status === 'AWAITING_REVIEW').length;
        const totalPendingActions = pendingLeaves + pendingReviewTasks;

        // 3. Task Completion Rate
        const totalTasks = tasks.length || 1;
        const completedTasks = tasks.filter(t => t.status === 'ARCHIVED').length;
        const taskCompletionRate = Math.min(100, Math.round((completedTasks / totalTasks) * 100));

        // 4. Today's Hours Logged
        const totalSecondsLoggedToday = todayAttendance.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const hoursLoggedToday = (totalSecondsLoggedToday / 3600).toFixed(1);

        return {
            totalStaff,
            activeClocked,
            attendanceRate,
            totalPendingActions,
            pendingLeaves,
            pendingReviewTasks,
            totalTasks,
            completedTasks,
            taskCompletionRate,
            hoursLoggedToday
        };
    }, [staffList, attendanceLogs, tasks, leaveRequests, todayStr]);

    const cards = [
        {
            title: "Active Staff & Attendance",
            metric: `${stats.activeClocked} / ${stats.totalStaff}`,
            subtext: `${stats.attendanceRate}% Present Today`,
            icon: Users,
            trend: stats.attendanceRate >= 80 ? "+5.2%" : "-2.1%",
            isPositive: stats.attendanceRate >= 80,
            color: "text-emerald-500",
            bgAccent: "bg-emerald-500/10 border-emerald-500/20"
        },
        {
            title: "Pending Action Items",
            metric: `${stats.totalPendingActions}`,
            subtext: `${stats.pendingLeaves} Leaves • ${stats.pendingReviewTasks} Tasks`,
            icon: AlertCircle,
            trend: stats.totalPendingActions > 0 ? "Requires Action" : "Clear",
            isPositive: stats.totalPendingActions === 0,
            color: stats.totalPendingActions > 0 ? "text-amber-500" : "text-emerald-500",
            bgAccent: stats.totalPendingActions > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20"
        },
        {
            title: "Task Resolution Rate",
            metric: `${stats.taskCompletionRate}%`,
            subtext: `${stats.completedTasks} of ${stats.totalTasks} Tasks Resolved`,
            icon: CheckCircle2,
            trend: `${stats.taskCompletionRate}%`,
            isPositive: stats.taskCompletionRate >= 70,
            color: "text-indigo-500",
            bgAccent: "bg-indigo-500/10 border-indigo-500/20"
        },
        {
            title: "Shift Hours Today",
            metric: `${stats.hoursLoggedToday} hrs`,
            subtext: "Logged across active shifts",
            icon: Clock,
            trend: "Live",
            isPositive: true,
            color: "text-sky-500",
            bgAccent: "bg-sky-500/10 border-sky-500/20"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div
                        key={idx}
                        className="flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-card border border-border shadow-sm hover:border-primary/40 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70 truncate">
                                {card.title}
                            </span>
                            <div className={cn("p-2 rounded-xl border shrink-0", card.bgAccent)}>
                                <Icon className={cn("w-4 h-4", card.color)} />
                            </div>
                        </div>

                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl md:text-3xl font-black font-headline tracking-tighter text-foreground">
                                    {card.metric}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[9px] md:text-[10px]">
                                <span className="text-muted-foreground font-medium truncate">{card.subtext}</span>
                                <span className={cn(
                                    "font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md text-[8px] ml-2 shrink-0",
                                    card.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                    {card.trend}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
