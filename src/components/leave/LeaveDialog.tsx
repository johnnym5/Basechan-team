<<<<<<< HEAD
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeavePageContent } from './LeavePageContent';

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveDialog({ open, onOpenChange }: LeaveDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Leave Management</DialogTitle>
            <DialogDescription>Request time off and manage your leave balance.</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <LeavePageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
=======
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeavePageContent } from './LeavePageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveDialog({ open, onOpenChange }: LeaveDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="top" className="flex flex-col p-0">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Leave Management</DialogTitle>
            <DialogDescription>Request time off and manage your leave balance.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <LeavePageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
