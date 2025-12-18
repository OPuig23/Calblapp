// file: src/app/menu/logistica/assignacions/components/VehicleRow.tsx
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
  conductorId?: string | null
}

interface Props {
  eventCode: string
  expectedVehicleType?: string
  row: any | null
  eventDay: string
  eventStartTime: string
  eventEndTime: string
  onChanged: () => void

  /** ✅ IMPORTANT: VehiclesTable ha d’enviar-ho:
   *  - files que venen de Firestore → isNew={false}
   *  - fila “Afegir vehicle” → isNew={true}
   */
  isNew: boolean
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

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

function toTime5(t?: string) {
  if (!t) return ''
  return String(t).slice(0, 5)
}

export default function VehicleRow({
  eventCode,
  expectedVehicleType,
  row,
  eventDay,
  eventStartTime,
  eventEndTime,
  onChanged,
  isNew,
}: Props) {
  /* =========================
     BASE: dades inicials
     - isNew=true  → fila nova (editable, conductor editable)
     - isNew=false → fila existent (conductor NO editable)
  ========================= */
  const initialDept = (row?.department || 'logistica').toString().toLowerCase()

  const [department, setDepartment] = useState<string>(initialDept)
  const [vehicleType, setVehicleType] = useState<string>(
    (row?.vehicleType || expectedVehicleType || '').toString()
  )
  const [plate, setPlate] = useState<string>((row?.plate || '').toString())
  const [driverName, setDriverName] = useState<string>((row?.name || '').toString())

  const [date, setDate] = useState<string>((row?.startDate || row?.date || eventDay || '').toString())
  const [startTime, setStartTime] = useState<string>(
    toTime5(row?.startTime || row?.departTime || eventStartTime || '')
  )
  const [endTime, setEndTime] = useState<string>(
    toTime5(row?.endTime || row?.returnTime || eventEndTime || '')
  )

  // 🔒 Mode edició: fila nova comença editable; fila existent comença bloquejada
  const [isEditing, setIsEditing] = useState<boolean>(isNew)

  // 🔄 Loading / error
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  /* =========================
     Conductors disponibles
     ✅ NOMÉS per fila nova (isNew)
  ========================= */
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [driversLoading, setDriversLoading] = useState(false)

  useEffect(() => {
    if (!isNew) return

    async function loadDrivers() {
      try {
        setDriversLoading(true)
        // ✅ Si tens un endpoint diferent, canvia només aquesta URL
        const res = await fetch(`/api/personnel?department=${encodeURIComponent(department)}`)
        if (!res.ok) {
          setDrivers([])
          return
        }
        const data = await res.json()
        setDrivers(Array.isArray(data) ? data : [])
      } catch {
        setDrivers([])
      } finally {
        setDriversLoading(false)
      }
    }

    loadDrivers()
    // si canviem dept a fila nova, reiniciem conductor
    setDriverName('')
  }, [isNew, department])

  /* =========================
     Vehicles disponibles (matrícules)
     - usa /api/transports/available (POST)
     - filtra per horari + tipus vehicle
  ========================= */
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  useEffect(() => {
    async function loadAvailableVehicles() {
      // No fem crida si falta info mínima (evita 400)
      if (!date || !startTime || !endTime) {
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
            endTime,
          }),
        })

        if (!res.ok) {
          setAvailableVehicles([])
          return
        }

        const json = await res.json()
        const list: AvailableVehicle[] = Array.isArray(json?.vehicles) ? json.vehicles : []

        // ✅ Només disponibles i compatibles amb vehicleType (si està seleccionat)
        const filtered = list.filter((v) => {
          if (v.available !== true) return false
          if (vehicleType && v.type !== vehicleType) return false
          return true
        })

        setAvailableVehicles(filtered)
      } catch (e) {
        console.error('Error carregant vehicles disponibles', e)
        setAvailableVehicles([])
      } finally {
        setLoadingVehicles(false)
      }
    }

    loadAvailableVehicles()
  }, [date, startTime, endTime, vehicleType])

  const plateOptions = useMemo(() => {
    // ✅ mantenim la matrícula actual visible encara que no sigui "available" ara mateix
    const opts = [...availableVehicles]
    const hasPlate = plate && opts.some((v) => v.plate === plate)
    if (plate && !hasPlate) {
      opts.unshift({
        id: `current-${plate}`,
        plate,
        type: vehicleType || '',
        available: true, // perquè es pugui seleccionar
      } as any)
    }
    return opts
  }, [availableVehicles, plate, vehicleType])

  /* =========================
     Helpers UX
  ========================= */
  const canEdit = isEditing
  const conductorEditable = isNew // ✅ regla de negoci

  const missingRequired =
    !date || !startTime || !endTime || !vehicleType || !plate || (isNew && !driverName)

  /* =========================
     SAVE / DELETE
  ========================= */
  const handleSave = async () => {
    try {
      setSaveError(null)
      setSaving(true)

  const isReallyNew = isNew === true || !row?.id

const payload = {
  eventCode,
  department,
  isNew: isReallyNew,
  rowId: isReallyNew ? undefined : row.id, // 👈 CLAU
  data: {
    name: driverName,
    plate,
    vehicleType,
    startDate: date,
    endDate: date,
    startTime,
    endTime,
  },
}


      const res = await fetch('/api/transports/assignacions/row/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        setSaveError(txt || 'No s’ha pogut desar (error servidor)')
        return
      }

      setIsEditing(false)
      onChanged()
    } catch (e) {
      console.error(e)
      setSaveError('No s’ha pogut desar (error inesperat)')
    } finally {
      setSaving(false)
    }
  }

