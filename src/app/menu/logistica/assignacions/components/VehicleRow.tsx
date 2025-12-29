//file: src/app/menu/logistica/assignacions/components/VehicleRow.tsx
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
  { value: 'camioPetit', label: 'Camió petit' },
  { value: 'camioGran', label: 'Camió gran' },
  { value: 'altres', label: 'Altres' },
] as const

const DEPARTMENTS = [
  { value: 'logistica', label: 'Logística' },
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
  /* =========================
     ESTAT BASE
  ========================= */
  const [department, setDepartment] = useState(
    (row?.department || 'logistica').toString().toLowerCase()
  )

  const [date, setDate] = useState(
    (row?.startDate || eventDay || '').toString()
  )

  const [startTime, setStartTime] = useState(
    toTime5(row?.startTime || eventStartTime || '')
  )

  const [endTime, setEndTime] = useState(
    toTime5(row?.endTime || eventEndTime || '')
  )

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

    /* =========================
     SINCRONITZACIÓ AMB ROW
     (quan arriba async)
  ========================= */
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


  /* =========================
     CONDUCTORS (només fila nova)
  ========================= */
/* =========================
   CONDUCTORS (fila nova + editar)
========================= */
const [drivers, setDrivers] = useState<Driver[]>([])
const [driversLoading, setDriversLoading] = useState(false)

useEffect(() => {
  // Només carreguem conductors quan la fila està en edició
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

      // ✅ només conductors disponibles
      setDrivers(Array.isArray(data?.conductors) ? data.conductors : [])
    } catch {
      setDrivers([])
    } finally {
      setDriversLoading(false)
    }
  }

  loadDrivers()
}, [isEditing, department, date, startTime, endTime])



  /* =========================
     VEHICLES DISPONIBLES
  ========================= */
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

        if (!res.ok) return setAvailableVehicles([])
        const json = await res.json()
        setAvailableVehicles(Array.isArray(json?.vehicles) ? json.vehicles : [])
      } catch {
        setAvailableVehicles([])
      } finally {
        setLoadingVehicles(false)
      }
    }

    loadVehicles()
  }, [date, startTime, endTime])

const plateOptions = useMemo(() => {
  if (!vehicleType) return []

  const options = availableVehicles.filter(
    (v) => v.type === vehicleType && v.available === true
  )

  // 🔒 FORÇAR la matrícula actual encara que no estigui disponible
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




  /* =========================
     VALIDACIONS
  ========================= */
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


  /* =========================
     SAVE / DELETE
  ========================= */
  const handleSave = async () => {
   // 🔒 Normalització defensiva (A)
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

  /* =========================
     RENDER
  ========================= */
return (
  <div className="rounded-xl border bg-white p-4 space-y-3">
    {/* FILA PRINCIPAL */}
    <div className="grid grid-cols-1 md:grid-cols-[120px_150px_90px_90px_140px_160px_1fr_120px] gap-3 items-end">
      
      {/* 1) Departament */}
      <div>
        <label className="text-xs text-gray-500">Departament</label>
        <select
          className="w-full border rounded px-2 py-1 text-sm"
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

      {/* 2) Dia */}
      <div>
        <label className="text-xs text-gray-500">Dia</label>
        <input
          type="date"
          className="w-full border rounded px-2 py-1 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={!isEditing}
        />
      </div>

      {/* 3) Hora sortida */}
      <div>
        <label className="text-xs text-gray-500">Sortida</label>
        <input
          type="time"
          className="w-full border rounded px-2 py-1 text-sm"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          disabled={!isEditing}
        />
      </div>

      {/* 4) Hora arribada */}
      <div>
        <label className="text-xs text-gray-500">Arribada</label>
        <input
          type="time"
          className="w-full border rounded px-2 py-1 text-sm"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          disabled={!isEditing}
        />
      </div>

      {/* 5) Tipus vehicle */}
      <div>
        <label className="text-xs text-gray-500">Vehicle</label>
        <select
          className="w-full border rounded px-2 py-1 text-sm"
          value={vehicleType}
          onChange={(e) => {
            setVehicleType(e.target.value)
            setPlate('')
          }}
          disabled={!isEditing || !canLoadVehicles}
        >
          <option value="">— Vehicle —</option>
          {VEHICLE_TYPES.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* 6) Matrícula */}
      <div>
        <label className="text-xs text-gray-500">Matrícula</label>
        <select
          className="w-full border rounded px-2 py-1 text-sm"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          disabled={!isEditing || !vehicleType || loadingVehicles}
        >
          <option value="">— Matrícula —</option>
          {plateOptions.map((v) => (
            <option key={v.id} value={v.plate}>
              {v.plate}
            </option>
          ))}
        </select>
      </div>

     
{/* 7) Conductor */}
<div>
  <label className="text-xs text-gray-500">Conductor</label>

  <select
    className={`w-full border rounded px-2 py-1 text-sm ${
      !driverName && isEditing
        ? 'border-amber-400 bg-amber-50'
        : isEditing
        ? 'bg-white'
        : 'bg-gray-100'
    }`}
    value={driverName}
    onChange={(e) => setDriverName(e.target.value)}
    disabled={!isEditing || driversLoading}
  >
    <option value="">— Conductor obligatori —</option>

    {/* ✅ conductor actual (per files existents) */}
    {row?.name && !drivers.find(d => d.name === row.name) && (
      <option value={row.name}>{row.name}</option>
    )}

    {/* ✅ conductors disponibles */}
    {drivers.map((d) => (
      <option key={d.id} value={d.name}>
        {d.name}
      </option>
    ))}
  </select>
</div>


      {/* 8) Accions */}
      <div className="flex gap-2 justify-end">
        {!isEditing ? (
     <Button
  size="icon"
  onClick={() => setIsEditing(true)}
  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border"
  title="Editar vehicle"
>
  <Pencil size={16} />
</Button>

        ) : (
          <Button
            size="icon"
            onClick={handleSave}
            disabled={saving || missingRequired}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
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
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>

    {/* ERROR */}
    {saveError && (
      <div className="text-xs text-red-600">
        {saveError}
      </div>
    )}
  </div>
)

}
