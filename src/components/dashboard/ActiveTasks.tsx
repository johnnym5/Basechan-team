'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Task, TaskPriority } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { useState, useMemo } from "react";
import { TaskCard } from "../tasks/TaskCard";
import { TaskDetailDialog } from "../tasks/TaskDetailDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { uiEmitter } from "@/lib/ui-emitter";

export function ActiveTasks() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: userProfile } = useDoc(userProfileRef);
    const permissions = usePermissions(userProfile);

    // Fetches all active tasks for the user. Sorting is handled on the client.
    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return query(
            collection(firestore, 'tasks'),
            where('assignedTo', '==', authUser.uid),
            where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'])
        );
    }, [firestore, authUser]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);

    const sortedTasks = useMemo(() => {
        if (!tasks) return [];
        
        const priorityOrder: Record<TaskPriority, number> = {
            "LEVEL_3": 3,
            "LEVEL_2": 2,
            "LEVEL_1": 1
        };

        const sorted = [...tasks].sort((a, b) => {
            // Sort by priority descending
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            // Then by due date ascending (earlier due dates first)
            const dueDateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dueDateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            if (dueDateA !== dueDateB) {
                return dueDateA - dueDateB;
            }

            // Fallback to creation date if priorities and due dates are the same
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return sorted.slice(0, 5); // Show top 5 prioritized tasks
    }, [tasks]);


    const handleDialogClose = (isOpen: boolean) => {
        if (!isOpen) {
          setSelectedTask(null);
        }
    };

  return (
    <>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-headline md:text-lg">Mission Log</h2>
                <Button variant="link" size="sm" className="text-primary" onClick={() => uiEmitter.emit('open-tasks-dialog')}>
                    View All
                </Button>
            </div>
            <div className="space-y-3">
                {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                {!isLoading && sortedTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center pt-8">No active missions. Enjoy the quiet!</p>
                )}
                {!isLoading && sortedTasks.map(task => (
                    <TaskCard 
                        key={task.id} 
                        task={task} 
                        userProfile={userProfile!} 
                        permissions={permissions}
                        onSelect={() => setSelectedTask(task)}
                    />
                ))}
            </div>
        </div>

         {selectedTask && userProfile && (
            <TaskDetailDialog
            task={selectedTask}
            isOpen={!!selectedTask}
            onOpenChange={handleDialogClose}
            currentUserProfile={userProfile}
            permissions={permissions}
            />
        )}
    </>
  );
}
