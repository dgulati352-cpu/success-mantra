require('dotenv').config();
const { setDoc, getDoc, queryCollection } = require('../backend/database/firestore');

const DEFAULT_MEMBERSHIP_PLANS = [
  {
    id: 'plan_monthly',
    name: 'Monthly Scholar Pass',
    slug: 'monthly-scholar-pass',
    price: 1499,
    original_price: 2999,
    duration_months: 1,
    billing_interval: 'billed monthly',
    badge: 'Flexible Access',
    description: 'Flexible 30-day all-access entry to live classes, recorded vault, and test series.',
    features: [
      'Unlimited Live Interactive Masterclasses',
      'Full CBT Mock Test Series with Rankings',
      'Digital Formula Booklets & Summary Notes',
      'Daily Doubt Resolution Desk',
      'HD Lecture Video Vault (2.0x Speed)'
    ],
    status: 'active',
    sort_order: 1
  },
  {
    id: 'plan_semester',
    name: '6-Month Semester Scholar Pass',
    slug: 'semester-scholar-pass',
    price: 4499,
    original_price: 8999,
    duration_months: 6,
    billing_interval: 'billed semi-annually • ₹749/mo',
    badge: 'Great Value',
    description: 'Half-yearly comprehensive preparation pass for CBSE Term Boards & CUET Domain mastery.',
    features: [
      'Everything in Monthly Scholar Pass Included',
      'Weekly 1-on-1 Live Doubt Clearing with CA Faculty',
      'Complete CUET 2027 Mock Test Series + Analytics',
      'Physical Quick Revision Booklets Shipped to Doorstep',
      'Topper Handwritten Case Study Model Answers',
      'Priority Exam Strategy & Roadmap Sessions'
    ],
    status: 'active',
    sort_order: 2
  },
  {
    id: 'plan_annual',
    name: 'Annual Super Scholar Pass',
    slug: 'annual-super-scholar-pass',
    price: 7999,
    original_price: 15999,
    duration_months: 12,
    billing_interval: 'billed annually • Save 50%',
    badge: '⭐ Most Popular',
    description: 'Complete 365-day all-access membership to every Class 11, 12, and CUET Commerce course.',
    features: [
      'Everything in 6-Month Semester Pass Included',
      'Full Class 11 + Class 12 + CUET Entire Syllabus Unlocked',
      'Guaranteed 1-on-1 CA Manish Kalra Personal Mentorship',
      'Complete Physical Kit (Books, Charts & Formula Maps) Delivered',
      '24/7 Priority VIP Doubt Desk & WhatsApp Support',
      '7-Day 100% Money-Back Guarantee'
    ],
    status: 'active',
    sort_order: 3
  }
];

async function seed() {
  console.log('Seeding 3 Membership Plans to Firestore...');
  for (const p of DEFAULT_MEMBERSHIP_PLANS) {
    const toSave = {
      ...p,
      features_json: JSON.stringify(p.features),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await setDoc('membershipPlans', p.id, toSave);
    console.log(`✓ Seeded: ${p.name} (₹${p.price})`);
  }
  console.log('Done!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
