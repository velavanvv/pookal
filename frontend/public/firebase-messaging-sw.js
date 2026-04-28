importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Config is passed as query params when the SW is registered from the main thread.
const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey:            params.get('apiKey'),
  authDomain:        params.get('authDomain'),
  projectId:         params.get('projectId'),
  storageBucket:     params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId:             params.get('appId'),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification ?? {};
  const data         = payload.data ?? {};

  self.registration.showNotification(notification.title ?? 'New Order', {
    body:  notification.body ?? 'A new order has been placed on your store.',
    icon:  notification.icon ?? '/icon-192.png',
    badge: '/icon-192.png',
    tag:   data.order_number ?? 'pookal-order',
    data:  { url: self.location.origin + '/orders' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? self.location.origin;
  event.waitUntil(clients.openWindow(url));
});
