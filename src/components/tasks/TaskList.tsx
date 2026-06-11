'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { Task, UserProfile, TaskPriority } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { parseISO, compareDesc, compareAsc } from 'date-fns';

interface TaskListProps {
    userProfile: UserProfile;
    permissions: Permissions;
    onTaskSelect: (task: Task) => void;
    searchTerm: string;
    sortBy: string;
}

const PRIORITY_MAP: Record<TaskPriority, number> = {
    'LEVEL_3': 3,
    'LEVEL_2': 2,
    'LEVEL_1': 1,
};

export function TaskList({ userProfile, permissions, onTaskSelect, searchTerm, sortBy }: TaskListProps) {
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
    
    const usersWithTasks = useMemo(() => {
        if (!tasks) return [];
        
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

        const userMap: Record<string, { name: string, tasks: Task[] }> = {};
        processedTasks.forEach(task => {
            if (!userMap[task.assignedTo]) {
                userMap[task.assignedTo] = { name: task.assignedToName, tasks: [] };
            }
            userMap[task.assignedTo].tasks.push(task);
        });

        return Object.values(userMap).sort((a,b) => a.name.localeCompare(b.name));

    }, [tasks, searchTerm, sortBy]);

    return (
        <Accordion type="multiple" className="w-full space-y-4" defaultValue={usersWithTasks.map(u => u.name)}>
            {isLoading && Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl"/>)}

            {!isLoading && usersWithTasks.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-12 border-2 border-dashed rounded-3xl opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">No Matches Identified</p>
                </div>
            )}

            {!isLoading && usersWithTasks.map(userGroup => (
                <AccordionItem key={userGroup.name} value={userGroup.name} className="border-none bg-secondary/10 rounded-[2.5rem] overflow-hidden transition-all hover:bg-secondary/20 group">
                    <AccordionTrigger className="px-6 py-5 hover:no-underline rounded-2xl group-data-[state=open]:bg-primary/5">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-11 w-11 border shadow-sm transition-transform group-hover:scale-105">
                                <AvatarFallback className="font-black text-xs bg-secondary">{userGroup.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                                <h3 className="font-black text-sm tracking-tight">{userGroup.name}</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{userGroup.tasks.length} Operational Units</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {userGroup.tasks.map((task, idx) => (
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
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
