// src/app/menu/reports/personnel/page.tsx
'use client'

import { useState, useCallback } from 'react'
import { Calendar }   from 'lucide-react'
import { motion }     from 'framer-motion'
import FilterSidebar, { ReportFilters } from '@/components/reports/FilterSidebar'
import { useReportOptions }   from '@/hooks/useReportOptions'
import { useReportPersonnel } from '@/hooks/useReportPersonnel'
import { KPIGrid }    from '@/components/reports/KPIGrid'
import { LineChart }  from '@/components/reports/LineChart'
import { DonutChart } from '@/components/reports/DonutChart'
import { DetailTable }from '@/components/reports/DetailTable'

export default function PersonnelReportPage() {
  // --- 1) ESTAT PER A FILTRES (draft i aplicats) ---
  const [draft, setDraft] = useState<ReportFilters>({
    fromDate:   '2025-06-01',
    toDate:     '2025-06-30',
    eventName:  '',
    responsible:''
  })
  const [applied, setApplied] = useState<ReportFilters>(draft)

  // --- 2) OPCIONS DINÀMIQUES PER A SELECTS, SI CAL (departaments, rols, etc) ---
  // (ja ho teníem implementat amb useReportOptions, pots afegir més camps)

  // --- 3) DADES DEL REPORT SEGONS FILTRES APLICATS ---
  const { data, loading, error } = useReportPersonnel({
    type:   'personnel',
    from:   applied.fromDate,
    to:     applied.toDate,
    event:  applied.eventName,
    responsible: applied.responsible
  })

  // --- 4) HANDLERS DE FILTRES ---
  const onChange = useCallback((upd: Partial<ReportFilters>) => {
    setDraft(f => ({ ...f, ...upd }))
  }, [])

  const onApply = () => setApplied(draft)
  const onReset = () => {
    const reset: ReportFilters = {
      fromDate:   '',
      toDate:     '',
      eventName:  '',
      responsible:''
    }
    setDraft(reset)
    setApplied(reset)
  }

  // --- 5) LOADING / ERROR STATES ---
  if (loading) return <div className="p-6">Carregant dades…</div>
  if (error)   return <div className="p-6 text-red-600">Error: {error}</div>
  if (!data)  return <div className="p-6">Sense dades</div>

  // --- 6) PREPAREM ELS KPI TILES ---
  const kpis = [
    { label:'Total Personal',     value:String(data.stats.totalPersonnel), icon:'👥', bg:'bg-blue-600' },
    { label:'Hores Treballades',  value:String(data.stats.totalHours),      icon:'⏳', bg:'bg-green-600' },
    { label:'Hores Extres',       value:String(data.stats.extraHours),      icon:'⚡', bg:'bg-yellow-600' },
    { label:'Top Responsables',   value:data.stats.topResponsables,        icon:'⭐', bg:'bg-indigo-600' }
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* --- Sidebar de filtres --- */}
      <aside className="w-full lg:w-72">
        <FilterSidebar
          filters={draft}
          onChange={onChange}
          onApply={onApply}
          onReset={onReset}
          loading={loading}
        />
      </aside>

      {/* --- Contingut principal --- */}
      <main className="flex-1 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPIGrid kpis={kpis} />
        </div>

        {/* Gràfics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-white shadow rounded p-4">
              <h3 className="text-lg font-semibold mb-2">Hores Treballades per Persona</h3>
              <LineChart data={data.chartByPerson} />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="bg-white shadow rounded p-4">
              <h3 className="text-lg font-semibold mb-2">Extres vs Normals</h3>
              <DonutChart data={data.chartDonut} />
            </div>
          </motion.div>
        </div>

        {/* Taula de detall */}
        <div className="bg-white shadow rounded p-4">
          <DetailTable rows={data.rows} />
        </div>
      </main>
    </div>
  )
}
