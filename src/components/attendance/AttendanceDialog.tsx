'use client';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AttendancePageContent } from './AttendancePageContent';

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
}

export function AttendanceDialog({ open, onOpenChange, modal = false }: AttendanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position={modal ? "center" : "left"} className="flex flex-col p-0 overflow-hidden">
        <DialogHeader className="sr-only">
            <DialogTitle>Attendance Center</DialogTitle>
            <DialogDescription>Manage your work hours and see who's currently online.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
            <AttendancePageContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
