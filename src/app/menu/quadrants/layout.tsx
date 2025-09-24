// src/app/menu/quadrants/layout.tsx
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { normalizeRole } from '@/lib/roles';

export default function QuadrantsLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // No fem cap redirecció aquí: només controlem l'accés
  if (status === 'loading') return <div className="p-4">Carregant sessió…</div>;
  if (!session?.user) return <div className="p-4">No autoritzat.</div>;

  const role = normalizeRole((session.user as any).role);
  const allowed = role === 'admin' || role === 'direccio' || role === 'cap';
  if (!allowed) return <div className="p-4">No tens permisos per veure Quadrants.</div>;

  return <>{children}</>;
}
