
/* Basechan Staff - Service Worker for Interactive Notifications */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  
  if (action === 'login' || !action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // If a window is already open, focus it and navigate
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus().then(c => c.navigate('/?panel=attendance'));
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/?panel=attendance');
        }
      })
    );
  }
});
