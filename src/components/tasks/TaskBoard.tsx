'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { Task, UserProfile, TaskStatus } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TaskBoardProps {
    userProfile: UserProfile;
    permissions: Permissions;
    onTaskSelect: (task: Task) => void;
}

const KANBAN_COLUMNS: { title: string, status: TaskStatus }[] = [
    { title: 'Queued', status: 'QUEUED' },
    { title: 'Active', status: 'ACTIVE' },
    { title: 'Awaiting Review', status: 'AWAITING_REVIEW' },
    { title: 'Archived', status: 'ARCHIVED' },
];

export function TaskBoard({ userProfile, permissions, onTaskSelect }: TaskBoardProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

    // Query all tasks regardless of status, we will filter on the client.
    const tasksQuery = useMemoFirebase((): Query | null => {
        if (!firestore) return null;
        
        const tasksRef = collection(firestore, 'tasks');

        if (permissions.canAccessAllTasks || isSuperAdmin) {
            return query(
                tasksRef, 
                where('orgId', '==', userProfile.orgId)
            );
        } else {
            return query(
                tasksRef, 
                where('assignedTo', '==', userProfile.id)
            );
        }
    }, [firestore, userProfile, permissions.canAccessAllTasks, isSuperAdmin]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);
    
    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            QUEUED: [],
            ACTIVE: [],
            AWAITING_REVIEW: [],
            ARCHIVED: [],
        };

        if (tasks) {
            for (const task of tasks) {
                if (grouped[task.status]) {
                    grouped[task.status].push(task);
                }
            }
        }
        return grouped;
    }, [tasks]);

    if (isLoading) {
        return (
             <div className="grid grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <ScrollArea className="w-full">
            <div className="flex gap-6 pb-4">
                {KANBAN_COLUMNS.map(col => (
                    <div key={col.status} className="w-72 flex-shrink-0">
                        <h3 className="font-semibold text-lg mb-4 px-1">{col.title} ({tasksByStatus[col.status].length})</h3>
                        <div className="space-y-4 bg-secondary/30 p-2 rounded-lg h-full">
                           <ScrollArea className="h-[calc(100vh-22rem)]">
                                <div className="p-2 space-y-3">
                                {tasksByStatus[col.status].length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground pt-16">
                                        No tasks in this stage.
                                    </div>
                                ) : (
                                    tasksByStatus[col.status].map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            userProfile={userProfile}
                                            permissions={permissions}
                                            onSelect={() => onTaskSelect(task)}
                                        />
                                    ))
                                )}
                                </div>
                           </ScrollArea>
                        </div>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}
