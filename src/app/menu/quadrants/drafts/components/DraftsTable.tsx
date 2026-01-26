// file: src/app/menu/quadrants/drafts/components/DraftsTable.tsx
'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAvailablePersonnel } from '@/app/menu/quadrants/[id]/hooks/useAvailablePersonnel'
import { GraduationCap, Truck, User, Users, ChevronDown, ChevronUp } from 'lucide-react'

// Subcomponents
import DraftRow from './DraftRow'
import RowEditor from './RowEditor'
import DraftActions from './DraftActions'

import type { Role } from './types'
import type { DraftInput, Row } from './types'

type Vehicle = {
  id: string
  plate: string
  type: string
  available: boolean
}

export default function DraftsTable({ draft }: { draft: DraftInput }) {
  const { data: session } = useSession()
  const department =
    (draft.department ||
      (session?.user && 'department' in session.user ? session.user.department : '') ||
      ''
    ).toLowerCase()

  const defaultMeetingPoint = draft.meetingPoint || ''
  const cuinaGroups = Array.isArray(draft.groups) ? draft.groups : []
  const hasCuinaGroups = cuinaGroups.length > 0

  const resolveNameById = (id: string) => {
    if (!id) return ''
    if (draft.responsable?.id === id) return draft.responsable?.name || ''
    const driver = (draft.conductors || []).find((c) => c.id === id)
    if (driver?.name) return driver.name
    const worker = (draft.treballadors || []).find((t) => t.id === id)
    if (worker?.name) return worker.name
    return ''
  }
  const norm = (value?: string) => (value || '').toLowerCase().trim()

  const buildCuinaRows = (): Row[] => {
    const rows: Row[] = []
    const driversPool = [...(draft.conductors || [])]
    const workersPool = [...(draft.treballadors || [])]
    const usedNames = new Set<string>()

    cuinaGroups.forEach((group, idx) => {
      const groupId = `group-${idx + 1}`
      const groupStartTime = group.startTime || draft.startTime || ''
      const groupEndTime = group.endTime || draft.endTime || ''
      const groupArrivalTime = group.arrivalTime || draft.arrivalTime || ''
      const groupMeetingPoint = group.meetingPoint || defaultMeetingPoint
      const respId =
        group.responsibleId ||
        (idx === 0 ? draft.responsableId || '' : '')
      let respName =
        group.responsibleName ||
        resolveNameById(respId) ||
        (idx === 0 && typeof draft.responsableName === 'string'
          ? draft.responsableName
          : '')
      if (respName && usedNames.has(norm(respName))) {
        respName = ''
      }

      const respRowIndex = rows.length
      rows.push({
        id: respId || '',
        name: respName || '',
        role: 'responsable',
        groupId,
        startDate: draft.startDate,
        startTime: groupStartTime,
        endDate: draft.endDate || draft.startDate,
        endTime: groupEndTime,
        meetingPoint: groupMeetingPoint,
        arrivalTime: groupArrivalTime,
        plate: '',
        vehicleType: '',
      })

      const driversNeeded = Number(group.drivers || 0)
      const assignedDrivers: Array<{ name?: string }> = []
      for (let i = 0; i < driversNeeded; i += 1) {
        let driver = driversPool.shift()
        while (driver?.name && usedNames.has(norm(driver.name))) {
          driver = driversPool.shift()
        }
        assignedDrivers.push({ name: driver?.name })
        rows.push({
          id: driver?.id || '',
          name: driver?.name || 'Extra',
          role: 'conductor',
          groupId,
          startDate: draft.startDate,
          startTime: groupStartTime,
          endDate: draft.endDate || draft.startDate,
          endTime: groupEndTime,
          meetingPoint: groupMeetingPoint,
          arrivalTime: groupArrivalTime,
          plate: driver?.plate || '',
          vehicleType: driver?.vehicleType || '',
        })
      }

      const responsibleIsDriver = assignedDrivers.some(
        (p) => p.name && norm(p.name) === norm(respName)
      )
      const workersNeeded = Math.max(
        Number(group.workers || 0) -
          driversNeeded -
          (responsibleIsDriver ? 0 : 1),
        0
      )
      const assignedWorkers: Array<{ name?: string }> = []
      for (let i = 0; i < workersNeeded; i += 1) {
        let worker = workersPool.shift()
        while (worker?.name && usedNames.has(norm(worker.name))) {
          worker = workersPool.shift()
        }
        assignedWorkers.push({ name: worker?.name })
        rows.push({
          id: worker?.id || '',
          name: worker?.name || 'Extra',
          role: 'treballador',
          groupId,
          startDate: draft.startDate,
          startTime: groupStartTime,
          endDate: draft.endDate || draft.startDate,
          endTime: groupEndTime,
          meetingPoint: groupMeetingPoint,
          arrivalTime: groupArrivalTime,
          plate: '',
          vehicleType: '',
        })
      }

      if (!rows[respRowIndex]?.name) {
        const candidate =
          assignedWorkers.find((p) => p.name && p.name !== 'Extra') ||
          assignedDrivers.find((p) => p.name && p.name !== 'Extra')
        if (candidate?.name) rows[respRowIndex].name = candidate.name
      }

      const groupNames = [
        rows[respRowIndex]?.name,
        ...assignedDrivers.map((p) => p.name),
        ...assignedWorkers.map((p) => p.name),
      ]
        .filter((name) => typeof name === 'string' && name && name !== 'Extra')
        .map((name) => norm(name as string))
      groupNames.forEach((name) => usedNames.add(name))
    })

    return rows
  }

  // --- Construcció inicial de files a partir del draft (incloent brigades)
  const initialRows: Row[] = hasCuinaGroups
    ? buildCuinaRows()
    : [
    ...(draft.responsableName
      ? [
          {
            id: draft.responsable?.id || '',
            name: draft.responsableName,
            role: 'responsable' as Role,
         startDate: draft.responsable?.startDate || draft.startDate,
startTime: draft.responsable?.startTime || draft.startTime,
endDate:   draft.responsable?.endDate   || draft.endDate,
endTime:   draft.responsable?.endTime   || draft.endTime,
meetingPoint:
              draft.responsable?.meetingPoint || defaultMeetingPoint,

            arrivalTime: draft.responsable?.arrivalTime || draft.arrivalTime || '',
            plate: draft.responsable?.plate || '',
            vehicleType: draft.responsable?.vehicleType || '',
          },
        ]
      : []),
    ...(draft.conductors || []).map((c) => ({
      id: c.id || '',
      name: c.name,
      role: 'conductor' as Role,
   startDate: c.startDate || draft.startDate,
startTime: c.startTime || draft.startTime,
endDate:   c.endDate   || draft.endDate,
endTime:   c.endTime   || draft.endTime,
      meetingPoint: c.meetingPoint || defaultMeetingPoint,

      arrivalTime: c.arrivalTime || draft.arrivalTime || '',
      plate: c.plate || '',
      vehicleType: c.vehicleType || '',
    })),
    ...(draft.treballadors || []).map((t) => ({
      id: t.id || '',
      name: t.name,
      role: 'treballador' as Role,
    startDate: t.startDate || draft.startDate,
startTime: t.startTime || draft.startTime,
endDate:   t.endDate   || draft.endDate,
endTime:   t.endTime   || draft.endTime,
      meetingPoint: t.meetingPoint || defaultMeetingPoint,

      arrivalTime: t.arrivalTime || draft.arrivalTime || '',
      plate: '',
      vehicleType: '',
    })),
    ...(draft.brigades || []).map((b) => ({
      id: b.id || '',
      name: b.name || '',
      role: 'brigada' as Role,
   startDate: b.startDate || draft.startDate,
startTime: b.startTime || draft.startTime,
endDate:   b.endDate   || draft.endDate,
endTime:   b.endTime   || draft.endTime,

      meetingPoint: b.meetingPoint || '',
      arrivalTime: b.arrivalTime || draft.arrivalTime || '',
      workers: b.workers || 0,
      plate: '',
      vehicleType: '',
    })),
  ]

  const [rows, setRows] = useState<Row[]>(initialRows)
  const initialRef = useRef(JSON.stringify(initialRows))
  const dirty = JSON.stringify(rows) !== initialRef.current
  const [expandedMerged, setExpandedMerged] = useState<Set<string>>(new Set())

  // --- Estat de confirmació
  const [confirmed, setConfirmed] = useState<boolean>(
    draft.status === 'confirmed'
  )
  const [confirming] = useState(false) // 👈 eliminat setConfirming no usat
  const isLocked = confirmed || confirming

  // --- Personal disponible
  const available = useAvailablePersonnel({
    departament: department,
    startDate: draft.startDate,
    endDate: draft.endDate,
    startTime: draft.startTime,
    endTime: draft.endTime,
    excludeIds: rows.map((r) => r.id).filter(Boolean),
  })

  // --- Comptadors (ara eliminats del render, però útils si es necessiten més tard)
  useMemo(
    () => ({
      responsables: rows.filter((r) => r.role === 'responsable').length,
      conductors: rows.filter((r) => r.role === 'conductor').length,
      treballadors: rows.filter((r) => r.role === 'treballador').length,
      brigades: rows.filter((r) => r.role === 'brigada').length,
    }),
    [rows]
  )

  useMemo(
    () => ({
      responsables: draft.responsablesNeeded || 1,
      conductors: draft.numDrivers || 0,
      treballadors: draft.totalWorkers || 0,
      brigades: (draft.brigades || []).length,
    }),
    [draft]
  )

  // --- Vehicles disponibles (per logística/cuines)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  React.useEffect(() => {
    const dept = department?.toLowerCase?.() || ''
    if (!(dept === 'logistica' || dept === 'cuina')) {
      setVehicles([])
      return
    }
    if (!draft.startDate || !draft.endDate || !draft.startTime || !draft.endTime) {
      setVehicles([])
      return
    }

    const controller = new AbortController()
    fetch('/api/transports/available', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: draft.startDate,
        startTime: draft.startTime,
        endDate: draft.endDate,
        endTime: draft.endTime,
        department: dept,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('No es poden carregar vehicles')
        const json = await res.json()
        setVehicles(Array.isArray(json?.vehicles) ? json.vehicles : [])
      })
      .catch(() => setVehicles([]))

    return () => controller.abort()
  }, [department, draft.startDate, draft.endDate, draft.startTime, draft.endTime])

  const availableForEditor = {
    responsables: available.responsables,
    conductors: available.conductors,
    treballadors: available.treballadors,
    vehicles,
  }

  // --- Callbacks (API routes)
