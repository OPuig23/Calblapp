// file: src/app/menu/logistica/assignacions/components/VehicleRowEditor.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Trash2 } from 'lucide-react'

type Props = {
  eventCode: string
  eventDay: string
  eventStartTime: string
  eventEndTime: string
  onSaved: () => void
  onCancel: () => void
}

const VEHICLE_TYPES = [
  { value: 'furgoneta', label: 'Furgoneta' },
  { value: 'camioPetit', label: 'Camió petit' },
  { value: 'camioGran', label: 'Camió gran' },
  { value: 'altres', label: 'Altres' },
]

export default function VehicleRowEditor({
  eventCode,
  eventDay,
  eventStartTime,
  eventEndTime,
  onSaved,
  onCancel,
}: Props) {
  /* =========================
     ESTAT BASE
  ========================= */
  const [department, setDepartment] = useState<'logistica' | 'serveis'>('logistica')
  const [vehicleType, setVehicleType] = useState('')
  const [plate, setPlate] = useState('')
  const [driverId, setDriverId] = useState('')
  const [date, setDate] = useState(eventDay)
  const [startTime, setStartTime] = useState(eventStartTime)
  const [endTime, setEndTime] = useState(eventEndTime)

  /* =========================
     CONDUCTORS PER DEPARTAMENT
  ========================= */
  const [drivers, setDrivers] = useState<any[]>([])

  useEffect(() => {
    async function loadDrivers() {
      const res = await fetch(`/api/personnel/by-department?dept=${department}`)
      if (!res.ok) return setDrivers([])
      const data = await res.json()
      setDrivers(Array.isArray(data.items) ? data.items : [])
    }
    loadDrivers()
  }, [department])

  /* =========================
     VEHICLES DISPONIBLES
  ========================= */
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  useEffect(() => {
    async function loadVehicles() {
      setLoadingVehicles(true)
      try {
        const res = await fetch('/api/transports/available', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: date,
            startTime,
            endDate: date,
            endTime,
          }),
        })
        if (!res.ok) return setVehicles([])
        const data = await res.json()
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : [])
      } finally {
        setLoadingVehicles(false)
      }
    }

    if (startTime && endTime) loadVehicles()
  }, [date, startTime, endTime])

  const plateOptions = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.available === true &&
        (!vehicleType || v.type === vehicleType)
    )
  }, [vehicles, vehicleType])

  /* =========================
     DESAR (AFEGEIX AL QUADRANT)
  ========================= */
  const handleSave = async () => {
    if (!vehicleType || !plate || !driverId) return

    await fetch('/api/transports/assignacions/row/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventCode,
        payload: {
          department,
          vehicleType,
          plate,
          driverId,
          startDate: date,
          endDate: date,
          startTime,
          endTime,
        },
      }),
    })

    onSaved()
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="border rounded-xl p-3 grid grid-cols-1 md:grid-cols-[120px_160px_160px_200px_140px_90px_90px_96px] gap-2 items-center bg-emerald-50">
      {/* Departament */}
      <select
        className="border rounded px-2 py-1 text-sm"
        value={department}
        onChange={(e) => setDepartment(e.target.value as any)}
      >
        <option value="logistica">Logística</option>
        <option value="serveis">Serveis</option>
      </select>

      {/* Matrícula */}
      <select
        className="border rounded px-2 py-1 text-sm"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        disabled={loadingVehicles}
      >
        <option value="">— Matrícula —</option>
        {plateOptions.map((v) => (
          <option key={v.id} value={v.plate}>
            {v.plate}
          </option>
        ))}
      </select>

      {/* Tipus vehicle */}
      <select
        className="border rounded px-2 py-1 text-sm"
        value={vehicleType}
        onChange={(e) => {
          setVehicleType(e.target.value)
          setPlate('')
        }}
      >
        <option value="">— Vehicle —</option>
        {VEHICLE_TYPES.map(v => (
          <option key={v.value} value={v.value}>{v.label}</option>
        ))}
      </select>

      {/* Conductor */}
      <select
        className="border rounded px-2 py-1 text-sm"
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
      >
        <option value="">— Nom conductor —</option>
        {drivers.map(d => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Dia */}
      <input
        type="date"
        className="border rounded px-2 py-1 text-sm"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {/* Hora inici */}
      <input
        type="time"
        className="border rounded px-2 py-1 text-sm"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />

      {/* Hora fi */}
      <input
        type="time"
        className="border rounded px-2 py-1 text-sm"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />

      {/* Accions */}
      <div className="flex gap-2 justify-end">
        <Button size="icon" className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
          <Save size={16} />
        </Button>
        <Button size="icon" variant="destructive" onClick={onCancel}>
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  )
}
