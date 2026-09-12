const assert = require('assert');
const http = require('http');
const express = require('express');
const app = express();
const publicRouter = require('./routes/public');
const studentRouter = require('./routes/student');

app.use(express.json());
app.use('/api/public', publicRouter);
app.use('/api/student', studentRouter);

async function runTests() {
  console.log('====================================================');
  console.log('TEST SUITE: Landing Page 4 Sections & 3 Access Tiers');
  console.log('====================================================\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const request = (path) => new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    }).on('error', reject);
  });

  try {
    // 1. SECTION: COURSES
    console.log('--- 1. Testing Public Courses Section ---');
    const coursesRes = await request('/api/public/courses');
    assert.strictEqual(coursesRes.status, 200, 'Courses endpoint should return 200');
    assert.strictEqual(coursesRes.data.success, true, 'Courses success should be true');
    assert(coursesRes.data.courses.length > 0, 'Should return published courses');
    const sampleCourse = coursesRes.data.courses[0];
    console.log(`✓ Loaded ${coursesRes.data.courses.length} courses. Sample: "${sampleCourse.title}" (₹${sampleCourse.price})`);

    // 2. SECTION: RECORDED VIDEOS (Check 3 Access Tiers)
    console.log('\n--- 2. Testing Recorded Video Lectures Section (3 Access Tiers) ---');
    const recRes = await request('/api/public/recordings');
    assert.strictEqual(recRes.status, 200, 'Recordings endpoint should return 200');
    assert.strictEqual(recRes.data.success, true, 'Recordings success should be true');
    assert(recRes.data.recordings.length > 0, 'Should return recordings');
    
    const recTiers = new Set(recRes.data.recordings.map(r => r.access_type));
    console.log('Recorded Video Access Tiers Present:', Array.from(recTiers));
    assert(recTiers.has('free'), 'Must have Free Preview recording');
    assert(recTiers.has('enrolled'), 'Must have Enrolled Only recording');
    assert(recTiers.has('vip'), 'Must have VIP Exclusive recording');
    console.log('✓ All 3 Access Tiers (Free, Enrolled, VIP) verified in Recorded Videos!');

    // 3. SECTION: STUDY NOTES & MATERIALS (Check 3 Access Tiers)
    console.log('\n--- 3. Testing Study Notes & Book Combos Section (3 Access Tiers) ---');
    const matRes = await request('/api/public/materials');
    assert.strictEqual(matRes.status, 200, 'Materials endpoint should return 200');
    assert.strictEqual(matRes.data.success, true, 'Materials success should be true');
    assert(matRes.data.materials.length > 0, 'Should return materials');

    const matTiers = new Set(matRes.data.materials.map(m => m.access_type));
    console.log('Notes / Materials Access Tiers Present:', Array.from(matTiers));
    assert(matTiers.has('free'), 'Must have Free Preview notes');
    assert(matTiers.has('enrolled'), 'Must have Enrolled Only notes');
    assert(matTiers.has('vip'), 'Must have VIP Exclusive notes');
    console.log('✓ All 3 Access Tiers (Free, Enrolled, VIP) verified in Study Notes!');

    // 4. SECTION: ALL INDIA CBT MOCK TESTS (Check 3 Access Tiers)
    console.log('\n--- 4. Testing All India Mock Exam Series Section (3 Access Tiers) ---');
    const testRes = await request('/api/public/mock-tests');
    assert.strictEqual(testRes.status, 200, 'Mock tests endpoint should return 200');
    assert.strictEqual(testRes.data.success, true, 'Mock tests success should be true');
    assert(testRes.data.tests.length > 0, 'Should return tests');

    const testTiers = new Set(testRes.data.tests.map(t => t.access_type));
    console.log('Mock Tests Access Tiers Present:', Array.from(testTiers));
    assert(testTiers.has('free'), 'Must have Free Preview mock test');
    assert(testTiers.has('enrolled'), 'Must have Enrolled Only mock test');
    assert(testTiers.has('vip'), 'Must have VIP Exclusive mock test');
    console.log('✓ All 3 Access Tiers (Free, Enrolled, VIP) verified in Mock Tests!');

    // 5. TEST FUNCTIONAL GATING ACROSS THE 3 ACCESS TIERS
    console.log('\n--- 5. Testing Functional Gating on Notes (Free Preview vs Enrolled/VIP) ---');
    const freeNote = matRes.data.materials.find(m => m.access_type === 'free');
    const enrolledNote = matRes.data.materials.find(m => m.access_type === 'enrolled');
    const vipNote = matRes.data.materials.find(m => m.access_type === 'vip');

    // Anonymous query to student materials endpoint (which powers download/view)
    const anonMaterialsRes = await request('/api/student/materials');
    assert.strictEqual(anonMaterialsRes.status, 200);
    const anonMaterials = anonMaterialsRes.data.materials;

    const anonFree = anonMaterials.find(m => m.id === freeNote.id);
    assert(anonFree && anonFree.can_access === true, 'Free note MUST be accessible to anonymous visitors');
    console.log(`✓ Free Note "${anonFree.title}" correctly accessible (can_access: true)`);

    const anonEnrolled = anonMaterials.find(m => m.id === enrolledNote.id);
    assert(anonEnrolled && anonEnrolled.can_access === false, 'Enrolled note MUST be locked for anonymous visitors');
    assert.strictEqual(anonEnrolled.access_reason, 'auth_required', 'Enrolled note reason must be auth_required');
    console.log(`✓ Enrolled Note "${anonEnrolled.title}" correctly locked with AUTH_REQUIRED`);

    const anonVip = anonMaterials.find(m => m.id === vipNote.id);
    assert(anonVip && anonVip.can_access === false, 'VIP note MUST be locked for anonymous visitors');
    assert.strictEqual(anonVip.access_reason, 'auth_required', 'VIP note reason must be auth_required');
    console.log(`✓ VIP Note "${anonVip.title}" correctly locked with AUTH_REQUIRED`);

    console.log('\n====================================================');
    console.log('ALL TESTS PASSED! All 4 sections and 3 tiers operational.');
    console.log('====================================================');
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
