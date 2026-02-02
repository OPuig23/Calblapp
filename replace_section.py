from pathlib import Path
path = Path('src/app/menu/quadrants/[id]/components/QuadrantModal.tsx')
text = path.read_text()
start = text.index('          {/* Camps específics */}')
end = text.index('          {department.toLowerCase() === " logistica\ && (', start)
new = ''' {/* Department-specific sections */}
 {isServeis && (
 <AutoGenerateServeis
 serveisTotals={serveisTotals}
 serveisGroups={serveisGroups}
 addServeisGroup={addServeisGroup}
 updateServeisGroup={updateServeisGroup}
 removeServeisGroup={removeServeisGroup}
 availableConductors={conductors}
 eventStartDate={startDate}
 />
 )}
'''
text = text[:start] + new + text[end:]
path.write_text(text)
