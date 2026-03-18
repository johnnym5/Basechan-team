'use client';
import { useState, useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Task, UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TasksPageContent({ initialPayload }: { initialPayload?: { taskId?: string } }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('board');

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, 
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const permissions = usePermissions(userProfile);

  const taskIdToOpen = initialPayload?.taskId;
  const taskFromPayloadRef = useMemoFirebase(() => 
    firestore && taskIdToOpen ? doc(firestore, 'tasks', taskIdToOpen) : null,
  [firestore, taskIdToOpen]);
  const { data: taskFromPayload } = useDoc<Task>(taskFromPayloadRef);

  useEffect(() => {
    if (taskFromPayload) {
      setSelectedTask(taskFromPayload);
    }
  }, [taskFromPayload]);

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTask(null);
    }
  };

  const isLoading = isProfileLoading;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Task Manager</h1>
            <p className="text-muted-foreground">
              {permissions.canManageStaff ? "Monitor tasks across your team." : "Your personal task board."}
            </p>
          </div>
          <div className="flex items-center gap-4">
              <TabsList>
                  <TabsTrigger value="board">Board</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
              {userProfile && (
                  <Button onClick={() => setIsAssignTaskOpen(true)}>
                      <PlusCircle className="mr-2"/>
                      New Task
                  </Button>
              )}
          </div>
        </div>

        {isLoading ? (
            <Skeleton className="h-[60vh] w-full mt-4" />
        ) : userProfile && (
          <>
            <TabsContent value="board" className="flex-1 mt-4">
                 <TaskBoard 
                    userProfile={userProfile}
                    permissions={permissions}
                    onTaskSelect={setSelectedTask}
                />
            </TabsContent>
            <TabsContent value="list" className="flex-1 mt-4">
                 <TaskList
                    userProfile={userProfile}
                    permissions={permissions}
                    onTaskSelect={setSelectedTask}
                />
            </TabsContent>
          </>
        )}
      </Tabs>

      {userProfile && (
          <AssignTaskDialog
            open={isAssignTaskOpen}
            onOpenChange={setIsAssignTaskOpen}
            currentUserProfile={userProfile}
            permissions={permissions}
            initialData={null}
        />
      )}

      {selectedTask && userProfile && (
        <TaskDetailDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onOpenChange={handleDialogClose}
          currentUserProfile={userProfile}
          permissions={permissions}
        />
      )}
    </div>
  );
}
