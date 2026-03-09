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

type ProjectRecipient = {
  email: string
  name?: string
}

type SendBlockAssignmentEmailInput = {
  senderEmail: string
  recipient: ProjectRecipient
  projectName: string
  blockName: string
  deadline?: string
}

type CreateBlockDeadlineEventInput = {
  assigneeEmail: string
  projectName: string
  blockName: string
  deadline: string
}

type SendTaskAssignmentEmailInput = {
  senderEmail: string
  recipient: ProjectRecipient
  projectName: string
  blockName: string
  taskName: string
  deadline?: string
}

type CreateTaskDeadlineEventInput = {
  assigneeEmail: string
  projectName: string
  blockName: string
  taskName: string
  deadline: string
}

type SendProjectMissedActivityEmailInput = {
  senderEmail: string
  recipient: ProjectRecipient
  channelName: string
  projectName?: string
  roomName?: string
  messageCount: number
  messages: Array<{
    senderName?: string
    body?: string
    createdAt?: number
  }>
  url?: string
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

export async function sendBlockAssignmentEmail(input: SendBlockAssignmentEmailInput) {
  const recipientEmail = String(input.recipient.email || '').trim()
  const senderEmail = String(input.senderEmail || '').trim()
  if (!recipientEmail || !senderEmail) return

  const accessToken = await getAccessToken()
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          subject: `Assignacio de bloc · ${input.blockName || 'Bloc'} · ${input.projectName || 'Projecte'}`,
          body: {
            contentType: 'HTML',
            content: buildBlockAssignmentEmailHtml(input),
          },
          toRecipients: [
            {
              emailAddress: {
                address: recipientEmail,
                name: input.recipient.name || recipientEmail,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No s ha pogut enviar el correu d assignacio de bloc: ${response.status} ${text}`)
  }
}

export async function createBlockDeadlineCalendarEvent(input: CreateBlockDeadlineEventInput) {
  const deadline = String(input.deadline || '').trim()
  const assigneeEmail = String(input.assigneeEmail || '').trim()
  if (!deadline || !assigneeEmail) return

  const accessToken = await getAccessToken()
  const endDate = addOneDay(deadline)
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(assigneeEmail)}/events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subject: `Entrega bloc · ${input.blockName || 'Bloc'} · ${input.projectName || 'Projecte'}`,
        body: {
          contentType: 'HTML',
          content: buildBlockDeadlineEventHtml(input.projectName, input.blockName, deadline),
        },
        start: {
          dateTime: `${deadline}T00:00:00`,
          timeZone: 'Europe/Madrid',
        },
        end: {
          dateTime: `${endDate}T00:00:00`,
          timeZone: 'Europe/Madrid',
        },
        isAllDay: true,
        isReminderOn: true,
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No s ha pogut crear l entrega al calendari: ${response.status} ${text}`)
  }
}

export async function sendTaskAssignmentEmail(input: SendTaskAssignmentEmailInput) {
  const recipientEmail = String(input.recipient.email || '').trim()
  const senderEmail = String(input.senderEmail || '').trim()
  if (!recipientEmail || !senderEmail) return

  const accessToken = await getAccessToken()
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          subject: `Assignacio de tasca · ${input.taskName || 'Tasca'} · ${input.projectName || 'Projecte'}`,
          body: {
            contentType: 'HTML',
            content: buildTaskAssignmentEmailHtml(input),
          },
          toRecipients: [
            {
              emailAddress: {
                address: recipientEmail,
                name: input.recipient.name || recipientEmail,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No s ha pogut enviar el correu d assignacio de tasca: ${response.status} ${text}`)
  }
}

export async function createTaskDeadlineCalendarEvent(input: CreateTaskDeadlineEventInput) {
  const deadline = String(input.deadline || '').trim()
  const assigneeEmail = String(input.assigneeEmail || '').trim()
  if (!deadline || !assigneeEmail) return

  const accessToken = await getAccessToken()
  const endDate = addOneDay(deadline)
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(assigneeEmail)}/events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subject: `Entrega tasca · ${input.taskName || 'Tasca'} · ${input.projectName || 'Projecte'}`,
        body: {
          contentType: 'HTML',
          content: buildTaskDeadlineEventHtml(input.projectName, input.blockName, input.taskName, deadline),
        },
        start: {
          dateTime: `${deadline}T00:00:00`,
          timeZone: 'Europe/Madrid',
        },
        end: {
          dateTime: `${endDate}T00:00:00`,
          timeZone: 'Europe/Madrid',
        },
        isAllDay: true,
        isReminderOn: true,
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No s ha pogut crear l entrega de tasca al calendari: ${response.status} ${text}`)
  }
}

export async function sendProjectMissedActivityEmail(input: SendProjectMissedActivityEmailInput) {
  const recipientEmail = String(input.recipient.email || '').trim()
  const senderEmail = String(input.senderEmail || '').trim()
  if (!recipientEmail || !senderEmail || input.messageCount <= 0) return

  const accessToken = await getAccessToken()
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          subject: `Activitat pendent · ${input.channelName || input.projectName || 'Projectes'}`,
          body: {
            contentType: 'HTML',
            content: buildProjectMissedActivityEmailHtml(input),
          },
          toRecipients: [
            {
              emailAddress: {
                address: recipientEmail,
                name: input.recipient.name || recipientEmail,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`No s ha pogut enviar el correu resum del canal: ${response.status} ${text}`)
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

function buildBlockAssignmentEmailHtml(params: SendBlockAssignmentEmailInput) {
  const deadlineLabel = params.deadline ? formatBarcelonaDate(params.deadline) : 'Sense data'

  return `
    <p>Se t'ha assignat la responsabilitat del bloc <strong>${escapeHtml(params.blockName || 'Bloc')}</strong>.</p>
    <p><strong>Projecte:</strong> ${escapeHtml(params.projectName || 'Projecte')}</p>
    <p><strong>Data limit:</strong> ${escapeHtml(deadlineLabel)}</p>
    <p>També s'ha afegit l'entrega al teu calendari d'Outlook.</p>
  `
}

function buildBlockDeadlineEventHtml(projectName: string, blockName: string, deadline: string) {
  return `
    <p>Entrega prevista del bloc <strong>${escapeHtml(blockName || 'Bloc')}</strong>.</p>
    <p><strong>Projecte:</strong> ${escapeHtml(projectName || 'Projecte')}</p>
    <p><strong>Data limit:</strong> ${escapeHtml(formatBarcelonaDate(deadline))}</p>
  `
}

function buildTaskAssignmentEmailHtml(params: SendTaskAssignmentEmailInput) {
  const deadlineLabel = params.deadline ? formatBarcelonaDate(params.deadline) : 'Sense data'

  return `
    <p>Se t'ha assignat la responsabilitat de la tasca <strong>${escapeHtml(params.taskName || 'Tasca')}</strong>.</p>
    <p><strong>Projecte:</strong> ${escapeHtml(params.projectName || 'Projecte')}</p>
    <p><strong>Bloc:</strong> ${escapeHtml(params.blockName || 'Bloc')}</p>
    <p><strong>Data limit:</strong> ${escapeHtml(deadlineLabel)}</p>
    <p>També s'ha afegit l'entrega al teu calendari d'Outlook.</p>
  `
}

function buildTaskDeadlineEventHtml(projectName: string, blockName: string, taskName: string, deadline: string) {
  return `
    <p>Entrega prevista de la tasca <strong>${escapeHtml(taskName || 'Tasca')}</strong>.</p>
    <p><strong>Projecte:</strong> ${escapeHtml(projectName || 'Projecte')}</p>
    <p><strong>Bloc:</strong> ${escapeHtml(blockName || 'Bloc')}</p>
    <p><strong>Data limit:</strong> ${escapeHtml(formatBarcelonaDate(deadline))}</p>
  `
}

function buildProjectMissedActivityEmailHtml(input: SendProjectMissedActivityEmailInput) {
  const lines = input.messages
    .slice(0, 6)
    .map((message) => {
      const sender = escapeHtml(message.senderName || 'Usuari')
      const body = escapeHtml((message.body || '').trim() || 'Missatge sense text')
      const at = formatDisplayDateTime(message.createdAt)
      return `<li style="margin:0 0 10px"><strong>${sender}</strong>${at ? ` · ${at}` : ''}<br/>${body}</li>`
    })
    .join('')

  const context = [input.projectName, input.roomName].filter(Boolean).join(' · ')
  const cta = input.url
    ? `<p style="margin:18px 0 0"><a href="${escapeHtml(input.url)}" style="display:inline-block;padding:10px 14px;background:#6d28d9;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Obrir canal</a></p>`
    : ''

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;line-height:1.45">
      <p style="margin:0 0 12px">Tens <strong>${input.messageCount}</strong> missatge${input.messageCount === 1 ? '' : 's'} pendent${input.messageCount === 1 ? '' : 's'} al canal <strong>${escapeHtml(input.channelName || 'Projectes')}</strong>.</p>
      ${context ? `<p style="margin:0 0 12px;color:#475569">${escapeHtml(context)}</p>` : ''}
      <ul style="padding-left:18px;margin:0">${lines}</ul>
      ${cta}
    </div>
  `
}

function formatDisplayDateTime(value?: number) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function formatBarcelonaDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ca-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function addOneDay(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
