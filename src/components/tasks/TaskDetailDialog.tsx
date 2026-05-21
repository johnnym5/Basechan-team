'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Task, UserProfile, ActivityEntry, SubTask, TaskStatus, Notification } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { format, differenceInHours } from 'date-fns';
import { Calendar, CheckSquare, History, Info, BookOpenCheck, User, Plus, Trash2, Share2, Pencil, Check, Loader2, Hourglass, LifeBuoy, Paperclip } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion, collection } from 'firebase/firestore';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn, sanitizeInput } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ActivityFeed } from '../shared/ActivityFeed';
import { ShareTaskDialog } from './ShareTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { uiEmitter } from '@/lib/ui-emitter';
import { CompletionBriefDialog } from './CompletionBriefDialog';
import { useToast } from '@/hooks/use-toast';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
}

export function TaskDetailDialog({ task: initialTask, isOpen, onOpenChange, currentUserProfile, permissions }: TaskDetailDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const taskRef = useMemoFirebase(() =>
    (firestore && initialTask) ? doc(firestore, 'tasks', initialTask.id) : null,
    [firestore, initialTask?.id]
  );
  const { data: liveTask } = useDoc<Task>(taskRef);

  const task = liveTask || initialTask;

  const [subTasks, setSubTasks] = useState<SubTask[]>(task.subTasks || []);
  const [newSubTask, setNewSubTask] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isCompletionBriefOpen, setIsCompletionBriefOpen] = useState(false);

  useEffect(() => {
    if (task) {
        setSubTasks(task.subTasks || []);
    }
  }, [task]);


  const handleSubTaskToggle = (subTaskId: string) => {
    if (!firestore) return;
    const updatedSubTasks = subTasks.map(st => 
        st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    setSubTasks(updatedSubTasks);
    const taskRef = doc(firestore, 'tasks', task.id);
    updateDocumentNonBlocking(taskRef, { subTasks: updatedSubTasks });
  };

  const handleAddSubTask = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      if (!newSubTask.trim() || !firestore) return;
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const newSubTaskItem: SubTask = { id: newId, text: newSubTask, completed: false };
      const updatedSubTasks = [...subTasks, newSubTaskItem];
      setSubTasks(updatedSubTasks);
      setNewSubTask('');
      const taskRef = doc(firestore, 'tasks', task.id);
      updateDocumentNonBlocking(taskRef, { subTasks: updatedSubTasks });
  };
  
  const handleDeleteTask = () => {
    if (!firestore || !task.id) {
        toast({ variant: "destructive", title: "Termination Blocked", description: "Firestore instance or task ID is missing." });
        return;
    }
    const targetRef = doc(firestore, 'tasks', task.id);
    deleteDocumentNonBlocking(targetRef);
    toast({ title: "Task Purged", description: `${task.serialNo} has been removed from the organizational grid.` });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }

  const handleAddComment = (commentText: string) => {
    if (!firestore || !currentUserProfile) return;
    
    const commentEntry: ActivityEntry = {
        type: 'COMMENT',
        actorId: currentUserProfile.id,
        actorName: currentUserProfile.fullName,
        timestamp: new Date().toISOString(),
        text: commentText,
    };
    
    const taskRef = doc(firestore, 'tasks', task.id);
    updateDocumentNonBlocking(taskRef, {
        activity: arrayUnion(commentEntry),
    });
  }

  const handleStatusChange = (newStatus: TaskStatus, comment?: string) => {
    if (!firestore) return;
    setIsSubmitting(true);
    const taskRef = doc(firestore, 'tasks', task.id);
    const now = new Date().toISOString();
    let logText = '';
    let updatePayload: any = { status: newStatus };

    switch (newStatus) {
        case 'ACTIVE':
            logText = `activated the task.`;
            break;
        case 'ARCHIVED':
            logText = `approved and archived the task.`;
            const activeLog = task.activity.find(a => a.toStatus === 'ACTIVE');
            if (activeLog) {
                const duration = Math.max(0, differenceInHours(new Date(now), new Date(activeLog.timestamp)));
                updatePayload.actualHours = duration;
            } else {
                const duration = Math.max(0, differenceInHours(new Date(now), new Date(task.createdAt)));
                updatePayload.actualHours = duration;
            }
            break;
        default:
            logText = `changed status to ${newStatus}.`;
    }

    const activityEntry: ActivityEntry = {
        type: 'LOG',
        actorId: currentUserProfile.id,
        actorName: currentUserProfile.fullName,
        timestamp: now,
        text: logText,
        fromStatus: task.status,
        toStatus: newStatus,
    };

    const activity: ActivityEntry[] = [activityEntry];
    if (comment) {
        activity.push({
            type: 'COMMENT',
            actorId: currentUserProfile.id,
            actorName: currentUserProfile.fullName,
            timestamp: now,
            text: comment,
        });
    }
    
    updatePayload.activity = arrayUnion(...activity);
    
    updateDocumentNonBlocking(taskRef, updatePayload);
    
    if (currentUserProfile.id !== task.assignedTo) {
        let notifTitle = '';
        let notifDescription = '';
        
        if (newStatus === 'ACTIVE') {
            notifTitle = 'Revisions Requested';
            notifDescription = `Revisions have been requested for "${task.title}".`;
        } else if (newStatus === 'ARCHIVED') {
            notifTitle = 'Task Accomplished';
            notifDescription = `Your work on "${task.title}" has been approved.`;
        }

        if (notifTitle) {
            const notification: Omit<Notification, 'id'> = {
                orgId: currentUserProfile.orgId,
                userId: task.assignedTo,
                title: notifTitle,
                description: notifDescription,
                href: `/tasks?taskId=${task.id}`,
                isRead: false,
                createdAt: now,
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notification);
        }
    }

    onOpenChange(false);
    setIsSubmitting(false);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] w-full flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
             <DialogTitle className='max-w-md flex items-center gap-2'>
                <span>{task.serialNo}: {task.title}</span>
                {task.type === 'ASSISTANCE_REQUEST' && (
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                        <LifeBuoy className="h-3 w-3" /> Assistance Request
                    </Badge>
                )}
             </DialogTitle>
             <TaskPriorityBadge priority={task.priority} />
          </div>
           <DialogDescription asChild>
             <div className="flex items-center gap-4 pt-1 text-sm text-muted-foreground">
                <Badge variant="secondary" className="uppercase text-[9px] font-black tracking-widest">{task.status.replace('_', ' ')}</Badge>
                <span className="font-bold text-[10px] uppercase tracking-tighter">
                Assigned to {task.assignedToName}
                </span>
             </div>
           </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 py-4 flex-1 overflow-y-auto">
          <div className="md:col-span-2 space-y-6 flex flex-col">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Info className="h-3 w-3" /> Task Context
              </h4>
              <p className="text-foreground text-sm leading-relaxed">{task.description || "No description provided."}</p>
            </div>
            
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <CheckSquare className="h-3 w-3" /> Checkpoints
                </h4>
                <div className="space-y-2 rounded-2xl border border-white/5 bg-secondary/5 p-4">
                    {subTasks.map(st => (
                        <div key={st.id} className="flex items-center gap-3">
                            <Checkbox 
                                id={`subtask-${st.id}`} 
                                checked={st.completed}
                                onCheckedChange={() => handleSubTaskToggle(st.id)}
                            />
                            <label htmlFor={`subtask-${st.id}`} className={cn("text-xs font-medium flex-1 cursor-pointer", st.completed ? 'line-through text-muted-foreground opacity-50' : 'text-foreground')}>
                                {st.text}
                            </label>
                        </div>
                    ))}
                    {subTasks.length === 0 && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center py-6 opacity-30">No checkpoints defined</p>}
                     <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                        <Input 
                            placeholder="Add task checkpoint..."
                            value={newSubTask}
                            onChange={(e) => setNewSubTask(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubTask(e) }}
                            className="h-9 rounded-xl bg-background/40 border-none text-xs"
                        />
                        <Button size="icon" variant="ghost" onClick={handleAddSubTask} className="rounded-xl">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <History className="h-3 w-3" /> Activity Feed
              </h4>
              <div className="flex-1 rounded-2xl border border-white/5 bg-card/30 p-4">
                  <ActivityFeed
                    activity={task.activity}
                    currentUserProfile={currentUserProfile}
                    onAddComment={handleAddComment}
                    isLoading={isSubmitting}
                  />
              </div>
            </div>
          </div>
          <div className="md:col-span-1 space-y-4 rounded-[2rem] border border-white/5 bg-secondary/20 p-5 h-fit">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 opacity-70">Task Summary</h4>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[9px]">
                  <User className="h-3 w-3" /> Assignee
                </span>
                <span className="font-bold text-foreground">{task.assignedToName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[9px]">
                  <Calendar className="h-3 w-3" /> Deadline
                </span>
                <span className="font-mono font-bold text-foreground">
                  {task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'OPEN'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[9px]">
                  <Hourglass className="h-3 w-3" /> Estimated
                </span>
                <span className="font-mono font-bold text-foreground">
                  {task.estimatedHours ? `${task.estimatedHours}h` : 'N/A'}
                </span>
              </div>
              {task.actualHours != null && (
                 <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[9px]">
                        <Check className="h-3 w-3" /> Actual Time
                    </span>
                    <span className="font-mono font-bold text-emerald-500">{task.actualHours}h</span>
                </div>
              )}
               {task.workbookId && (
                 <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[9px]">
                      <BookOpenCheck className="h-3 w-3" /> Linked Data
                    </span>
                    <Button
                        variant="link"
                        className="h-auto p-0 text-[10px] font-black uppercase text-primary hover:underline truncate max-w-[100px]"
                        onClick={() => {
                            uiEmitter.emit('open-workbooks-dialog', { workbookId: task.workbookId!, sheetId: task.sheetId });
                            onOpenChange(false);
                        }}
                    >
                        View Node
                    </Button>
                  </div>
               )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[9px]">
                    <Paperclip className="h-3 w-3" /> Evidence
                  </span>
                  {task.attachmentUrl ? (
                      <Link href={task.attachmentUrl} target="_blank" rel="noopener noreferrer" className='text-[10px] font-black uppercase text-primary hover:underline truncate max-w-[150px]' title={task.attachmentName || 'View File'}>
                          {task.attachmentName || 'Download'}
                      </Link>
                  ) : (
                      <span className="font-bold text-muted-foreground opacity-30 uppercase text-[9px]">None</span>
                  )}
                </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between flex-shrink-0 pt-4 border-t border-white/5">
             <div className='flex justify-start w-full items-center'>
                <div className='flex gap-2'>
                    {permissions.canManageStaff && (
                        <>
                             <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="rounded-xl px-4 font-black uppercase tracking-widest active:scale-95 transition-all">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Terminate
                            </Button>
                             <Button variant="outline" onClick={() => setShowEditDialog(true)} className="rounded-xl px-4 font-black uppercase tracking-widest active:scale-95 transition-all">
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        </>
                    )}
                    {(permissions.canManageStaff || task.assignedTo === currentUserProfile.id) && (
                        <Button variant="outline" onClick={() => setShowShareDialog(true)} className="rounded-xl px-4 font-black uppercase tracking-widest active:scale-95 transition-all">
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    )}
                </div>
            </div>
            <div className="ml-auto flex gap-2">
                {task.assignedTo === currentUserProfile.id && task.status === 'QUEUED' && (
                    <Button onClick={() => handleStatusChange('ACTIVE')} disabled={isSubmitting} className="rounded-xl px-6 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Start Task
                    </Button>
                )}
                {task.assignedTo === currentUserProfile.id && task.status === 'ACTIVE' && (
                    <Button onClick={() => setIsCompletionBriefOpen(true)} className="rounded-xl px-6 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                        Signal Completion
                    </Button>
                )}
                
                {permissions.canManageStaff && task.status === 'AWAITING_REVIEW' && (
                    <>
                        <Button variant="outline" onClick={() => handleStatusChange('ACTIVE', 'Revisions requested.')} disabled={isSubmitting} className="rounded-xl px-4 font-black uppercase tracking-widest">Reject Brief</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-6 font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20" onClick={() => handleStatusChange('ARCHIVED')} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Approve & Archive
                        </Button>
                    </>
                )}
            </div>
        </DialogFooter>
        
        {/* Security Confirmation: Deletion */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent className="apple-glass-darker border-none rounded-[2.5rem] p-8">
                <AlertDialogHeader className="space-y-4">
                    <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit">
                        <Trash2 className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="text-center">
                        <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Terminate Task?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed">
                            This action is irreversible. The record for <span className="text-foreground">{task.serialNo}</span> will be permanently purged from the organizational mainframe.
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
                    <AlertDialogAction
                        className="w-full h-14 bg-destructive text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-95" 
                        onClick={handleDeleteTask}
                    >
                        Confirm Termination
                    </AlertDialogAction>
                    <AlertDialogCancel className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-transparent transition-all">
                        Abort Command
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {showEditDialog && (
            <EditTaskDialog
                task={task}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                currentUserProfile={currentUserProfile}
            />
        )}

        {showShareDialog && (
            <ShareTaskDialog
                task={task}
                open={showShareDialog}
                onOpenChange={setShowShareDialog}
                currentUserProfile={currentUserProfile}
            />
        )}
        
        {isOpen && (
            <CompletionBriefDialog
                isOpen={isCompletionBriefOpen}
                onOpenChange={setIsCompletionBriefOpen}
                task={task}
                userProfile={currentUserProfile}
            />
        )}

      </DialogContent>
    </Dialog>
  );
}
