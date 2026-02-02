const fs = require('fs');
const path = 'src/app/menu/quadrants/page.tsx';
let data = fs.readFileSync(path, 'utf-8');
data = data.replace('subtitle="Gesti\u00f3 setmanal per departament"', 'subtitle="Gestió setmanal per departament"');
data = data.replace(/\n\s*\{\}\s*\n/g, '\n');
fs.writeFileSync(path, data, 'utf-8');
