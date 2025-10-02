// src/app/api/googleCalendar/events/route.ts
import { NextResponse } from 'next/server'
import { getCalendarEvents } from '@/services/googleCalendar'

// 🔹 Tipo mínimo de evento de Google Calendar
export interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  [key: string]: unknown // permitimos campos extra de la API
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Falten paràmetres from i to' },
      { status: 400 }
    )
  }

  // Si només reps 'YYYY-MM-DD', converteix a ISO complet:
  const fromIso = from.length === 10
    ? new Date(`${from}T00:00:00.000Z`).toISOString()
    : new Date(from).toISOString()
  const toIso = to.length === 10
    ? new Date(`${to}T23:59:59.999Z`).toISOString()
    : new Date(to).toISOString()

  try {
    // ⚡️ Eliminamos any con cast explícito
    const events = await getCalendarEvents(fromIso, toIso) as unknown as CalendarEvent[]

    return NextResponse.json({ events })
  } catch (err: unknown) {
    console.error('[api/googleCalendar/events] Error:', err)

    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error consultant Google Calendar' },
      { status: 500 }
    )
  }
}
