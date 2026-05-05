'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TasksPageContent } from './TasksPageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { PanelSwitcher } from '@/components/layout/PanelSwitcher';


interface TasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { taskId?: string };
}

export function TasksDialog({ open, onOpenChange, initialPayload }: TasksDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <PanelSwitcher />
        <VisuallyHidden>
            <DialogHeader>
                <DialogTitle>Task Manager</DialogTitle>
                <DialogDescription>View and manage tasks.</DialogDescription>
            </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <TasksPageContent initialPayload={initialPayload} />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
