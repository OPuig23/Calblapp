//file: src/app/menu/quadrants/[id]/components/QuadrantFieldsCuina.tsx
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

export default function QuadrantFieldsCuina({
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
          Vehicles disponibles: {available.vehicles.filter(v => v.available).length} / {available.vehicles.length}
        </div>

        {/* Assignacions per conductor */}
        {vehicleAssignments.map((assign, idx) => (
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
              </SelectContent>
            </Select>

            {/* 2. Selecció MATRÍCULA */}
            {assign.vehicleType && (
              <Select
                value={assign.vehicleId}
                onValueChange={val => {
                  const chosen = available.vehicles.find(v => v.id === val)
                  const upd = [...vehicleAssignments]
                  upd[idx].vehicleId = val
                  upd[idx].plate = chosen?.plate || ''
                  upd[idx].vehicleType = chosen?.type || upd[idx].vehicleType
                  setVehicleAssignments(upd)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Matrícula" />
                </SelectTrigger>
                <SelectContent>
                  {(available.vehicles || [])
                    .filter(v =>
                      v.available &&
                      (v.type?.toLowerCase() === 'camiopetit' || v.type?.toLowerCase() === 'furgoneta') &&
                      v.type?.toLowerCase() === assign.vehicleType.toLowerCase() &&
                      !vehicleAssignments.some((a, i) => i !== idx && a.vehicleId === v.id)
                    )
                    .map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate || '(sense matrícula)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
