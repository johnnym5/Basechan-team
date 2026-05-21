'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { Task, UserProfile, TaskStatus, TaskPriority } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '../ui/badge';
import { parseISO, compareDesc, compareAsc } from 'date-fns';

interface TaskBoardProps {
    userProfile: UserProfile;
    permissions: Permissions;
    onTaskSelect: (task: Task) => void;
    searchTerm: string;
    sortBy: string;
}

const KANBAN_COLUMNS: { title: string, status: TaskStatus }[] = [
    { title: 'Queued', status: 'QUEUED' },
    { title: 'Active', status: 'ACTIVE' },
    { title: 'Awaiting Review', status: 'AWAITING_REVIEW' },
    { title: 'Archived', status: 'ARCHIVED' },
];

const PRIORITY_MAP: Record<TaskPriority, number> = {
    'LEVEL_3': 3,
    'LEVEL_2': 2,
    'LEVEL_1': 1,
};

export function TaskBoard({ userProfile, permissions, onTaskSelect, searchTerm, sortBy }: TaskBoardProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

    const tasksQuery = useMemoFirebase((): Query | null => {
        if (!firestore || !userProfile?.orgId) return null;
        
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
    }, [firestore, userProfile?.orgId, userProfile?.id, permissions.canAccessAllTasks, isSuperAdmin]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);
    
    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            QUEUED: [],
            ACTIVE: [],
            AWAITING_REVIEW: [],
            ARCHIVED: [],
        };

        if (tasks) {
            let processedTasks = [...tasks];

            // 1. Apply Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                processedTasks = processedTasks.filter(t => 
                    t.title.toLowerCase().includes(term) || 
                    t.serialNo.toLowerCase().includes(term)
                );
            }

            // 2. Apply Sort
            processedTasks.sort((a, b) => {
                switch(sortBy) {
                    case 'priority':
                        return PRIORITY_MAP[b.priority] - PRIORITY_MAP[a.priority];
                    case 'deadline':
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return compareAsc(parseISO(a.dueDate), parseISO(b.dueDate));
                    case 'user':
                        return (a.assignedToName || '').localeCompare(b.assignedToName || '');
                    case 'newest':
                    default:
                        return compareDesc(parseISO(a.createdAt), parseISO(b.createdAt));
                }
            });

            for (const task of processedTasks) {
                if (grouped[task.status]) {
                    grouped[task.status].push(task);
                }
            }
        }
        return grouped;
    }, [tasks, searchTerm, sortBy]);

    if (isLoading) {
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full p-6">
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
        <div className="h-full flex flex-col min-h-0">
            <ScrollArea className="flex-1 w-full h-full">
                <div className="flex h-full gap-6 p-6">
                    {KANBAN_COLUMNS.map(col => (
                        <div key={col.status} className="w-80 flex-shrink-0 flex flex-col h-full min-h-0">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="font-black text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                                    {col.title}
                                </h3>
                                <Badge variant="secondary" className="h-5 rounded-md px-1.5 font-bold text-[9px] bg-white/5 border-white/5">
                                    {tasksByStatus[col.status].length}
                                </Badge>
                            </div>
                            <div className="flex-1 min-h-0 bg-secondary/5 p-3 rounded-[2rem] border border-white/5 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4 p-1">
                                    {tasksByStatus[col.status].length === 0 ? (
                                        <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 pt-20">
                                            Stage Empty
                                        </div>
                                    ) : (
                                        tasksByStatus[col.status].map((task, idx) => (
                                            <div 
                                                key={task.id} 
                                                className="animate-slide-up-fade"
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <TaskCard
                                                    task={task}
                                                    userProfile={userProfile}
                                                    permissions={permissions}
                                                    onSelect={() => onTaskSelect(task)}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
