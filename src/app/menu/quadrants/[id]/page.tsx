// src/app/menu/quadrants/[id]/page.tsx
'use client';

import React from 'react';
import QuadrantTable from './components/QuadrantTable';

interface Params {
  params: { id: string };
}

export default function QuadrantDetailPage({ params }: Params) {
  // initialData can come from props or a fetch; use null for now
  return (
    <main className="p-6">
      <QuadrantTable eventId={params.id} initialData={null} />
    </main>
  );
}
