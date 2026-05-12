'use client';
import { useState, useEffect } from 'react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Task, UserProfile, Permissions } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

interface TasksPageContentProps {
  initialPayload?: { taskId?: string };
  currentUserProfile: UserProfile | null;
  permissions: Permissions;
}

export function TasksPageContent({ initialPayload, currentUserProfile, permissions }: TasksPageContentProps) {
  const firestore = useFirestore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('board');

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

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-4 flex-wrap flex-shrink-0">
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
              {currentUserProfile && (
                  <Button onClick={() => setIsAssignTaskOpen(true)}>
                      <PlusCircle className="mr-2"/>
                      New Task
                  </Button>
              )}
          </div>
        </div>

        {!currentUserProfile ? (
            <Skeleton className="flex-1 w-full mt-4" />
        ) : (
          <div className="flex-1 min-h-0 mt-4 overflow-hidden border rounded-xl bg-card/30">
            <ScrollArea className="h-full p-4">
                <TabsContent value="board" className="m-0 h-full">
                    <TaskBoard 
                        userProfile={currentUserProfile}
                        permissions={permissions}
                        onTaskSelect={setSelectedTask}
                    />
                </TabsContent>
                <TabsContent value="list" className="m-0 h-full">
                    <TaskList
                        userProfile={currentUserProfile}
                        permissions={permissions}
                        onTaskSelect={setSelectedTask}
                    />
                </TabsContent>
            </ScrollArea>
          </div>
        )}
      </Tabs>

      {currentUserProfile && (
          <AssignTaskDialog
            open={isAssignTaskOpen}
            onOpenChange={setIsAssignTaskOpen}
            currentUserProfile={currentUserProfile}
            permissions={permissions}
            initialData={null}
        />
      )}

      {selectedTask && currentUserProfile && (
        <TaskDetailDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onOpenChange={handleDialogClose}
          currentUserProfile={currentUserProfile}
          permissions={permissions}
        />
      )}
    </div>
  );
}
