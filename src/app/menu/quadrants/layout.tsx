// src/app/menu/quadrants/layout.tsx
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { normalizeRole, type Role } from '@/lib/roles';

interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string | Role;
  department?: string;
}

export default function QuadrantsLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div className="p-4">Carregant sessió…</div>;
  if (!session?.user) return <div className="p-4">No autoritzat.</div>;

  const role = normalizeRole((session.user as SessionUser).role || '');
  const allowed = role === 'admin' || role === 'direccio' || role === 'cap';
  if (!allowed) return <div className="p-4">No tens permisos per veure Quadrants.</div>;

  return <>{children}</>;
}
