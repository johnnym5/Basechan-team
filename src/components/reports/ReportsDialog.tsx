'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ReportsPageContent } from './ReportsPageContent';

interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { tab?: string };
  modal?: boolean;
}

export function ReportsDialog({ open, onOpenChange, initialPayload, modal = false }: ReportsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position={modal ? "center" : "left"} className="flex flex-col p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Organizational Analytics</DialogTitle>
          <DialogDescription>Analyze performance and review team reports.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] p-8 pb-32 custom-scrollbar bg-background">
            <ReportsPageContent initialPayload={initialPayload} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
