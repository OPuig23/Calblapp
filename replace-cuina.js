const fs = require('fs')
const path = 'src/app/menu/quadrants/[id]/components/QuadrantModal.tsx'
const text = fs.readFileSync(path, 'utf8')
const start = text.indexOf('          {          {/* Grups Cuina */}')
if (start === -1) {
  throw new Error('start marker not found')
}
const end = text.indexOf('/* Responsable */', start)
if (end === -1) {
  throw new Error('end marker not found')
}
const newBlock = `          {/* Grups Cuina */}
          {isCuina && (
            <div className="mt-4 space-y-4 border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">
                  {eventName || 'Quadrant cuina'}
                </p>
                <p className="text-xs text-slate-500">
                  Servei {event.service || '—'} · PAX {event.numPax ?? '—'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Número total de treballadors</Label>
                  <Input
                    type="number"
                    min={0}
                    value={totalWorkers}
                    onChange={(e) => setTotalWorkers(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Suma per grups: {cuinaTotals.workers}
                  </p>
                </div>
                <div>
                  <Label>Número total de conductors</Label>
                  <Input
                    type="number"
                    min={0}
                    value={numDrivers}
                    onChange={(e) => setNumDrivers(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Suma per grups: {cuinaTotals.drivers}
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Grups Cuina</p>
                  <p className="text-xs text-slate-500">
                    Treballadors {cuinaTotals.workers} · Conductors {cuinaTotals.drivers} ·
                    Responsables {cuinaTotals.responsables}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={addCuinaGroup}
                >
                  + Grup
                </Button>
              </div>
              <div className="space-y-3">
                {cuinaGroups.map((group, idx) => (
                  <div
                    key={group.id}
                    className="border border-slate-200 rounded-xl p-3 bg-white space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Grup {idx + 1}</span>
                      {cuinaGroups.length > 1 && (
                        <button
                          type="button"
                          className="text-red-500 hover:underline"
                          onClick={() => removeCuinaGroup(group.id)}
                        >
                          Elimina grup
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label>Meeting point</Label>
                        <Input
                          value={group.meetingPoint}
                          onChange={(e) =>
                            updateCuinaGroup(group.id, { meetingPoint: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Hora arribada</Label>
                        <Input
                          type="time"
                          value={group.arrivalTime}
                          onChange={(e) =>
                            updateCuinaGroup(group.id, { arrivalTime: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Hora inici</Label>
                        <Input
                          type="time"
                          value={group.startTime}
                          onChange={(e) =>
                            updateCuinaGroup(group.id, { startTime: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Hora fi</Label>
                        <Input
                          type="time"
                          value={group.endTime}
                          onChange={(e) =>
                            updateCuinaGroup(group.id, { endTime: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Treballadors</Label>
                        <Input
                          type="number"
                          min={0}
                          value={group.workers}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            updateCuinaGroup(group.id, {
                              workers: Number.isNaN(value) ? 0 : value,
                            })
                          }}
                        />
                      </div>
                      <div>
                        <Label>Conductors</Label>
                        <Input
                          type="number"
                          min={0}
                          value={group.drivers}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            updateCuinaGroup(group.id, {
                              drivers: Number.isNaN(value) ? 0 : value,
                            })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
`
const next = text.slice(0, start) + newBlock + text.slice(end)
fs.writeFileSync(path, next, 'utf8')
