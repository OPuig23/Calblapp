const fs = require('fs')
const path = 'src/app/menu/quadrants/[id]/components/QuadrantModal.tsx'
const text = fs.readFileSync(path, 'utf8')
const startMarker = '          {/* Camps específics */}'
const endMarker = '          {department.toLowerCase() ===  logistica && ('
const start = text.indexOf(startMarker)
const end = text.indexOf(endMarker, start)
if (start === -1 || end === -1) {
  throw new Error('markers not found')
}
const newBlock =           {/* Department-specific sections */}\n          {isServeis && (\n            <AutoGenerateServeis\n              serveisTotals={serveisTotals}\n              serveisGroups={serveisGroups}\n              addServeisGroup={addServeisGroup}\n              updateServeisGroup={updateServeisGroup}\n              removeServeisGroup={removeServeisGroup}\n              availableConductors={conductors}\n              eventStartDate={startDate}\n            />\n          )}\n
fs.writeFileSync(path, text.slice(0, start) + newBlock + text.slice(end), 'utf8')
