const fs = require('fs');
const path = 'src/app/menu/quadrants/page.tsx';
const data = fs.readFileSync(path, 'utf-8');
const lines = data.split(/\r?\n/);
const filtered = lines.filter(line => !(line.trimStart().startsWith('//') && line.includes('Ã')));
fs.writeFileSync(path, filtered.join('\n'), 'utf-8');
