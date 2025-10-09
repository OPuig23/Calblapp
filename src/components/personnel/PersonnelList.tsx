// file: src/components/personnel/PersonnelList.tsx
'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { usePersonnel, Personnel } from '@/hooks/usePersonnel'
import {
  GraduationCap,
  Truck,
  User,
  Users,
  Car,
  Phone,
  AtSign,
  Pencil,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ──────────────────────────────
   Icones de rol i vehicle
────────────────────────────── */
const roleIcon: Record<string, React.ReactNode> = {
  responsable: <GraduationCap className="text-blue-700" size={18} />,
  conductor: <Truck className="text-orange-500" size={18} />,
  treballador: <User className="text-green-600" size={18} />,
  brigada: <Users className="text-purple-600" size={18} />,
}

function VehicleIcon({ type }: { type?: string }) {
  if (!type) return null
  switch (type.toLowerCase()) {
    case 'camiogran':
      return <Truck className="w-4 h-4 text-blue-800" title="Camió gran" />
    case 'camiopetit':
      return <Truck className="w-4 h-4 text-green-700" title="Camió petit" />
    case 'furgoneta':
      return <Car className="w-4 h-4 text-orange-600" title="Furgoneta" />
    default:
      return <Truck className="w-4 h-4 text-gray-500" title={type} />
  }
}

/* ──────────────────────────────
   Component principal
────────────────────────────── */
type Props = {
  personnel: Personnel[]
  mutate: () => void
  onEdit?: (p: Personnel) => void
}

export default function PersonnelList({ personnel, mutate, onEdit }: Props) {
  const { deletePersonnel } = usePersonnel()
  const [loadingMap, setLoadingMap] = React.useState<Record<string, boolean>>({})

  async function handleDelete(p: Personnel) {
    if (!confirm(`Segur que vols eliminar ${p.name || p.id}?`)) return
    try {
      setLoadingMap((m) => ({ ...m, [p.id]: true }))
      await deletePersonnel(p.id)
      mutate()
    } finally {
      setLoadingMap((m) => ({ ...m, [p.id]: false }))
    }
  }

  if (!personnel?.length) {
    return <div className="text-gray-500 text-center py-6">No hi ha personal per mostrar.</div>
  }

  const deptBorder = (dept?: string) => {
    const d = (dept || '').toLowerCase()
    if (d.includes('log')) return 'border-blue-200'
    if (d.includes('cuina')) return 'border-green-200'
    if (d.includes('serve')) return 'border-purple-200'
    if (d.includes('food')) return 'border-pink-200'
    return 'border-gray-200'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 w-full">
      {personnel.map((p) => {
        const isLoading = !!loadingMap[p.id]
        const available = p.available
        const role = (p.role || '').toLowerCase()
        return (
          <div
            key={p.id}
            className={cn(
              'w-full rounded-2xl border bg-white p-3 shadow-sm hover:shadow-md transition-all',
              deptBorder(p.department)
            )}
          >
            {/* ─────────── Línia 1 ─────────── */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Inicial + Nom */}
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 border border-gray-300 text-gray-700 font-semibold">
                    {p.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm truncate max-w-[140px]">
                    {p.name}
                  </span>
                </div>

                {/* Departament */}
                {p.department && (
                  <span className="text-xs text-gray-600 truncate max-w-[80px]">
                    {p.department}
                  </span>
                )}

                {/* Icona rol */}
                {roleIcon[role] || roleIcon['treballador']}
              </div>

              {/* Accions */}
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(p)}
                    className="text-orange-600 hover:bg-orange-50 rounded-full"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(p)}
                  disabled={isLoading}
                  className="text-red-600 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ─────────── Línia 2 ─────────── */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
              {/* Punt de disponibilitat */}
              <span
                className={cn(
                  'inline-block w-2.5 h-2.5 rounded-full',
                  available ? 'bg-green-500' : 'bg-red-500'
                )}
                title={available ? 'Disponible' : 'No disponible'}
              />

              {/* Vehicle */}
              {p.driver?.isDriver && <VehicleIcon type={p.driver.vehicleType || (p.driver.camioGran ? 'camioGran' : p.driver.camioPetit ? 'camioPetit' : 'furgoneta')} />}

              {/* Telèfon */}
              {p.phone && (
                <span className="flex items-center gap-1 text-gray-600">
                  <Phone className="h-3 w-3" /> {p.phone}
                </span>
              )}

              {/* Email */}
              {p.email && (
                <span className="flex items-center gap-1 text-gray-600 truncate max-w-[130px]">
                  <AtSign className="h-3 w-3" />
                  <span className="truncate">{p.email}</span>
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
