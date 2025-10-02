// src/app/menu/quadrants/[id]/components/QuadrantTable.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Trash2,
  Plus,
  Truck,
  User,
  GraduationCap,
  Save,
  CheckCircle,
  Trash,
  Edit
} from 'lucide-react'

const roleIcon = {
  responsable: <GraduationCap className="text-blue-700" size={20} title="Responsable" />,  
  conductor:   <Truck className="text-orange-500" size={18} title="Conductor" />,   
  treballador: <User className="text-green-600" size={18} title="Treballador" />  
}

// Format (DD/MM)
const formatDate = (d: string) => {
  if (!d) return '--/--'
  const [, mm, dd] = d.split('-')
  return `${dd}/${mm}`
}

// Format (HH:MM)
const formatTime = (t: string) => t ? t.substring(0, 5) : '--:--'


export default function QuadrantTable({ draft }) {
  const [rows, setRows] = useState([
    ...(draft.responsableId
      ? [{
          role: 'responsable',
          id: draft.responsable.id,
          name: draft.responsable.name,
          startDate: draft.startDate,
          startTime: draft.startTime,
          endDate: draft.endDate,
          endTime: draft.endTime,
          meetingPoint: draft.meetingPoint || ''
        }]
      : []),
    ...(Array.isArray(draft.conductors)
      ? draft.conductors.map(c => ({
          role: 'conductor',
          id: c.id,
          name: c.name,
          startDate: draft.startDate,
          startTime: draft.startTime,
          endDate: draft.endDate,
          endTime: draft.endTime,
          meetingPoint: draft.meetingPoint || ''
        }))
      : []),
    ...(Array.isArray(draft.treballadors)
      ? draft.treballadors.map(t => ({
          role: 'treballador',
          id: t.id,
          name: t.name,
          startDate: draft.startDate,
          startTime: draft.startTime,
          endDate: draft.endDate,
          endTime: draft.endTime,
          meetingPoint: draft.meetingPoint || ''
        }))
      : [])
  ])

  const [editIdx, setEditIdx] = useState(null)
  const [editRow, setEditRow] = useState(null)

  const handleConfirm = () => { /* TODO */ }
  const handleSave    = () => { /* TODO */ }
  const handleDelete  = () => { /* TODO */ }

  const handleEdit = i => {
    setEditIdx(i)
    setEditRow({ ...rows[i] })
  }
  const handleEditChange = (k, v) => {
    setEditRow(r => ({ ...r, [k]: v }))
  }
  const handleEditSave = i => {
    setRows(rs => rs.map((r, idx) => (idx === i ? editRow : r)))
    setEditIdx(null)
    setEditRow(null)
  }
  const handleDeleteLine = i => {
    setRows(rs => rs.filter((_, idx) => idx !== i))
    setEditIdx(null)
    setEditRow(null)
  }
  const handleAddLine = role => {
    setRows(rs => [
      ...rs,
      {
        role,
        id: '',
        name: '',
        startDate: draft.startDate,
        startTime: draft.startTime,
        endDate: draft.endDate,
        endTime: draft.endTime,
        meetingPoint: draft.meetingPoint || ''
      }
    ])
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow border px-4 py-4">
      {/* Header */}
      <div className="mb-2 flex justify-between items-center">
        <div>
          <div className="font-bold text-lg">
            {draft.code} – {draft.eventName}
          </div>
          {draft.location && (
            <div className="text-xs text-blue-700 font-medium truncate">
              {draft.location}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="icon" className="bg-green-600 text-white" onClick={handleConfirm} title="Confirma">
            <CheckCircle size={18} />
          </Button>
          <Button size="icon" className="bg-blue-600 text-white" onClick={handleSave} title="Desa">
            <Save size={18} />
          </Button>
          <Button size="icon" className="bg-red-600 text-white" onClick={handleDelete} title="Elimina">
            <Trash size={18} />
          </Button>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-0.5">
        {rows.map((r, i) => (
          <div key={i} className="group relative flex items-center border-b py-2">
            <div className="w-7 flex justify-center items-center">
              {roleIcon[r.role]}
            </div>
            <div className="flex-1 min-w-[90px] truncate text-base">
              {r.name || <span className="text-slate-400 italic">Sense nom</span>}
            </div>
            <div className="w-14 text-center font-mono text-sm">
              {formatDate(r.startDate)}
            </div>
            <div className="w-12 text-center font-mono text-sm">
              {formatTime(r.startTime)}
            </div>
            <div className="min-w-[80px] max-w-[110px] truncate text-xs text-slate-700">
              {r.meetingPoint || '-'}
            </div>
            <div className="flex gap-1 ml-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleEdit(i)}
                disabled={editIdx !== null && editIdx !== i}
                title="Editar"
              >
                <Edit size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDeleteLine(i)}
                disabled={editIdx !== null && editIdx !== i}
                title="Eliminar"
              >
                <Trash2 size={16} />
              </Button>
            </div>

            {/* Editable panel */}
            {editIdx === i && (
              <div className="absolute left-0 top-full w-full mt-1 bg-slate-50 border rounded-xl px-3 py-3 flex flex-col gap-2 z-10 shadow">
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium">Nom</label>
                    <Input
                      value={editRow.name}
                      onChange={e => handleEditChange('name', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium">Lloc convocatòria</label>
                    <Input
                      value={editRow.meetingPoint}
                      onChange={e => handleEditChange('meetingPoint', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-medium">Data inici</label>
                    <Input
                      type="date"
                      value={editRow.startDate}
                      onChange={e => handleEditChange('startDate', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Hora inici</label>
                    <Input
                      type="time"
                      value={editRow.startTime}
                      onChange={e => handleEditChange('startTime', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Data fi</label>
                    <Input
                      type="date"
                      value={editRow.endDate}
                      onChange={e => handleEditChange('endDate', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Hora fi</label>
                    <Input
                      type="time"
                      value={editRow.endTime}
                      onChange={e => handleEditChange('endTime', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <Button size="sm" className="bg-green-600 text-white" onClick={() => handleEditSave(i)}>
                    <Save size={16} className="mr-1" />Desa
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditIdx(null); setEditRow(null) }}>
                    Cancel·la
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAddLine('treballador')}>
          <Plus className="text-green-600" size={16} /> Treballador
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAddLine('conductor')}>
          <Plus className="text-orange-500" size={16} /> Conductor
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAddLine('responsable')}>
          <Plus className="text-blue-600" size={16} /> Responsable
        </Button>
      </div>
    </div>
  )
}