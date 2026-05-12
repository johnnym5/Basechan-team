<<<<<<< HEAD
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RequisitionsPageContent } from './RequisitionsPageContent';

interface RequisitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { reqId?: string };
}

export function RequisitionsDialog({ open, onOpenChange, initialPayload }: RequisitionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>Procurement & Requisitions</DialogTitle>
            <DialogDescription>Manage organizational financial requests and external vendor procurement.</DialogDescription>
          </DialogHeader>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <RequisitionsPageContent initialPayload={initialPayload} />
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
import { RequisitionsPageContent } from './RequisitionsPageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';


interface RequisitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { reqId?: string };
}

export function RequisitionsDialog({ open, onOpenChange, initialPayload }: RequisitionsDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="top" className="flex flex-col p-0">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Requisitions</DialogTitle>
            <DialogDescription>Manage all financial requisitions.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <RequisitionsPageContent initialPayload={initialPayload} />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
