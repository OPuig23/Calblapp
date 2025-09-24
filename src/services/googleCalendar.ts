// file: src/services/googleCalendar.ts
import { google, calendar_v3 } from 'googleapis'
import path from 'path'
import fs from 'fs'

export interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  start:  { dateTime?: string; date?: string }
  end:    { dateTime?: string; date?: string }
  location?: string
  extendedProperties?: {
    private?: Record<string, any>
    shared?: Record<string, any>
  }
  /** 👇 IMPORTANT: adjunts del Calendar (Drive) */
  attachments?: Array<{ fileUrl: string; title?: string; mimeType?: string }>
  [key: string]: any
}

// Helper per autenticar-se amb Service Account
async function authenticate() {
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

  const auth     = await authenticate()
  const calendar = google.calendar({ version: 'v3', auth })

  const events: CalendarEvent[] = []
  let pageToken: string | undefined

  do {
    const resp = await calendar.events.list({
      calendarId,
      timeMin:      from,
      timeMax:      to,
      singleEvents: true,
      orderBy:      'startTime',
      maxResults:   2500,
      pageToken,
      // Camps bàsics per al llistat (no cal attachments aquí)
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

  const auth     = await authenticate()
  const calendar = google.calendar({ version: 'v3', auth })
  try {
    const resp = await calendar.events.get({
      calendarId,
      eventId: id,
      // 👇 AFEGIT: attachments(fileUrl,title,mimeType)
      fields: 'id,summary,description,location,start,end,extendedProperties,attachments(fileUrl,title,mimeType)',
    } as calendar_v3.Params$Resource$Events$Get)

    return (resp.data as CalendarEvent) || null
  } catch (e: any) {
    if (e.code === 404) return null
    // Fallback sense "fields" per a debug si algun calendari no admet filtre de camps
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
