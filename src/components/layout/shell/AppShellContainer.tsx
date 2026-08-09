'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AppShellContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Acts as the outer frame/case enclosing both the Sidebar Dock and the Main Viewport.
 * Implements the bounded "App Shell Case" architecture.
 */
export function AppShellContainer({ children, className }: AppShellContainerProps) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground p-2 sm:p-4 lg:p-6 flex items-center justify-center overflow-hidden">
      {/* Docked App Shell Case */}
      <div
        className={cn(
          "w-full max-w-[1800px] h-[95vh] flex flex-col rounded-[2.5rem] border border-border/50 bg-card/20 backdrop-blur-3xl shadow-2xl overflow-hidden relative transition-all duration-700 ease-apple-ease animate-in fade-in zoom-in-95",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
