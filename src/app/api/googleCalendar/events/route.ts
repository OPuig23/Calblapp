// File: src/app/api/googleCalendar/events/route.ts
import { NextResponse } from 'next/server';
import { getCalendarEvents } from '@/services/googleCalendar';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Falten paràmetres from i to' }, { status: 400 });
  }

  // Si només reps 'YYYY-MM-DD', converteix a ISO complet:
  const fromIso = from.length === 10
    ? new Date(`${from}T00:00:00.000Z`).toISOString()
    : new Date(from).toISOString();
  const toIso = to.length === 10
    ? new Date(`${to}T23:59:59.999Z`).toISOString()
    : new Date(to).toISOString();

  try {
    const events = await getCalendarEvents(fromIso, toIso);
    return NextResponse.json({ events });
  } catch (err: any) {
    console.error('[api/googleCalendar/events] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Error consultant Google Calendar' },
      { status: 500 }
    );
  }
}
