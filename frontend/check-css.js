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

console.log('CSS file size:', cssContent.length, 'bytes');

const classesToCheck = [
  'grid-cols-1',
  'grid-cols-2',
  'grid-cols-4',
  'md:grid-cols-2',
  'lg:grid-cols-4',
  'shadow-2xl',
  'rounded-[36px]',
  'min-width: 768px',
  'min-width: 1024px',
];

classesToCheck.forEach(cls => {
  const contains = cssContent.includes(cls);
  console.log(`Contains "${cls}":`, contains);
});
