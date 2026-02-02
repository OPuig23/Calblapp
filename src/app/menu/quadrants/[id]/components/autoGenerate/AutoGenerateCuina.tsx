import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CuinaGroup } from './types'

interface AutoGenerateCuinaProps {
  totalWorkers: string
  numDrivers: string
  setTotalWorkers: (value: string) => void
  setNumDrivers: (value: string) => void
  cuinaTotals: { workers: number; drivers: number; responsables: number }
  cuinaGroups: CuinaGroup[]
  addCuinaGroup: () => void
  updateCuinaGroup: (id: string, patch: Partial<CuinaGroup>) => void
  removeCuinaGroup: (id: string) => void
}

export default function AutoGenerateCuina({
  totalWorkers,
  numDrivers,
  setTotalWorkers,
  setNumDrivers,
  cuinaTotals,
  cuinaGroups,
  addCuinaGroup,
  updateCuinaGroup,
  removeCuinaGroup,
}: AutoGenerateCuinaProps) {
  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
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
            className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3"
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
  )
}
