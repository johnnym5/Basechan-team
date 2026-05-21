'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WebDashboardPageContent } from './WebDashboardPageContent';

interface WebDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPayload?: { displayId?: string };
}

export function WebDashboardDialog({ open, onOpenChange, initialPayload }: WebDashboardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent position="left" className="flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Live Displays & Dashboards</DialogTitle>
          <DialogDescription>Integration of external analytical tools and real-time dashboards.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
            <div className="p-6 h-full min-h-[calc(100vh-2rem)]">
                <WebDashboardPageContent initialPayload={initialPayload} />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
