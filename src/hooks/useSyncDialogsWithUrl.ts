<<<<<<< HEAD
'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Synchronizes the application's panel (dialog) state with the URL search parameters.
 * This enables deep linking and standard browser navigation for full-screen workstations.
 */
export function useSyncDialogsWithUrl() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const isInternalUpdate = useRef(false);

    // 1. URL -> UI (Handle incoming deep links)
    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        const panel = searchParams.get('panel');
        if (!panel) {
            uiEmitter.emit('close-all-dialogs');
            return;
        }

        const payload: Record<string, any> = {};
        searchParams.forEach((value, key) => {
            if (key !== 'panel') payload[key] = value;
        });

        // Trigger the specific panel via emitter
        uiEmitter.emit(`open-${panel}-dialog` as any, Object.keys(payload).length > 0 ? payload : undefined);
    }, [searchParams]);

    // 2. UI -> URL (Update URL when panels are opened/closed via UI buttons)
    useEffect(() => {
        const updateUrl = (panel: string | null, payload?: any) => {
            isInternalUpdate.current = true;
            const currentParams = new URLSearchParams(window.location.search);
            const currentPanel = currentParams.get('panel');

            // Avoid redundant navigation if state matches current URL
            if (panel === currentPanel && !payload) {
                isInternalUpdate.current = false;
                return;
            }

            const nextParams = new URLSearchParams();
            
            if (panel) {
                nextParams.set('panel', panel);
                if (payload) {
                    Object.entries(payload).forEach(([key, val]) => {
                        if (val) nextParams.set(key, String(val));
                    });
                }
                router.replace(`${pathname}?${nextParams.toString()}`);
            } else {
                // Only replace if there are actually params to clear
                if (window.location.search) {
                    router.replace(pathname);
                } else {
                    isInternalUpdate.current = false;
                }
            }
        };

        const handlers: any[] = [];
        
        const panelNames = [
            'profile', 'settings', 'chat', 'tasks', 'workbooks', 
            'requisitions', 'attendance', 'leave', 'reports', 
            'accounting', 'library', 'superadmin'
        ];

        panelNames.forEach(name => {
            const handler = (payload: any) => updateUrl(name, payload);
            uiEmitter.on(`open-${name}-dialog` as any, handler);
            handlers.push({ name: `open-${name}-dialog`, handler });
        });

        const closeHandler = () => updateUrl(null);
        uiEmitter.on('close-all-dialogs', closeHandler);

        return () => {
            handlers.forEach(h => uiEmitter.off(h.name as any, h.handler));
            uiEmitter.off('close-all-dialogs', closeHandler);
        };
    }, [pathname, router]);
}
=======
'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { uiEmitter } from '@/lib/ui-emitter';

/**
 * Synchronizes the application's panel (dialog) state with the URL search parameters.
 * This enables deep linking and standard browser navigation for modal workstations.
 */
export function useSyncDialogsWithUrl() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const isInternalUpdate = useRef(false);

    // 1. URL -> UI (Handle incoming deep links)
    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        const panel = searchParams.get('panel');
        if (!panel) {
            uiEmitter.emit('close-all-dialogs');
            return;
        }

        const payload: Record<string, any> = {};
        searchParams.forEach((value, key) => {
            if (key !== 'panel') payload[key] = value;
        });

        // Trigger the specific panel via emitter
        uiEmitter.emit(`open-${panel}-dialog` as any, Object.keys(payload).length > 0 ? payload : undefined);
    }, [searchParams]);

    // 2. UI -> URL (Update URL when panels are opened/closed via UI buttons)
    useEffect(() => {
        const updateUrl = (panel: string | null, payload?: any) => {
            isInternalUpdate.current = true;
            const params = new URLSearchParams(window.location.search);
            
            if (panel) {
                params.set('panel', panel);
                if (payload) {
                    Object.entries(payload).forEach(([key, val]) => {
                        if (val) params.set(key, String(val));
                    });
                }
            } else {
                // Clear all search params when closing
                const newParams = new URLSearchParams();
                router.replace(pathname);
                return;
            }
            
            router.replace(`${pathname}?${params.toString()}`);
        };

        const handlers: any[] = [];
        
        // Listen for all possible dialog opening events
        const panelNames = [
            'profile', 'settings', 'chat', 'tasks', 'workbooks', 
            'requisitions', 'attendance', 'leave', 'reports', 
            'accounting', 'library', 'superadmin'
        ];

        panelNames.forEach(name => {
            const handler = (payload: any) => updateUrl(name, payload);
            uiEmitter.on(`open-${name}-dialog` as any, handler);
            handlers.push({ name: `open-${name}-dialog`, handler });
        });

        const closeHandler = () => updateUrl(null);
        uiEmitter.on('close-all-dialogs', closeHandler);

        return () => {
            handlers.forEach(h => uiEmitter.off(h.name as any, h.handler));
            uiEmitter.off('close-all-dialogs', closeHandler);
        };
    }, [pathname, router]);
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
