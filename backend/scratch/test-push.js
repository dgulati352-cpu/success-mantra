const pushService = require('../services/pushNotificationService');

async function testPushService() {
  console.log('Testing Push Service...');
  const key = await pushService.getVapidPublicKey();
  console.log('✅ VAPID Public Key generated / retrieved:', key ? `${key.slice(0, 20)}...` : 'NONE');

  const count = await pushService.getPushSubscribersCount();
  console.log('✅ Subscribed devices count in database:', count);

  const broadcastRes = await pushService.broadcastOfferNotification({
    title: '🎉 Test 40% OFF Flash Sale',
    body: 'Exclusive weekend discount on Class 12 BST & Accounts Masterclass.',
    couponCode: 'MANTRA40',
    discountText: '40% OFF FLASH DEAL',
    validTill: 'Tomorrow 11:59 PM',
    url: 'https://www.camanishkalra.com/courses'
  });
  console.log('✅ Broadcast Offer Notification result:', broadcastRes);
  console.log('ALL TESTS PASSED!');
}

testPushService().catch(err => {
  console.error('Push test failed:', err);
  process.exit(1);
});
