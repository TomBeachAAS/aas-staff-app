declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title ?? 'AAS Staff Portal';
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag ?? data.url ?? 'aas-notification',
    renotify: true,
    data: { url: data.url ?? '/dashboard' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/dashboard';
  event.waitUntil(
    (self.clients as any).matchAll({ type: 'window', includeUncontrolled: true }).then((clients: WindowClient[]) => {
      // Focus existing window if already open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new window
      return (self.clients as any).openWindow(url);
    })
  );
});
