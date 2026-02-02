const fs = require('fs');
const path = 'src/app/menu/quadrants/page.tsx';
let data = fs.readFileSync(path, 'utf-8');
const pattern = /const bad = new Set\(\[[\s\S]*?\]\)/;
data = data.replace(pattern, "const bad = new Set(['--', '-', '—', '–', '“', '”'])");
fs.writeFileSync(path, data, 'utf-8');
