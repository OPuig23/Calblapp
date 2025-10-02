// File: src/app/menu/quadrants/[id]/hooks/useResponsables.ts
'use client';

import { useState, useEffect } from 'react';

export interface Responsable {
  id: string;
  name: string;
}

export function useResponsables() {
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchResponsables() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/personnel', { signal: controller.signal });
        const body: { success?: boolean; error?: string; data?: Array<{ id: string; name: string; role?: string }> } =
          await res.json();

        if (!res.ok || !body.success || !Array.isArray(body.data)) {
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        // **Filtrar només rol “responsable”** (sense importar majúscules/minúscules)
        const respOnly: Responsable[] = body.data
          .filter(
            (p) => typeof p.role === 'string' && p.role.toLowerCase().startsWith('resp')
          )
          .map((p) => ({
            id: p.id,
            name: p.name,
          }));

        if (isMounted) setResponsables(respOnly);
      } catch (err) {
        if (isMounted && (err as Error).name !== 'AbortError') {
          console.error('useResponsables:', err);
          setError('No s’han pogut carregar els responsables');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchResponsables();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return { responsables, loading, error };
}
