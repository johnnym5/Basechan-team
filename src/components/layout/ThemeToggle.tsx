'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

/**
 * Tactical Theme Toggle component.
 * Provides hydration-safe light/dark/system mode switching.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Ensure component is mounted before rendering theme-dependent UI to avoid hydration mismatch
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px] size-11 flex items-center justify-center" disabled />;
  }

  return (
    <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px] size-11 flex items-center justify-center" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500" /> : <Moon className="h-[1.2rem] w-[1.2rem] text-primary" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
