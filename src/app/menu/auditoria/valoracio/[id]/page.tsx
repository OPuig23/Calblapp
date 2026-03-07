'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, RotateCcw, Save, XCircle } from 'lucide-react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type DetailAnswer = {
  itemId?: string
  type?: 'checklist' | 'rating' | 'photo' | string
  value?: boolean | number | string | null
  photos?: Array<{ url?: string; path?: string }>
}

type DetailBlock = {
  id?: string
  title?: string
  weight?: number
  items?: Array<{ id?: string; label?: string; type?: string }>
}

type ReviewBlockCheck = {
  blockId: string
  isValid: boolean
}

type ExecutionDetail = {
  id: string
  eventId: string
  eventSummary?: string
  department: string
  templateName?: string
  status: string
  notes?: string | null
  auditAnswers?: DetailAnswer[]
  templateBlocks?: DetailBlock[]
  completedAt?: number
  completedByName?: string
  reviewedAt?: number
  reviewedByName?: string
  reviewNote?: string | null
  reviewBlockChecks?: ReviewBlockCheck[]
}

const formatDate = (ts?: number) => {
  const d = new Date(Number(ts || 0))
  if (Number.isNaN(d.getTime()) || ts === 0) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

export default function AuditoriaValoracioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const executionId = String((params as Record<string, string> | null)?.id || '')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<ExecutionDetail | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [blockChecks, setBlockChecks] = useState<Record<string, boolean | null>>({})
  const [prevId, setPrevId] = useState<string | null>(null)
  const [nextId, setNextId] = useState<string | null>(null)

  const navQuery = useMemo(() => {
    const q = new URLSearchParams()
    const keys = ['fromTs', 'toTs', 'status', 'department', 'q']
    keys.forEach((key) => {
      const value = String(searchParams.get(key) || '').trim()
      if (value) q.set(key, value)
    })
    return q
  }, [searchParams])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/auditoria/executions/${executionId}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(json?.error || 'No s ha pogut carregar l auditoria'))
      const execution = (json?.execution || null) as ExecutionDetail | null
      setDetail(execution)
      setReviewNote(String(execution?.reviewNote || ''))

      const initialChecks: Record<string, boolean | null> = {}
      const reviewChecks = Array.isArray(execution?.reviewBlockChecks) ? execution.reviewBlockChecks : []
      reviewChecks.forEach((b) => {
        const blockId = String(b?.blockId || '').trim()
        if (!blockId || typeof b?.isValid !== 'boolean') return
        initialChecks[blockId] = b.isValid
      })
      setBlockChecks(initialChecks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error carregant auditoria')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!executionId) return
    load()
  }, [executionId])

  const loadNavigation = async () => {
    try {
      const qs = new URLSearchParams(navQuery.toString())
      qs.set('limit', '2000')
      const res = await fetch(`/api/auditoria/executions/list?${qs.toString()}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return
      const list = Array.isArray(json?.executions) ? (json.executions as Array<{ id?: string }>) : []
      const idx = list.findIndex((row) => String(row?.id || '') === executionId)
      if (idx < 0) {
        setPrevId(null)
        setNextId(null)
        return
      }
      setPrevId(idx > 0 ? String(list[idx - 1]?.id || '') || null : null)
      setNextId(idx < list.length - 1 ? String(list[idx + 1]?.id || '') || null : null)
    } catch {
      setPrevId(null)
      setNextId(null)
    }
  }

  useEffect(() => {
    if (!executionId) return
    loadNavigation()
  }, [executionId, navQuery])

  const allBlocksChecked = useMemo(() => {
    const blocks = Array.isArray(detail?.templateBlocks) ? detail.templateBlocks : []
    if (!blocks.length) return false
    return blocks.every((block, idx) => {
      const blockId = String(block?.id || `b-${idx + 1}`)
      return typeof blockChecks[blockId] === 'boolean'
    })
  }, [detail?.templateBlocks, blockChecks])

  const toggleBlockCheck = (blockId: string) => {
    setBlockChecks((prev) => {
      const current = prev[blockId]
      if (current === true) return { ...prev, [blockId]: false }
      return { ...prev, [blockId]: true }
    })
  }

  const saveValidation = async () => {
    if (!detail?.id || saving || !allBlocksChecked) return
    setSaving(true)
    setError('')
    try {
      const blocks = Array.isArray(detail.templateBlocks) ? detail.templateBlocks : []
      const payloadChecks = blocks.map((block, idx) => {
        const blockId = String(block?.id || `b-${idx + 1}`)
        return {
          blockId,
          isValid: blockChecks[blockId] === true,
        }
      })

      const res = await fetch(`/api/auditoria/executions/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: reviewNote,
          blockChecks: payloadChecks,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(json?.error || 'No s ha pogut desar la validacio'))

      setDetail((prev) => (prev ? { ...prev, status: String(json?.status || prev.status) } : prev))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desant validacio')
    } finally {
      setSaving(false)
    }
  }

  const reopenValidation = async () => {
    if (!detail?.id || saving) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/auditoria/executions/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(json?.error || 'No s ha pogut reobrir la validacio'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reobrint validacio')
    } finally {
      setSaving(false)
    }
  }

  const goToExecution = (targetId: string | null) => {
    if (!targetId) return
    const suffix = navQuery.toString()
    router.push(`/menu/auditoria/valoracio/${targetId}${suffix ? `?${suffix}` : ''}`)
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
        <ModuleHeader subtitle="Valoracio" />

        <Card className="space-y-6">
          {loading ? (
            <div className="text-sm text-gray-600">Carregant auditoria...</div>
          ) : !detail ? (
            <div className="text-sm text-gray-600">No s'ha trobat l'auditoria.</div>
          ) : (
            <>
              <header className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold text-gray-900 truncate">{detail.eventSummary || `Event ${detail.eventId}`}</h2>
                    <p className="text-sm text-gray-600">{detail.completedByName || '-'} - {formatDate(detail.completedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Auditoria anterior"
                      title="Auditoria anterior"
                      disabled={!prevId}
                      onClick={() => goToExecution(prevId)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Auditoria seguent"
                      title="Auditoria seguent"
                      disabled={!nextId}
                      onClick={() => goToExecution(nextId)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </header>

              {(detail.templateBlocks || []).map((block, bIdx) => {
                const blockId = String(block.id || `b-${bIdx + 1}`)
                const current = blockChecks[blockId]
                return (
                  <section key={blockId} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{block.title || `Bloc ${bIdx + 1}`}</h3>
                      <button
                        type="button"
                        disabled={detail.status !== 'completed'}
                        onClick={() => toggleBlockCheck(blockId)}
                        className="inline-flex items-center justify-center h-9 w-9 disabled:opacity-50"
                        title={current === false ? 'No validat' : current === true ? 'Validat' : 'Pendent'}
                      >
                        {current === false ? (
                          <XCircle className="w-6 h-6 text-red-600" />
                        ) : current === true ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-2 pl-1">
                      {(block.items || []).map((item, iIdx) => {
                        const answer = (detail.auditAnswers || []).find((a) => String(a.itemId || '') === String(item.id || ''))
                        const type = String(item.type || 'checklist')
                        const photos = Array.isArray(answer?.photos)
                          ? answer.photos.filter((p) => String(p?.url || '').trim())
                          : []

                        const value =
                          type === 'checklist'
                            ? answer?.value === true
                              ? 'Si'
                              : 'No'
                            : String(answer?.value ?? '-')

                        return (
                          <div key={String(item.id || iIdx)} className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">{item.label || `Item ${iIdx + 1}`}</div>
                            {type !== 'photo' && <div className="text-sm text-gray-700">Resposta: {value}</div>}
                            {type === 'photo' && photos.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                {photos.map((p, pIdx) => (
                                  <a key={`${blockId}-${iIdx}-${pIdx}`} href={String(p.url)} target="_blank" rel="noreferrer" className="block overflow-hidden hover:opacity-90">
                                    <img src={String(p.url)} alt={`Evidencia ${pIdx + 1}`} className="h-28 w-full object-cover rounded-md" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}

              <div className="space-y-2 pt-2">
                <textarea
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                  rows={4}
                  placeholder="Nota de validacio (opcional)"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  disabled={detail.status !== 'completed'}
                />
                <div className="flex justify-end">
                  {detail.status === 'completed' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Desar validacio"
                      aria-label="Desar validacio"
                      disabled={saving || !allBlocksChecked}
                      onClick={saveValidation}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reobrir validacio"
                      aria-label="Reobrir validacio"
                      disabled={saving}
                      onClick={reopenValidation}
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
        </Card>
      </div>
    </RoleGuard>
  )
}
