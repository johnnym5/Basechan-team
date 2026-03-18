'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { Task, UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface TaskListProps {
    userProfile: UserProfile;
    permissions: Permissions;
    onTaskSelect: (task: Task) => void;
}

export function TaskList({ userProfile, permissions, onTaskSelect }: TaskListProps) {
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
    
    const usersWithTasks = useMemo(() => {
        if (!tasks) return [];
        
        const userMap: Record<string, { name: string, tasks: Task[] }> = {};
        tasks.forEach(task => {
            if (!userMap[task.assignedTo]) {
                userMap[task.assignedTo] = { name: task.assignedToName, tasks: [] };
            }
            userMap[task.assignedTo].tasks.push(task);
        });

        return Object.values(userMap).sort((a,b) => a.name.localeCompare(b.name));

    }, [tasks]);

    return (
        <Accordion type="multiple" className="w-full space-y-4" defaultValue={usersWithTasks.map(u => u.name)}>
            {isLoading && Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-24 w-full"/>)}

            {!isLoading && usersWithTasks.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <p className="text-sm">No tasks found.</p>
                </div>
            )}

            {!isLoading && usersWithTasks.map(userGroup => (
                <AccordionItem key={userGroup.name} value={userGroup.name} className="border-none bg-secondary/30 rounded-lg">
                    <AccordionTrigger className="p-4 hover:no-underline hover:bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback>{userGroup.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-semibold text-left">{userGroup.name}</h3>
                                <p className="text-sm text-muted-foreground text-left">{userGroup.tasks.length} tasks</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {userGroup.tasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    userProfile={userProfile}
                                    permissions={permissions}
                                    onSelect={() => onTaskSelect(task)}
                                />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
