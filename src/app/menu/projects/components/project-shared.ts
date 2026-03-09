export const PROJECT_DEPARTMENTS = [
  'Empresa',
  'Compres',
  'Comptabilitat',
  'Administracio',
  'Restauracio',
  'Marqueting',
  'Manteniment',
  'Decoracio',
  'Recursos Humans',
  'Serveis',
  'Logistica',
  'Cuina',
  'Cuina del Felix',
  'Food Lover',
  'FDLC',
  'Qualitat',
  'Produccio',
  'Casaments',
  'Transports',
] as const

export const PROJECT_PHASE_OPTIONS = [
  { value: 'initial', label: 'Inicial' },
  { value: 'definition', label: 'Definicio' },
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'planning', label: 'Planificacio' },
  { value: 'execution', label: 'Execucio' },
  { value: 'control', label: 'Control' },
  { value: 'evaluation', label: 'Avaluacio' },
  { value: 'closed', label: 'Tancat' },
] as const

export const PROJECT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Esborrany' },
  { value: 'definition', label: 'En definicio' },
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'planning', label: 'En planificacio' },
  { value: 'execution', label: 'En execucio' },
  { value: 'control', label: 'En control' },
  { value: 'evaluation', label: 'En avaluacio' },
  { value: 'closed', label: 'Tancat' },
] as const

export const BLOCK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendent' },
  { value: 'in_progress', label: 'En curs' },
  { value: 'blocked', label: 'Bloquejat' },
  { value: 'overdue', label: 'En retard' },
  { value: 'done', label: 'Fet' },
] as const

export const TASK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendent' },
  { value: 'in_progress', label: 'En curs' },
  { value: 'blocked', label: 'Bloquejada' },
  { value: 'done', label: 'Feta' },
] as const

export const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
] as const

export type ProjectTask = {
  id: string
  title: string
  description?: string
  department?: string
  owner: string
  deadline: string
  dependsOn: string
  cost?: string
  priority: string
  status: string
  documents?: ProjectDocument[]
}

export type ProjectBlock = {
  id: string
  name: string
  summary: string
  department: string
  departments: string[]
  owner: string
  deadline: string
  budget: string
  dependsOn: string
  status: string
  tasks: ProjectTask[]
}

export type ProjectDocument = {
  id?: string
  category?: string
  label?: string
  name?: string
  path?: string
  url?: string
  size?: number
  type?: string
} | null

export type ProjectRoom = {
  id: string
  name: string
  kind: 'block' | 'manual'
  blockId?: string
  opsChannelId?: string
  opsChannelName?: string
  opsChannelSource?: 'projects'
  opsSyncedAt?: number
  departments: string[]
  participants: string[]
  participantDetails?: Array<{
    name: string
    department?: string
    role?: string
  }>
  notes?: string
  documents?: ProjectDocument[]
  messages?: Array<{
    id: string
    author: string
    text: string
    createdAt: number
  }>
}

export const PROJECT_DOCUMENT_CATEGORIES = [
  { value: 'initial', label: 'Document inicial' },
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'general', label: 'Projecte general' },
  { value: 'block', label: 'Blocs' },
  { value: 'other', label: 'Altres' },
] as const

export type KickoffAttendee = {
  key: string
  department: string
  userId: string
  name: string
  email: string
  attended?: boolean
}

export type KickoffData = {
  date: string
  startTime: string
  durationMinutes: number
  notes: string
  minutes: string
  minutesStatus?: 'open' | 'closed'
  minutesAuthor?: string
  minutesClosedAt?: string
  minutesUpdatedAt?: string
  excludedKeys: string[]
  attendees: KickoffAttendee[]
  status?: string
  graphWebLink?: string
  emailNotificationStatus?: 'sent' | 'failed'
  emailNotificationError?: string
}

export type ProjectData = {
  id: string
  name: string
  sponsor: string
  owner: string
  ownerUserId?: string
  createdById?: string
  context: string
  strategy: string
  risks: string
  startDate: string
  launchDate: string
  budget: string
  departments: string[]
  phase: string
  status: string
  blocks: ProjectBlock[]
  rooms: ProjectRoom[]
  document: ProjectDocument
  documents: ProjectDocument[]
  kickoff: KickoffData
}

export const EMPTY_KICKOFF: KickoffData = {
  date: '',
  startTime: '',
  durationMinutes: 60,
  notes: '',
  minutes: '',
  minutesStatus: 'open',
  minutesAuthor: '',
  minutesClosedAt: '',
  minutesUpdatedAt: '',
  excludedKeys: [],
  attendees: [],
  status: '',
  graphWebLink: '',
}

