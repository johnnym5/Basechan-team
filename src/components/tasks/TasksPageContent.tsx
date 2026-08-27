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
import { PlusCircle, Search, ListFilter, ShieldAlert } from 'lucide-react';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface TasksPageContentProps {
  initialPayload?: { taskId?: string };
  currentUserProfile: UserProfile | null;
  permissions: Permissions;
}

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function TasksPageContent({ initialPayload, currentUserProfile, permissions }: TasksPageContentProps) {
  const firestore = useFirestore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

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

  if (!currentUserProfile) return <Skeleton className="h-full w-full rounded-[2rem]" />;

  if (!permissions.canAccessTasks) {
    return (
         <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background">
            <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold font-headline text-white">Access Denied</h1>
            <p className="text-muted-foreground mt-2">The tasks module is currently disabled for your account or organization.</p>
          </div>
    );
  }

  return (
    <ModuleContainer
        title="Tasks Dashboard"
        subtitle={permissions.canManageStaff ? "Team Tasks & Operations Overview" : "My Active Tasks"}
        noScroll={true}
        actions={
            <div className="flex items-center gap-3">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-secondary/20 rounded-xl p-1 border border-white/5">
                        <TabsTrigger value="board" className="rounded-lg px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">Board</TabsTrigger>
                        <TabsTrigger value="list" className="rounded-lg px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background transition-all">List</TabsTrigger>
                    </TabsList>
                </Tabs>
                {permissions.canCreateTask && (
                    <Button onClick={() => setIsAssignTaskOpen(true)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6 shadow-xl shadow-primary/20 m3-interactive">
                        <PlusCircle className="mr-2 h-4 w-4 text-primary"/>
                        New Task
                    </Button>
                )}
            </div>
        }
    >
      <div className="flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar pr-2">
          <div className="flex flex-col sm:flex-row items-center gap-4 border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm shrink-0">
              <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search tasks by title or assignee..."
                      className="pl-12 h-12 bg-background/50 border-white/5 rounded-2xl text-sm font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground shrink-0 opacity-60">
                      <ListFilter className="h-3.5 w-3.5" />
                      Sort:
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-12 w-[200px] bg-background/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                          <SelectValue placeholder="Sort order" />
                      </SelectTrigger>
                      <SelectContent className="m3-surface-high border-none rounded-2xl">
                          <SelectItem value="newest" className="text-[10px] font-black uppercase tracking-widest">Newest First</SelectItem>
                          <SelectItem value="priority" className="text-[10px] font-black uppercase tracking-widest">Priority (H-L)</SelectItem>
                          <SelectItem value="deadline" className="text-[10px] font-black uppercase tracking-widest">Deadline</SelectItem>
                          <SelectItem value="user" className="text-[10px] font-black uppercase tracking-widest">Staff</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>

          <div className="flex-1 min-h-0">
              <div className="border border-border/60 bg-muted/30 rounded-xl p-4 shadow-sm relative overflow-hidden h-full">
                <Tabs value={activeTab} className="h-full">
                    <TabsContent value="board" className="m-0 h-full">
                        <TaskBoard
                            userProfile={currentUserProfile}
                            permissions={permissions}
                            onTaskSelect={setSelectedTask}
                            searchTerm={searchTerm}
                            sortBy={sortBy}
                        />
                    </TabsContent>
                    <TabsContent value="list" className="m-0 h-full">
                        <TaskList
                            userProfile={currentUserProfile}
                            permissions={permissions}
                            onTaskSelect={setSelectedTask}
                            searchTerm={searchTerm}
                            sortBy={sortBy}
                        />
                    </TabsContent>
                </Tabs>
              </div>
          </div>
      </div>

      {isAssignTaskOpen && (
          <AssignTaskDialog
            open={isAssignTaskOpen}
            onOpenChange={setIsAssignTaskOpen}
            currentUserProfile={currentUserProfile}
            permissions={permissions}
            initialData={null}
        />
      )}

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onOpenChange={handleDialogClose}
          currentUserProfile={currentUserProfile}
          permissions={permissions}
        />
      )}
    </ModuleContainer>
  );
}
