'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Task } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function DashboardTaskList() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return query(
            collection(firestore, 'tasks'),
            where('orgId', '==', authUser.uid), // In a real app we'd use orgId, for now using user context
            orderBy('createdAt', 'desc'),
            limit(10)
        );
    }, [firestore, authUser]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);

  return (
    <section className="card-bg rounded-2xl p-6 shadow-lg h-full">
        <h3 className="text-lg font-semibold mb-6">Active Tasks</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-gray-500 text-sm border-b border-gray-800">
                        <th className="pb-4 font-medium">Priority</th>
                        <th className="pb-4 font-medium">Task Name</th>
                        <th className="pb-4 font-medium">Assignee</th>
                        <th className="pb-4 font-medium">Due Date</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {isLoading && Array.from({length: 5}).map((_, i) => (
                        <tr key={i}><td colSpan={4} className="py-4"><Skeleton className="h-6 w-full" /></td></tr>
                    ))}
                    {!isLoading && tasks?.map((task) => (
                        <tr key={task.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                            <td className="py-4">
                                <span className={cn(
                                    "px-3 py-1 rounded-md text-xs font-semibold uppercase",
                                    task.priority === 'LEVEL_3' ? "bg-red-500/20 text-red-500" :
                                    task.priority === 'LEVEL_2' ? "bg-orange-500/20 text-orange-400" :
                                    "bg-blue-500/20 text-blue-400"
                                )}>
                                    {task.priority === 'LEVEL_3' ? 'High' : task.priority === 'LEVEL_2' ? 'Medium' : 'Low'}
                                </span>
                            </td>
                            <td className="py-4 font-medium text-gray-200">{task.title}</td>
                            <td className="py-4 text-gray-400">{task.assignedToName}</td>
                            <td className="py-4 text-gray-400">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'N/A'}</td>
                        </tr>
                    ))}
                    {!isLoading && tasks?.length === 0 && (
                        <tr><td colSpan={4} className="py-10 text-center text-gray-500">No active tasks found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </section>
  );
}