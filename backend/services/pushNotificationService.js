const webpush = require('web-push');
const db = require('../database/db');
const { getDoc, setDoc, addDoc, queryCollection, deleteDoc } = require('../database/firestore');

// Fallback in-memory VAPID key cache
let cachedVapidKeys = null;

/**
 * Initialize VAPID Keys: retrieve existing or generate new pair & persist.
 */
async function initVapidKeys() {
  if (cachedVapidKeys) {
    return cachedVapidKeys;
  }

  // 1. Check environment variables
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cachedVapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:camanishkalra@gmail.com',
      cachedVapidKeys.publicKey,
      cachedVapidKeys.privateKey
    );
    return cachedVapidKeys;
  }

  // 2. Check Database / Settings
  try {
    let vapidDoc = await getDoc('settings', 'push_vapid');
    if (vapidDoc && vapidDoc.publicKey && vapidDoc.privateKey) {
      cachedVapidKeys = {
        publicKey: vapidDoc.publicKey,
        privateKey: vapidDoc.privateKey
      };
    } else if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        const row = db.prepare("SELECT value FROM system_settings WHERE key = 'push_vapid'").get();
        if (row && row.value) {
          cachedVapidKeys = JSON.parse(row.value);
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 3. Generate new VAPID keys if none exist yet
  if (!cachedVapidKeys || !cachedVapidKeys.publicKey) {
    const newKeys = webpush.generateVAPIDKeys();
    cachedVapidKeys = {
      publicKey: newKeys.publicKey,
      privateKey: newKeys.privateKey
    };

    try {
      await setDoc('settings', 'push_vapid', cachedVapidKeys);
    } catch (e) {}

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO system_settings (key, value, updated_at)
          VALUES ('push_vapid', ?, CURRENT_TIMESTAMP)
        `).run(JSON.stringify(cachedVapidKeys));
      } catch (e) {}
    }
  }

  // Set VAPID Details
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:camanishkalra@gmail.com',
    cachedVapidKeys.publicKey,
    cachedVapidKeys.privateKey
  );

  return cachedVapidKeys;
}

/**
 * Get VAPID Public Key for client subscription
 */
async function getVapidPublicKey() {
  const keys = await initVapidKeys();
  return keys.publicKey;
}

/**
 * Save browser/device push subscription
 */
async function savePushSubscription({ subscription, userId = null, email = null, userAgent = '', platform = 'web' }) {
  if (!subscription || !subscription.endpoint) {
    throw new Error('Invalid subscription payload: endpoint required.');
  }

  await initVapidKeys();

  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh || '';
  const auth = subscription.keys?.auth || '';
  const subId = `sub_${Buffer.from(endpoint.slice(-32)).toString('hex')}`;

  const docData = {
    id: subId,
    endpoint,
    p256dh,
    auth,
    user_id: userId,
    email,
    user_agent: userAgent,
    platform,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    await setDoc('push_subscriptions', subId, docData);
  } catch (e) {
    console.warn('Firestore push subscription write note:', e.message);
  }

  if (db && typeof db.prepare === 'function') {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          endpoint TEXT UNIQUE,
          p256dh TEXT,
          auth TEXT,
          user_id TEXT,
          email TEXT,
          user_agent TEXT,
          platform TEXT,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      db.prepare(`
        INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_id, email, user_agent, platform, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(endpoint) DO UPDATE SET
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          user_id = COALESCE(excluded.user_id, push_subscriptions.user_id),
          email = COALESCE(excluded.email, push_subscriptions.email),
          user_agent = excluded.user_agent,
          platform = excluded.platform,
          is_active = 1,
          updated_at = CURRENT_TIMESTAMP
      `).run(subId, endpoint, p256dh, auth, userId, email, userAgent, platform);
    } catch (e) {
      console.warn('SQLite push subscription write note:', e.message);
    }
  }

  return { success: true, id: subId };
}

/**
 * Remove push subscription
 */
async function removePushSubscription(endpoint) {
  if (!endpoint) return { success: false };

  const subId = `sub_${Buffer.from(endpoint.slice(-32)).toString('hex')}`;
  try {
    await deleteDoc('push_subscriptions', subId);
  } catch (e) {}

  if (db && typeof db.prepare === 'function') {
    try {
      db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
    } catch (e) {}
  }

  return { success: true };
}

/**
 * Fetch all active push subscriptions
 */
async function getAllActiveSubscriptions() {
  let list = [];

  if (db && typeof db.prepare === 'function') {
    try {
      list = db.prepare("SELECT * FROM push_subscriptions WHERE is_active = 1").all();
    } catch (e) {}
  }

  if (!list || list.length === 0) {
    try {
      const docs = await queryCollection('push_subscriptions', {
        filters: [{ field: 'is_active', op: '==', value: true }]
      });
      list = docs || [];
    } catch (e) {}
  }

  return (list || []).map(row => ({
    id: row.id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    },
    user_id: row.user_id,
    email: row.email,
    platform: row.platform
  }));
}

/**
 * Count active push subscribers
 */
async function getPushSubscribersCount() {
  if (db && typeof db.prepare === 'function') {
    try {
      const row = db.prepare("SELECT COUNT(*) as count FROM push_subscriptions WHERE is_active = 1").get();
      return row ? row.count : 0;
    } catch (e) {}
  }

  try {
    const list = await queryCollection('push_subscriptions');
    return (list || []).length;
  } catch (e) {
    return 0;
  }
}

/**
 * Send a push notification payload to a single subscription
 */
async function sendPushToSubscription(subscription, payload) {
  await initVapidKeys();

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys?.p256dh || subscription.p256dh,
      auth: subscription.keys?.auth || subscription.auth
    }
  };

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const response = await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 60 * 60 * 24 // 24 hours
    });
    return { success: true, statusCode: response.statusCode };
  } catch (err) {
    console.error(`[PUSH ERROR] Failed to send push to ${subscription.endpoint?.slice(0, 30)}...:`, err.message);

    // If subscription is expired or unsubscribed (410 Gone or 404 Not Found), remove it
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[PUSH CLEANUP] Removing expired subscription: ${subscription.endpoint?.slice(0, 30)}...`);
      await removePushSubscription(subscription.endpoint);
    }

    return { success: false, statusCode: err.statusCode, error: err.message };
  }
}

