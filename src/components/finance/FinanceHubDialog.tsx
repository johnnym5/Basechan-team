'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FinanceHub } from './FinanceHub';

interface FinanceHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { reqId?: string; tab?: string };
  modal?: boolean;
}

export function FinanceHubDialog({ open, onOpenChange, initialPayload, modal = false }: FinanceHubDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position={modal ? "center" : "left"} className="flex flex-col p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Finance Command Center</DialogTitle>
          <DialogDescription>Integrated financial management hub.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
            <FinanceHub initialPayload={initialPayload} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
