const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'dist', 'assets');
const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));

if (!cssFile) {
  console.log('No CSS file found in dist/assets!');
  process.exit(1);
}

const cssPath = path.join(assetsDir, cssFile);
const cssContent = fs.readFileSync(cssPath, 'utf8');

const otherClasses = ['p-4', 'p-8', 'p-12', 'text-4xl', 'text-5xl'];
otherClasses.forEach(cls => {
  console.log(`Contains "${cls}" (literal):`, cssContent.includes(cls));
  console.log(`Contains "${cls}" (escaped md\\:${cls}):`, cssContent.includes(`md\\:${cls}`));
  console.log(`Contains "${cls}" (escaped lg\\:${cls}):`, cssContent.includes(`lg\\:${cls}`));
});
