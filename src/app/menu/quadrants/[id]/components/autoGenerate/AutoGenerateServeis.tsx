import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { ServeiGroup } from './types'

interface AutoGenerateServeisProps {
  serveisTotals: { workers: number; drivers: number; responsables: number }
  serveisGroups: ServeiGroup[]
  addServeisGroup: () => void
  updateServeisGroup: (id: string, patch: Partial<ServeiGroup>) => void
  removeServeisGroup: (id: string) => void
  availableConductors: { id: string; name: string }[]
  eventStartDate: string
}

const inputChangeNumber =
  (cb: (value: number) => void) =>
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    cb(Number.isNaN(value) ? 0 : value)
  }

export default function AutoGenerateServeis({
  serveisTotals,
  serveisGroups,
  addServeisGroup,
  updateServeisGroup,
  removeServeisGroup,
  availableConductors,
  eventStartDate,
}: AutoGenerateServeisProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Grups Serveis</p>
          <p className="text-xs text-slate-500">
            Treballadors {serveisTotals.workers} · Conductors {serveisTotals.drivers} ·
            Responsables {serveisTotals.responsables}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={addServeisGroup}
        >
          + Grup
        </Button>
      </div>
      <div className="space-y-3">
        {serveisGroups.map((group, idx) => (
          <div
            key={group.id}
            className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Grup {idx + 1}</span>
              {serveisGroups.length > 1 && (
                <button
                  type="button"
                  className="text-red-500 hover:underline"
                  onClick={() => removeServeisGroup(group.id)}
                >
                  Elimina grup
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label>Data servei</Label>
                <Input
                  type="date"
                  value={group.serviceDate}
                  onChange={(e) =>
                    updateServeisGroup(group.id, { serviceDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Meeting point</Label>
                <Input
                  value={group.meetingPoint}
                  onChange={(e) =>
                    updateServeisGroup(group.id, { meetingPoint: e.target.value })
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
                    updateServeisGroup(group.id, { startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Hora fi</Label>
                <Input
                  type="time"
                  value={group.endTime}
                  onChange={(e) =>
                    updateServeisGroup(group.id, { endTime: e.target.value })
                  }
                />
              </div>
            </div>
            {group.serviceDate && group.serviceDate !== eventStartDate && (
              <div>
                <Label>Nota del dia</Label>
                <Input
                  type="text"
                  placeholder="Montatge"
                  value={group.dateLabel}
                  onChange={(e) =>
                    updateServeisGroup(group.id, { dateLabel: e.target.value })
                  }
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label>Treballadors</Label>
                <Input
                  type="number"
                  min={0}
                  value={group.workers}
                  onChange={inputChangeNumber((value) =>
                    updateServeisGroup(group.id, { workers: value })
                  )}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`need-driver-${group.id}`}
                    checked={group.needsDriver}
                    onCheckedChange={(checked) =>
                      updateServeisGroup(group.id, {
                        needsDriver: Boolean(checked),
                        driverId: checked ? group.driverId : '',
                      })
                    }
                  />
                  <Label htmlFor={`need-driver-${group.id}`} className="mb-0">
                    Necessita conductor?
                  </Label>
                </div>
                {group.needsDriver && (
                  <Select
                    value={group.driverId || '__none__'}
                    onValueChange={(value) =>
                      updateServeisGroup(group.id, {
                        driverId: value === '__none__' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un conductor…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sense assignar</SelectItem>
                      {availableConductors.map((conductor) => (
                        <SelectItem key={conductor.id} value={conductor.id}>
                          {conductor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
