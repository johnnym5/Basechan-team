'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { Task, UserProfile, TaskStatus } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface TaskBoardProps {
    userProfile: UserProfile;
    permissions: Permissions;
    onTaskSelect: (task: Task) => void;
}

const statusColumns: TaskStatus[] = ["QUEUED", "ACTIVE", "AWAITING_REVIEW", "ARCHIVED"];

export function TaskBoard({ userProfile, permissions, onTaskSelect }: TaskBoardProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

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
    
    const { groupedTasks } = useMemo(() => {
        const initialGroups: Record<TaskStatus, Task[]> = {
            QUEUED: [],
            ACTIVE: [],
            AWAITING_REVIEW: [],
            ARCHIVED: [],
        };
        
        if (!tasks) {
            return { groupedTasks: initialGroups };
        }

        // Sort tasks by due date client-side
        const sortedTasks = [...tasks].sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        });

        const grouped = sortedTasks.reduce((acc, task) => {
            if (acc[task.status]) {
                acc[task.status].push(task);
            }
            return acc;
        }, initialGroups);
        
        return { groupedTasks: grouped };
    }, [tasks]);

    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {statusColumns.map(status => (
                <div key={status} className="bg-secondary/30 rounded-lg h-full flex flex-col">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">
                           {status.replace('_', ' ')}
                           <span className="ml-2 text-sm font-normal text-muted-foreground">({groupedTasks[status].length})</span>
                        </h3>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-4">
                            {isLoading && <p className="text-sm text-muted-foreground">Loading tasks...</p>}
                            {!isLoading && groupedTasks[status].length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                    <p className="text-sm">No tasks in this stage.</p>
                                </div>
                            )}
                            {!isLoading && groupedTasks[status].map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    userProfile={userProfile} 
                                    permissions={permissions}
                                    onSelect={() => onTaskSelect(task)}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            ))}
        </div>
    );
}
