//filename: src/components/quadrants/WeeklyTable.tsx
'use client'

import { useState, useEffect } from 'react'
import type { QuadrantData } from '@/hooks/quadrants/useQuadrantsByDept'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useLinkedDepartmentsWeek from '@/hooks/quadrants/useLinkedDepartmentsWeek'


interface WeeklyTableProps {
  quadrants: QuadrantData[]
  loading: boolean
  error: string | null
  start?: string
  end?: string
}

/**
 * 🧩 WeeklyTable
 * Vista plana de quadrants setmanals amb enllaços entre departaments
 * - Mobile-first
 * - Optimitzada per 30+ esdeveniments setmanals
 */
export default function WeeklyTable({ quadrants, loading, error, start, end }: WeeklyTableProps) {
  const [selected, setSelected] = useState<QuadrantData | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const { linkedData, loading: loadingLinks } = useLinkedDepartmentsWeek(start, end)

  // 🧭 Formatador de data curta + dia setmana
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' }) +
      ' — ' +
      d.toLocaleDateString('ca-ES', { weekday: 'long' })
  }

  // 🔍 Carrega dades detallades quan s’obre modal
  useEffect(() => {
    const fetchDetails = async () => {
      if (!selected?.code) return
      setLoadingDetails(true)
      try {
        const res = await fetch(`/api/quadrants/details?code=${selected.code}`)
        const json = await res.json()
        if (res.ok) setDetails(json)
        else console.error('❌ Error detalls quadrant:', json.error)
      } catch (err) {
        console.error('⚠️ Error obtenint detalls modal:', err)
      } finally {
        setLoadingDetails(false)
      }
    }
    fetchDetails()
  }, [selected])

  // 🌀 Loading principal
  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 text-gray-500">
        <Loader2 className="animate-spin w-5 h-5 mr-2" /> Carregant quadrants…
      </div>
    )
  }

  // ⚠️ Error principal
  if (error) {
    return <p className="text-red-600 text-center py-10">{error}</p>
  }

  // 📭 Sense dades
  if (!quadrants || quadrants.length === 0) {
    return (
      <p className="text-gray-400 text-center py-10">
        Cap quadrant trobat per aquesta setmana.
      </p>
    )
  }

  // 🧾 Taula principal
  return (
    <>
      <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-emerald-50 text-emerald-900 text-sm">
              <TableHead className="min-w-[80px]">Codi</TableHead>
              <TableHead>Data / Dia</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Finca / Ubicació</TableHead>
              <TableHead>Personal i Conductors</TableHead>
              <TableHead className="text-right">PAX</TableHead>
              <TableHead>Vestimenta</TableHead>
              <TableHead>Horari</TableHead>
              <TableHead>Altres departaments</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {quadrants.map((q) => (
              <TableRow
                key={q.id}
                className="text-xs sm:text-sm hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => setSelected(q)}
              >
                {/* 🔹 Codi Firestore */}
                <TableCell className="font-semibold text-emerald-700 underline">
                  {q.code || '—'}
                </TableCell>

                {/* 📅 Data curta + dia setmana */}
                <TableCell>{formatDate(q.startDate)}</TableCell>

                {/* 👨 Responsable */}
                <TableCell>{q.responsable || '—'}</TableCell>

                {/* 📍 Ubicació */}
                <TableCell>{q.location || '—'}</TableCell>

                {/* 👷 Personal i conductors */}
                <TableCell>
                  {[...(q.treballadors || []), ...(q.conductors || [])]
                    .map((p) => p.name)
                    .join(', ') || '—'}
                </TableCell>

                {/* 👥 PAX */}
                <TableCell className="text-right">{q.pax ?? 0}</TableCell>

                {/* 👔 Vestimenta */}
                <TableCell>{q.dressCode || '—'}</TableCell>

                {/* 🕒 Horari */}
                <TableCell>
                  {q.startTime || '—'} – {q.endTime || '—'}
                </TableCell>

                {/* 🧩 Altres departaments */}
                <TableCell className="text-xs text-emerald-700">
                  {loadingLinks ? (
                    <span className="text-gray-400">...</span>
                  ) : (() => {
                      const links = linkedData[q.code ?? ''] || []

                      const others = links.filter((l) => l.dept !== q.department)
                      if (others.length === 0) return <span className="text-gray-400">—</span>
                      return others.map((l, i) => (
                        <div key={i}>
                          {l.dept} {l.startTime || ''}
                        </div>
                      ))
                    })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 🪟 Modal detallat */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg mx-auto rounded-2xl p-6 bg-white shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-emerald-700 font-semibold text-base sm:text-lg">
                {selected.eventName || 'Esdeveniment'}
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex justify-center py-6 text-gray-500">
                <Loader2 className="animate-spin w-5 h-5 mr-2" /> Carregant detalls…
              </div>
            ) : (
              <div className="space-y-3 text-sm text-gray-700 mt-2">
                <p><strong>Codi:</strong> {selected.code || '—'}</p>
                <p><strong>Ubicació:</strong> {selected.location || '—'}</p>

                {/* 📊 Informació comercial (stage) */}
                {details?.stage && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="font-semibold text-emerald-600 mb-1">Informació comercial</p>
                    <p><strong>Comercial:</strong> {details.stage.comercial || '—'}</p>
                    <p><strong>Servei:</strong> {details.stage.servei || '—'}</p>
                    <p><strong>Stage:</strong> {details.stage.stageColor || '—'}</p>
                  </div>
                )}

                {/* 🧩 Altres departaments */}
                {details?.departaments && Object.keys(details.departaments).length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="font-semibold text-emerald-600 mb-1">Altres departaments</p>
                    {Object.entries(details.departaments).map(([dept, data]: any) => (
                      <div key={dept} className="mt-2">
                        <p className="font-semibold capitalize">{dept}</p>
                        <p><strong>Hora inici:</strong> {data.startTime || '—'}</p>
                        <p><strong>Responsable:</strong> {data.responsable || '—'}</p>
                        <p><strong>Conductors:</strong> {(data.conductors || []).map((c: any) => c.name).join(', ') || '—'}</p>
                        <p><strong>Treballadors:</strong> {(data.treballadors || []).map((t: any) => t.name).join(', ') || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelected(null)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-1.5 text-sm shadow"
              >
                Tancar
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
