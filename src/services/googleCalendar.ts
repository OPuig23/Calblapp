// file: src/services/googleCalendar.ts
import { google, calendar_v3 } from 'googleapis'
import path from 'path'
import fs from 'fs'

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
  /** 👇 IMPORTANT: adjunts del Calendar (Drive) */
  attachments?: Array<{ fileUrl: string; title?: string; mimeType?: string }>
  [key: string]: unknown   // ✅ eliminem any
}

// Helper per autenticar-se amb Service Account
async function authenticate() {
  // 🔑 Primer intentem llegir credencials des d'entorn (Vercel)
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
  }

  // 🖥️ Fallback només per desenvolupament local amb fitxer JSON
  const keyFileName = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || 'serviceAccountKey.json'
  const keyFilePath = path.resolve(process.cwd(), keyFileName)
  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Fitxer de credencials no trobat: ${keyFilePath}`)
  }
  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
}

// Llegeix un rang d’esdeveniments (amb paginació + camps necessaris)
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
      fields: 'nextPageToken,items(id,summary,description,location,start,end,extendedProperties)',
    } as calendar_v3.Params$Resource$Events$List)

    events.push(...((resp.data.items as CalendarEvent[]) || []))
    pageToken = resp.data.nextPageToken || undefined
  } while (pageToken)

  return events
}

// Llegeix un únic esdeveniment per ID (incloent ATTACHMENTS)
export async function fetchGoogleEventById(id: string): Promise<CalendarEvent | null> {
  const calendarId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('Falta NEXT_PUBLIC_GOOGLE_CALENDAR_ID')

  const auth = await authenticate()
  const calendar = google.calendar({ version: 'v3', auth })
  try {
    const resp = await calendar.events.get({
      calendarId,
      eventId: id,
      fields: 'id,summary,description,location,start,end,extendedProperties,attachments(fileUrl,title,mimeType)',
    } as calendar_v3.Params$Resource$Events$Get)

    return (resp.data as CalendarEvent) || null
  } catch (e: unknown) {   // ✅ no fem servir any
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
