'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TasksPageContent } from './TasksPageContent';
import type { UserProfile, Permissions } from '@/lib/types';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
        <VisuallyHidden>
            <DialogHeader>
                <DialogTitle>Mission Control: Task Manager</DialogTitle>
                <DialogDescription>View and manage tactical missions and team tasks.</DialogDescription>
            </DialogHeader>
        </VisuallyHidden>
        <div className="flex-1 min-h-0">
            <TasksPageContent 
                initialPayload={initialPayload} 
                currentUserProfile={userProfile} 
                permissions={permissions} 
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}