import {
  Blocks,
  CalendarDays,
  FileText,
  FolderOpen,
  LayoutDashboard,
  TimerReset,
  UsersRound,
} from 'lucide-react'

export type WorkspaceTab =
  | 'overview'
  | 'kickoff'
  | 'blocks'
  | 'tasks'
  | 'documents'
  | 'rooms'
  | 'tracking'

export type ResponsibleOption = {
  id: string
  name: string
  role: string
  email: string
  department: string
}

export const workspaceTabs: Array<{
  id: WorkspaceTab
  label: string
  icon: typeof LayoutDashboard
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'kickoff', label: 'Kickoff', icon: CalendarDays },
  { id: 'blocks', label: 'Blocs', icon: Blocks },
  { id: 'tasks', label: 'Tasques', icon: TimerReset },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'rooms', label: 'Sales', icon: UsersRound },
  { id: 'tracking', label: 'Seguiment', icon: FolderOpen },
]

export const createBlockDraft = () => ({
  name: '',
  summary: '',
  department: '',
  owner: '',
  deadline: '',
  dependsOn: 'none',
  status: 'pending',
})

export const createTaskDraft = () => ({
  blockId: 'none',
  title: '',
  owner: '',
  deadline: '',
  dependsOn: 'none',
  priority: 'normal',
  status: 'pending',
})

export const normalizeDepartment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export const priorityBadgeClass = (priority: string) => {
  if (priority === 'critical') return 'bg-rose-100 text-rose-700'
  if (priority === 'high') return 'bg-amber-100 text-amber-800'
  if (priority === 'low') return 'bg-slate-100 text-slate-700'
  return 'bg-violet-100 text-violet-700'
}
