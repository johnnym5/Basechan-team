'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TasksPageContent } from './TasksPageContent';
import type { UserProfile, Permissions } from '@/lib/types';

interface TasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { taskId?: string };
  userProfile: UserProfile | null;
  permissions: Permissions;
}

export function TasksDialog({ open, onOpenChange, initialPayload, userProfile, permissions }: TasksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
            <DialogHeader>
                <DialogTitle>Mission Control: Task Manager</DialogTitle>
                <DialogDescription>View and manage tactical missions and team tasks.</DialogDescription>
            </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <TasksPageContent 
                  initialPayload={initialPayload} 
                  currentUserProfile={userProfile} 
                  permissions={permissions} 
                />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}