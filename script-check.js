const fs = require('fs');
const data = fs.readFileSync('src/app/menu/quadrants/page.tsx', 'utf-8');
const idx = data.indexOf('subtitle="');
console.log(data.slice(idx, idx+40));
