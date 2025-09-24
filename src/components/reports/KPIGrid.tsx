// src/components/reports/KPIGrid.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'

type KPI = { label: string; value: string; icon: React.ReactNode; bg: string }

export function KPIGrid({ kpis }: { kpis: KPI[] }) {
  return (
    <>
      {kpis.map((k, i) => (
        <Card key={i} className={`${k.bg} text-white`}>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase">{k.label}</div>
              <div className="text-2xl font-bold">{k.value}</div>
            </div>
            <div className="text-4xl">{k.icon}</div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
