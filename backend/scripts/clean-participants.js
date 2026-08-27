require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { queryCollection, updateDoc, setDoc } = require('../database/firestore');

async function cleanStaleParticipants() {
  console.log('[CLEANUP] Scanning liveClasses in Firestore...');
  const classes = await queryCollection('liveClasses') || [];
  for (const classData of classes) {
    const parts = classData.participants || {};
    const sockKeys = Object.keys(parts);
    console.log(`Class ${classData.id} has ${sockKeys.length} participant entries.`);

    // Deduplicate by userId or name
    const seen = new Map();
    const cleanParts = {};

    for (const [sockId, p] of Object.entries(parts)) {
      if (!p) continue;
      const key = (p.userId && !p.userId.startsWith('sock_') && p.userId !== 'usr_anon')
        ? p.userId
        : (p.email || p.name?.trim().toLowerCase() || sockId);

      if (!seen.has(key)) {
        seen.set(key, sockId);
        cleanParts[sockId] = p;
      } else {
        console.log(`Removing duplicate socket ${sockId} for ${p.name}`);
      }
    }

    if (Object.keys(cleanParts).length !== sockKeys.length) {
      console.log(`Class ${classData.id}: Updating clean participants map with ${Object.keys(cleanParts).length} entries...`);
      await updateDoc('liveClasses', classData.id, {
        participants: cleanParts,
        updated_at: new Date().toISOString()
      });
      console.log(`Class ${classData.id}: Cleaned successfully.`);
    }
  }
  console.log('[CLEANUP] Done.');
  process.exit(0);
}

cleanStaleParticipants().catch(e => {
  console.error('Error during cleanup:', e);
  process.exit(1);
});
