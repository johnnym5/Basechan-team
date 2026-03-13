'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, orderBy, limit, doc } from "firebase/firestore";
import type { Task } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import Link from "next/link";
import { Button } from "../ui/button";
import { useState } from "react";
import { TaskCard } from "../tasks/TaskCard";
import { TaskDetailDialog } from "../tasks/TaskDetailDialog";
import { usePermissions } from "@/hooks/usePermissions";

export function ActiveTasks() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: userProfile } = useDoc(userProfileRef);
    const permissions = usePermissions(userProfile);

    // Simplified query to avoid composite index.
    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return query(
            collection(firestore, 'tasks'),
            where('assignedTo', '==', authUser.uid),
            where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW']),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }, [firestore, authUser]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);

    const handleDialogClose = (isOpen: boolean) => {
        if (!isOpen) {
          setSelectedTask(null);
        }
    };

  return (
    <>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-headline md:text-lg">Today's Tasks</h2>
                <Link href="/tasks" passHref>
                <Button variant="link" size="sm" className="text-primary">
                    View All
                </Button>
                </Link>
            </div>
            <div className="space-y-3">
                {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                {!isLoading && tasks?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center pt-8">No active tasks. Enjoy the quiet!</p>
                )}
                {!isLoading && tasks?.map(task => (
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
