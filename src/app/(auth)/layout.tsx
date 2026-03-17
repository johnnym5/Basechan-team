'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This layout now serves only to redirect any access attempts to /login or /register.
export default function AuthRedirectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/');
    }, [router]);

    // Show a loader while redirecting to avoid flashing the old content.
    return (
        <main className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="animate-spin text-primary w-12 h-12" />
        </main>
    );
}
