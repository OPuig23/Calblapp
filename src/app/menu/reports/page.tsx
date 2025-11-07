// ✅ file: src/app/menu/reports/page.tsx
'use client'

import ModuleHeader from '@/components/layout/ModuleHeader'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <ModuleHeader
        icon={<BarChart3 className="w-7 h-7 text-indigo-600" />}
        title="Informes"
        subtitle="Mòdul en desenvolupament"
      />

      <div className="bg-white rounded shadow p-6 text-gray-700">
        <p>
          📊 Aquest mòdul d’informes està actualment desactivat. 
          Aviat s’hi afegirà el panell d’anàlisi de personal i esdeveniments.
        </p>
      </div>
    </div>
  )
}
