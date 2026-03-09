'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FileText, Flag, Save, TriangleAlert, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { normalizeRole } from '@/lib/roles'

type ResponsibleOption = {
  id: string
  name: string
  role?: string
}

type CreateProjectData = {
  name: string
  sponsor: string
  owner: string
  context: string
  strategy: string
  risks: string
  startDate: string
  launchDate: string
  budget: string
  file: File | null
}

const todayKey = () => new Date().toISOString().slice(0, 10)

const emptyData: CreateProjectData = {
  name: '',
  sponsor: '',
  owner: '',
  context: '',
  strategy: '',
  risks: '',
  startDate: todayKey(),
  launchDate: '',
  budget: '',
  file: null,
}

export default function ProjectEditor() {
  const router = useRouter()
  const { data: session } = useSession()
  const [data, setData] = useState<CreateProjectData>(emptyData)
  const [responsibles, setResponsibles] = useState<ResponsibleOption[]>([])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  useEffect(() => {
    const sessionUserName = String(session?.user?.name || '').trim()
    if (!sessionUserName) return

    setData((current) =>
      current.sponsor === sessionUserName || current.sponsor.trim()
        ? current
        : { ...current, sponsor: sessionUserName }
    )
  }, [session?.user?.name])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        if (!res.ok) throw new Error('No s han pogut carregar els usuaris')
        const users = (await res.json()) as Array<{ id: string; name?: string; role?: string }>
        const next = users
          .filter((user) => {
            const role = normalizeRole(user.role || '')
            return role === 'admin' || role === 'direccio' || role === 'cap'
          })
          .map((user) => ({
            id: user.id,
            name: String(user.name || '').trim(),
            role: normalizeRole(user.role || ''),
          }))
          .filter((user) => user.name)
          .sort((a, b) => a.name.localeCompare(b.name))

        if (!cancelled) setResponsibles(next)
      } catch {
        if (!cancelled) setResponsibles([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const ownerOptions = useMemo(() => {
    if (data.owner && !responsibles.some((item) => item.name === data.owner)) {
      return [{ id: 'current', name: data.owner }, ...responsibles]
    }
    return responsibles
  }, [data.owner, responsibles])

  const canContinue = Boolean(
    data.name.trim() &&
      data.owner.trim() &&
      data.context.trim() &&
      data.strategy.trim() &&
      data.launchDate
  )

  const setField = <K extends keyof CreateProjectData>(field: K, value: CreateProjectData[K]) => {
    setData((current) => ({ ...current, [field]: value }))
  }

  const buildForm = (status: 'draft' | 'definition') => {
    const form = new FormData()
    form.set('name', data.name)
    form.set('sponsor', data.sponsor)
    form.set('owner', data.owner)
    form.set('context', data.context)
    form.set('strategy', data.strategy)
    form.set('risks', data.risks)
    form.set('startDate', data.startDate)
    form.set('launchDate', data.launchDate)
    form.set('budget', data.budget)
    form.set('phase', status === 'draft' ? 'initial' : 'definition')
    form.set('status', status)
    if (data.file) form.set('file', data.file)
    return form
  }

  const createProject = async (status: 'draft' | 'definition') => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      body: buildForm(status),
    })
    const payload = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
    if (!res.ok || !payload.id) {
      throw new Error(payload.error || 'No s ha pogut crear el projecte')
    }
    return payload.id
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      setFeedback(null)
      await createProject('draft')
      setFeedback({ type: 'success', message: 'Esborrany guardat correctament.' })
      toast({ title: 'Esborrany guardat' })
      router.replace('/menu/projects')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error guardant el projecte'
      setFeedback({ type: 'error', message })
      toast({ title: 'Error guardant el projecte', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    try {
      setSaving(true)
      setFeedback(null)
      const id = await createProject('definition')
      setFeedback({ type: 'success', message: 'Projecte creat correctament.' })
      toast({ title: 'Projecte creat' })
      router.replace(`/menu/projects/${id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error guardant el projecte'
      setFeedback({ type: 'error', message })
      toast({ title: 'Error guardant el projecte', description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-violet-200 bg-white shadow-sm">
        <div className="border-b border-violet-200 bg-gradient-to-r from-violet-50 via-white to-violet-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Fitxa inicial</h1>
              <p className="text-sm text-slate-500">Creacio del projecte i definicio base.</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6">
          <div className="grid gap-6 2xl:grid-cols-[1.45fr_0.55fr]">
            <section className="space-y-5 rounded-[24px] border border-violet-200 bg-violet-50/40 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                  <Flag className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Base del projecte</h2>
                  <p className="text-sm text-slate-500">La fitxa obligatoria per arrencar.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-name">Nom del projecte</Label>
                <Input
                  id="project-name"
                  value={data.name}
                  onChange={(event) => setField('name', event.target.value)}
                  placeholder="Nom del projecte"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-sponsor">Responsable impulsor</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="project-sponsor"
                      className="pl-10"
                      value={data.sponsor}
                      readOnly
                      placeholder="Nom i cognoms"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Responsable del projecte</Label>
                  <Select value={data.owner || undefined} onValueChange={(value) => setField('owner', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {ownerOptions.map((option) => (
                        <SelectItem key={`${option.id}-${option.name}`} value={option.name}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-context">Definicio del projecte</Label>
                <Textarea
                  id="project-context"
                  value={data.context}
                  onChange={(event) => setField('context', event.target.value)}
                  placeholder="Context, necessitat i definicio inicial"
                  className="min-h-[140px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-strategy">Objectius estrategics</Label>
                <Textarea
                  id="project-strategy"
                  value={data.strategy}
                  onChange={(event) => setField('strategy', event.target.value)}
                  placeholder="Objectius i alineacio amb empresa"
                  className="min-h-[120px]"
                />
              </div>
            </section>

            <div className="space-y-5">
              <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <TriangleAlert className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Avaluacio inicial</h2>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-risks">Riscos identificats</Label>
                  <Textarea
                    id="project-risks"
                    value={data.risks}
                    onChange={(event) => setField('risks', event.target.value)}
                    placeholder="Principals riscos"
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-start-date">Data inici prevista</Label>
                    <Input
                      id="project-start-date"
                      type="date"
                      value={data.startDate}
                      onChange={(event) => setField('startDate', event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-launch-date">Data objectiu d arrencada</Label>
                    <Input
                      id="project-launch-date"
                      type="date"
                      value={data.launchDate}
                      onChange={(event) => setField('launchDate', event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-budget">Pressupost orientatiu</Label>
                  <Input
                    id="project-budget"
                    value={data.budget}
                    onChange={(event) => setField('budget', event.target.value)}
                    placeholder="Ex: 120000 EUR"
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Document inicial</h2>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-document">Document base o de suport</Label>
                  <Input
                    id="project-document"
                    type="file"
                    onChange={(event) => setField('file', event.target.files?.[0] || null)}
                  />
                </div>
              </section>
            </div>
          </div>

          {feedback ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'border border-red-200 bg-red-50 text-red-700'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Guardar esborrany
            </Button>
            <Button type="button" onClick={handleContinue} disabled={saving || !canContinue}>
              Continuar
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
