// file: src/app/menu/reports/page.tsx
'use client'

import { useState } from 'react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { BarChart3, Activity, Truck, AlertTriangle, FileEdit } from 'lucide-react'
import { PersonalPanel } from '@/components/reports/PersonalPanel'

const TABS = [
  { key: 'personal', label: 'Personal' },
  { key: 'events', label: 'Events' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'incidencies', label: 'Incidències' },
  { key: 'modificacions', label: 'Modificacions' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function ReportsPage() {
  const [active, setActive] = useState<TabKey>('personal')

  return (
    <div className="p-6 flex flex-col gap-6">
      <ModuleHeader
        icon={<BarChart3 className="w-7 h-7 text-indigo-600" />}
        title="Informes"
        subtitle="Panell inicial: personal (hores, rols, esdeveniments)"
      />

      <div className="flex gap-4">
        <aside className="w-48 shrink-0">
          <nav className="space-y-2">
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

        <main className="flex-1">
          {active === 'personal' && <PersonalPanel />}
          {active === 'events' && <Placeholder icon={<Activity />} title="Events" />}
          {active === 'vehicles' && <Placeholder icon={<Truck />} title="Vehicles" />}
          {active === 'incidencies' && <Placeholder icon={<AlertTriangle />} title="Incidències" />}
          {active === 'modificacions' && <Placeholder icon={<FileEdit />} title="Modificacions" />}
        </main>
      </div>
    </div>
  )
}

function Placeholder({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-white border rounded-xl p-6 text-gray-600 flex items-center gap-3">
      <div className="text-indigo-500">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-500">Properament: afegirem gràfics i mètriques.</p>
      </div>
    </div>
  )
}
