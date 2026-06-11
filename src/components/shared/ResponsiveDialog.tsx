'use client';

import * as React from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
}

/**
 * A responsive wrapper that renders as a centered Dialog on desktop 
 * and a bottom-anchored Sheet (Drawer) on mobile for a native feel.
 */
export function ResponsiveDialog({
  children,
  open,
  onOpenChange,
  title,
  description,
  className
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("sm:max-w-md apple-glass-darker border-none rounded-3xl animate-pop-in", className)}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-headline tracking-tight">{title}</DialogTitle>
            {description && <DialogDescription className="text-sm opacity-60 uppercase tracking-widest font-black mt-1">{description}</DialogDescription>}
          </DialogHeader>
          <div className="py-2">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn("h-[90vh] rounded-t-[3rem] apple-glass-darker border-none p-0 overflow-hidden", className)}>
        {/* Native-style pull handle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted/30 rounded-full z-10" />
        
        <div className="flex flex-col h-full">
            <SheetHeader className="text-left px-8 pt-10 pb-4">
                <SheetTitle className="text-3xl font-black font-headline tracking-tighter">{title}</SheetTitle>
                {description && <SheetDescription className="text-xs uppercase tracking-[0.2em] font-black opacity-50">{description}</SheetDescription>}
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-8 pb-32">
                {children}
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
