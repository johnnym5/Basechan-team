
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
import { format } from 'date-fns';
import { Calendar, CheckSquare, History, Info, BookOpenCheck, User, Plus, Trash2, Share2, Pencil, Check, Loader2, Hourglass, LifeBuoy } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion, collection } from 'firebase/firestore';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ActivityFeed } from '../shared/ActivityFeed';
import { ShareTaskDialog } from './ShareTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { uiEmitter } from '@/lib/ui-emitter';
import { CompletionBriefDialog } from './CompletionBriefDialog';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
}

export function TaskDetailDialog({ task: initialTask, isOpen, onOpenChange, currentUserProfile, permissions }: TaskDetailDialogProps) {
  const firestore = useFirestore();

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
    const updatedSubTasks = subTasks.map(st => 
        st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    setSubTasks(updatedSubTasks);
    const taskRef = doc(firestore, 'tasks', task.id);
    updateDocumentNonBlocking(taskRef, { subTasks: updatedSubTasks });
  };

  const handleAddSubTask = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      if (!newSubTask.trim()) return;
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const newSubTaskItem: SubTask = { id: newId, text: newSubTask, completed: false };
      const updatedSubTasks = [...subTasks, newSubTaskItem];
      setSubTasks(updatedSubTasks);
      setNewSubTask('');
      const taskRef = doc(firestore, 'tasks', task.id);
      updateDocumentNonBlocking(taskRef, { subTasks: updatedSubTasks });
  };
  
  const handleDeleteTask = (e: React.MouseEvent) => {
    e.preventDefault();
    const taskRef = doc(firestore, 'tasks', task.id);
    deleteDocumentNonBlocking(taskRef);
    setShowDeleteConfirm(false); // close confirmation
    onOpenChange(false); // Close the main dialog
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
    setIsSubmitting(true);
    const taskRef = doc(firestore, 'tasks', task.id);
    const now = new Date().toISOString();
    let logText = '';

    switch (newStatus) {
        case 'ACTIVE':
            logText = `activated the mission.`;
            break;
        case 'ARCHIVED':
            logText = `approved and archived the mission.`;
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
    
    updateDocumentNonBlocking(taskRef, {
        status: newStatus,
        activity: arrayUnion(...activity)
    });
    
    if (currentUserProfile.id !== task.assignedTo) {
        let notifTitle = '';
        let notifDescription = '';
        
        if (newStatus === 'ACTIVE') {
            notifTitle = 'Revisions Requested';
            notifDescription = `Revisions have been requested for "${task.title}".`;
        } else if (newStatus === 'ARCHIVED') {
            notifTitle = 'Mission Accomplished';
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

    onOpenChange(false); // Close dialog on status change
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
                <Badge variant="secondary">{task.status.replace('_', ' ')}</Badge>
                <span>
                Assigned to {task.assignedToName}
                </span>
             </div>
           </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 py-4 flex-1 overflow-y-auto">
          <div className="md:col-span-2 space-y-6 flex flex-col">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Info className="h-4 w-4" /> Details
              </h4>
              <p className="text-foreground text-sm">{task.description || "No description provided."}</p>
            </div>
            
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CheckSquare className="h-4 w-4" /> Checklist
                </h4>
                <div className="space-y-2 rounded-md border p-3">
                    {subTasks.map(st => (
                        <div key={st.id} className="flex items-center gap-3">
                            <Checkbox 
                                id={`subtask-${st.id}`} 
                                checked={st.completed}
                                onCheckedChange={() => handleSubTaskToggle(st.id)}
                            />
                            <label htmlFor={`subtask-${st.id}`} className={cn("text-sm flex-1", st.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                {st.text}
                            </label>
                        </div>
                    ))}
                    {subTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No checklist items yet.</p>}
                     <div className="flex items-center gap-2 pt-2 border-t">
                        <Input 
                            placeholder="Add a checklist item..."
                            value={newSubTask}
                            onChange={(e) => setNewSubTask(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubTask(e) }}
                            className="h-9"
                        />
                        <Button size="icon" variant="ghost" onClick={handleAddSubTask}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <History className="h-4 w-4" /> Activity Feed
              </h4>
              <div className="flex-1 rounded-md border p-4">
                  <ActivityFeed
                    activity={task.activity}
                    currentUserProfile={currentUserProfile}
                    onAddComment={handleAddComment}
                    isLoading={isSubmitting}
                  />
              </div>
            </div>
          </div>
          <div className="md:col-span-1 space-y-4 rounded-lg border bg-secondary/30 p-4 h-fit">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold">Mission Brief</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Assignee
                </span>
                <span className="font-medium">{task.assignedToName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Due Date
                </span>
                <span className="font-medium">
                  {task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Hourglass className="h-4 w-4" /> Estimated Hours
                </span>
                <span className="font-medium">
                  {task.estimatedHours ? `${task.estimatedHours}h` : 'Not set'}
                </span>
              </div>
               {task.workbookId && (
                 <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <BookOpenCheck className="h-4 w-4" /> Workbook
                    </span>
                    <Button
                        variant="link"
                        className="h-auto p-0 font-medium text-primary hover:underline truncate max-w-[100px]"
                        onClick={() => {
                            uiEmitter.emit('open-workbooks-dialog', { workbookId: task.workbookId!, sheetId: task.sheetId });
                            onOpenChange(false);
                        }}
                    >
                        View Sheet
                    </Button>
                  </div>
               )}
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between flex-shrink-0">
             <div className='flex justify-start w-full items-center'>
                <div className='flex gap-2'>
                    {permissions.canManageStaff && (
                        <>
                            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the mission "{task.title}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive hover:bg-destructive/90" 
                                            onClick={handleDeleteTask}
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        </>
                    )}
                    {(permissions.canManageStaff || task.assignedTo === currentUserProfile.id) && (
                        <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    )}
                </div>
            </div>
            <div className="ml-auto flex gap-2">
                {/* For Assignee */}
                {task.assignedTo === currentUserProfile.id && task.status === 'QUEUED' && (
                    <Button onClick={() => handleStatusChange('ACTIVE')} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Start Mission
                    </Button>
                )}
                {task.assignedTo === currentUserProfile.id && task.status === 'ACTIVE' && (
                    <Button onClick={() => setIsCompletionBriefOpen(true)}>Submit for Review</Button>
                )}
                
                {/* For Manager */}
                {permissions.canManageStaff && task.status === 'AWAITING_REVIEW' && (
                    <>
                        <Button variant="outline" onClick={() => handleStatusChange('ACTIVE', 'Revisions requested.')} disabled={isSubmitting}>Request Revisions</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange('ARCHIVED')} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Approve & Archive
                        </Button>
                    </>
                )}
            </div>
        </DialogFooter>
        
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

    