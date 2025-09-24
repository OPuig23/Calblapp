'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import FilterSidebar, { ReportFilters } from '../../../components/reports/FilterSidebar'
//import UseReportOptions from '@/hooks/UseReportOptions'
import { useReportPersonnel } from '../../../hooks/useReportPersonnel'
import { KPIGrid } from '../../../components/reports/KPIGrid'
import { LineChart } from '../../../components/reports/LineChart'
import { DonutChart } from '../../../components/reports/DonutChart'
import { DetailTable } from '../../../components/reports/DetailTable'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  // 1) Estat de filtres “draft” i “aplicats”
  const [draft, setDraft] = useState<ReportFilters>({
    fromDate: '',
    toDate: '',
    eventName: '',
    department: '',
    workerName: '',
  })
  const [applied, setApplied] = useState<ReportFilters>(draft)

   // 2) Carreguem opcions de Departament (desactivat temporalment)
  const departments: string[] = []
  const optsLoading = false

  // 3) Inicialitzem el departament per defecte (no fem res perquè no tenim dades)
  // useEffect(() => {
  //   if (!optsLoading && draft.department === '' && departments.length) {
  //     setDraft((f) => ({ ...f, department: departments[0] }))
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [optsLoading])


  // 4) Obtenim dades segons filtres aplicats
  const { data, loading, error } = useReportPersonnel({
    department: applied.department,
    role: '', // si vols rol, pots afegir aquí
    from: applied.fromDate,
    to: applied.toDate,
    event: applied.eventName,
    responsible: applied.workerName, // backend filtra per personName
    businessLine: '', // idem
  })

  // 5) Handlers per al Sidebar
  const onChange = useCallback((upd: Partial<ReportFilters>) => {
    setDraft((f) => ({ ...f, ...upd }))
  }, [])
  const onApply = () => setApplied(draft)
  const onReset = () => {
    const reset: ReportFilters = {
      fromDate: '',
      toDate: '',
      eventName: '',
      department: '',
      workerName: '',
    }
    setDraft(reset)
    setApplied(reset)
  }

  // 6) Estats de UI
  if (optsLoading) return <div className="p-6">Carregant opcions…</div>
  if (loading) return <div className="p-6">Carregant dades…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!data) return <div className="p-6">Sense dades</div>

  // 7) KPI tiles
  const kpis = [
    { label: 'Total Personal', value: String(data.stats.totalPersonnel), icon: '👥', bg: 'bg-blue-600' },
    { label: 'Hores Treballades', value: String(data.stats.totalHours), icon: '⏳', bg: 'bg-green-600' },
    { label: 'Hores Extres', value: String(data.stats.extraHours), icon: '⚡', bg: 'bg-yellow-600' },
    { label: 'Top Responsables', value: data.stats.topResponsables, icon: '⭐', bg: 'bg-indigo-600' },
  ]

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* 🔹 Header unificat */}
      <ModuleHeader
        icon={<BarChart3 className="w-7 h-7 text-indigo-600" />}
        title="Informes"
        subtitle="Analitza dades de personal i esdeveniments"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar de filtres */}
        <aside className="w-full lg:w-80">
          <FilterSidebar
            filters={draft}
            departments={departments}
            onChange={onChange}
            onApply={onApply}
            onReset={onReset}
            loading={loading}
          />
        </aside>

        {/* Contingut principal */}
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
    </div>
  )
}
