'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Pencil, Trash2, Loader2 } from 'lucide-react'

type Driver = { id: string; name: string }

type AvailableVehicle = {
  id: string
  plate: string
  type: string
  available: boolean
}

interface Props {
  eventCode: string
  expectedVehicleType?: string
  row: any | null
  rowIndex?: number
  eventDay: string
  eventStartTime: string
  eventEndTime: string
  onChanged: () => void
  isNew: boolean
}

const VEHICLE_TYPES = [
  { value: 'furgoneta', label: 'Furgoneta' },
  { value: 'camioPetit', label: 'Camio petit' },
  { value: 'camioGran', label: 'Camio gran' },
  { value: 'altres', label: 'Altres' },
] as const

const DEPARTMENTS = [
  { value: 'logistica', label: 'Logistica' },
  { value: 'serveis', label: 'Serveis' },
  { value: 'cuina', label: 'Cuina' },
  { value: 'empresa', label: 'Empresa' },
] as const

const toTime5 = (t?: string) => (t ? String(t).slice(0, 5) : '')

export default function VehicleRow({
  eventCode,
  expectedVehicleType,
  row,
  rowIndex,
  eventDay,
  eventStartTime,
  eventEndTime,
  onChanged,
  isNew,
}: Props) {
  const [department, setDepartment] = useState(
    (row?.department || 'logistica').toString().toLowerCase()
  )
  const [date, setDate] = useState((row?.startDate || eventDay || '').toString())
  const [startTime, setStartTime] = useState(toTime5(row?.startTime || eventStartTime || ''))
  const [endTime, setEndTime] = useState(toTime5(row?.endTime || eventEndTime || ''))
  const [vehicleType, setVehicleType] = useState(
    (row?.vehicleType || expectedVehicleType || '').toString()
  )

  const normalizedPlate =
    row?.plate ||
    row?.matricula ||
    row?.vehiclePlate ||
    ''
  const originalPlate = normalizedPlate.toString()

  const [plate, setPlate] = useState(normalizedPlate.toString())
  const [driverName, setDriverName] = useState((row?.name || '').toString())

  const [isEditing, setIsEditing] = useState<boolean>(isNew)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync when row arrives async
  useEffect(() => {
    if (!row) return
    if (row.name) setDriverName(row.name)
    if (row.department) setDepartment(row.department)
    if (row.startDate) setDate(row.startDate)
    if (row.startTime) setStartTime(toTime5(row.startTime))
    if (row.endTime) setEndTime(toTime5(row.endTime))
    if (row.vehicleType) setVehicleType(row.vehicleType)
    if (row.plate) setPlate(row.plate)
  }, [row])

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [driversLoading, setDriversLoading] = useState(false)

  useEffect(() => {
    if (!isEditing || !date || !startTime) {
      setDrivers([])
      return
    }

    async function loadDrivers() {
      try {
        setDriversLoading(true)

        const params = new URLSearchParams({
          department,
          startDate: date,
          startTime,
          endDate: date,
          endTime: endTime || startTime,
        })

        const res = await fetch(`/api/personnel/available?${params.toString()}`)
        if (!res.ok) {
          setDrivers([])
          return
        }

        const data = await res.json()
        setDrivers(Array.isArray(data?.conductors) ? data.conductors : [])
      } catch {
        setDrivers([])
      } finally {
        setDriversLoading(false)
      }
    }

    loadDrivers()
  }, [isEditing, department, date, startTime, endTime])

  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  const canLoadVehicles = Boolean(date && startTime)

  useEffect(() => {
    async function loadVehicles() {
      if (!canLoadVehicles) {
        setAvailableVehicles([])
        return
      }

      try {
        setLoadingVehicles(true)
        const res = await fetch('/api/transports/available', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: date,
            startTime,
            endDate: date,
            endTime: endTime || startTime,
          }),
        })

        if (!res.ok) {
          setAvailableVehicles([])
          return
        }

        const json = await res.json()
        setAvailableVehicles(Array.isArray(json?.vehicles) ? json.vehicles : [])
      } catch {
        setAvailableVehicles([])
      } finally {
        setLoadingVehicles(false)
      }
    }

    loadVehicles()
  }, [canLoadVehicles, date, startTime, endTime])

  const plateOptions = useMemo(() => {
    if (!vehicleType) return []

    const options = availableVehicles.filter(
      (v) => v.type === vehicleType && v.available === true
    )

    if (plate && !options.some((v) => v.plate === plate)) {
      options.unshift({
        id: `current-${plate}`,
        plate,
        type: vehicleType,
        available: true,
      } as any)
    }

    return options
  }, [availableVehicles, vehicleType, plate])

  const safeDateForValidation = date || eventDay
  const safeStartForValidation = startTime || eventStartTime || ''
  const safeEndForValidation = endTime || eventEndTime || ''
  const safeDeptForValidation = department || row?.department || ''

  const missingRequired =
    !safeDeptForValidation ||
    !safeDateForValidation ||
    !safeStartForValidation ||
    !safeEndForValidation ||
    !vehicleType ||
    !plate ||
    (isNew && !driverName)

  const handleSave = async () => {
    const safeDate = date || eventDay
    const safeStartTime = startTime || eventStartTime || ''
    const safeEndTime = endTime || eventEndTime || ''
    const safeDepartment = department || row?.department || ''

    try {
      setSaveError(null)
      setSaving(true)

      const payload = {
        eventCode,
        department: safeDepartment,
        isNew: isNew || !row?.id,
        rowId: row?.id,
        rowIndex,
        originalPlate,
        data: {
          name: driverName,
          plate,
          vehicleType,
          startDate: safeDate,
          endDate: safeDate,
          startTime: safeStartTime,
          endTime: safeEndTime,
        },
      }

      const res = await fetch('/api/transports/assignacions/row/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text()
        setSaveError(txt || 'Error desant')
        return
      }

      setIsEditing(false)
      onChanged()
    } catch {
      setSaveError('Error inesperat')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!row?.id) return
    if (!confirm('Vols eliminar aquest vehicle?')) return

    await fetch('/api/transports/assignacions/row/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventCode,
        department,
        rowId: row.id,
      }),
    })

    onChanged()
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="text-xs text-gray-500">Departament</label>
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-100"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={!isEditing}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">Dia</label>
          <input
            type="date"
            className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-100"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Sortida</label>
          <input
            type="time"
            className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-100"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Arribada</label>
          <input
            type="time"
            className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-100"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Vehicle</label>
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-100"
            value={vehicleType}
            onChange={(e) => {
              setVehicleType(e.target.value)
              setPlate('')
            }}
            disabled={!isEditing || !canLoadVehicles}
          >
            <option value="">Selecciona vehicle</option>
            {VEHICLE_TYPES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">Matricula</label>
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-100"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            disabled={!isEditing || !vehicleType || loadingVehicles}
          >
            <option value="">Selecciona matricula</option>
            {plateOptions.map((v) => (
              <option key={v.id} value={v.plate}>
                {v.plate}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">Conductor</label>
          <select
            className={`mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-100 ${
              !driverName && isEditing ? 'border-amber-400 bg-amber-50' : ''
            }`}
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            disabled={!isEditing || driversLoading}
          >
            <option value="">Selecciona conductor</option>
            {row?.name && !drivers.find((d) => d.name === row.name) && (
              <option value={row.name}>{row.name}</option>
            )}
            {drivers.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end justify-end gap-2 sm:col-span-2 xl:col-span-1">
          {!isEditing ? (
            <Button
              size="icon"
              onClick={() => setIsEditing(true)}
              className="border bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Editar vehicle"
            >
              <Pencil size={16} />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSave}
              disabled={saving || missingRequired}
              className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
              title={missingRequired ? 'Falten camps obligatoris' : 'Desar'}
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            </Button>
          )}

          <Button
            size="icon"
            variant="destructive"
            onClick={handleDelete}
            title="Eliminar"
            disabled={!row?.id}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="text-xs text-red-600">
          {saveError}
        </div>
      )}
    </div>
  )
}
