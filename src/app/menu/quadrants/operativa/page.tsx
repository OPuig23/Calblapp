// ✅ file: src/app/menu/quadrants/operativa/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import useQuadrantsByDept from '@/hooks/quadrants/useQuadrantsByDept'
import ModuleHeader from '@/components/layout/ModuleHeader'
import WeeklyFilters from '@/components/quadrants/WeeklyFilters'
import WeeklyTable from '@/components/quadrants/WeeklyTable'
import { ClipboardList } from 'lucide-react'

export default function QuadrantsOperativaPage() {
// 🧩 Sessió usuari i departament
const { data: session } = useSession()

let userDept = 'serveis'
if (session && typeof session.user === 'object' && session.user) {
  const u: any = session.user
  if (typeof u.department === 'string') {
    userDept = u.department.toLowerCase()
  }
}

const departament =
  userDept === 'total' || userDept === 'direccio' ? 'serveis' : userDept


  // 🗓 Estat inicial de filtres
  const today = new Date()
  const monday = new Date(today)
  const dow = monday.getDay() || 7
  if (dow !== 1) monday.setDate(monday.getDate() - (dow - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const [filters, setFilters] = useState({
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    departament,
    responsable: '',
    treballador: '',
    finca: '',
    dia: ''
  })

  const [filtersOpen, setFiltersOpen] = useState(false)

  // 🔹 Carrega de dades Firestore segons departament i setmana
  const { quadrants, loading, error } = useQuadrantsByDept(
    filters.departament,
    filters.start,
    filters.end
  )

  // 🔹 Filtratge local addicional
  const filtered = useMemo(() => {
    return quadrants.filter((q) => {
      const matchResponsable = filters.responsable
        ? q.responsable?.toLowerCase().includes(filters.responsable.toLowerCase())
        : true
      const matchFinca = filters.finca
        ? q.location?.toLowerCase().includes(filters.finca.toLowerCase())
        : true
      const matchTreballador = filters.treballador
        ? (q.treballadors || [])
            .map((t) => t.name.toLowerCase())
            .join(' ')
            .includes(filters.treballador.toLowerCase())
        : true
      return matchResponsable && matchFinca && matchTreballador
    })
  }, [quadrants, filters])

  // 🔄 Navegació setmanal (identic a Espais)
  const shiftWeek = (direction: 'prev' | 'next') => {
    const base = new Date(filters.start)
    base.setDate(base.getDate() + (direction === 'next' ? 7 : -7))
    const newStart = base.toISOString().split('T')[0]
    const newEnd = new Date(base)
    newEnd.setDate(base.getDate() + 6)
    setFilters((prev) => ({
      ...prev,
      start: newStart,
      end: newEnd.toISOString().split('T')[0],
    }))
  }

  // 🏷 Etiqueta setmana
  const weekLabel = (() => {
    const start = new Date(filters.start)
    const end = new Date(filters.end)
    const f = (d: Date) =>
      d.toLocaleDateString('ca-ES', { day: '2-digit', month: 'short' })
    return `${f(start)} — ${f(end)}`
  })()

  // 🖼 Render principal
  return (
    <section className="relative w-full h-full bg-white">
      {/* Header */}
      <ModuleHeader
        icon={<ClipboardList className="w-6 h-6 text-emerald-600" />}
        title="Vista setmanal operativa"
        subtitle={`Consulta unificada per setmana – ${departament}`}
      />

      {/* Botó flotant per obrir filtres */}
<button
  onClick={() => setFiltersOpen(true)}
  className="fixed top-[4.5rem] left-3 z-50 bg-white/95 rounded-full shadow-md px-3 py-1 text-2xl active:scale-95 transition"
  title="Obrir filtres i opcions"
>
  ≡
</button>

{/* Panell de filtres controlat des d’aquí */}
<WeeklyFilters
  open={filtersOpen}
  onOpenChange={setFiltersOpen}
  onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
  fixedDepartment={departament}
  role="Cap Departament"
/>

      

      {/* Selector setmanal */}
      <div className="flex items-center justify-center gap-3 mt-4 mb-2">
        <button
          onClick={() => shiftWeek('prev')}
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          ◀
        </button>
        <span className="font-semibold text-gray-700 text-sm sm:text-base">
          Setmana: {weekLabel}
        </span>
        <button
          onClick={() => shiftWeek('next')}
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          ▶
        </button>
      </div>

      {/* 📊 Taula de resultats */}
      <WeeklyTable
  quadrants={quadrants}
  loading={loading}
  error={error}
  start={filters.start}   // o la variable real que tens
  end={filters.end}
/>

    </section>
  )
}
