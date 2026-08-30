import { apiFetch } from './api';

/**
 * Check if Web Push & Notifications API are supported by this browser
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current browser notification permission
 */
export function getPushPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Convert base64 VAPID string to Uint8Array for pushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser already has an active push subscription
 */
export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('Get existing push subscription note:', err);
    return null;
  }
}

/**
 * Request permission & subscribe browser for outside-the-app offer notifications
 */
export async function subscribeToPushNotifications(user = null) {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  // 1. Request Permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notification permission was denied in browser settings. Please enable notifications for this site to receive outside-app offer alerts.'
        : 'Notification permission dismissed.'
    );
  }

  // 2. Fetch VAPID Public Key from Backend
  const vapidRes = await apiFetch('/public/push/vapid-key');
  if (!vapidRes || !vapidRes.publicKey) {
    throw new Error('Unable to retrieve push notification encryption keys from server.');
  }

  // 3. Register Service Worker & Subscribe with PushManager
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const convertedKey = urlBase64ToUint8Array(vapidRes.publicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });
  }

  // 4. Send subscription to Backend
  const subPayload = JSON.parse(JSON.stringify(subscription));
  const res = await apiFetch('/public/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      subscription: subPayload,
      userId: user?.id || user?.student_id || null,
      email: user?.email || null,
      platform: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile_web' : 'desktop_web'
    })
  });

  localStorage.setItem('sm_push_offer_alerts', 'true');
  return { success: true, subscription, message: res.message || 'Subscribed to offer alerts!' };
}

/**
 * Unsubscribe from outside-the-app push notifications
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await apiFetch('/public/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }

    localStorage.removeItem('sm_push_offer_alerts');
    return { success: true, message: 'Unsubscribed from outside-the-app alerts.' };
  } catch (err) {
    console.error('Unsubscribe push error:', err);
    throw err;
  }
}

/**
 * Send an instant test notification to verify outside-app reception
 */
export async function triggerTestNotification() {
  if (!isPushSupported()) {
    throw new Error('Notifications are not supported by this browser.');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // If not subscribed to backend push yet, request permission and trigger immediate local SW notification
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registration.showNotification('🎉 35% OFF Flash Deal Alert!', {
        body: 'Success Mantra Special: Use Code "MANTRA35" for 35% OFF on Class 12 Commerce Master Program!',
        icon: '/logo.png',
        badge: '/favicon-32x32.png',
        tag: `test-offer-${Date.now()}`,
        data: { url: '/courses' },
        actions: [
          { action: 'claim_offer', title: 'Claim 35% OFF 🎁' },
          { action: 'view_course', title: 'Explore Courses 📚' }
        ]
      });
      return { success: true, message: '🔔 Test notification displayed! Check your notification tray outside the app.' };
    } else {
      throw new Error('Notification permission is not granted.');
    }
  }

  // Trigger from server via Web Push
  const subPayload = JSON.parse(JSON.stringify(subscription));
  const res = await apiFetch('/public/push/test', {
    method: 'POST',
    body: JSON.stringify({ subscription: subPayload })
  });

  return res;
}
