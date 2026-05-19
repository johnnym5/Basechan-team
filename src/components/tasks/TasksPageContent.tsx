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
import { PlusCircle, Search, ListFilter } from 'lucide-react';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { PerformanceCard } from '../dashboard/PerformanceCard';
import { DashboardRecentReports } from '../dashboard/DashboardRecentReports';

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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 bg-background/20 p-4 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-3xl font-black font-headline tracking-tighter">Mission Manager</h1>
                    <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">
                      {permissions.canManageStaff ? "Strategic Deployment & Load Monitoring" : "Personal Tactical Objectives"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                      <TabsList className="bg-secondary/20 rounded-xl p-1">
                          <TabsTrigger value="board" className="rounded-lg px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">Board</TabsTrigger>
                          <TabsTrigger value="list" className="rounded-lg px-4 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background">List</TabsTrigger>
                      </TabsList>
                      <Button onClick={() => setIsAssignTaskOpen(true)} className="rounded-xl font-bold shadow-lg shadow-primary/20">
                          <PlusCircle className="mr-2 h-4 w-4"/>
                          Deploy Mission
                      </Button>
                  </div>
                </div>

                {/* Tactical Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-secondary/10 p-3 rounded-2xl border border-white/5">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Identify mission by title or serial..." 
                            className="pl-10 h-11 bg-background/50 border-none rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
                            <ListFilter className="h-3 w-3" />
                            Sort:
                        </div>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-11 w-[180px] bg-background/50 border-none rounded-xl text-xs font-bold uppercase tracking-wider">
                                <SelectValue placeholder="Ordering Strategy" />
                            </SelectTrigger>
                            <SelectContent className="apple-glass-darker border-none">
                                <SelectItem value="newest" className="text-xs font-bold uppercase tracking-widest">Newest Logged</SelectItem>
                                <SelectItem value="priority" className="text-xs font-bold uppercase tracking-widest">Highest Threat</SelectItem>
                                <SelectItem value="deadline" className="text-xs font-bold uppercase tracking-widest">Nearest Clearance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 lg:col-span-8 xl:col-span-9">
                      <div className="border rounded-3xl bg-background/20 backdrop-blur-sm relative overflow-hidden min-h-[500px]">
                        <TabsContent value="board" className="m-0 h-full">
                            <TaskBoard 
                                userProfile={currentUserProfile}
                                permissions={permissions}
                                onTaskSelect={setSelectedTask}
                                searchTerm={searchTerm}
                                sortBy={sortBy}
                            />
                        </TabsContent>
                        <TabsContent value="list" className="m-0 h-full p-6">
                            <TaskList
                                userProfile={currentUserProfile}
                                permissions={permissions}
                                onTaskSelect={setSelectedTask}
                                searchTerm={searchTerm}
                                sortBy={sortBy}
                            />
                        </TabsContent>
                      </div>
                  </div>

                  <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
                      <PerformanceCard userProfile={currentUserProfile} />
                      <DashboardRecentReports />
                      <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Mission Integrity</h4>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                              All tactical objectives are tracked in real-time. Moving a task to "Awaiting Review" triggers an automated notification to the mission commander. 
                          </p>
                      </div>
                  </div>
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
    </Tabs>
  );
}
