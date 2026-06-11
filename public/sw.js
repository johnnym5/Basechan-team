
// Basechan Staff PWA Service Worker
const CACHE_NAME = 'basechan-cache-v1';
const BRIEFING_CACHE = 'morning-briefing-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Interactive Notification Logic
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  notification.close();

  // Focus or Open App Window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      let client = clientList.find((c) => c.visibilityState === 'visible') || clientList[0];

      if (client) {
        client.focus();
        if (action === 'clock-in') {
          client.postMessage({ type: 'TRIGGER_ACTION', action: 'open-attendance' });
        } else if (action === 'sign-out') {
          client.postMessage({ type: 'TRIGGER_ACTION', action: 'trigger-signout' });
        }
        return;
      }

      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Morning Preloading via Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'morning-debrief-preload') {
    event.waitUntil(preloadDebriefData());
  }
});

async function preloadDebriefData() {
  const cache = await caches.open(BRIEFING_CACHE);
  // In a production app, we would fetch specific API endpoints here
  // For now, we ensure the shell and key assets are ready
  return cache.addAll([
    '/',
    '/globals.css',
    '/favicon.ico'
  ]);
}
