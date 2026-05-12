'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TasksPageContent } from './TasksPageContent';

interface TasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { taskId?: string };
}

export function TasksDialog({ open, onOpenChange, initialPayload }: TasksDialogProps) {
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
                <TasksPageContent initialPayload={initialPayload} />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
