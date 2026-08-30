// Success Mantra Service Worker for Web Push & Outside-the-App Offer Notifications
const CACHE_NAME = 'success-mantra-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for Push Notifications from Backend (Even when app is closed / in background)
self.addEventListener('push', (event) => {
  let data = {
    title: '🎉 New Offer from Success Mantra!',
    body: 'Exclusive discounts and masterclass updates from CA Manish Kalra.',
    icon: '/logo.png',
    badge: '/favicon-32x32.png',
    tag: 'sm-offer',
    data: {
      url: 'https://www.camanishkalra.com/courses',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/favicon-32x32.png',
    image: data.image || undefined,
    tag: data.tag || `sm-offer-${Date.now()}`,
    data: data.data || { url: 'https://www.camanishkalra.com/courses' },
    vibrate: [200, 100, 200],
    requireInteraction: true, // Keep notification visible until user interacts
    actions: data.actions || [
      {
        action: 'claim_offer',
        title: 'Claim Offer 🎁'
      },
      {
        action: 'explore_courses',
        title: 'Explore Courses 📚'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Handle User Clicking the Notification or Action Buttons Outside the App
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickAction = event.action;
  let targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/courses';

  if (clickAction === 'explore_courses') {
    targetUrl = '/courses';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle Subscription Change
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/public/push/vapid-key')
      .then(res => res.json())
      .then(data => {
        if (!data || !data.publicKey) return;
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: data.publicKey
        });
      })
      .then(newSubscription => {
        if (!newSubscription) return;
        return fetch('/api/public/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSubscription })
        });
      })
      .catch(err => console.error('Subscription change update error:', err))
  );
});