export const statusLabel = (status?: string) =>
  PROJECT_STATUS_OPTIONS.find((item) => item.value === status)?.label || status || 'Sense estat'

export const phaseLabel = (phase?: string) =>
  PROJECT_PHASE_OPTIONS.find((item) => item.value === phase)?.label || phase || 'Inicial'

export const deriveBlockStatus = (
  block: Pick<ProjectBlock, 'tasks'> & Partial<Pick<ProjectBlock, 'status'>>
) => {
  const tasks = Array.isArray(block.tasks) ? block.tasks : []
  if (tasks.length === 0) return block.status || 'pending'
  if (tasks.some((task) => task.status === 'blocked')) return 'blocked'
  if (tasks.every((task) => task.status === 'done')) return 'done'
  const deadline = String((block as Partial<ProjectBlock>).deadline || '').trim()
  if (deadline) {
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (deadline <= todayKey) return 'overdue'
  }
  if (tasks.some((task) => task.status === 'in_progress' || task.status === 'done')) return 'in_progress'
  return 'in_progress'
}

export const deriveProjectPhase = (project: Pick<ProjectData, 'kickoff' | 'blocks' | 'launchDate'>) => {
  const blocks = Array.isArray(project.blocks) ? project.blocks : []
  const allTasks = blocks.flatMap((block) => block.tasks || [])
  const normalizedBlocks = blocks.map((block) => ({
    ...block,
    status: deriveBlockStatus(block),
  }))
  const launchDateRaw = String(project.launchDate || '').trim()
  const launchDate = launchDateRaw
    ? new Date(launchDateRaw.length === 10 ? `${launchDateRaw}T00:00:00` : launchDateRaw)
    : null
  const launchPlus24h =
    launchDate && !Number.isNaN(launchDate.getTime())
      ? launchDate.getTime() + 24 * 60 * 60 * 1000
      : null
  const hasKickoffSignal = Boolean(
    project.kickoff?.status ||
      project.kickoff?.date ||
      project.kickoff?.startTime ||
      (project.kickoff?.attendees || []).length
  )
  const hasBlocks = normalizedBlocks.length > 0
  const hasTasks = allTasks.length > 0
  const allBlocksDone = hasBlocks && normalizedBlocks.every((block) => block.status === 'done')
  const allTasksDone = hasTasks && allTasks.every((task) => task.status === 'done')
  const hasExecutionSignal =
    normalizedBlocks.some((block) => ['in_progress', 'blocked', 'done'].includes(block.status)) ||
    allTasks.some((task) => ['in_progress', 'blocked', 'done'].includes(task.status))

  if (launchPlus24h && Date.now() >= launchPlus24h) return 'closed'
  if ((hasBlocks || hasTasks) && allBlocksDone && (!hasTasks || allTasksDone)) return 'closed'
  if (hasExecutionSignal) return 'execution'
  if (hasBlocks || hasTasks) return 'planning'
  if (hasKickoffSignal) return 'kickoff'
  return 'definition'
}

export const parseProjectCost = (value?: string | number | null) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value || '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export const formatProjectCost = (value: number) => {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace('.', ',')
}

export const sumTaskCosts = (tasks?: ProjectTask[]) =>
  (tasks || []).reduce((sum, task) => sum + parseProjectCost(task.cost), 0)

export const formatProjectDate = (value?: string | number | null) => {
  if (typeof value === 'number') {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Sense data'
    return date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const raw = String(value || '').trim()
  if (!raw) return 'Sense data'

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw

  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw)
  if (Number.isNaN(date.getTime())) return raw

  return date.toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const getBlockDepartments = (block: Pick<ProjectBlock, 'department' | 'departments'>) => {
  const next = Array.isArray(block.departments) ? block.departments.filter(Boolean) : []
  if (next.length > 0) return [...new Set(next)]
  return block.department ? [block.department] : []
}

export const getPrimaryBlockDepartment = (block: Pick<ProjectBlock, 'department' | 'departments'>) =>
  getBlockDepartments(block)[0] || ''

export const getPreLaunchDeadline = (launchDate?: string | null) => {
  const raw = String(launchDate || '').trim()
  if (!raw) return ''
  const base = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw)
  if (Number.isNaN(base.getTime())) return ''
  const previousDay = new Date(base)
  previousDay.setDate(previousDay.getDate() - 1)
  return previousDay.toISOString().slice(0, 10)
}

export const clampProjectDeadline = (value: string, launchDate?: string | null) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const max = getPreLaunchDeadline(launchDate)
  if (!max) return raw
  return raw > max ? max : raw
}
