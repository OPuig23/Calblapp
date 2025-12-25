//file: src/app/menu/quadrants/[id]/components/QuadrantFieldsLogistica.tsx
'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

type VehicleAssignment = {
  vehicleType: string
  vehicleId: string
  plate: string
  arrivalTime?: string
}

type AvailableVehicle = {
  id: string
  plate?: string
  type?: string
  available: boolean
}

type Props = {
  totalWorkers: string
  numDrivers: string
  setTotalWorkers: (v: string) => void
  setNumDrivers: (v: string) => void
  vehicleAssignments: VehicleAssignment[]
  setVehicleAssignments: (v: VehicleAssignment[]) => void
  available: { vehicles: AvailableVehicle[] }
}

// Normalitza tipus
const normalizeType = (t: string) => {
  const val = t?.toLowerCase()
  if (!val) return ''
  if (val.includes('petit')) return 'camioPetit'
  if (val.includes('gran')) return 'camioGran'
  if (val.includes('furgo')) return 'furgoneta'
  return val
}

export default function QuadrantFieldsLogistica({
  totalWorkers, numDrivers,
  setTotalWorkers, setNumDrivers,
  vehicleAssignments, setVehicleAssignments,
  available,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* # Treballadors */}
      <div>
        <Label># Treballadors</Label>
        <Input
          type="number"
          min={0}
          value={totalWorkers}
          onChange={e => setTotalWorkers(e.target.value)}
        />
      </div>

      {/* # Conductors */}
      <div>
        <Label># Conductors</Label>
        <Input
          type="number"
          min={0}
          value={numDrivers}
          onChange={e => setNumDrivers(e.target.value)}
        />

        <div className="mt-2 text-sm text-gray-700">
          Vehicles disponibles (total): {available.vehicles.filter(v => v.available).length} / {available.vehicles.length}
        </div>

        {/* Assignacions per conductor */}
        {vehicleAssignments.map((assign, idx) => {
          // vehicles disponibles per aquest tipus
          const filtered = (available.vehicles || []).filter(v =>
            v.available &&
            normalizeType(v.type || '') === normalizeType(assign.vehicleType) &&
            !vehicleAssignments.some((a, i) => i !== idx && a.vehicleId === v.id)
          )

          return (
            <div key={idx} className="mt-3 border p-3 rounded-md space-y-2">
              <p className="text-sm font-semibold">Vehicle #{idx + 1}</p>

              {/* 1. Selecció TIPUS */}
              <Select
                value={assign.vehicleType}
                onValueChange={val => {
                  const upd = [...vehicleAssignments]
                  upd[idx].vehicleType = val
                  upd[idx].vehicleId = ''
                  upd[idx].plate = ''
                  setVehicleAssignments(upd)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipus de vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camioPetit">Camió petit</SelectItem>
                  <SelectItem value="furgoneta">Furgoneta</SelectItem>
                  <SelectItem value="camioGran">Camió gran</SelectItem>
                </SelectContent>
              </Select>

              {/* 2. Selecció MATRÍCULA + Hora d'arribada */}
              {assign.vehicleType && (
                <>
                  <div className="text-xs text-gray-500">
                    Matrícules disponibles: {filtered.length}
                  </div>
                  <Select
                    value={assign.vehicleId}
                    onValueChange={val => {
                      if (val === '__any__') {
                        const upd = [...vehicleAssignments]
                        upd[idx].vehicleId = ''
                        upd[idx].plate = ''
                        setVehicleAssignments(upd)
                        return
                      }

                      const chosen = available.vehicles.find(v => v.id === val)
                      const upd = [...vehicleAssignments]
                      upd[idx].vehicleId = val
                      upd[idx].plate = chosen?.plate || ''
                      upd[idx].vehicleType = normalizeType(chosen?.type || upd[idx].vehicleType)
                      setVehicleAssignments(upd)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipus només o matrícula" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Opció extra per no assignar matrícula */}
                      <SelectItem value="__any__">(Només tipus, sense matrícula)</SelectItem>

                      {filtered.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate || '(sense matrícula)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="space-y-1 pt-2">
                    <Label>Hora d'arribada</Label>
                    <Input
                      type="time"
                      value={assign.arrivalTime || ''}
                      onChange={(e) => {
                        const upd = [...vehicleAssignments]
                        upd[idx].arrivalTime = e.target.value
                        setVehicleAssignments(upd)
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
