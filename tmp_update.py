from pathlib import Path
path = Path('src/app/menu/quadrants/[id]/components/QuadrantModal.tsx')
text = path.read_text(encoding='utf-8')
start = text.index('          {/* Camps espec')
end = text.index("          {department.toLowerCase() === 'logistica' && (")
new_block = "          {/* Camps específics */}\n          {isServeis && (\n            <QuadrantServeisAutoGenerate\n              groups={serveisGroups}\n              totals={serveisTotals}\n              addGroup={addServeisGroup}\n              removeGroup={removeServeisGroup}\n              updateGroup={updateServeisGroup}\n              eventStartDate={extractDate(event.start)}\n              meetingPoint={meetingPoint || location || ''}\n              availableConductors={availableConductors}\n            />\n          )}\n"
text = text[:start] + new_block + text[end:]
path.write_text(text, encoding='utf-8')
