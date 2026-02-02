const fs = require('fs');
const path = 'src/app/menu/quadrants/[id]/components/QuadrantModal.tsx';
const text = fs.readFileSync(path, 'utf8');
const start = text.indexOf('          {/* Camps espec');
const end = text.indexOf("          {department.toLowerCase() === 'logistica' && (");
if (start === -1 || end === -1) {
  throw new Error('markers not found');
}
const newBlock = "          {/* Camps específics */}\n          {isServeis && (\n            <QuadrantServeisAutoGenerate\n              groups={serveisGroups}\n              totals={serveisTotals}\n              addGroup={addServeisGroup}\n              removeGroup={removeServeisGroup}\n              updateGroup={updateServeisGroup}\n              eventStartDate={extractDate(event.start)}\n              meetingPoint={meetingPoint || location || ''}\n              availableConductors={availableConductors}\n            />\n          )}\n";
const updated = text.slice(0, start) + newBlock + text.slice(end);
fs.writeFileSync(path, updated, 'utf8');
