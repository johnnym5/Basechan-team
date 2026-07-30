'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ModuleContainerProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Standardized reusable wrapper component for every module/page view.
 * Ensures consistent framing, padding, and scroll behavior.
 */
export function ModuleContainer({
  children,
  header,
  title,
  subtitle,
  actions,
  className,
  contentClassName
}: ModuleContainerProps) {
  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700", className)}>
      {/* Module Header */}
      {(header || title) && (
        <header className="shrink-0 px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          {header || (
            <>
              <div className="space-y-1">
                <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground uppercase">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && <div className="flex items-center gap-3">{actions}</div>}
            </>
          )}
        </header>
      )}

      {/* Module Body */}
      <main className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full">
          <div className={cn("p-6 lg:p-8 space-y-8", contentClassName)}>
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
