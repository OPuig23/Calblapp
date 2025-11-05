// ✅ file: src/app/menu/quadrants/[id]/page.tsx
'use client'

import React from 'react'
import QuadrantTable from './components/QuadrantTable'

export default function QuadrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ✅ Desempaqueta la promesa de `params`
  const { id } = React.use(params)

  return (
    <main className="p-6">
      {/* ✅ Manté la mateixa funcionalitat actual */}
      <QuadrantTable eventId={id} initialData={null} />
    </main>
  )
}
