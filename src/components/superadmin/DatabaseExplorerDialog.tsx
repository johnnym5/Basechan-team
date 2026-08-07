'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DatabaseExplorer } from "./DatabaseExplorer";

interface DatabaseExplorerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DatabaseExplorerDialog({ open, onOpenChange }: DatabaseExplorerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 apple-glass-darker border-none overflow-hidden">
        <DialogHeader className="p-8 pb-4 shrink-0">
          <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Kernel Database Explorer</DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">High-level architectural oversight and document mutation.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <DatabaseExplorer />
        </div>
      </DialogContent>
    </Dialog>
  );
}
