'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';

export const CloseToDashboardButton = () => {
  const pathname = usePathname();

  // Define dashboard paths where the button should not be shown
  const dashboardPaths = ['/dashboard', '/'];

  if (dashboardPaths.includes(pathname)) {
    return null;
  }

  return (
    <Link
      href="/dashboard"
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-card/50 text-foreground/70 backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground"
      aria-label="Close module and return to dashboard"
    >
      <X className="h-5 w-5" />
    </Link>
  );
};