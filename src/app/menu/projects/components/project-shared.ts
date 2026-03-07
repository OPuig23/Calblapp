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
  owner: string
  deadline: string
  dependsOn: string
  priority: string
  status: string
}

export type ProjectBlock = {
  id: string
  name: string
  summary: string
  department: string
  owner: string
  deadline: string
  dependsOn: string
  status: string
  tasks: ProjectTask[]
}

export type ProjectDocument = {
  name?: string
  path?: string
  url?: string
  size?: number
  type?: string
} | null

export type KickoffAttendee = {
  key: string
  department: string
  userId: string
  name: string
  email: string
}

export type KickoffData = {
  date: string
  startTime: string
  durationMinutes: number
  notes: string
  excludedKeys: string[]
  attendees: KickoffAttendee[]
  status?: string
  graphWebLink?: string
}

export type ProjectData = {
  id: string
  name: string
  sponsor: string
  owner: string
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
  document: ProjectDocument
  kickoff: KickoffData
}

export const EMPTY_KICKOFF: KickoffData = {
  date: '',
  startTime: '',
  durationMinutes: 60,
  notes: '',
  excludedKeys: [],
  attendees: [],
  status: '',
  graphWebLink: '',
}

export const statusLabel = (status?: string) =>
  PROJECT_STATUS_OPTIONS.find((item) => item.value === status)?.label || status || 'Sense estat'

export const phaseLabel = (phase?: string) =>
  PROJECT_PHASE_OPTIONS.find((item) => item.value === phase)?.label || phase || 'Inicial'