/**
 * Broadcast an Offer Notification outside the app to all registered devices & browsers
 */
async function broadcastOfferNotification({
  title = '🎉 New Special Offer from Success Mantra!',
  body = 'Check out exclusive discounts on CA Manish Kalra\'s commerce courses and masterclasses.',
  couponCode = '',
  discountText = '',
  validTill = '',
  url = 'https://www.camanishkalra.com/courses',
  icon = '/logo.png',
  badge = '/favicon-32x32.png',
  image = '',
  tag = 'success-mantra-offer'
}) {
  await initVapidKeys();

  const subscriptions = await getAllActiveSubscriptions();
  if (!subscriptions || subscriptions.length === 0) {
    console.log('[PUSH BROADCAST] No active push subscriptions registered.');
    return {
      success: true,
      totalSubscribers: 0,
      sentCount: 0,
      failedCount: 0,
      message: 'No registered push notification devices found.'
    };
  }

  const notificationPayload = {
    title: title || '🎁 Exclusive Offer from CA Manish Kalra',
    body: `${body}${couponCode ? ` Use Code: ${couponCode}` : ''}${validTill ? ` (Valid till ${validTill})` : ''}`,
    icon: icon || '/logo.png',
    badge: badge || '/favicon-32x32.png',
    image: image || undefined,
    tag: `${tag}-${Date.now()}`,
    data: {
      url: url || 'https://www.camanishkalra.com/courses',
      couponCode: couponCode || '',
      discountText: discountText || '',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'claim_offer',
        title: couponCode ? `Claim with ${couponCode} 🎁` : 'View Special Offer 🚀'
      },
      {
        action: 'explore_courses',
        title: 'Explore Courses 📚'
      }
    ]
  };

  let sentCount = 0;
  let failedCount = 0;

  const pushPromises = subscriptions.map(async (sub) => {
    const res = await sendPushToSubscription(sub, notificationPayload);
    if (res.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  });

  await Promise.allSettled(pushPromises);

  // Record push campaign in history
  const campaignRecord = {
    id: `push_camp_${Date.now()}`,
    title,
    body,
    coupon_code: couponCode,
    discount_text: discountText,
    url,
    total_target: subscriptions.length,
    sent_count: sentCount,
    failed_count: failedCount,
    created_at: new Date().toISOString()
  };

  try {
    await addDoc('push_campaigns', campaignRecord);
  } catch (e) {}

  if (db && typeof db.prepare === 'function') {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS push_campaigns (
          id TEXT PRIMARY KEY,
          title TEXT,
          body TEXT,
          coupon_code TEXT,
          discount_text TEXT,
          url TEXT,
          total_target INTEGER,
          sent_count INTEGER,
          failed_count INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      db.prepare(`
        INSERT INTO push_campaigns (id, title, body, coupon_code, discount_text, url, total_target, sent_count, failed_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        campaignRecord.id,
        campaignRecord.title,
        campaignRecord.body,
        campaignRecord.coupon_code,
        campaignRecord.discount_text,
        campaignRecord.url,
        campaignRecord.total_target,
        campaignRecord.sent_count,
        campaignRecord.failed_count,
        campaignRecord.created_at
      );
    } catch (e) {}
  }

  console.log(`[PUSH BROADCAST COMPLETE] Dispatched to ${sentCount}/${subscriptions.length} devices (Failed: ${failedCount})`);

  return {
    success: true,
    totalSubscribers: subscriptions.length,
    sentCount,
    failedCount,
    campaignId: campaignRecord.id,
    message: `Push notification dispatched to ${sentCount} device(s) outside the app!`
  };
}

module.exports = {
  initVapidKeys,
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  getAllActiveSubscriptions,
  getPushSubscribersCount,
  sendPushToSubscription,
  broadcastOfferNotification
};
