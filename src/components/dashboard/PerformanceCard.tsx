'use client';
import { useMemo } from "react";
import type { UserProfile, Task, DailyReport, SystemConfig } from "@/lib/types";
import { uiEmitter } from "@/lib/ui-emitter";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { useSystemConfig } from "@/hooks/useSystemConfig";

interface PerformanceCardProps {
    userProfile: UserProfile;
}

export function PerformanceCard({ userProfile }: PerformanceCardProps) {
    const firestore = useFirestore();
    const { config: systemConfig } = useSystemConfig(userProfile.orgId);
    const today = format(new Date(), 'yyyy-MM-dd');

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'tasks'),
            where('orgId', '==', userProfile.orgId)
        );
    }, [firestore, userProfile]);
    const { data: allTasks } = useCollection<Task>(tasksQuery);

    const reportsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'daily_reports'),
            where('orgId', '==', userProfile.orgId),
            where('reportDate', '==', today)
        );
    }, [firestore, userProfile, today]);
    const { data: dailyReports } = useCollection<DailyReport>(reportsQuery);

    const usersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
    , [firestore, userProfile.orgId]);
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
        <section className="card-bg rounded-2xl p-6 shadow-lg h-full flex flex-col animate-slide-up-fade">
            <h3 className="text-lg font-semibold mb-6">Mission & Reporting KPIs</h3>
            <div className="flex flex-col items-center flex-1 justify-center">
                <div 
                    className="gauge-container mb-4 scale-125 cursor-pointer hover:scale-[1.3] transition-transform duration-300"
                    onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'analytics' })}
                >
                    <div className="gauge-track"></div>
                    <div className="gauge-fill" style={{ transform: `rotate(${45 + (stats.success * 1.8)}deg)` }}></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className="text-4xl font-bold">{stats.success}%</span>
                        <span className="text-[0.625rem] uppercase tracking-widest text-gray-400">Team Success</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 w-full mt-8">
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'analytics' })}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">{stats.success}%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</span>
                    </div>
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-attendance-dialog')}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">0%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Punctuality</span>
                    </div>
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog')}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">{stats.management}%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Management</span>
                    </div>
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'team-reports' })}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">{stats.reporting}%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Reporting</span>
                    </div>
                </div>
            </div>
            {systemConfig?.reporting_schedule?.required && (
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reporting Deadline</span>
                    <span className="text-xs font-bold text-amber-500">{systemConfig.reporting_schedule.deadline} TODAY</span>
                </div>
            )}
        </section>
    );
}
