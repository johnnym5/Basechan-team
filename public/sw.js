// Basechan Staff PWA Service Worker
// Deterministic background task handler for notifications and offline state.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

/**
 * Handles interactions with system notifications.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const action = event.action;

    // Handle "Log In" or "Sign Out" actions from the notification buttons
    if (action === 'login' || !action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                // Focus existing window if open
                for (const client of clientList) {
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});
