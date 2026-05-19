'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Task, UserProfile, Permissions } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { uiEmitter } from "@/lib/ui-emitter";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { ORG_ID } from "@/lib/config";

interface DashboardTaskListProps {
    userProfile: UserProfile | null;
    permissions: Permissions;
}

export function DashboardTaskList({ userProfile, permissions }: DashboardTaskListProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();
    const orgId = userProfile?.orgId || ORG_ID;

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        const tasksRef = collection(firestore, 'tasks');
        
        if (permissions.canAccessAllTasks || isSuperAdmin || !userProfile) {
            return query(
                tasksRef,
                where('orgId', '==', orgId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
        } else {
            return query(
                tasksRef,
                where('assignedTo', '==', userProfile.id),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
        }
    }, [firestore, userProfile, permissions.canAccessAllTasks, isSuperAdmin, orgId]);

    const { data: allTasks, isLoading } = useCollection<Task>(tasksQuery);
    
    // Filter for active tasks on the client
    const tasks = allTasks?.filter(t => t.status !== 'ARCHIVED').slice(0, 10);

  return (
    <section className="apple-glass rounded-2xl p-5 h-full animate-slide-up-fade overflow-hidden flex flex-col" style={{ animationDelay: '100ms' }}>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Active Tasks</h3>
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-muted-foreground text-[8px] uppercase tracking-[0.2em] border-b border-white/5">
                        <th className="pb-3 font-black">Priority</th>
                        <th className="pb-3 font-black">Task Name</th>
                        <th className="pb-3 font-black">Assigned To</th>
                        <th className="pb-3 font-black">Due Date</th>
                    </tr>
                </thead>
                <tbody className="text-[11px]">
                    {isLoading && Array.from({length: 5}).map((_, i) => (
                        <tr key={i}><td colSpan={4} className="py-3"><Skeleton className="h-4 w-full" /></td></tr>
                    ))}
                    {!isLoading && tasks?.map((task, idx) => (
                        <tr 
                            key={task.id} 
                            className="border-b border-white/5 last:border-0 hover:bg-primary/5 transition-all cursor-pointer group"
                            onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                            style={{ animationDelay: `${150 + (idx * 50)}ms` }}
                        >
                            <td className="py-3">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                    task.priority === 'LEVEL_3' ? "bg-rose-500/20 text-rose-500" :
                                    task.priority === 'LEVEL_2' ? "bg-amber-500/20 text-amber-500" :
                                    "bg-sky-500/20 text-sky-500"
                                )}>
                                    {task.priority === 'LEVEL_3' ? 'High' : task.priority === 'LEVEL_2' ? 'Med' : 'Low'}
                                </span>
                            </td>
                            <td className="py-3 font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">{task.title}</td>
                            <td className="py-3 text-muted-foreground uppercase text-[9px] font-black tracking-tight">{task.assignedToName.split(' ')[0]}</td>
                            <td className="py-3 text-muted-foreground font-mono text-[10px]">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}</td>
                        </tr>
                    ))}
                    {!isLoading && (!tasks || tasks.length === 0) && (
                        <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">No active tasks</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </section>
  );
}
