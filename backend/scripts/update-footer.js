require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { setDoc } = require('../database/firestore');
const db = require('../database/db');

async function updateFooter() {
  const footerContent = {
    aboutText: "India's premier online coaching platform for Commerce students. Live classes, mock exams, and study materials.",
    email: 'camanishkalra@gmail.com',
    phone: '+91 87559 10352',
    address: '5/2515, Gopal Nagar, Near Nagli Mandir, Saharanpur',
    socialLinks: {
      website: 'https://www.camanishkalra.com',
      instagram: 'https://www.instagram.com/successmantra_camanishkalra?igsh=c3RtM3lyZnJ2OWNt',
      telegram: 'https://t.me/successmantra'
    },
    programs: [
      { label: 'Class 12 Commerce', path: '/courses?class=Class+12' },
      { label: 'Class 11 Commerce', path: '/courses?class=Class+11' },
      { label: 'CUET 2027', path: '/courses?class=CUET' },
      { label: 'CA Foundation', path: '/courses?class=CA+Foundation' },
      { label: 'All India Test Series', path: '/courses' }
    ],
    platformLinks: [
      { label: 'Live Classes', path: '/live-classes' },
      { label: 'VIP Membership', path: '/membership' },
      { label: 'Bookstore & Notes', path: '/store' },
      { label: 'Verify Certificate', path: '/verify-certificate' },
      { label: 'About Us', path: '/about' },
      { label: 'Contact', path: '/contact' }
    ],
    copyrightText: '© 2026 Success Mantra EdTech Pvt. Ltd. All rights reserved.',
    updated_at: new Date().toISOString()
  };

  await setDoc('cms', 'footer', footerContent);

  if (db && typeof db.prepare === 'function') {
    try {
      db.prepare(`
        INSERT INTO website_cms (section_key, content_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(section_key) DO UPDATE SET
          content_json = excluded.content_json,
          updated_at = CURRENT_TIMESTAMP
      `).run('footer', JSON.stringify(footerContent));
    } catch (e) {
      console.warn('SQLite note:', e.message);
    }
  }

  console.log('✅ Footer details successfully saved to Firestore & SQLite databases!');
}

updateFooter().then(() => process.exit(0)).catch(err => {
  console.error('Update footer error:', err);
  process.exit(1);
});
