import { getGraphToken } from '@/services/sharepoint/graph'

type KickoffAttendee = {
  email: string
  name?: string
}

type CreateKickoffEventInput = {
  organizerEmail: string
  subject: string
  startDateTime: string
  endDateTime: string
  notes?: string
  attendees: KickoffAttendee[]
  projectName: string
}

type GraphEventResponse = {
  id?: string
  webLink?: string
  onlineMeeting?: {
    joinUrl?: string
  }
}

export async function createKickoffCalendarEvent(input: CreateKickoffEventInput) {
  const tokenData = await getGraphToken()
  const accessToken =
    typeof tokenData === 'string' ? tokenData : tokenData.access_token

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(input.organizerEmail)}/events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subject: input.subject,
        body: {
          contentType: 'HTML',
          content: buildKickoffHtml(input.projectName, input.notes),
        },
        start: {
          dateTime: input.startDateTime,
          timeZone: 'Europe/Madrid',
        },
        end: {
          dateTime: input.endDateTime,
          timeZone: 'Europe/Madrid',
        },
        attendees: input.attendees.map((attendee) => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name || attendee.email,
          },
          type: 'required',
        })),
        isReminderOn: true,
        allowNewTimeProposals: true,
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No s ha pogut crear la convocatoria Outlook: ${response.status} ${text}`)
  }

  const data = (await response.json()) as GraphEventResponse
  return {
    id: data.id || '',
    webLink: data.webLink || '',
    joinUrl: data.onlineMeeting?.joinUrl || '',
  }
}

function buildKickoffHtml(projectName: string, notes?: string) {
  const extra = notes?.trim()
    ? `<p><strong>Notes:</strong><br/>${escapeHtml(notes).replace(/\n/g, '<br/>')}</p>`
    : ''

  return `
    <p>Convocatoria de kickoff del projecte <strong>${escapeHtml(projectName || 'Projecte')}</strong>.</p>
    ${extra}
    <p>Revisarem objectius, abast, responsables i seguents passos.</p>
  `
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
