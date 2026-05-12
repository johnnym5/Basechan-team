'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root redirection component.
 * Ensures that users visiting the root domain are cleanly 
 * routed to the home page within the primary application group.
 */
export default function RootRedirectionPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirection to the app group to avoid route collisions
        router.replace('/');
    }, [router]);

    return null;
}
