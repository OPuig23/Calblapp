const fs = require('fs');
const data = fs.readFileSync('src/app/menu/quadrants/page.tsx','utf-8');
console.log('gestio', data.includes('Gestió'));
console.log('bad', data.includes('GestiÃ³'));
