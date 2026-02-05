'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { BellOff, BellRing, Paperclip, Search, Send, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { RoleGuard } from '@/lib/withRoleGuard'
import { getAblyClient } from '@/lib/ablyClient'
import { useSearchParams } from 'next/navigation'
import { normalizeRole } from '@/lib/roles'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Channel = {
  id: string
  name: string
  type: string
  source: string
  location: string
  responsibleUserId?: string | null
  responsibleUserName?: string | null
  lastMessagePreview?: string
  lastMessageAt?: number
  unreadCount?: number
  muted?: boolean
}

type Message = {
  id: string
  channelId: string
  senderId: string
  senderName: string
  body: string
  createdAt: number
  visibility: 'channel' | 'direct'
  targetUserIds?: string[]
  imageUrl?: string | null
  imagePath?: string | null
  imageMeta?: { width?: number; height?: number; size?: number; type?: string } | null
  ticketId?: string | null
  ticketCode?: string | null
  ticketStatus?: string | null
}

type Member = { userId: string; userName: string }

function timeLabel(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
}

function initials(name?: string) {
  const clean = (name || '').trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/)
  const a = parts[0]?.charAt(0) || ''
  const b = parts[1]?.charAt(0) || ''
  return (a + b).toUpperCase()
}

function labelType(type?: string) {
  if (type === 'manteniment') return 'Manteniment'
  if (type === 'maquinaria') return 'Maquinària'
  if (type === 'produccio') return 'Producció'
  return type || ''
}

function labelSource(source?: string) {
  if (source === 'events') return 'Events'
  if (source === 'restaurants') return 'Restaurants'
  return source || ''
}

