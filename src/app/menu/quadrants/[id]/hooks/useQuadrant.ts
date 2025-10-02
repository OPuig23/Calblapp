// file: src/app/menu/quadrants/[id]/hooks/useQuadrant.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

export type QuadrantStatus = 'draft' | 'confirmed' | 'canceled';

export interface QuadrantDraft {
  id: string;
  eventName: string;
  startDate: string;     // YYYY-MM-DD
  startTime: string;     // HH:mm
  endDate: string;       // YYYY-MM-DD
  endTime: string;       // HH:mm
  totalWorkers: number;
  numDrivers: number;

  // Camps opcionals que sovint tenim al draft
  location?: string;
  meetingPoint?: string;
  department?: string;
  responsableId?: string;
  responsableName?: string;
  conductors?: Array<{ id: string; name: string }>;
  treballadors?: Array<{ id: string; name: string }>;

  status: QuadrantStatus;
  createdAt?: string;
  updatedAt?: string;
}

type DraftResponse = { quadrant?: QuadrantDraft };

// 👇 Evitem `any`
function safeStringify(obj: unknown) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '';
  }
}

export function useQuadrant(eventId: string, initialData: Partial<QuadrantDraft> = {}) {
  const [quadrant, setQuadrant] = useState<Partial<QuadrantDraft>>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Guardem un "snapshot" per calcular si hi ha canvis pendents
  const savedSnapshotRef = useRef<string>(safeStringify({ ...initialData, id: eventId }));

  const dirty = useMemo(() => {
    return safeStringify({ ...quadrant, id: eventId }) !== savedSnapshotRef.current;
  }, [quadrant, eventId]);

  /** Carrega des del servidor (si existeix) */
  const refresh = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<DraftResponse>(`/api/quadrantsDraft/${eventId}`);
      if (res.data?.quadrant) {
        setQuadrant(res.data.quadrant);
        savedSnapshotRef.current = safeStringify(res.data.quadrant);
        setLastSavedAt(new Date().toISOString());
      } else {
        // No existeix al backend → mantenim el que tinguem en memòria
        savedSnapshotRef.current = safeStringify({ ...quadrant, id: eventId });
      }
    } catch {
      setError('No s’ha pogut carregar el borrador');
    } finally {
      setLoading(false);
    }
  }, [eventId, quadrant]);

  useEffect(() => {
    refresh();
  }, [eventId, refresh]);

  /** Setter de camp únic, útil per inputs */
  const setField = useCallback(<K extends keyof QuadrantDraft>(key: K, value: QuadrantDraft[K]) => {
    setQuadrant((q) => ({ ...q, [key]: value }));
  }, []);

  /** Desa (merge) amb *optimistic update*. Pots passar només el patch que ha canviat. */
  const saveDraft = useCallback(
    async (patch: Partial<QuadrantDraft> = {}) => {
      if (!eventId) return;
      setSaving(true);
      setError(null);

      // optimistic
      const prev = quadrant;
      const next = {
        ...prev,
        ...patch,
        id: eventId,
        status: (patch.status as QuadrantStatus) || (prev.status as QuadrantStatus) || 'draft',
      };
      setQuadrant(next);

      try {
        await axios.post('/api/quadrantsDraft/save', { id: eventId, ...next });
        savedSnapshotRef.current = safeStringify(next);
        setLastSavedAt(new Date().toISOString());
      } catch {
        // revert
        setQuadrant(prev);
        setError('Error en desar el borrador');
      } finally {
        setSaving(false);
      }
    },
    [eventId, quadrant]
  );

  /** Confirma el quadrant i el marca com a `confirmed`. Accepta patch addicional. */
  const confirmQuadrant = useCallback(
    async (patch: Partial<QuadrantDraft> = {}) => {
      if (!eventId) return;
      setSaving(true);
      setError(null);

      const prev = quadrant;
      const next = { ...prev, ...patch, id: eventId, status: 'confirmed' as QuadrantStatus };
      setQuadrant(next);

      try {
        await axios.post('/api/quadrantsDraft/confirm', { id: eventId, ...next });
        savedSnapshotRef.current = safeStringify(next);
        setLastSavedAt(new Date().toISOString());
      } catch {
        setQuadrant(prev);
        setError('Error en confirmar el quadrant');
      } finally {
        setSaving(false);
      }
    },
    [eventId, quadrant]
  );

  /** Cancel·la (o elimina) el draft al backend i neteja la UI */
  const deleteDraft = useCallback(async () => {
    if (!eventId) return;
    setSaving(true);
    setError(null);

    const prev = quadrant;
    try {
      await axios.post('/api/quadrantsDraft/cancel', { id: eventId });
      setQuadrant({});
      savedSnapshotRef.current = safeStringify({});
      setLastSavedAt(new Date().toISOString());
    } catch {
      setQuadrant(prev);
      setError('Error en esborrar el borrador');
    } finally {
      setSaving(false);
    }
  }, [eventId, quadrant]);

  /** Avís si tanquen la pestanya amb canvis pendents */
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  return {
    quadrant,
    setQuadrant,
    setField,
    refresh,

    saveDraft,
    confirmQuadrant,
    deleteDraft,

    loading,
    saving,
    dirty,
    lastSavedAt,
    error,
  };
}
