const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory() && !full.includes('node_modules') && !full.includes('.git') && !full.includes('dist')) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk('frontend/src');
let out = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('students')) {
      out.push(f + ':' + (idx+1) + ': ' + line.trim());
    }
  });
});
fs.writeFileSync('students_found.txt', out.join('\n'));
console.log('Written ' + out.length + ' lines');
