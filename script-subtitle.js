const fs = require('fs');
const path = 'src/app/menu/quadrants/page.tsx';
let data = fs.readFileSync(path, 'utf-8');
data = data.replace('Gestiï¿½', 'Gestió');
fs.writeFileSync(path, data, 'utf-8');
