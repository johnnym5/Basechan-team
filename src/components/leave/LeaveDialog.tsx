'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeavePageContent } from './LeavePageContent';

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
}

export function LeaveDialog({ open, onOpenChange, modal = false }: LeaveDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position={modal ? "center" : "left"} className="flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Leave Management</DialogTitle>
          <DialogDescription>Request time off and manage your leave balance.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <LeavePageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
