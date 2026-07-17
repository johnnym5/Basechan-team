'use client';

import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-full mb-6">
            <FileQuestion className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-foreground">404 - Page Not Found</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
            The page you are looking for does not exist or has been moved. Let's get you back on track.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild>
                <Link href="/">Go to Home</Link>
            </Button>
        </div>
    </div>
  );
}
