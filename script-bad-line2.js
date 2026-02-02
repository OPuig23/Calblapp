const fs = require('fs');
const path = 'src/app/menu/quadrants/page.tsx';
let data = fs.readFileSync(path, 'utf-8');
const pattern = /    const bad = new Set\(\[[^\]]*\]\)/s;
if (!pattern.test(data)) throw new Error('pattern not found');
const newLine = "    const bad = new Set(['--', '-', '\\u2014', '\\u2013', '\\u201c', '\\u201d'])";
data = data.replace(pattern, newLine);
fs.writeFileSync(path, data, 'utf-8');