const handleDelete = async () => {
  if (!row?.id) return

  const ok = confirm('Vols eliminar aquest vehicle?')
  if (!ok) return

  try {
    const res = await fetch('/api/transports/assignacions/row/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventCode,
        department,
        rowId: row.id,
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      alert(txt || 'Error eliminant el vehicle')
      return
    }

    onChanged()
  } catch (e) {
    console.error(e)
    alert('Error inesperat eliminant el vehicle')
  }
}


  /* =========================
     RENDER
  ========================= */
  return (
    <div className="border rounded-xl p-3 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-[140px_170px_170px_1fr_150px_95px_95px_110px] gap-2 items-center">
        {/* 1) Departament */}
        {isNew ? (
          <select
            className="border rounded px-2 py-1 text-sm"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={!canEdit}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-sm font-semibold text-gray-700 px-2">
            {cap(department)}
          </div>
        )}

        {/* 2) Matrícula (desplegable) */}
        <select
          className="border rounded px-2 py-1 text-sm"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          disabled={!canEdit || loadingVehicles}
          title={
            loadingVehicles
              ? 'Carregant vehicles disponibles...'
              : 'Matrícules disponibles segons tipus i horari'
          }
        >
          <option value="">— Matrícula —</option>
          {plateOptions.map((v) => (
            <option key={v.id} value={v.plate}>
              {v.plate}
            </option>
          ))}
        </select>

        {/* 3) Tipus vehicle */}
        <select
          className="border rounded px-2 py-1 text-sm"
          value={vehicleType}
          onChange={(e) => {
            setVehicleType(e.target.value)
            setPlate('') // reset matrícula quan canvies tipus
          }}
          disabled={!canEdit}
        >
          <option value="">— Vehicle —</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* 4) Conductor */}
        {conductorEditable ? (
          <select
            className="border rounded px-2 py-1 text-sm"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            disabled={!canEdit || driversLoading}
            title="Conductors disponibles del departament"
          >
            <option value="">— Conductor —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="border rounded px-2 py-1 text-sm bg-gray-50"
            value={row?.name || driverName || ''}
            disabled
            readOnly
          />
        )}

        {/* 5) Dia */}
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={!canEdit}
        />

        {/* 6) Hora inici */}
        <input
          type="time"
          className="border rounded px-2 py-1 text-sm"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          disabled={!canEdit}
        />

        {/* 7) Hora fi */}
        <input
          type="time"
          className="border rounded px-2 py-1 text-sm"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          disabled={!canEdit}
        />

        {/* 8) Accions */}
        <div className="flex gap-2 justify-end">
          {!isEditing ? (
            <Button
              size="icon"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsEditing(true)}
              title="Editar"
            >
              <Pencil size={16} />
            </Button>
          ) : (
            <Button
              size="icon"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSave}
              disabled={saving || missingRequired}
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

      {/* 👇 Feedback UX clar (sense molestar) */}
      {!loadingVehicles && canEdit && vehicleType && date && startTime && endTime && plateOptions.length === 0 && (
        <div className="mt-2 text-xs text-amber-700">
          No hi ha vehicles disponibles per aquest tipus i horari.
        </div>
      )}

      {saveError && (
        <div className="mt-2 text-xs text-red-600">
          {saveError}
        </div>
      )}
    </div>
  )
}
