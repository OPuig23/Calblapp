// filename: src/app/api/torns/getTorns/route.ts
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { fetchAllTorns, type Torn } from '@/services/tornsService'
import { resolveWorkerAlias } from '@/services/userService.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function norm(s?: string | null): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function isISO(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}
function clampISO(s: string): string {
  if (!isISO(s)) return ''
  const y = Number(s.slice(0, 4))
  return y >= 2000 && y <= 2100 ? s : ''
}
function ensureOrdered(a: string, b: string): [string, string] {
  if (!a || !b) return ['', '']
  return a <= b ? [a, b] : [b, a]
}

type TokenLike = {
  role?: string
  department?: string
  name?: string
  user?: {
    role?: string
    department?: string
    name?: string
  }
}

type WorkerExpanded = Torn & {
  workerId?: string
  workerName?: string
  workerRole?: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = (await getToken({ req })) as TokenLike | null

    const roleRaw = norm(token?.role || token?.user?.role || '')
    const role: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador' =
      roleRaw?.startsWith('admin')
        ? 'Admin'
        : roleRaw?.includes('dire')
        ? 'Direcció'
        : roleRaw?.includes('cap')
        ? 'Cap Departament'
        : 'Treballador'

    const sessionDept = norm(token?.department || token?.user?.department || '')
    const userName = String(token?.name || token?.user?.name || '')

    // Dates
    const rawStart = clampISO(searchParams.get('start') || '')
    const rawEnd = clampISO(searchParams.get('end') || '')
    const [start, end] = ensureOrdered(rawStart, rawEnd)
    if (!start || !end) {
      return Response.json({ ok: false, error: 'Missing or invalid start/end' }, { status: 400 })
    }

    // Params addicionals
    const departmentIn = searchParams.get('department') || ''
    const department = norm(departmentIn)
    const roleTypeParam = (searchParams.get('roleType') as
      | 'treballador'
      | 'conductor'
      | 'responsable'
      | 'all'
      | null) || null
    const workerIdParam = searchParams.get('workerId') || ''
    const workerNameParam = searchParams.get('workerName') || ''

    // ── Crida al servei (segons rol)
    const torns = await fetchAllTorns(
      start,
      end,
      role,
      role === 'Treballador' || role === 'Cap Departament'
        ? sessionDept
        : department || null,
      role === 'Treballador' ? userName : undefined
    )

    // ── META
    const depSet = new Set<string>()
    const workerMap = new Map<string, { id?: string; name: string; role?: string }>()
    for (const t of torns) {
      if (t.department) depSet.add(norm(t.department))
      const arr = t.__rawWorkers
      if (Array.isArray(arr)) {
        for (const w of arr) {
          const id = w?.id ? String(w.id) : undefined
          const name = w?.name ? String(w.name) : ''
          const role = w?.role ? String(w.role) : undefined
          const key = id ? `id:${id}` : `name:${norm(name)}`
          if (!workerMap.has(key)) workerMap.set(key, { id, name, role })
        }
      }
    }
    const meta = {
      departments: Array.from(depSet).sort((a, b) => a.localeCompare(b, 'ca')),
      workers: Array.from(workerMap.values()).filter((w) => w.name),
    }

    // ── DATA
    let data: WorkerExpanded[] = torns

    // Explosió per treballador només si NO és Treballador
    if (role !== 'Treballador') {
      console.log('[getTorns] abans flatMap → torns:', torns.length)

      data = data.flatMap((t: Torn) => {
        if (!Array.isArray(t.__rawWorkers) || !t.__rawWorkers.length) return [t]

        const expanded: WorkerExpanded[] = t.__rawWorkers.map((w) => {
          const obj: WorkerExpanded = {
            ...t,
            id: `${t.id}:${w.id || norm(w.name)}`,
            workerId: w.id || norm(w.name),
            workerName: w.name,
            workerRole: w.role ? norm(w.role) : 'treballador',
            startTime: w.startTime || '',
            endTime: w.endTime || '',
            meetingPoint: w.meetingPoint || t.meetingPoint,
            department: w.department || t.department || 'Sense departament',
          }

          // 🔎 log per validar que role i departament es conserven
          console.log('[getTorns] expand worker', {
            event: t.eventName,
            worker: w.name,
            originalRole: w.role,
            resultRole: obj.workerRole,
            originalDept: w.department || t.department,
            finalDept: obj.department,
          })

          return obj
        })

        return expanded
      })

      console.log('[getTorns] després flatMap → data:', data.length)
    }

    // ── 1) Filtre roleType
    if (roleTypeParam && roleTypeParam !== 'all') {
      const rt = norm(roleTypeParam)
      data = data.filter((t) => norm(t.workerRole || '') === rt)
    }

    // ── 2) Filtre workerId / workerName
    const wantsWorkerFilter =
      (workerIdParam && workerIdParam !== '__all__') ||
      (workerNameParam && workerNameParam !== '__all__')

    if (wantsWorkerFilter) {
      const aliasSet = new Set<string>()
      const push = (s?: string) => { if (s) aliasSet.add(norm(s)) }

      push(workerIdParam)
      push(workerNameParam)

      try {
        const alias = await resolveWorkerAlias(workerIdParam || workerNameParam || '')
        if (alias?.name) push(alias.name)
        if (Array.isArray(alias?.aliases)) alias.aliases.forEach(push)
      } catch (e) {
        console.warn('[API/getTorns] resolveWorkerAlias error (ignored):', e)
      }

      data = data.filter((t) => {
        if (role === 'Treballador') {
          return t.workerName && aliasSet.has(norm(t.workerName))
        }
        return (
          (t.workerId && aliasSet.has(norm(t.workerId))) ||
          (t.workerName && aliasSet.has(norm(t.workerName)))
        )
      })
    }

    return Response.json({ ok: true, data, meta }, { status: 200 })
  } catch (err: unknown) {
    console.error('[api/torns/getTorns] error:', err)
    return Response.json({ ok: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
