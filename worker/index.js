// Force immediate activation — belt-and-suspenders alongside next-pwa's skipWaiting/clientsClaim config
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  if (!event.data) return;
  var data = {};
  try { data = event.data.json(); } catch(e) { data = { title: 'AAS Staff', body: event.data.text() }; }

  var title = data.title || 'AAS Staff Portal';
  var options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || data.url || 'aas-notification',
    renotify: true,
    data: { url: data.url || '/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if ('focus' in client) {
          try { client.navigate(url); } catch(e) {}
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
