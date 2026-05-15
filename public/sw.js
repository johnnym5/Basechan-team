// Basechan Staff PWA Service Worker
const CACHE_NAME = 'basechan-v1';
const BRIEFING_CACHE = 'morning-briefing-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ZERO-WAIT MORNING PRELOADING
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'morning-debrief-preload') {
    event.waitUntil(preloadDebriefData());
  }
});

async function preloadDebriefData() {
  try {
    const cache = await caches.open(BRIEFING_CACHE);
    // In a production environment, we would fetch fresh Firestore data here
    // For now, we simulate pre-caching the application shell and static assets
    await cache.addAll(['/', '/?panel=attendance', '/?panel=tasks']);
    console.log('Morning debrief telemetry synchronized');
  } catch (e) {
    console.error('Periodic sync failed:', e);
  }
}

// INTERACTIVE NOTIFICATION HANDLER
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  notification.close();

  if (action === 'dismiss') {
    return;
  }

  // Handle "Log In", "Start Shift", "Sign Out" actions
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (notification.tag === 'geofence-arrival') {
              return focusedClient.navigate('/?panel=attendance');
            }
            if (notification.tag.startsWith('shift-end') || notification.tag === 'geofence-departure') {
              return focusedClient.navigate('/?panel=attendance');
            }
            return focusedClient.navigate('/');
          });
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        let url = '/';
        if (notification.tag === 'geofence-arrival' || notification.tag === 'geofence-departure') {
          url = '/?panel=attendance';
        }
        return clients.openWindow(url);
      }
    })
  );
});