const handleSaveAll = async (rowsOverride?: Row[]) => {
  try {
    // 1) Elimina files completament buides (sense nom i sense id)
    const cleaned = (rowsOverride ?? rows).filter(
      (r) => r.name?.trim() !== '' || r.id?.trim() !== ''
    )

    // 2) Crida a l’API amb les files netes
    const res = await fetch('/api/quadrantsDraft/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department: draft.department,
        eventId: draft.id,
        rows: cleaned,
      }),
    })

    if (!res.ok) throw new Error('Error en desar quadrant')

    alert('✅ Quadrant desat correctament')

    // 3) Marquem estat com a no-dirty
    initialRef.current = JSON.stringify(cleaned)

    // 4) Notifiquem perquè la pantalla es refresqui
    window.dispatchEvent(new Event('quadrant:updated'))
  } catch (err) {
    console.error('Error desa quadrant', err)
    alert('❌ Error en desar quadrant')
  }
}


  const handleConfirm = async () => {
    try {
      const res = await fetch('/api/quadrantsDraft/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draft.department,
          eventId: draft.id,
        }),
      })
      if (!res.ok) throw new Error('Error confirmant quadrant')
      const data = await res.json()
      if (data.ok) {
        setConfirmed(true)
        alert('✅ Quadrant confirmat correctament i notificacions enviades')
        window.dispatchEvent(new Event('quadrant:created'))
      } else {
        alert('⚠️ No s’ha pogut confirmar')
      }
    } catch (e) {
      console.error('Error confirmant quadrant', e)
      alert('❌ Error confirmant quadrant')
    }
  }

  const handleUnconfirm = async () => {
    try {
      const res = await fetch('/api/quadrantsDraft/unconfirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draft.department,
          eventId: draft.id,
        }),
      })
      if (!res.ok) throw new Error('Error reobrint quadrant')
      setConfirmed(false)
      alert('🔓 Quadrant reobert')
      window.dispatchEvent(new Event('quadrant:created'))
    } catch (err) {
      console.error('Error reobrint quadrant', err)
      alert('❌ Error reobrint quadrant')
    }
  }

  const handleDeleteQuadrant = async () => {
    if (!confirm('Segur que vols eliminar aquest quadrant?')) return
    try {
      const res = await fetch('/api/quadrantsDraft/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draft.department,
          eventId: draft.id,
          rows,
        }),
      })
      if (!res.ok) throw new Error('Error eliminant quadrant')
      alert('🗑️ Quadrant eliminat correctament')
    window.dispatchEvent(new Event('quadrant:updated'))

    } catch (err) {
      console.error('Error eliminant quadrant', err)
      alert('❌ Error eliminant quadrant')
      window.dispatchEvent(new Event('quadrant:updated'))
    }
  }

  const [editIdx, setEditIdx] = useState<number | null>(null)
  const startEdit = (i: number) => setEditIdx(i)
  const endEdit = () => setEditIdx(null)
  const patchRow = (patch: Partial<Row>) =>
    setRows((rs) =>
      rs.map((r, idx) => (idx === editIdx ? { ...r, ...patch } as Row : r))
    )

  const revertRow = () => {
    if (editIdx === null) return
    setRows((rs) => {
      const copy = [...rs]
      copy[editIdx] = initialRows[editIdx] // torna a l’estat inicial
      return copy
    })
    setEditIdx(null)
  }

  const deleteRow = async (index: number) => {
    const next = rows.filter((_, idx) => idx !== index)
    setRows(next)
    setEditIdx(null)
    await handleSaveAll(next)
  }

  const showCuinaGroups = hasCuinaGroups

  const toggleMerged = (key: string) =>
    setExpandedMerged((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  type DisplayItem =
    | { type: 'single'; row: Row; index: number }
    | { type: 'merged'; key: string; rows: Array<{ row: Row; index: number }> }

  const buildDisplayItems = (groupId?: string): DisplayItem[] => {
    const order: string[] = []
    const grouped = new Map<string, Array<{ row: Row; index: number }>>()

    rows.forEach((row, index) => {
      if (groupId && row.groupId !== groupId) return
      if (!groupId && row.groupId) return

      const name = row.name || ''
      const canMerge = name && name !== 'Extra'
      const key = canMerge
        ? [
            groupId || 'nogroup',
            norm(name),
            row.startDate,
            row.startTime,
            row.endDate,
            row.endTime,
            row.meetingPoint || ''
          ].join('|')
        : `single-${index}`

      if (!grouped.has(key)) {
        grouped.set(key, [])
        order.push(key)
      }
      grouped.get(key)!.push({ row, index })
    })

    return order.map((key) => {
      const groupRows = grouped.get(key) || []
      if (groupRows.length <= 1) {
        const single = groupRows[0]
        return { type: 'single', row: single.row, index: single.index } as DisplayItem
      }
      return { type: 'merged', key, rows: groupRows } as DisplayItem
    })
  }

  const roleIcon = {
    responsable: <GraduationCap className="text-blue-700" size={20} />,
    conductor: <Truck className="text-orange-500" size={18} />,
    treballador: <User className="text-green-600" size={18} />,
    brigada: <Users className="text-purple-600" size={18} />,
  }

  const renderMergedRowDesktop = (item: Extract<DisplayItem, { type: 'merged' }>) => {
    const roleRows = item.rows.map((r) => r.row)
    const roles = Array.from(new Set(roleRows.map((r) => r.role)))
    const primary =
      roleRows.find((r) => r.role === 'conductor') ||
      roleRows.find((r) => r.role === 'responsable') ||
      roleRows[0]
    const isExpanded = expandedMerged.has(item.key)

    return (
      <div
        className="border-b px-2 py-3 hover:bg-gray-50 grid gap-2 grid-cols-1 sm:grid-cols-[32px_1fr_5.5rem_5.5rem_minmax(10rem,1fr)_minmax(10rem,1fr)_3.5rem] items-center"
      >
        <div className="hidden sm:flex items-center justify-center gap-1">
          {roles.map((role) => (
            <span key={role}>{roleIcon[role]}</span>
          ))}
        </div>
        <div className="hidden sm:block truncate font-medium">
          {primary.name || <span className="italic text-gray-400">Sense nom</span>}
        </div>
        <div className="hidden sm:block w-[5.5rem] tabular-nums">
          {primary.startDate ? primary.startDate.split('-').slice(1).reverse().join('/') : '--/--'}
        </div>
        <div className="hidden sm:block w-[5.5rem] tabular-nums">
          {primary.startTime ? primary.startTime.substring(0, 5) : '--:--'}
        </div>
        <div className="hidden sm:block truncate text-xs text-gray-700">
          {primary.meetingPoint || <span className="text-gray-400">—</span>}
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-800">
          {primary.role === 'conductor' ? (
            <>
              <span>{primary.plate || '—'}</span>
              <Truck className="w-5 h-5 text-gray-500" />
            </>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
        <div className="hidden sm:flex justify-center">
          <button
            onClick={() => toggleMerged(item.key)}
            className="text-gray-500 hover:text-gray-700"
            title={isExpanded ? 'Amaga rols' : 'Mostra rols'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
    )
  }

  const renderMergedRowMobile = (item: Extract<DisplayItem, { type: 'merged' }>) => {
    const roleRows = item.rows.map((r) => r.row)
    const roles = Array.from(new Set(roleRows.map((r) => r.role)))
    const primary =
      roleRows.find((r) => r.role === 'conductor') ||
      roleRows.find((r) => r.role === 'responsable') ||
      roleRows[0]
    const isExpanded = expandedMerged.has(item.key)

    return (
      <div className="p-3 text-sm border-b">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {roles.map((role) => (
              <span key={role}>{roleIcon[role]}</span>
            ))}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-800">{primary.name || '—'}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {primary.startDate ? primary.startDate.split('-').slice(1).reverse().join('/') : '--/--'}
              {' · '}
              {primary.startTime ? primary.startTime.substring(0, 5) : '--:--'}
            </div>
          </div>
          <button
            onClick={() => toggleMerged(item.key)}
            className="text-gray-500 hover:text-gray-700"
            title={isExpanded ? 'Amaga rols' : 'Mostra rols'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
    )
  }

  const renderRow = (r: Row, i: number) => (
    <React.Fragment key={`${r.role}-${r.id || 'noid'}-${i}`}>
      <DraftRow
        row={r}
        isLocked={isLocked}
        onEdit={() => startEdit(i)}
        onDelete={() => deleteRow(i)}
      />
      {editIdx === i && (
        <RowEditor
          row={r}
          available={availableForEditor}
          onPatch={patchRow}
          onClose={endEdit}
          onRevert={revertRow}
          isLocked={isLocked}
        />
      )}
    </React.Fragment>
  )

  const defaultGroup = hasCuinaGroups ? cuinaGroups[0] : undefined
  const defaultGroupId = hasCuinaGroups ? 'group-1' : undefined
  const defaultGroupStartTime = defaultGroup?.startTime || draft.startTime
  const defaultGroupEndTime = defaultGroup?.endTime || draft.endTime
  const defaultGroupArrivalTime = defaultGroup?.arrivalTime || draft.arrivalTime
  const defaultGroupMeetingPoint = defaultGroup?.meetingPoint || draft.meetingPoint || ''

  const addRowToGroup = (role: Role, groupId?: string) => {
    const group = hasCuinaGroups
      ? cuinaGroups[Number(groupId?.replace('group-', '')) - 1] || defaultGroup
      : undefined
    const groupStart = group?.startTime || defaultGroupStartTime || ''
    const groupEnd = group?.endTime || defaultGroupEndTime || ''
    const groupArrival = group?.arrivalTime || defaultGroupArrivalTime || ''
    const groupMeeting = group?.meetingPoint || defaultGroupMeetingPoint

    setRows([
      ...rows,
      {
        id: '',
        name: '',
        role,
        startDate: draft.startDate,
        endDate: draft.endDate,
        startTime: groupStart,
        endTime: groupEnd,
        meetingPoint: groupMeeting,
        arrivalTime: groupArrival,
        plate: '',
        vehicleType: '',
        groupId,
      },
    ])
  }

  return (
  <div className="w-full rounded-2xl border bg-white shadow">
    {/* 💻 Vista escriptori */}
    <div className="hidden sm:block overflow-x-auto">
      {/* Capçalera */}
      <div
        className="grid border-b bg-gray-50 text-xs font-semibold text-gray-600 px-1 py-2 items-center min-w-[750px]"
        style={{
          gridTemplateColumns:
            '32px 1fr 5.5rem 5.5rem minmax(10rem,1fr) minmax(10rem,1fr) auto',
        }}
      >
        <div></div>
        <div>Nom / Brigada</div>
        <div>Data</div>
        <div>Hora</div>
        <div>Meeting point</div>
        <div>Vehicle / Nº persones</div>
        <div className="flex justify-end gap-1">
          <DraftActions
            confirmed={confirmed}
            confirming={confirming}
            dirty={dirty}
            onConfirm={handleConfirm}
            onUnconfirm={handleUnconfirm}
            onSave={handleSaveAll}
            onDelete={handleDeleteQuadrant}
          />
        </div>
      </div>

      {/* Files */}
      <div className="flex flex-col divide-y">
        {showCuinaGroups
          ? cuinaGroups.map((group, gidx) => {
              const groupId = `group-${gidx + 1}`
              const groupStart = group.startTime || draft.startTime || '—'
              const groupArrival = group.arrivalTime || draft.arrivalTime || '—'
              const groupEnd = group.endTime || draft.endTime || '—'
              const groupMeeting = group.meetingPoint || draft.meetingPoint || '—'
              return (
                <React.Fragment key={groupId}>
                  <div
                    className="grid border-b bg-slate-50 text-xs text-slate-600 px-2 py-2 items-center min-w-[750px]"
                    style={{
                      gridTemplateColumns:
                        '32px 1fr 5.5rem 5.5rem minmax(10rem,1fr) minmax(10rem,1fr) auto',
                    }}
                  >
                    <div className="col-span-full">
                      Grup {gidx + 1} · Meeting point {groupMeeting} · Hora inici {groupStart} ·
                      Hora arribada {groupArrival} · Hora fi {groupEnd}
                    </div>
                  </div>
                  {buildDisplayItems(groupId).map((item) =>
                    item.type === 'single' ? (
                      renderRow(item.row, item.index)
                    ) : expandedMerged.has(item.key) ? (
                      item.rows.map((r) => renderRow(r.row, r.index))
                    ) : (
                      <React.Fragment key={item.key}>
                        {renderMergedRowDesktop(item)}
                      </React.Fragment>
                    )
                  )}
                  {!isLocked && (
                    <div className="flex flex-wrap gap-2 justify-end sm:justify-start px-3 py-3 bg-slate-50 border-b">
                      <button
                        onClick={() => addRowToGroup('responsable', groupId)}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                      >
                        + Responsable
                      </button>
                      <button
                        onClick={() => addRowToGroup('conductor', groupId)}
                        className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200"
                      >
                        + Conductor
                      </button>
                      <button
                        onClick={() => addRowToGroup('treballador', groupId)}
                        className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                      >
                        + Treballador
                      </button>
                      <button
                        onClick={() => addRowToGroup('brigada', groupId)}
                        className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
                      >
                        + Brigada
                      </button>
                    </div>
                  )}
                </React.Fragment>
              )
            })
          : rows.map((r, i) => renderRow(r, i))}
      </div>
    </div>

    {/* 📱 Vista mòbil */}
    <div className="block sm:hidden divide-y">
      {showCuinaGroups
        ? cuinaGroups.map((group, gidx) => {
            const groupId = `group-${gidx + 1}`
            const groupStart = group.startTime || draft.startTime || '—'
            const groupArrival = group.arrivalTime || draft.arrivalTime || '—'
            const groupEnd = group.endTime || draft.endTime || '—'
            const groupMeeting = group.meetingPoint || draft.meetingPoint || '—'
            return (
              <div key={groupId} className="divide-y">
                <div className="px-3 py-2 text-xs text-slate-600 bg-slate-50">
                  <div className="font-semibold text-slate-700">Grup {gidx + 1}</div>
                  <div>Meeting point: {groupMeeting}</div>
                  <div>Hora inici: {groupStart}</div>
                  <div>Hora arribada: {groupArrival}</div>
                  <div>Hora fi: {groupEnd}</div>
                </div>
                {buildDisplayItems(groupId).map((item) =>
                  item.type === 'single' ? (
                    <div key={`${item.row.role}-${item.row.id || 'noid'}-${item.index}`} className="p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800">{item.row.name || '—'}</span>
                        <span className="text-xs text-gray-500">{item.row.role}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                        <div>📅 {item.row.startDate}</div>
                        <div>🕒 {item.row.startTime || '—'}</div>
                        <div>📍 {item.row.meetingPoint || '—'}</div>
                        {item.row.vehicleType && <div>🚐 {item.row.vehicleType}</div>}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => startEdit(item.index)}
                          className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs"
                        >
                          Edita
                        </button>
                        <button
                          onClick={() => deleteRow(item.index)}
                          className="px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs"
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  ) : expandedMerged.has(item.key) ? (
                    item.rows.map((r) => renderRow(r.row, r.index))
                  ) : (
                    <React.Fragment key={item.key}>
                      {renderMergedRowMobile(item)}
                    </React.Fragment>
                  )
                )}
                {!isLocked && (
                  <div className="flex flex-wrap gap-2 px-3 py-3 bg-slate-50">
                    <button
                      onClick={() => addRowToGroup('responsable', groupId)}
                      className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                    >
                      + Responsable
                    </button>
                    <button
                      onClick={() => addRowToGroup('conductor', groupId)}
                      className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200"
                    >
                      + Conductor
                    </button>
                    <button
                      onClick={() => addRowToGroup('treballador', groupId)}
                      className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                    >
                      + Treballador
                    </button>
                    <button
                      onClick={() => addRowToGroup('brigada', groupId)}
                      className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
                    >
                      + Brigada
                    </button>
                  </div>
                )}
              </div>
            )
          })
        : rows.map((r, i) => (
            <div key={`${r.role}-${r.id || 'noid'}-${i}`} className="p-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{r.name || '—'}</span>
                <span className="text-xs text-gray-500">{r.role}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                <div>📅 {r.startDate}</div>
                <div>🕒 {r.startTime || '—'}</div>
                <div>📍 {r.meetingPoint || '—'}</div>
                {r.vehicleType && <div>🚐 {r.vehicleType}</div>}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => startEdit(i)}
                  className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs"
                >
                  Edita
                </button>
                <button
                  onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                  className="px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs"
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
    </div>

    {!showCuinaGroups && (
      <div className="flex flex-wrap gap-2 justify-end sm:justify-start px-3 py-3 bg-gray-50 border-t">
        <button
          onClick={() => addRowToGroup('responsable', defaultGroupId)}
          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
        >
          + Responsable
        </button>
        <button
          onClick={() => addRowToGroup('conductor', defaultGroupId)}
          className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200"
        >
          + Conductor
        </button>
        <button
          onClick={() => addRowToGroup('treballador', defaultGroupId)}
          className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
        >
          + Treballador
        </button>
        <button
          onClick={() => addRowToGroup('brigada', defaultGroupId)}
          className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
        >
          + Brigada
        </button>
      </div>
    )}
  </div>
)

}