export default function MissatgeriaPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const userRole = normalizeRole((session?.user as any)?.role || '')
  const searchParams = useSearchParams()

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [loadingSend, setLoadingSend] = useState(false)
  const [messagesState, setMessagesState] = useState<Message[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'manteniment' | 'maquinaria' | 'produccio'>('manteniment')
  const [sourceFilter, setSourceFilter] = useState<'events' | 'restaurants'>('events')
  const [channelQuery, setChannelQuery] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{
    url: string
    path: string
    meta: { width?: number; height?: number; size?: number; type?: string }
  } | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionTarget, setMentionTarget] = useState<Member | null>(null)
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({})
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messagesCache = useRef<Map<string, Message[]>>(new Map())
  const typingThrottleRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [membersOpen, setMembersOpen] = useState(false)
  const [savingResponsible, setSavingResponsible] = useState(false)
  const [creatingTicketId, setCreatingTicketId] = useState<string | null>(null)

  const { data: channelsData, mutate: refreshChannels } = useSWR(
    '/api/messaging/channels?scope=mine',
    fetcher,
    { refreshInterval: 10000 }
  )

  const channels: Channel[] = Array.isArray(channelsData?.channels)
    ? channelsData.channels
    : []

  const filteredChannels = useMemo(() => {
    let out = channels
    out = out.filter((c) => c.type === typeFilter)
    out = out.filter((c) => c.source === sourceFilter)
    const q = channelQuery.trim().toLowerCase()
    if (q) {
      out = out.filter((c) => {
        const hay = `${c.name} ${c.source} ${c.location}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return out
  }, [channels, typeFilter, sourceFilter, channelQuery])

  const unreadByType = useMemo(() => {
    const map: Record<string, number> = {}
    channels.forEach((c) => {
      const n = Number(c.unreadCount || 0)
      if (!n) return
      map[c.type] = (map[c.type] || 0) + n
    })
    return map
  }, [channels])

  useEffect(() => {
    const queryChannel = searchParams?.get('channel')
    if (queryChannel && channels.some((c) => c.id === queryChannel)) {
      setSelectedChannelId(queryChannel)
      setMobileView('chat')
      return
    }
    if (!selectedChannelId && filteredChannels.length > 0) {
      setSelectedChannelId(filteredChannels[0].id)
    }
  }, [channels, filteredChannels, selectedChannelId, searchParams])

  const { data: messagesData, mutate: refreshMessages } = useSWR(
    selectedChannelId
      ? `/api/messaging/channels/${selectedChannelId}/messages?limit=15`
      : null,
    fetcher,
    { refreshInterval: 0 }
  )

  const messages: Message[] = Array.isArray(messagesData?.messages)
    ? messagesData.messages
    : []

  const { data: membersData } = useSWR(
    selectedChannelId
      ? `/api/messaging/channels/${selectedChannelId}/members`
      : null,
    fetcher
  )

  const members: Member[] = Array.isArray(membersData?.members)
    ? membersData.members
    : []

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) || null,
    [channels, selectedChannelId]
  )

  const canEditResponsible = userRole === 'admin' || userRole === 'direccio'
  const canCreateTicket =
    !!selectedChannel &&
    (selectedChannel.type === 'manteniment' || selectedChannel.type === 'maquinaria') &&
    !!userId &&
    selectedChannel.responsibleUserId === userId

  const createTicketFromMessage = async (message: Message) => {
    if (!message?.id || !canCreateTicket) return
    if (message.ticketId) return
    try {
      setCreatingTicketId(message.id)
      const res = await fetch(`/api/messaging/messages/${message.id}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      await refreshMessages()
      await refreshChannels()
    } catch (err: any) {
      alert(err?.message || 'No s’ha pogut crear el ticket')
    } finally {
      setCreatingTicketId(null)
    }
  }

  useEffect(() => {
    setMessagesState(messages)
    if (selectedChannelId) {
      messagesCache.current.set(selectedChannelId, messages)
    }
  }, [messagesData?.messages, selectedChannelId])

  useEffect(() => {
    if (!selectedChannelId) return
    const cached = messagesCache.current.get(selectedChannelId)
    if (cached && cached.length) {
      setMessagesState(cached)
    }
  }, [selectedChannelId])

  useEffect(() => {
    if (!messagesState.length) return
    const ids = messagesState.map((m) => m.id).filter(Boolean)
    fetch('/api/messaging/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: ids }),
    }).catch(() => {})
  }, [messagesState])

  useEffect(() => {
    if (!selectedChannelId) return
    fetch(`/api/messaging/channels/${selectedChannelId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    }).then(() => refreshChannels())
  }, [selectedChannelId, refreshChannels])

  useEffect(() => {
    if (!userId) return
    const client = getAblyClient()
    const inboxChannel = client.channels.get(`user:${userId}:inbox`)
    const handler = () => refreshChannels()
    inboxChannel.subscribe('updated', handler)

    return () => {
      inboxChannel.unsubscribe('updated', handler)
    }
  }, [userId, refreshChannels])

  useEffect(() => {
    if (!selectedChannelId) return
    const client = getAblyClient()
    const channel = client.channels.get(`chat:${selectedChannelId}`)
    const direct = userId ? client.channels.get(`user:${userId}:direct`) : null

    const handleMessage = (msg: any) => {
      const data = msg?.data as Message | undefined
      if (!data) return
      if (data.channelId !== selectedChannelId) return
      refreshMessages()
      refreshChannels()
    }

    channel.subscribe('message', handleMessage)
    channel.subscribe('typing', (msg) => {
      const data = msg?.data as { userId?: string; userName?: string } | undefined
      if (!data?.userId || data.userId === userId) return
      setTypingUsers((prev) => ({ ...prev, [data.userId]: Date.now() }))
    })
    direct?.subscribe('message', handleMessage)

    return () => {
      channel.unsubscribe('message', handleMessage)
      channel.unsubscribe('typing')
      direct?.unsubscribe('message', handleMessage)
    }
  }, [selectedChannelId, userId, refreshMessages, refreshChannels])

  const loadMore = async () => {
    if (!selectedChannelId || messagesState.length === 0) return
    try {
      setLoadingMore(true)
      const oldest = messagesState[messagesState.length - 1]
      const before = oldest?.createdAt ? `&before=${oldest.createdAt}` : ''
      const res = await fetch(
        `/api/messaging/channels/${selectedChannelId}/messages?limit=10${before}`
      )
      const data = await res.json()
      const next = Array.isArray(data?.messages) ? data.messages : []
      const merged = [...messagesState, ...next]
      const dedup = Array.from(new Map(merged.map((m) => [m.id, m])).values())
      setMessagesState(dedup)
      messagesCache.current.set(selectedChannelId, dedup)
    } finally {
      setLoadingMore(false)
    }
  }

  const sendMessage = async () => {
    const hasText = !!messageText.trim()
    const hasImage = !!pendingImage?.url
    if (!selectedChannelId || (!hasText && !hasImage)) return
    const directTarget = mentionTarget?.userId || ''
    const finalVisibility = directTarget ? 'direct' : 'channel'

    try {
      setLoadingSend(true)
      await fetch(`/api/messaging/channels/${selectedChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: hasText ? messageText.trim() : '',
          visibility: finalVisibility,
          targetUserId: finalVisibility === 'direct' ? directTarget : undefined,
          imageUrl: pendingImage?.url || undefined,
          imagePath: pendingImage?.path || undefined,
          imageMeta: pendingImage?.meta || undefined,
        }),
      })
      setMessageText('')
      setPendingImage(null)
      setMentionTarget(null)
      setMentionQuery('')
      setMentionOpen(false)
      refreshMessages()
      refreshChannels()
    } finally {
      setLoadingSend(false)
    }
  }

  const deleteMessage = async (msgId: string) => {
    if (!confirm('Vols esborrar aquest missatge?')) return
    await fetch(`/api/messaging/messages/${msgId}`, { method: 'DELETE' })
    refreshMessages()
    refreshChannels()
  }

  const handleTyping = (_value: string) => {
    if (!selectedChannelId || !userId) return
    const now = Date.now()
    if (now - typingThrottleRef.current < 1500) return
    typingThrottleRef.current = now
    const client = getAblyClient()
    const channel = client.channels.get(`chat:${selectedChannelId}`)
    channel.publish('typing', { userId, userName: (session?.user as any)?.name || '' })
  }

  useEffect(() => {
    const now = Date.now()
    const active = Object.entries(typingUsers)
      .filter(([, ts]) => now - ts < 3000)
      .map(([uid]) => uid)
    if (active.length === 0) return
    const timer = setTimeout(() => {
      setTypingUsers((prev) => {
        const next: Record<string, number> = {}
        Object.entries(prev).forEach(([uid, ts]) => {
          if (now - ts < 3000) next[uid] = ts
        })
        return next
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [typingUsers])

  const compressImage = async (file: File, maxSizeBytes = 1024 * 1024) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.src = url
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    const maxDim = 1600
    let { width, height } = img
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No canvas')
    ctx.drawImage(img, 0, 0, width, height)

    let quality = 0.9
    let blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )

    while (blob && blob.size > maxSizeBytes && quality > 0.5) {
      quality -= 0.1
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      )
    }

    URL.revokeObjectURL(url)
    if (!blob) throw new Error('Compress error')
    return { blob, width, height, type: blob.type, size: blob.size }
  }

  const handleImagePick = async (file: File | null) => {
    if (!file || !selectedChannelId || !userId) return
    setImageError(null)
    try {
      setImageUploading(true)
      const { blob, width, height, type, size } = await compressImage(file)
      if (size > 1024 * 1024) {
        throw new Error('La imatge encara pesa massa')
      }
      const form = new FormData()
      form.append('file', blob, 'image.jpg')
      form.append('channelId', selectedChannelId)

      const res = await fetch('/api/messaging/upload-image', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Error pujant la imatge')
      }
      setPendingImage({
        url: data.url,
        path: data.path,
        meta: { width, height, size, type },
      })
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Error pujant la imatge')
    } finally {
      setImageUploading(false)
    }
  }

  const updateMentionState = (value: string) => {
    const match = value.match(/@([^\s@]{0,30})$/)
    if (match) {
      setMentionQuery(match[1].toLowerCase())
      setMentionOpen(true)
    } else {
      setMentionQuery('')
      setMentionOpen(false)
    }

    if (mentionTarget) {
      const token = `@${mentionTarget.userName}`
      if (!value.includes(token)) {
        setMentionTarget(null)
      }
    }
  }

  const selectMention = (m: Member) => {
    const value = messageText
    const replaced = value.replace(/@([^\s@]{0,30})$/, `@${m.userName} `)
    setMessageText(replaced)
    setMentionTarget(m)
    setMentionOpen(false)
    setMentionQuery('')
  }

  const openChannel = (id: string) => {
    setSelectedChannelId(id)
    setMobileView('chat')
  }

  const updateResponsible = async (targetUserId: string) => {
    if (!selectedChannel || !canEditResponsible) return
    try {
      setSavingResponsible(true)
      await fetch(`/api/messaging/channels/${selectedChannel.id}/responsible`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      })
      await refreshChannels()
    } finally {
      setSavingResponsible(false)
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
      <div className="p-0 lg:p-4">
        {mobileView === 'list' && (
          <div className="px-3 py-2 flex items-center justify-between">
            <Link
              href="/menu"
              className="text-base font-semibold text-gray-900 hover:text-emerald-700 dark:text-slate-100"
            >
              WhatsBlapp
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <aside
            className={`lg:col-span-1 bg-white dark:bg-slate-900 ${
              mobileView === 'chat' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="p-3 space-y-3 border-b border-gray-100 lg:border-b lg:border-gray-100 dark:border-slate-800">
              <div className="flex w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                {[
                  { key: 'manteniment', label: 'Manteniment' },
                  { key: 'maquinaria', label: 'Maquinària' },
                  { key: 'produccio', label: 'Producció' },
                ].map((chip, idx, arr) => {
                  const active = typeFilter === chip.key
                  const isLast = idx === arr.length - 1
                  const typeUnread = unreadByType[chip.key] || 0
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setTypeFilter(chip.key as any)}
                      className={`flex-1 px-3 py-2 text-xs font-semibold border-r last:border-r-0 relative ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                      } ${isLast ? 'border-r-0' : 'border-gray-200 dark:border-slate-700'}`}
                    >
                      {typeUnread > 0 && !active && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full px-1.5">
                          {typeUnread}
                        </span>
                      )}
                      {chip.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 border rounded-lg px-2 py-1 dark:border-slate-700">
                <Search className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                <input
                  className="w-full text-sm outline-none bg-transparent text-gray-800 dark:text-slate-100"
                  placeholder="Cerca canal, finca o restaurant..."
                  value={channelQuery}
                  onChange={(e) => setChannelQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'events', label: 'Events' },
                  { key: 'restaurants', label: 'Restaurants' },
                ].map((chip) => {
                  const active = sourceFilter === chip.key
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setSourceFilter(chip.key as any)}
                      className={`px-3 py-1 rounded-full text-xs border ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <ul className="max-h-[70vh] overflow-y-auto">
              {filteredChannels.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openChannel(c.id)}
                    className={`w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 ${
                      selectedChannelId === c.id ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-100 flex items-center justify-center text-xs font-semibold shrink-0">
                        {initials(c.location || c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                            {c.location}
                          </div>
                      {c.unreadCount ? (
                        <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                          {c.unreadCount}
                        </span>
                      ) : null}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between gap-2">
                          <span className="truncate">
                            {c.lastMessagePreview || 'Sense missatges'}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0">
                            {timeLabel(c.lastMessageAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {filteredChannels.length === 0 && (
                <li className="p-4 text-sm text-gray-500 dark:text-slate-400">
                  No tens canals subscrits.
                </li>
              )}
            </ul>
          </aside>

          <section
            className={`lg:col-span-3 bg-white dark:bg-slate-900 flex flex-col ${
              mobileView === 'list' ? 'hidden lg:flex' : 'flex'
            } lg:border lg:rounded-xl lg:shadow-sm min-h-[100dvh] lg:min-h-0`}
          >
            <div className="px-3 py-2 lg:py-3 lg:border-b flex items-center justify-between dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="lg:hidden text-2xl text-gray-700 hover:text-gray-900 dark:text-slate-200 dark:hover:text-white -ml-1 px-2"
                  onClick={() => setMobileView('list')}
                  aria-label="Tornar"
                >
                  ←
                </button>
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-100 flex items-center justify-center text-xs font-semibold">
                  {initials(selectedChannel?.location || selectedChannel?.name)}
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                  {selectedChannel?.location || 'Selecciona un canal'}
                </div>
              </div>
              {selectedChannel && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white"
                    onClick={() => setMembersOpen((prev) => !prev)}
                    title="Membres del canal"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white"
                    onClick={async () => {
                      const next = !selectedChannel.muted
                      await fetch(`/api/messaging/channels/${selectedChannel.id}/mute`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ muted: next }),
                      })
                      refreshChannels()
                    }}
                    title={selectedChannel.muted ? 'Activar canal' : 'Silenciar canal'}
                  >
                    {selectedChannel.muted ? (
                      <BellRing className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {membersOpen && selectedChannel && (
              <div className="border-b bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                    Membres del canal
                  </div>
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => setMembersOpen(false)}
                  >
                    Tancar
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Responsable:{' '}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {selectedChannel.responsibleUserName || 'No assignat'}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {members.map((m) => {
                    const isResponsible = selectedChannel.responsibleUserId === m.userId
                    return (
                      <div
                        key={m.userId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-100 flex items-center justify-center text-xs font-semibold">
                            {initials(m.userName)}
                          </div>
                          <div className="text-sm text-gray-800 dark:text-slate-100">
                            {m.userName}
                          </div>
                        </div>
                        {isResponsible ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Responsable
                          </span>
                        ) : canEditResponsible ? (
                          <button
                            type="button"
                            className="text-xs border rounded-full px-3 py-1 text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:border-slate-600 dark:hover:text-white"
                            onClick={() => updateResponsible(m.userId)}
                            disabled={savingResponsible}
                          >
                            Fer responsable
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                  {members.length === 0 && (
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      Sense membres.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              ref={scrollRef}
              className="flex-1 px-3 py-4 lg:p-4 space-y-3 overflow-y-auto pb-32"
              onScroll={(e) => {
                const el = e.currentTarget
                if (el.scrollTop < 40 && !loadingMore) {
                  loadMore()
                }
              }}
            >
              {messagesState
                .slice()
                .reverse()
                .map((m) => {
                  const isMine = userId && m.senderId === userId
                  const ticks =
                    isMine && (m as any)?.readCount > 0 ? '✓✓' : isMine ? '✓' : ''
                  return (
                    <div
                      key={m.id}
                      className={`space-y-1 ${isMine ? 'flex flex-col items-end' : ''}`}
                    >
                      <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2">
                        {!isMine && (
                          <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-100 flex items-center justify-center text-[10px] font-semibold">
                            {initials(m.senderName)}
                          </span>
                        )}
                        <span>
                          {isMine ? 'Tu' : m.senderName || 'Usuari'} · {timeLabel(m.createdAt)}
                          {m.visibility === 'direct' ? ' · Directe' : ''}
                        </span>
                        {ticks && (
                          <span className="text-[10px] text-gray-400">{ticks}</span>
                        )}
                        {isMine && (
                          <button
                            type="button"
                            className="text-gray-400 hover:text-red-600"
                            onClick={() => deleteMessage(m.id)}
                            title="Esborrar missatge"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`text-sm rounded-lg p-2 space-y-2 max-w-[85%] ${
                          isMine
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {m.body && <div>{m.body}</div>}
                        {m.imageUrl && (
                          <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={m.imageUrl}
                              alt="Imatge"
                              className="max-h-64 rounded border dark:border-slate-700"
                            />
                          </a>
                        )}
                      </div>
                      {((canCreateTicket && m.visibility === 'channel') || m.ticketId) && (
                        <div className="text-xs text-gray-600 dark:text-slate-300">
                          {m.ticketId ? (
                            <Link
                              href={`/menu/manteniment/tickets?ticket=${m.ticketId}`}
                              className="underline hover:text-emerald-600"
                            >
                              Veure ticket {m.ticketCode ? `· ${m.ticketCode}` : ''}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => createTicketFromMessage(m)}
                              disabled={creatingTicketId === m.id}
                              className="underline hover:text-emerald-600"
                            >
                              {creatingTicketId === m.id ? 'Creant ticket…' : 'Crear ticket'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              {messagesState.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-slate-400">Encara no hi ha missatges.</p>
              )}
            </div>

            <div className="border-t p-3 space-y-2 bg-white dark:bg-slate-900 fixed bottom-0 left-0 right-0 lg:sticky lg:bottom-0 pb-[env(safe-area-inset-bottom)] dark:border-slate-800">
              {Object.keys(typingUsers).length > 0 && (
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  S'està escrivint…
                </div>
              )}
              {pendingImage && (
                <div className="flex items-center gap-3 text-sm">
                  <img
                    src={pendingImage.url}
                    alt="Imatge adjunta"
                    className="h-16 w-16 object-cover rounded border dark:border-slate-700"
                  />
                  <button
                    type="button"
                    className="text-red-600 text-xs"
                    onClick={() => setPendingImage(null)}
                  >
                    Eliminar imatge
                  </button>
                </div>
              )}
              {imageError && (
                <div className="text-xs text-red-600">{imageError}</div>
              )}
              <div className="flex flex-wrap gap-2">
                {['Rebut', 'Ho reviso', 'Fet'].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    className="text-xs border rounded-full px-3 py-1 text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:border-slate-700 dark:hover:text-white"
                    onClick={() => setMessageText((prev) => `${prev} ${quick}`.trim())}
                  >
                    {quick}
                  </button>
                ))}
              </div>
              {mentionTarget && (
                <div className="text-xs text-emerald-700">
                  Directe a: <strong>{mentionTarget.userName}</strong>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImagePick(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="border rounded px-2 py-1 text-gray-600 hover:text-gray-800 hover:border-gray-400 dark:text-slate-300 dark:border-slate-700 dark:hover:text-white dark:hover:border-slate-500"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar imatge"
                  disabled={imageUploading}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-slate-100 dark:border-slate-700"
                  placeholder="Escriu el missatge..."
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value)
                    updateMentionState(e.target.value)
                    handleTyping(e.target.value)
                  }}
                />
                <button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full"
                  onClick={sendMessage}
                  disabled={loadingSend || imageUploading}
                  title="Enviar"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {mentionOpen && (
                <div className="border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm max-h-40 overflow-y-auto">
                  {members
                    .filter((m) =>
                      m.userName.toLowerCase().includes(mentionQuery)
                    )
                    .map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm"
                        onClick={() => selectMention(m)}
                      >
                        {m.userName}
                      </button>
                    ))}
                  {members.filter((m) =>
                    m.userName.toLowerCase().includes(mentionQuery)
                  ).length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">
                      Cap usuari
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </RoleGuard>
  )
}


