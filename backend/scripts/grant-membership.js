require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { setDoc, getDoc, queryCollection } = require('../database/firestore');
const db = require('../database/db');

async function grantMembership() {
  const email = 'dhairyag104@gmail.com';
  console.log('Activating ₹7,999 Annual Super Scholar Pass membership for:', email);

  // 1. Find user in Firestore
  const users = await queryCollection('users', {
    filters: [{ field: 'email', op: '==', value: email }]
  });

  if (!users || users.length === 0) {
    console.error('❌ User not found with email:', email);
    process.exit(1);
  }

  const user = users[0];
  console.log('Found user record:', user.id, user.name, user.email);

  const planId = 'plan_annual';
  const plan = await getDoc('membershipPlans', planId) || {
    id: 'plan_annual',
    name: 'Annual Super Scholar Pass',
    price: 7999,
    duration_months: 12
  };

  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1); // 1 year validity

  const memId = 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  // 2. Save Membership to Firestore
  const membershipData = {
    id: memId,
    user_id: user.id,
    plan_id: planId,
    plan_name: plan.name || 'Annual Super Scholar Pass',
    price: 7999,
    duration_months: 12,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    status: 'active',
    autopay_enabled: false,
    autopay_type: 'Annual VIP Pass',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await setDoc('memberships', memId, membershipData);
  console.log('✅ Firestore membership activated:', memId);

  // 3. Save Notification
  const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  await setDoc('notifications', notifId, {
    id: notifId,
    user_id: user.id,
    title: '👑 VIP Annual Super Scholar Pass Activated!',
    message: 'Your 365-day ₹7,999 Annual VIP Membership is now active. Enjoy full access to all live classes, lecture vault, and test series!',
    type: 'payment',
    link: '/student/membership',
    is_read: false,
    created_at: new Date().toISOString()
  });
  console.log('✅ Notification created in Firestore');

  // 4. Save to SQLite
  try {
    db.prepare(`
      INSERT OR REPLACE INTO memberships (id, user_id, plan_id, start_date, end_date, status, autopay_enabled)
      VALUES (?, ?, ?, ?, ?, 'active', 0)
    `).run(memId, user.id, planId, startDate.toISOString(), endDate.toISOString());
    console.log('✅ SQLite membership synced');
  } catch (sqlErr) {
    console.warn('SQLite sync note:', sqlErr.message);
  }

  console.log('🎉 SUCCESS: Annual Super Scholar Pass (₹7,999) is now ACTIVE for', user.email);
  process.exit(0);
}

grantMembership().catch(err => {
  console.error('Error activating membership:', err);
  process.exit(1);
});
