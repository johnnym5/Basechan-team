'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Task, UserProfile, Permissions } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { uiEmitter } from "@/lib/ui-emitter";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

interface DashboardTaskListProps {
    userProfile: UserProfile;
    permissions: Permissions;
}

export function DashboardTaskList({ userProfile, permissions }: DashboardTaskListProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        
        const tasksRef = collection(firestore, 'tasks');
        
        if (permissions.canAccessAllTasks || isSuperAdmin) {
            return query(
                tasksRef,
                where('orgId', '==', userProfile.orgId),
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
    }, [firestore, userProfile, permissions.canAccessAllTasks, isSuperAdmin]);

    const { data: allTasks, isLoading } = useCollection<Task>(tasksQuery);
    
    // Filter for active tasks on the client to avoid complex index requirements for simple dashboard views
    const tasks = allTasks?.filter(t => t.status !== 'ARCHIVED').slice(0, 10);

  return (
    <section className="card-bg rounded-2xl p-6 shadow-lg h-full animate-slide-up-fade" style={{ animationDelay: '100ms' }}>
        <h3 className="text-lg font-bold font-headline tracking-tight mb-6">Active Tasks</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-muted-foreground text-[0.625rem] uppercase tracking-widest border-b">
                        <th className="pb-4 font-bold">Priority</th>
                        <th className="pb-4 font-bold">Task Name</th>
                        <th className="pb-4 font-bold">Assignee</th>
                        <th className="pb-4 font-bold">Due Date</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {isLoading && Array.from({length: 5}).map((_, i) => (
                        <tr key={i}><td colSpan={4} className="py-4"><Skeleton className="h-6 w-full" /></td></tr>
                    ))}
                    {!isLoading && tasks?.map((task, idx) => (
                        <tr 
                            key={task.id} 
                            className="border-b border-border/50 hover:bg-primary/5 transition-all cursor-pointer group interactive-element"
                            onClick={() => uiEmitter.emit('open-tasks-dialog', { taskId: task.id })}
                            style={{ animationDelay: `${150 + (idx * 50)}ms` }}
                        >
                            <td className="py-4">
                                <span className={cn(
                                    "px-3 py-1 rounded-md text-[0.625rem] font-bold uppercase tracking-wider",
                                    task.priority === 'LEVEL_3' ? "bg-destructive/20 text-destructive" :
                                    task.priority === 'LEVEL_2' ? "bg-amber-500/20 text-amber-500" :
                                    "bg-primary/20 text-primary"
                                )}>
                                    {task.priority === 'LEVEL_3' ? 'High' : task.priority === 'LEVEL_2' ? 'Medium' : 'Low'}
                                </span>
                            </td>
                            <td className="py-4 font-semibold text-foreground group-hover:text-primary transition-colors">{task.title}</td>
                            <td className="py-4 text-muted-foreground">{task.assignedToName}</td>
                            <td className="py-4 text-muted-foreground font-mono text-xs">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'N/A'}</td>
                        </tr>
                    ))}
                    {!isLoading && (!tasks || tasks.length === 0) && (
                        <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">No active tasks found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </section>
  );
}