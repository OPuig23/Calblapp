// file: src/app/menu/quadrants/[id]/hooks/useGoogleEvents.ts
'use client';

import { useState, useEffect } from 'react';
import { extractCode } from '@/utils/extractCode';

// --- Helpers locals (sense dependències noves)
const stripCodeFromTitle = (summary = '') =>
  summary.replace(/\s*-\s*#\w+\s*$/i, '').trim();

const getCommercial = (ev: any) => {
  // 1) extendedProperties (private o shared)
  const ext = ev?.extendedProperties;
  const fromExt =
    ext?.private?.comercial ?? ext?.shared?.comercial ??
    ext?.private?.commercial ?? ext?.shared?.commercial ??
    ext?.private?.com ?? ext?.shared?.com ?? null;
  if (fromExt && String(fromExt).trim()) return String(fromExt).trim();

  // 2) description tolerant a accents/majuscules
  const desc = String(ev?.description || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

  const m =
    desc.match(/(?:comercial|com)\s*[:\-]\s*([^\n\r]+)/i) ??
    desc.match(/comercial\s+([^\n\r]+)/i);

  return (m?.[1] || '').trim();
};

const shortLocation = (s = '') => {
  const first = (s.split(',')[0] ?? s).trim();
  return first.length > 30 ? first.slice(0, 30) + '…' : first;
};

// --- Tipatge bàsic + camps enriquits
export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
  location?: string;

  // ✨ camps enriquits (opc.)
  eventCode?: string;
  commercial?: string;
  locationShort?: string;
  titleClean?: string;

  // comoditats
  startIso?: string;
  endIso?: string;
  [key: string]: any;
}

export function useGoogleEvents(from: string, to: string) {
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);

    fetch(`/api/googleCalendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(res => res.json())
      .then(data => {
        console.log('[debug:gcal] client received', data?.events?.[0]);
        const raw: GoogleEvent[] = data?.events || [];


        const mapped: GoogleEvent[] = raw.map(ev => {
          const code = extractCode(ev.summary || '') || '';
          return {
            ...ev,
            startIso: ev.start?.dateTime || ev.start?.date || '',
            endIso:   ev.end?.dateTime   || ev.end?.date   || '',
            eventCode: code,                               // ← codi #XXXX
            titleClean: stripCodeFromTitle(ev.summary || ''), // ← nom sense #codi
            locationShort: shortLocation(ev.location || ''),
            commercial: getCommercial(ev),                // ← comercial (ext.Props o description)
          };
        });

        setEvents(mapped);
      })
      .catch(err => {
        console.error('[useGoogleEvents] Error:', err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

 


  return { events, loading };
}
