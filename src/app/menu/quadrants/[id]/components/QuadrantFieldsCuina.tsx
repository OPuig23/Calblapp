'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TRANSPORT_TYPE_LABELS,
  TRANSPORT_TYPE_OPTIONS,
  normalizeTransportType,
} from '@/lib/transportTypes'

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
  totalWorkers,
  numDrivers,
  setTotalWorkers,
  setNumDrivers,
  vehicleAssignments,
  setVehicleAssignments,
  available,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label># Treballadors</Label>
        <Input
          type="number"
          min={0}
          value={totalWorkers}
          onChange={(e) => setTotalWorkers(e.target.value)}
        />
      </div>

      <div>
        <Label># Conductors</Label>
        <Input
          type="number"
          min={0}
          value={numDrivers}
          onChange={(e) => setNumDrivers(e.target.value)}
        />

        <div className="mt-2 text-sm text-gray-700">
          Vehicles disponibles: {available.vehicles.filter((v) => v.available).length} /{' '}
          {available.vehicles.length}
        </div>

        {vehicleAssignments.map((assign, idx) => (
          <div key={idx} className="mt-3 space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">Vehicle #{idx + 1}</p>

            <Select
              value={assign.vehicleType}
              onValueChange={(val) => {
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
                {TRANSPORT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {assign.vehicleType && (
              <Select
                value={assign.vehicleId}
                onValueChange={(val) => {
                  const chosen = available.vehicles.find((v) => v.id === val)
                  const upd = [...vehicleAssignments]
                  upd[idx].vehicleId = val
                  upd[idx].plate = chosen?.plate || ''
                  upd[idx].vehicleType = normalizeTransportType(
                    chosen?.type || upd[idx].vehicleType
                  )
                  setVehicleAssignments(upd)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Matricula" />
                </SelectTrigger>
                <SelectContent>
                  {(available.vehicles || [])
                    .filter(
                      (v) =>
                        v.available &&
                        normalizeTransportType(v.type) ===
                          normalizeTransportType(assign.vehicleType) &&
                        !vehicleAssignments.some((a, i) => i !== idx && a.vehicleId === v.id)
                    )
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate || '(sense matricula)'}
                        {v.type
                          ? ` - ${TRANSPORT_TYPE_LABELS[normalizeTransportType(v.type)] || v.type}`
                          : ''}
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
