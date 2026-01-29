//file:src\app\menu\quadrants\[id]\components\QuadrantFieldsServeis.tsx
'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import brigades from '@/data/brigades.json'

type BrigadaAssignada = {
  id: string
  name: string
  workers: number
  startTime: string
  endTime: string
}

type Props = {
  value: {
    workers: number
    drivers: number
    brigades: BrigadaAssignada[]
  }
  onChange: (data: Props['value']) => void
}

export default function QuadrantFieldsServeis({ value, onChange }: Props) {
  const [needsBrigada, setNeedsBrigada] = useState(value.brigades.length > 0)

  const handleChange = (field: 'workers' | 'drivers', newValue: number) => {
    onChange({ ...value, [field]: newValue })
  }

  const handleAddBrigada = () => {
    const updated = [...value.brigades, { id: '', name: '', workers: 0, startTime: '', endTime: '' }]
    onChange({ ...value, brigades: updated })
  }

  const handleUpdateBrigada = (
    index: number,
    field: 'id' | 'workers' | 'startTime' | 'endTime',
    newValue: string | number
  ) => {
    const updated = [...value.brigades]
    if (field === 'id') {
      const brigada = brigades.find(b => b.id === newValue)
      if (brigada) {
        updated[index].id = brigada.id
        updated[index].name = brigada.name
      }
    } else if (field === 'workers') {
      updated[index].workers = Number(newValue)
    } else if (field === 'startTime') {
      updated[index].startTime = String(newValue)
    } else if (field === 'endTime') {
      updated[index].endTime = String(newValue)
    }
    onChange({ ...value, brigades: updated })
  }

  return (
    <div className="space-y-4">
      {/* Nombre de treballadors */}
      <div>
        <Label htmlFor="workers">Nombre de treballadors</Label>
        <Input
          id="workers"
          type="number"
          min={0}
          value={value.workers}
          onChange={e => handleChange('workers', Number(e.target.value))}
        />
      </div>

      {/* Nombre de conductors */}
      <div>
        <Label htmlFor="drivers">Nombre de conductors</Label>
        <Input
          id="drivers"
          type="number"
          min={0}
          value={value.drivers}
          onChange={e => handleChange('drivers', Number(e.target.value))}
        />
      </div>

      {/* ETT */}
      <div>
        <div className="flex items-center gap-2">
          <Switch
            id="needsBrigada"
            checked={needsBrigada}
            onCheckedChange={setNeedsBrigada}
          />
          <Label htmlFor="needsBrigada">Necessita ETT?</Label>
        </div>

        {needsBrigada && (
          <div className="mt-3 space-y-3">
            {value.brigades.map((brig, index) => (
              <div key={index} className="border rounded-md p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Select
                    value={brig.id}
                    onValueChange={val => handleUpdateBrigada(index, 'id', val)}
                  >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecciona ETT" />
                  </SelectTrigger>
                    <SelectContent>
                      {brigades.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min={0}
                    placeholder="Nº treballadors"
                    value={brig.workers}
                    onChange={e => handleUpdateBrigada(index, 'workers', e.target.value)}
                    className="w-[120px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Hora inici</Label>
                    <Input
                      type="time"
                      value={brig.startTime}
                      onChange={e => handleUpdateBrigada(index, 'startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Hora final</Label>
                    <Input
                      type="time"
                      value={brig.endTime}
                      onChange={e => handleUpdateBrigada(index, 'endTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={handleAddBrigada}>
              + Afegir ETT
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
