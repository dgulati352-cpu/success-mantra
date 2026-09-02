require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { setDoc, queryCollection } = require('../database/firestore');
const db = require('../database/db');

async function seedLiveClasses() {
  console.log('🌱 Seeding active and upcoming live classes into Firestore & SQLite...');

  const liveClasses = [
    {
      id: 'live_cls_12_acc_live',
      course_id: 'crs_12_acc',
      faculty_id: 'usr_manish_kalra',
      faculty_name: 'CA Manish Kalra',
      faculty_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ManishKalra',
      title: 'Class 12 Accountancy: Partnership Admission & Goodwill Masterclass',
      subject: 'Accountancy',
      course_title: 'Class 12 Accountancy Board Blueprint',
      course_class: 'Class 12 Commerce',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 7200000).toISOString(),
      status: 'live',
      meeting_url: 'https://www.camanishkalra.com/student/live-classes/live_cls_12_acc_live/room',
      description: 'Live interactive conceptual breakdown with instant 2-way doubt clearing and board blueprint numericals.',
      created_at: new Date().toISOString()
    },
    {
      id: 'live_cls_12_bst_today',
      course_id: 'crs_12_bst',
      faculty_id: 'usr_manish_kalra',
      faculty_name: 'CA Manish Kalra',
      faculty_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ManishKalra',
      title: 'Class 12 BST: Principles of Management & Case Study Blueprint',
      subject: 'Business Studies',
      course_title: 'Class 12 Business Studies 100/100 Blueprint',
      course_class: 'Class 12 Commerce',
      start_time: new Date(Date.now() + 1800000).toISOString(), // 30 mins from now
      end_time: new Date(Date.now() + 5400000).toISOString(),
      status: 'scheduled',
      meeting_url: 'https://www.camanishkalra.com/student/live-classes/live_cls_12_bst_today/room',
      description: 'Master 100% CBSE case study solving framework with topper model answer sheets.',
      created_at: new Date().toISOString()
    },
    {
      id: 'live_cls_12_eco_evening',
      course_id: 'crs_12_eco',
      faculty_id: 'usr_manish_kalra',
      faculty_name: 'CA Manish Kalra',
      faculty_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ManishKalra',
      title: 'Class 12 Economics: National Income & Aggregate Demand Numericals',
      subject: 'Economics',
      course_title: 'Class 12 Macroeconomics Mastery',
      course_class: 'Class 12 Commerce',
      start_time: new Date(Date.now() + 14400000).toISOString(), // 4 hours from now
      end_time: new Date(Date.now() + 18000000).toISOString(),
      status: 'scheduled',
      meeting_url: 'https://www.camanishkalra.com/student/live-classes/live_cls_12_eco_evening/room',
      description: 'Formulas and step-by-step practical questions from previous 10 years CBSE papers.',
      created_at: new Date().toISOString()
    },
    {
      id: 'live_cls_11_acc_foundation',
      course_id: 'crs_11_acc',
      faculty_id: 'usr_manish_kalra',
      faculty_name: 'CA Manish Kalra',
      faculty_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ManishKalra',
      title: 'Class 11 Accountancy: Journal Entries & Ledger Balancing Fundamentals',
      subject: 'Accountancy',
      course_title: 'Class 11 Accountancy Fundamentals',
      course_class: 'Class 11 Commerce',
      start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      end_time: new Date(Date.now() + 90000000).toISOString(),
      status: 'scheduled',
      meeting_url: 'https://www.camanishkalra.com/student/live-classes/live_cls_11_acc_foundation/room',
      description: 'Building rock-solid concepts in modern classification of accounts and golden rules.',
      created_at: new Date().toISOString()
    },
    {
      id: 'live_cls_cuet_general_test',
      course_id: 'crs_cuet_acc',
      faculty_id: 'usr_manish_kalra',
      faculty_name: 'CA Manish Kalra',
      faculty_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ManishKalra',
      title: 'CUET 2027: High-Speed Commerce MCQ Speed Drill & Negative Marking Strategy',
      subject: 'CUET Commerce',
      course_title: 'CUET 2027 Commerce Super Batch',
      course_class: 'CUET UG 2027',
      start_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      end_time: new Date(Date.now() + 176400000).toISOString(),
      status: 'scheduled',
      meeting_url: 'https://www.camanishkalra.com/student/live-classes/live_cls_cuet_general_test/room',
      description: 'NTA pattern 45-second question elimination techniques for 100 percentile in CUET.',
      created_at: new Date().toISOString()
    }
  ];

  for (const c of liveClasses) {
    await setDoc('liveClasses', c.id, c);
    console.log(`✅ Seeded to Firestore: ${c.id} - ${c.title}`);

    try {
      db.prepare(`
        INSERT OR REPLACE INTO live_classes (id, course_id, faculty_id, title, subject, start_time, end_time, meeting_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(c.id, c.course_id, c.faculty_id, c.title, c.subject, c.start_time, c.end_time, c.meeting_url, c.status);
    } catch(e) {}
  }

  console.log('🎉 Successfully seeded live classes to Firestore and SQLite.');
  process.exit(0);
}

seedLiveClasses().catch(e => {
  console.error('Error seeding live classes:', e);
  process.exit(1);
});
