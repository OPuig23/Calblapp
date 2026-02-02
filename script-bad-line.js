const fs = require('fs');
const path = 'src/app/menu/quadrants/page.tsx';
let data = fs.readFileSync(path, 'utf-8');
const oldLine = "    const bad = new Set(['--', '-', 'â€”', 'â€“', 'â€œ', 'â€'])";
const newLine = "    const bad = new Set(['--', '-', '\\u2014', '\\u2013', '\\u201c', '\\u201d'])";
if (!data.includes(oldLine)) throw new Error('old line not found');
data = data.replace(oldLine, newLine);
fs.writeFileSync(path, data, 'utf-8');
