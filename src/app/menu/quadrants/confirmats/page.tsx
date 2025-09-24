// File: src/app/menu/quadrants/confirmats/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuadrantsConfirmed } from '../hooks/useQuadrantsConfirmed';
import ConfirmedTable from './components/ConfirmedTable';

export default function ConfirmedPage() {
  const router = useRouter();
  const { confirmed, loading, error } = useQuadrantsConfirmed();

  return (
    <main className="container mx-auto py-8">
      <Button variant="outline" className="mb-6" onClick={() => router.back()}>
        ← Tornar enrere
      </Button>

      <Card className="rounded-2xl shadow border border-gray-200">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Carregant…</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : confirmed.length === 0 ? (
            <div className="text-center py-20 text-gray-600">No hi ha cap quadrant confirmat</div>
          ) : (
            <ConfirmedTable confirmed={confirmed} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}