'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TasksPageContent } from './TasksPageContent';
import type { UserProfile, Permissions } from '@/lib/types';

interface TasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { taskId?: string };
  userProfile: UserProfile | null;
  permissions: Permissions;
  modal?: boolean;
}

export function TasksDialog({ open, onOpenChange, initialPayload, userProfile, permissions, modal = false }: TasksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position="left" className="flex flex-col p-0">
        <DialogHeader className="sr-only">
            <DialogTitle>Mission Control: Task Manager</DialogTitle>
            <DialogDescription>View and manage tactical missions and team tasks.</DialogDescription>
        </DialogHeader>
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
