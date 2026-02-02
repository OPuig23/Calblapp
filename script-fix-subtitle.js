const fs = require('fs');
const path = 'src/app/menu/quadrants/page.tsx';
let data = fs.readFileSync(path, 'utf-8');
const pattern = /subtitle="[^"]*"/;
if (!pattern.test(data)) throw new Error('subtitle pattern not found');
data = data.replace(pattern, 'subtitle="Gestió setmanal per departament"');
fs.writeFileSync(path, data, 'utf-8');
