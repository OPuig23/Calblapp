// file: src/app/menu/reports/page.tsx
'use client'

import { useState } from 'react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { BarChart3 } from 'lucide-react'

import { PersonalPanel } from '@/components/reports/PersonalPanel'
import { EventsPanel } from '@/components/reports/events/EventsPanel'
import { FinancialPanel } from '@/components/reports/financial/FinancialPanel'
import { VehiclesPanel } from '@/components/reports/vehicles/VehiclesPanel'
import { ModificacionsPanel } from '@/components/reports/modificacions/ModificacionsPanel'
import { IncidenciesPanel } from '@/components/reports/incidencies/IncidenciesPanel'
import { SummaryPanel } from '@/components/reports/summary/SummaryPanel'

const TABS = [
  { key: 'summary', label: 'Resum' },
  { key: 'personal', label: 'Personal' },
  { key: 'events', label: 'Events' },
  { key: 'financial', label: 'Financial' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'incidencies', label: 'IncidÇùncies' },
  { key: 'modificacions', label: 'Modificacions' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function ReportsPage() {
  const [active, setActive] = useState<TabKey>('summary')

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">

      {/* ================= HEADER ================= */}
      <ModuleHeader
        icon={<BarChart3 className="w-7 h-7 text-indigo-600" />}
        title="Informes"
        subtitle="Panell inicial: resum global"
      />

      {/* ================= MOBILE: TABS ================= */}
      <div className="sm:hidden flex items-center justify-center gap-2">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`whitespace-nowrap px-3 py-2 rounded-full border text-sm ${
                active === tab.key
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* ================= DESKTOP: NAV ================= */}
        <aside className="hidden sm:block w-full lg:w-48 shrink-0">
          <nav className="grid grid-cols-2 sm:grid-cols-1 gap-2">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`w-full text-left px-3 py-2 rounded-lg border ${
                  active === tab.key
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ================= CONTINGUT ================= */}
        <main className="flex-1 min-w-0">
          {active === 'summary' && <SummaryPanel />}
          {active === 'personal' && <PersonalPanel />}
          {active === 'events' && <EventsPanel />}
          {active === 'financial' && <FinancialPanel />}
          {active === 'vehicles' && <VehiclesPanel />}
          {active === 'incidencies' && <IncidenciesPanel />}
          {active === 'modificacions' && <ModificacionsPanel />}
        </main>
      </div>
    </div>
  )
}
