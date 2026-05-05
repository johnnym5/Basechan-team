'use client';
import { useMemo } from "react";
import type { UserProfile, Task } from "@/lib/types";
import { uiEmitter } from "@/lib/ui-emitter";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface PerformanceCardProps {
    userProfile: UserProfile;
}

export function PerformanceCard({ userProfile }: PerformanceCardProps) {
    const firestore = useFirestore();

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'tasks'),
            where('orgId', '==', userProfile.orgId)
        );
    }, [firestore, userProfile]);

    const { data: allTasks } = useCollection<Task>(tasksQuery);

    const progress = useMemo(() => {
        if (!allTasks || allTasks.length === 0) return 20; 
        const completed = allTasks.filter(t => t.status === 'ARCHIVED').length;
        return Math.round((completed / allTasks.length) * 100);
    }, [allTasks]);

    return (
        <section className="card-bg rounded-2xl p-6 shadow-lg h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-6">Monthly Performance</h3>
            <div className="flex flex-col items-center flex-1 justify-center">
                <div 
                    className="gauge-container mb-4 scale-125 cursor-pointer hover:scale-[1.3] transition-transform duration-300"
                    onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'analytics' })}
                >
                    <div className="gauge-track"></div>
                    <div className="gauge-fill" style={{ transform: `rotate(${45 + (progress * 1.8)}deg)` }}></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className="text-4xl font-bold">{progress}%</span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-400">Team Success</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 w-full mt-8">
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'analytics' })}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">{progress}%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</span>
                    </div>
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-attendance-dialog')}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">93%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Attendance</span>
                    </div>
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-tasks-dialog')}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">65%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Management</span>
                    </div>
                    <div 
                        className="flex flex-col cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        onClick={() => uiEmitter.emit('open-reports-dialog', { tab: 'team-reports' })}
                    >
                        <span className="text-xl font-bold group-hover:text-primary transition-colors">20%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Reporting</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
