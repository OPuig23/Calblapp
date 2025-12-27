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
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* 🎨 Icones de rol */
const roleIcon: Record<string, React.ReactNode> = {
  responsable: <GraduationCap className="text-blue-700" size={18} />,
  driver: <Truck className="text-orange-500" size={18} />,
  treballador: <User className="text-green-600" size={18} />,
  brigada: <Users className="text-purple-600" size={18} />
}

/* 🎨 Icona vehicle */
function VehicleIcon({ type }: { type?: string }) {
  if (!type) return null
  const t = type.toLowerCase()

  if (t === 'camiogran')
    return <Truck className="w-4 h-4 text-blue-800" title="Camió gran" />

  if (t === 'camiopetit')
    return <Truck className="w-4 h-4 text-green-700" title="Camió petit" />

  if (t === 'furgoneta')
    return <Car className="w-4 h-4 text-orange-600" title="Furgoneta" />

  return <Truck className="w-4 h-4 text-gray-500" title={type} />
}

/* 🎨 Colors franja departament */
const deptColor = (dept?: string) => {
  const d = (dept || '').toLowerCase()
  if (d.includes('log')) return 'bg-blue-500'
  if (d.includes('cuina')) return 'bg-green-500'
  if (d.includes('serve')) return 'bg-purple-500'
  if (d.includes('food')) return 'bg-pink-500'
  return 'bg-gray-300'
}

type Props = {
  personnel: Personnel[]
  mutate: () => void
  onEdit?: (p: Personnel) => void
}

export default function PersonnelList({ personnel, mutate, onEdit }: Props) {
  const { deletePersonnel, requestUser } = usePersonnel()
  const [loadingMap, setLoadingMap] = React.useState<Record<string, boolean>>({})

  // 🔥 Accions
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

  async function handleRequestUser(p: Personnel) {
    const missing: string[] = []
    if (!p.name?.trim()) missing.push('nom')
    if (!p.role?.toString().trim()) missing.push('rol')
    if (!p.department?.toString().trim()) missing.push('departament')
    if (!p.email?.toString().trim()) missing.push('email')
    if (!p.phone?.toString().trim()) missing.push('telèfon')
    if (p.driver?.isDriver) {
      const hasType = p.driver.camioGran || p.driver.camioPetit
      if (!hasType) missing.push('tipus conductor')
    }
    if (missing.length) {
      alert(
        `Falten camps obligatoris per demanar usuari: ${missing.join(', ')}`
      )
      return
    }

    try {
      setLoadingMap((m) => ({ ...m, [p.id]: true }))
      await requestUser(p.id)
      mutate()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No s'ha pogut sol·licitar l'usuari"
      alert(msg)
    } finally {
      setLoadingMap((m) => ({ ...m, [p.id]: false }))
    }
  }

  if (!personnel?.length) {
    return <p className="text-gray-500 text-center py-6">No hi ha personal.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {personnel.map((p) => {
        const isLoading = !!loadingMap[p.id]
        const role = (p.role || '').toLowerCase()

        return (
          <div
            key={p.id}
            className="relative rounded-xl bg-white shadow-sm hover:shadow-md transition border border-gray-200 p-3"
          >
            {/* Franja superior */}
            <div className={cn('absolute top-0 left-0 w-full h-1 rounded-t-xl', deptColor(p.department))} />

            {/* Línia superior */}
            <div className="flex items-center justify-between mt-2">
              {/* Identitat */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-100 border flex items-center justify-center text-gray-700 font-semibold">
                  {p.name?.[0]?.toUpperCase() || <User size={14} />}
                </div>

                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.department}</span>
                </div>

                {roleIcon[role] || roleIcon['treballador']}
              </div>

              {/* Botons */}
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(p)}
                    className="text-orange-600 hover:bg-orange-50 rounded-full"
                  >
                    <Pencil size={15} />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(p)}
                  disabled={isLoading}
                  className="text-red-600 hover:bg-red-50 rounded-full"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>

            {/* Línia info */}
            <div className="flex items-center gap-3 text-xs text-gray-700 mt-2">
              <span
                className={cn(
                  'inline-block w-2.5 h-2.5 rounded-full',
                  p.available ? 'bg-green-500' : 'bg-red-500'
                )}
              />

              {p.driver?.isDriver && (
                <VehicleIcon
                  type={
                    p.driver.camioGran
                      ? 'camioGran'
                      : p.driver.camioPetit
                      ? 'camioPetit'
                      : 'furgoneta'
                  }
                />
              )}

              {p.phone && (
                <span className="flex items-center gap-1 text-gray-600">
                  <Phone size={12} /> {p.phone}
                </span>
              )}

              {p.email && (
                <span className="flex items-center gap-1 text-gray-600 truncate max-w-[120px]">
                  <AtSign size={12} />
                  <span className="truncate">{p.email}</span>
                </span>
              )}
            </div>

            {/* Estat usuari */}
            <div className="mt-3">
              {p.hasUser && (
                <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                  <CheckCircle2 size={16} /> Usuari creat
                </div>
              )}

              {!p.hasUser && p.requestStatus === 'pending' && (
                <div className="flex items-center gap-2 text-blue-600 text-xs font-medium">
                  <Clock size={16} /> Sol·licitud pendent
                </div>
              )}

              {!p.hasUser && p.requestStatus === 'rejected' && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-medium">
                  <XCircle size={16} /> Sol·licitud rebutjada
                </div>
              )}

              {!p.hasUser && p.requestStatus === 'none' && (
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mt-1"
                  disabled={isLoading}
                  onClick={() => handleRequestUser(p)}
                >
                  <UserPlus size={16} />
                  Sol·licitar usuari
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
