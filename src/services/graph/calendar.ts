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

type SendKickoffNotificationEmailInput = {
  organizerEmail: string
  recipients: KickoffAttendee[]
  subject: string
  projectName: string
  startDateTime: string
  endDateTime: string
  notes?: string
}

async function getAccessToken() {
  const tokenData = await getGraphToken()
  return typeof tokenData === 'string' ? tokenData : tokenData.access_token
}

export async function createKickoffCalendarEvent(input: CreateKickoffEventInput) {
  const accessToken = await getAccessToken()

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

export async function sendKickoffNotificationEmail(input: SendKickoffNotificationEmailInput) {
  const accessToken = await getAccessToken()
  const recipients = input.recipients
    .map((attendee) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name || attendee.email,
      },
    }))
    .filter((recipient) => recipient.emailAddress.address.includes('@'))

  if (recipients.length === 0) return

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(input.organizerEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: {
            contentType: 'HTML',
            content: buildKickoffEmailHtml({
              projectName: input.projectName,
              startDateTime: input.startDateTime,
              endDateTime: input.endDateTime,
              notes: input.notes,
            }),
          },
          toRecipients: recipients,
        },
        saveToSentItems: true,
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No s ha pogut enviar el correu de convocatoria: ${response.status} ${text}`)
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

function buildKickoffEmailHtml(params: {
  projectName: string
  startDateTime: string
  endDateTime: string
  notes?: string
}) {
  const { projectName, startDateTime, endDateTime, notes } = params
  const start = formatBarcelonaDateTime(startDateTime)
  const end = formatBarcelonaDateTime(endDateTime)
  const extra = notes?.trim()
    ? `<p><strong>Notes convocatoria:</strong><br/>${escapeHtml(notes).replace(/\n/g, '<br/>')}</p>`
    : ''

  return `
    <p>S'ha convocat el kickoff del projecte <strong>${escapeHtml(projectName || 'Projecte')}</strong>.</p>
    <p><strong>Data i hora:</strong> ${escapeHtml(start)} - ${escapeHtml(end)}</p>
    ${extra}
    <p>Rebreu tambe la invitacio de calendari d'Outlook per poder acceptar o rebutjar la reunio.</p>
  `
}

function formatBarcelonaDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ca-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
