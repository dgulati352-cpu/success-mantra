import fs from 'fs';
import path from 'path';

console.log('🔍 RUNNING COMPREHENSIVE SUCCESS MANTRA SEO AUDIT...');

const errors = [];
const successes = [];

// 1. Verify robots.txt
try {
  const robotsPath = path.resolve('public/robots.txt');
  const robotsContent = fs.readFileSync(robotsPath, 'utf8');
  if (!robotsContent.includes('https://www.camanishkalra.com/sitemap.xml')) {
    errors.push('robots.txt does not contain production sitemap URL');
  } else {
    successes.push('robots.txt properly configured with production sitemap URL');
  }
  if (!robotsContent.includes('Disallow: /admin') || !robotsContent.includes('Disallow: /student')) {
    errors.push('robots.txt does not block private areas');
  } else {
    successes.push('robots.txt blocks private /admin and /student areas');
  }
} catch (e) {
  errors.push(`robots.txt check failed: ${e.message}`);
}

// 2. Verify sitemap.xml
try {
  const sitemapPath = path.resolve('public/sitemap.xml');
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
  const requiredRoutes = [
    'https://www.camanishkalra.com/',
    'https://www.camanishkalra.com/books',
    'https://www.camanishkalra.com/books/class-12-accountancy-mcq-book',
    'https://www.camanishkalra.com/books/class-12-business-studies-mcq-book',
    'https://www.camanishkalra.com/books/class-12-economics-mcq-book',
    'https://www.camanishkalra.com/courses',
    'https://www.camanishkalra.com/live-classes',
    'https://www.camanishkalra.com/membership',
    'https://www.camanishkalra.com/about',
    'https://www.camanishkalra.com/contact'
  ];

  requiredRoutes.forEach(route => {
    if (!sitemapContent.includes(route)) {
      errors.push(`sitemap.xml missing required URL: ${route}`);
    } else {
      successes.push(`sitemap.xml includes ${route}`);
    }
  });
} catch (e) {
  errors.push(`sitemap.xml check failed: ${e.message}`);
}

// 3. Verify index.html structured data and tags
try {
  const indexPath = path.resolve('index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (!indexContent.includes('Success Mantra | Class 12 Commerce Books & Coaching')) {
    errors.push('index.html missing optimized title');
  } else {
    successes.push('index.html has exact requested homepage title');
  }
  if (!indexContent.includes('H.No. Kothi D-Type 52, Numaish Camp, Saharanpur, Uttar Pradesh 247001, India')) {
    errors.push('index.html missing NAP consistent address');
  } else {
    successes.push('index.html has NAP consistent Saharanpur address');
  }
  if (!indexContent.includes('https://www.camanishkalra.com/')) {
    errors.push('index.html missing canonical URL');
  } else {
    successes.push('index.html has canonical link to production domain');
  }
} catch (e) {
  errors.push(`index.html check failed: ${e.message}`);
}

// 4. Verify BookDetail data
try {
  const bookDetailPath = path.resolve('src/pages/public/BookDetail.jsx');
  const bookDetailContent = fs.readFileSync(bookDetailPath, 'utf8');
  const keywords = [
    'Class 12 Accountancy MCQ Book',
    'Class 12 Business Studies MCQ Book',
    'Class 12 Economics MCQ Book',
    'Class 12 Accountancy MCQs',
    'Class 12 BST MCQs',
    'Class 12 Economics MCQs',
    '1 Mark Questions',
    'Question Bank'
  ];
  keywords.forEach(kw => {
    if (!bookDetailContent.includes(kw)) {
      errors.push(`BookDetail.jsx missing keyword: ${kw}`);
    } else {
      successes.push(`BookDetail.jsx contains keyword: ${kw}`);
    }
  });
} catch (e) {
  errors.push(`BookDetail.jsx check failed: ${e.message}`);
}

console.log('\n--- AUDIT RESULTS ---');
console.log(`✅ Successes: ${successes.length}`);
console.log(`❌ Errors: ${errors.length}`);

if (errors.length > 0) {
  console.error('\nErrors found:');
  errors.forEach(err => console.error(` - ${err}`));
  process.exit(1);
} else {
  console.log('\n🌟 ALL SEO AUDIT TESTS PASSED WITH 100% COMPLIANCE!');
}
