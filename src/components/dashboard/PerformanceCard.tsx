'use client';
import { useMemo } from "react";
import type { UserProfile, Task, DailyReport, SystemConfig } from "@/lib/types";
import { uiEmitter } from "@/lib/ui-emitter";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { ORG_ID } from "@/lib/config";

interface PerformanceCardProps {
    userProfile: UserProfile | null;
}

export function PerformanceCard({ userProfile }: PerformanceCardProps) {
    const firestore = useFirestore();
    const orgId = userProfile?.orgId || ORG_ID;
    const { config: systemConfig } = useSystemConfig(orgId);
    const today = format(new Date(), 'yyyy-MM-dd');

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'tasks'),
            where('orgId', '==', orgId)
        );
    }, [firestore, orgId]);
    const { data: allTasks } = useCollection<Task>(tasksQuery);

    const reportsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'daily_reports'),
            where('orgId', '==', orgId),
            where('reportDate', '==', today)
        );
    }, [firestore, orgId, today]);
    const { data: dailyReports } = useCollection<DailyReport>(reportsQuery);

    const usersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', orgId)) : null
    , [firestore, orgId]);
    const { data: orgUsers } = useCollection<UserProfile>(usersQuery);

    const stats = useMemo(() => {
        const result = { success: 0, management: 0, reporting: 0 };
        
        if (allTasks && allTasks.length > 0) {
            const completed = allTasks.filter(t => t.status === 'ARCHIVED').length;
            result.success = Math.round((completed / allTasks.length) * 100);
            
            const started = allTasks.filter(t => t.status !== 'QUEUED').length;
            result.management = Math.round((started / allTasks.length) * 100);
        }

        if (dailyReports && orgUsers && orgUsers.length > 0) {
            const totalStaff = orgUsers.length;
            const submittedCount = dailyReports.length;
            result.reporting = Math.round((submittedCount / totalStaff) * 100);
        }

        return result;
    }, [allTasks, dailyReports, orgUsers]);

    return (
        <section className="apple-glass rounded-2xl p-4 md:p-5 h-full flex flex-col animate-slide-up-fade interactive-element">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Work Performance Overview</h3>
            <div className="flex flex-col items-center flex-1 justify-center py-2">
                <div 
                    className="gauge-container mb-2 scale-[0.75] sm:scale-90 md:scale-100 cursor-pointer hover:scale-[1.1] transition-transform duration-300"
                    onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'analytics' })}
                >
                    <div className="gauge-track"></div>
                    <div className="gauge-fill" style={{ transform: `rotate(${45 + (stats.success * 1.8)}deg)` }}></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className="text-xl md:text-2xl font-black font-mono">{stats.success}%</span>
                        <span className="text-[8px] uppercase tracking-widest text-muted-foreground">Completed Tasks</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 w-full mt-4">
                    <div 
                        className="flex flex-col items-center cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'analytics' })}
                    >
                        <span className="text-sm font-black font-mono group-hover:text-primary transition-colors">{stats.success}%</span>
                        <span className="text-[7px] text-muted-foreground uppercase tracking-tight font-bold">Success</span>
                    </div>
                    <div 
                        className="flex flex-col items-center cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-attendance-dialog')}
                    >
                        <span className="text-sm font-black font-mono group-hover:text-primary transition-colors">0%</span>
                        <span className="text-[7px] text-muted-foreground uppercase tracking-tight font-bold">Punctual</span>
                    </div>
                    <div 
                        className="flex flex-col items-center cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog')}
                    >
                        <span className="text-sm font-black font-mono group-hover:text-primary transition-colors">{stats.management}%</span>
                        <span className="text-[7px] text-muted-foreground uppercase tracking-tight font-bold">Activity</span>
                    </div>
                    <div 
                        className="flex flex-col items-center cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'team-reports' })}
                    >
                        <span className="text-sm font-black font-mono group-hover:text-primary transition-colors">{stats.reporting}%</span>
                        <span className="text-[7px] text-muted-foreground uppercase tracking-tight font-bold">Reports</span>
                    </div>
                </div>
            </div>
            {systemConfig?.reporting_schedule?.required && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Report Deadline</span>
                    <span className="text-[9px] font-black text-amber-500">{systemConfig.reporting_schedule.deadline} TODAY</span>
                </div>
            )}
        </section>
    );
}
