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
    <div className="min-h-screen w-full bg-[#0a0a0a] text-foreground p-2 sm:p-4 lg:p-6 flex items-center justify-center overflow-hidden">
      {/* Docked App Shell Case */}
      <div
        className={cn(
          "w-full max-w-[1800px] h-[95vh] flex flex-col rounded-[2.5rem] border border-white/10 bg-card/20 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden relative transition-all duration-700 ease-apple-ease animate-in fade-in zoom-in-95",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
