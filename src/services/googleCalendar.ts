// file: src/services/googleCalendar.ts
import { google, calendar_v3 } from 'googleapis'
import path from 'path'
import fs from 'fs'

// ─────────────────────────────────────────────────────────────────────────────
// Tipus d'esdeveniment del Calendar
export interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  extendedProperties?: {
    private?: Record<string, string | number | boolean | null>
    shared?: Record<string, string | number | boolean | null>
  }
  attachments?: Array<{ fileUrl: string; title?: string; mimeType?: string }>
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔐 AUTENTICACIÓ UNIVERSAL (Vercel + Local)
async function authenticate() {
  try {
    // 1️⃣ Primer intent: variable d’entorn amb JSON complet (Vercel)
    if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
      const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
      return new google.auth.GoogleAuth({
        credentials: creds,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      })
    }

    // 2️⃣ Segon intent: credencials individuals (per compatibilitat antiga)
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      return new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      })
    }

    // 3️⃣ Últim recurs: lectura local de fitxer (entorn de desenvolupament)
    const keyFileName = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || 'serviceAccountKey.json'
    const keyFilePath = path.resolve(process.cwd(), keyFileName)
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Fitxer de credencials no trobat: ${keyFilePath}`)
    }

    return new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
  } catch (err) {
    console.error('[googleCalendar] Error d’autenticació:', err)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📅 Obté esdeveniments en un rang de dates
export async function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const calendarId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('Falta NEXT_PUBLIC_GOOGLE_CALENDAR_ID')

  const auth = await authenticate()
  const calendar = google.calendar({ version: 'v3', auth })

  const events: CalendarEvent[] = []
  let pageToken: string | undefined

  do {
    const resp = await calendar.events.list({
      calendarId,
      timeMin: from,
      timeMax: to,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
      pageToken,
      fields:
        'nextPageToken,items(id,summary,description,location,start,end,extendedProperties)',
    } as calendar_v3.Params$Resource$Events$List)

    events.push(...((resp.data.items as CalendarEvent[]) || []))
    pageToken = resp.data.nextPageToken || undefined
  } while (pageToken)

  return events
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 Llegeix un únic esdeveniment (incloent adjunts)
export async function fetchGoogleEventById(id: string): Promise<CalendarEvent | null> {
  const calendarId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('Falta NEXT_PUBLIC_GOOGLE_CALENDAR_ID')

  const auth = await authenticate()
  const calendar = google.calendar({ version: 'v3', auth })

  try {
    const resp = await calendar.events.get({
      calendarId,
      eventId: id,
      fields:
        'id,summary,description,location,start,end,extendedProperties,attachments(fileUrl,title,mimeType)',
    } as calendar_v3.Params$Resource$Events$Get)

    return (resp.data as CalendarEvent) || null
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code?: number }).code === 404) {
      return null
    }

    // Fallback sense "fields"
    try {
      const respFull = await calendar.events.get({
        calendarId,
        eventId: id,
      } as calendar_v3.Params$Resource$Events$Get)
      return (respFull.data as CalendarEvent) || null
    } catch {
      throw e
    }
  }
}
