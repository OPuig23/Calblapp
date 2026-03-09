export type Channel = {
  id: string
  name: string
  type: string
  source: string
  location: string
  projectId?: string | null
  projectName?: string | null
  roomId?: string | null
  roomName?: string | null
  roomKind?: 'block' | 'manual' | null
  eventCode?: string | null
  eventTitle?: string | null
  eventStart?: string | null
  eventEnd?: string | null
  visibleUntil?: number | null
  status?: string | null
  responsibleUserId?: string | null
  responsibleUserName?: string | null
  lastMessagePreview?: string
  lastMessageAt?: number
  unreadCount?: number
  muted?: boolean
}

export type Message = {
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
  fileUrl?: string | null
  filePath?: string | null
  fileName?: string | null
  fileMeta?: { size?: number; type?: string } | null
  ticketId?: string | null
  ticketCode?: string | null
  ticketStatus?: string | null
  ticketType?: 'maquinaria' | 'deco' | null
}

export type Member = { userId: string; userName: string; hidden?: boolean }

export type PendingImage = {
  url: string
  path: string
  meta: { width?: number; height?: number; size?: number; type?: string }
}
