'use client';

import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Cannot use hooks here, so we just log to console.
    // A production app would use a third-party logging service.
    console.error("Global Error Boundary Caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
        <head>
            <title>Application Error</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased">
            <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-full mb-6">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                </div>
                <h1 className="text-3xl font-bold font-headline text-foreground">A Critical Error Occurred</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                    The application has encountered a serious problem. The error has been logged for review. Please reload the page to restart.
                </p>
                
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                     <Button
                        onClick={() => window.location.reload()}
                        variant="destructive"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reload Page
                    </Button>
                </div>
            </div>
      </body>
    </html>
  );
}
