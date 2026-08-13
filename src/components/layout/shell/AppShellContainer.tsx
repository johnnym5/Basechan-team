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
    <div className="min-h-screen w-full bg-background text-foreground flex overflow-hidden">
      {/* Docked App Shell Case */}
      <div
        className={cn(
          "w-full h-screen flex transition-all duration-700 ease-apple-ease animate-in fade-in",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
