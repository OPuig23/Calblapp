// file: src/components/personnel/PersonnelList.tsx
'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePersonnel, Personnel } from '@/hooks/usePersonnel'
import {
  UserPlus,
  Loader2,
  Trash2,
  User,
  Car,
  Phone,
  AtSign,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  personnel: Personnel[]
  mutate: () => void
  onEdit?: (p: Personnel) => void
}

export default function PersonnelList({ personnel, mutate, onEdit }: Props) {
  const { requestUser, deletePersonnel } = usePersonnel()
  const [loadingMap, setLoadingMap] = React.useState<Record<string, boolean>>({})

  async function handleRequest(p: Personnel) {
    try {
      setLoadingMap(m => ({ ...m, [p.id]: true }))
      await requestUser(p.id)
      mutate()
    } catch (e: any) {
      alert(e?.message || 'No s’ha pogut enviar la sol·licitud')
    } finally {
      setLoadingMap(m => ({ ...m, [p.id]: false }))
    }
  }

  async function handleDelete(p: Personnel) {
    if (!confirm(`Segur que vols eliminar ${p.name || p.id}?`)) return
    try {
      setLoadingMap(m => ({ ...m, [p.id]: true }))
      await deletePersonnel(p.id)
      mutate()
    } catch (e: any) {
      alert(e?.message || 'No s’ha pogut eliminar el registre')
    } finally {
      setLoadingMap(m => ({ ...m, [p.id]: false }))
    }
  }

  if (!personnel?.length) {
    return <div className="text-gray-500">No hi ha personal per mostrar.</div>
  }

  const deptColors: Record<string, string> = {
    LOGISTICA: 'bg-blue-50 text-blue-700 border border-blue-200',
    CUINA: 'bg-green-50 text-green-700 border border-green-200',
    SERVEIS: 'bg-purple-50 text-purple-700 border border-purple-200',
    'FOOD LOVER': 'bg-pink-50 text-pink-700 border border-pink-200',
    TOTAL: 'bg-gray-50 text-gray-700 border border-gray-200',
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {personnel.map(p => {
        const isLoading = !!loadingMap[p.id]
        const deptStyle =
          deptColors[p.department?.toUpperCase()] || 'bg-gray-50 text-gray-700 border'

        return (
          <div
            key={p.id}
            className="flex flex-col rounded-2xl border shadow-sm hover:shadow-md bg-white overflow-hidden transition"
          >
            {/* 🔹 Capçalera */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
              <div className="flex items-center gap-3">
                {/* Inicial */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-bold text-base">
                  {p.name?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
                </div>

                {/* Nom + Departament */}
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                  {p.department && (
                    <span
                      className={cn(
                        'mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit',
                        deptStyle
                      )}
                    >
                      {p.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Estat usuari */}
              <div>
                {p.hasUser && (
                  <Badge variant="success" className="text-xs">
                    Usuari
                  </Badge>
                )}
                {!p.hasUser && p.requestStatus === 'pending' && (
                  <Badge variant="warning" className="text-xs">
                    Pendent
                  </Badge>
                )}
                {!p.hasUser && p.requestStatus === 'rejected' && (
                  <Badge variant="destructive" className="text-xs">
                    Rebutjat
                  </Badge>
                )}
              </div>
            </div>

            {/* 🔹 Cos */}
            <div className="px-4 py-3 text-sm text-gray-700 space-y-3">
              {/* Rol i conductor */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-800">
                  {(p.role || 'TREBALLADOR').toUpperCase()}
                </span>
                {p.driver?.isDriver && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                    <Car className="h-3 w-3" />
                    {p.driver.camioGran
                      ? 'Camió gran'
                      : p.driver.camioPetit
                      ? 'Camió petit'
                      : 'Conductor'}
                  </span>
                )}
              </div>

              {/* Estat de disponibilitat */}
              <div>
                {p.available ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                    <Check className="h-3 w-3" /> Disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                    <X className="h-3 w-3" /> No disponible
                  </span>
                )}
              </div>

              {/* Contacte */}
              <div className="flex flex-col gap-1 text-xs text-gray-500">
                {p.email && (
                  <div className="flex items-center gap-1">
                    <AtSign className="h-3 w-3" />
                    <span>{p.email}</span>
                  </div>
                )}
                {p.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{p.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 🔹 Peu */}
            <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50">
              {/* Botó editar */}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(p)}
                  title="Editar"
                  className="text-orange-600 hover:bg-orange-50"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}

              {/* Botó eliminar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(p)}
                disabled={isLoading}
                title="Eliminar"
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              {/* Botó sol·licitar */}
              {!p.hasUser && p.requestStatus === 'none' && (
                <button
                  onClick={() => handleRequest(p)}
                  disabled={isLoading}
                  className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700 px-3 py-1 text-xs font-medium hover:bg-amber-100"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enviant…
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Sol·licitar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
