//file: src/app/menu/quadrants/[id]/components/CalendarView.tsx
'use client';

import React from 'react';
import { parseISO, isValid, format, startOfWeek } from 'date-fns';
import { ca } from 'date-fns/locale';
import { QuadrantEvent } from '@/app/menu/quadrants/[id]/hooks/useQuadrants';
import EventTile from './EventTile';

interface CalendarViewProps {
  events: QuadrantEvent[];
  onEventClick: (e: QuadrantEvent) => void;
  range: { start: string; end: string };
}

export default function CalendarView({
  events,
  onEventClick,
  range
}: CalendarViewProps) {
  const dayKeys = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

  // 1) Determine the Monday to start from, fallback to this week
  let monday: Date;
  const parsed = parseISO(range.start);
  if (isValid(parsed)) {
    monday = parsed;
  } else {
    monday = startOfWeek(new Date(), { weekStartsOn: 1 }); // Dilluns d’aquesta setmana
  }

  // 2) Build the dates of the week
  const weekDates = dayKeys.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // 3) Initialize empty groups
  const eventsByDay: Record<string, QuadrantEvent[]> = {};
  dayKeys.forEach(k => (eventsByDay[k] = []));

  // 4) Group events into days
  events.forEach(ev => {
    // a) Extract ISO start
    const isoString =
      typeof ev.start === 'string' ? ev.start : ev.start?.dateTime || ev.start?.date;
    if (!isoString) return;
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) return;
    // b) Compute index 0..6 (Dl..Dg)
    const idx = (dateObj.getDay() + 6) % 7;
    const key = dayKeys[idx];
    if (!eventsByDay[key]) return;
    eventsByDay[key].push(ev);
  });

  // 5) Sort each day by start time
  dayKeys.forEach(k => {
    eventsByDay[k].sort((a, b) => {
      const aTime = new Date(
        typeof a.start === 'string' ? a.start : a.start.dateTime || a.start.date!
      ).getTime();
      const bTime = new Date(
        typeof b.start === 'string' ? b.start : b.start.dateTime || b.start.date!
      ).getTime();
      return aTime - bTime;
    });
  });

  // 6) Highlight today
  const todayIndex = (new Date().getDay() + 6) % 7;
  // DEBUG: mira què arriba al client
console.log('[CalendarView sample]', events?.[0]);

  return (
    <div className="mt-8">
      {/* Header with days and counts */}
      <div className="grid grid-cols-7 bg-white rounded-t-lg border border-gray-200 shadow-inner">
        {dayKeys.map((key, idx) => {
          const date = weekDates[idx];
          const count = eventsByDay[key].length;
          return (
            <div
              key={key}
              className={`flex flex-col items-center py-3 ${idx === todayIndex ? 'bg-blue-50' : ''}`}
            >
              <span className="text-sm font-semibold text-gray-700 uppercase">
                {key}
              </span>
              <span className="text-xs text-gray-500">
                {format(date, 'dd/MM', { locale: ca })}
              </span>
              <span className="text-[10px] text-gray-400 mt-1">{count}</span>
            </div>
          );
        })}
      </div>

{/* Grid of events */}
<div className="grid grid-cols-7 border-l border-r border-b border-gray-200">
  {dayKeys.map((key, idx) => (
    <div
      key={key}
      className={`p-2 space-y-2 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
    >
      {eventsByDay[key].length > 0 ? (
        eventsByDay[key].map(ev => {
          console.log('[CalendarView → EventTile]', {
            id: ev.id,
            code: ev.eventCode,
            responsable: (ev as any).responsable,
            conductors: (ev as any).conductors,
            treballadors: (ev as any).treballadors,
          });
          return (
            <EventTile key={ev.id} event={ev} onClick={onEventClick} />
          );
        })
      ) : (
        <div className="text-center text-xs text-gray-300 py-4">
          — Cap esdeveniment —
        </div>
      )}
    </div>
  ))}
</div>

    </div>
  );
}
