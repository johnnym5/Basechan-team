'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Tactical Theme Toggle component.
 * Provides hydration-safe light/dark/system mode switching.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Ensure component is mounted before rendering theme-dependent UI to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full w-10 h-10">
        <Sun className="h-[1.2rem] w-[1.2rem] opacity-20" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 relative focus-visible:ring-0 focus-visible:ring-offset-0 interactive-element">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="apple-glass border-none shadow-3xl mt-2 min-w-[140px]">
        <DropdownMenuItem 
          onSelect={() => setTheme('light')} 
          className="p-3 cursor-pointer font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 transition-colors"
        >
          <Sun className="mr-3 h-4 w-4 text-amber-500" /> Light Mode
        </DropdownMenuItem>
        <DropdownMenuItem 
          onSelect={() => setTheme('dark')} 
          className="p-3 cursor-pointer font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 transition-colors"
        >
          <Moon className="mr-3 h-4 w-4 text-primary" /> Dark Mode
        </DropdownMenuItem>
        <DropdownMenuItem 
          onSelect={() => setTheme('system')} 
          className="p-3 cursor-pointer font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 transition-colors"
        >
          <Monitor className="mr-3 h-4 w-4 text-muted-foreground" /> System Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
