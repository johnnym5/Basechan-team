'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { Task, UserProfile, TaskStatus, TaskPriority, Permissions } from '@/lib/types';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '../ui/badge';
import { parseISO, compareDesc, compareAsc } from 'date-fns';
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react';

interface TaskBoardProps {
    userProfile: UserProfile;
    permissions: Permissions;
    onTaskSelect: (task: Task) => void;
    searchTerm: string;
    sortBy: string;
}

const KANBAN_COLUMNS: { title: string, status: TaskStatus, stateKey: string }[] = [
    { title: 'Queued', status: 'QUEUED', stateKey: 'queued' },
    { title: 'Active', status: 'ACTIVE', stateKey: 'active' },
    { title: 'Awaiting Review', status: 'AWAITING_REVIEW', stateKey: 'awaitingReview' },
    { title: 'Archived', status: 'ARCHIVED', stateKey: 'archived' },
];

const PRIORITY_MAP: Record<TaskPriority, number> = {
    'LEVEL_3': 3,
    'LEVEL_2': 2,
    'LEVEL_1': 1,
};

function Column({
    title,
    tasks,
    visibleCount,
    handleLoadMore,
    userProfile,
    permissions,
    onTaskSelect
}: {
    title: string,
    tasks: Task[],
    visibleCount: number,
    handleLoadMore: () => void,
    userProfile: UserProfile,
    permissions: Permissions,
    onTaskSelect: (task: Task) => void
}) {
    const visibleTasks = tasks.slice(0, visibleCount);
    const hasMore = tasks.length > visibleCount;

    return (
        <div className="w-80 flex-shrink-0 flex flex-col h-full min-h-0 rounded-[2rem]">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {title}
                </h3>
                <Badge variant="secondary" className="h-5 rounded-md px-1.5 font-bold text-[9px] bg-white/5 border-white/5">
                    {tasks.length}
                </Badge>
            </div>
            <div className="flex-1 min-h-0 p-3 rounded-[2rem] border border-white/5 bg-secondary/5 transition-colors overflow-y-auto custom-scrollbar">
                <div className="space-y-4 p-1">
                    {tasks.length === 0 ? (
                        <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 pt-20">
                            Stage Empty
                        </div>
                    ) : (
                        <>
                            {visibleTasks.map((task, idx) => (
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
                            ))}

                            {hasMore && (
                                <Button
                                    variant="ghost"
                                    onClick={handleLoadMore}
                                    className="mt-4 w-full h-10 rounded-xl border border-border border-dashed text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                                >
                                    <ChevronDown className="mr-2 h-3 w-3" />
                                    Load More ({tasks.length - visibleCount} remaining)
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function TaskBoard({ userProfile, permissions, onTaskSelect, searchTerm, sortBy }: TaskBoardProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

    const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
        queued: 5,
        active: 5,
        awaitingReview: 5,
        archived: 5
    });

    const handleLoadMore = (stateKey: string) => {
        setVisibleCounts(prev => ({
            ...prev,
            [stateKey]: prev[stateKey] + 5
        }));
    };

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

    const { data: initialTasks, isLoading } = useCollection<Task>(tasksQuery);
    const [localTasks, setLocalTasks] = useState<Task[]>([]);

    useEffect(() => {
        if (initialTasks) {
            setLocalTasks(initialTasks);
        }
    }, [initialTasks]);
    
    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            QUEUED: [],
            ACTIVE: [],
            AWAITING_REVIEW: [],
            ARCHIVED: [],
        };

        if (localTasks) {
            let processedTasks = [...localTasks];

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
    }, [localTasks, searchTerm, sortBy]);

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
                        <Column
                            key={col.status}
                            title={col.title}
                            tasks={tasksByStatus[col.status]}
                            visibleCount={visibleCounts[col.stateKey]}
                            handleLoadMore={() => handleLoadMore(col.stateKey)}
                            userProfile={userProfile}
                            permissions={permissions}
                            onTaskSelect={onTaskSelect}
                        />
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
