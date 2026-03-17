'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        // If we are done loading and a user object exists, redirect them away.
        if (!isUserLoading && user) {
            router.replace('/');
        }
    }, [user, isUserLoading, router]);

    // Only show a loader while the auth state is being determined.
    if (isUserLoading) {
        return (
             <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-12 h-12" />
            </div>
        );
    }

    // If we are done loading and there's no user, show the content.
    // If a user *is* present, this will render for a brief moment before the
    // useEffect above redirects them. This is preferable to a loading loop.
    return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            {children}
        </main>
    );
}
