'use client'

import React from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Message } from '../types'
import { initials, timeLabel } from '../utils'

type Props = {
  messages: Message[]
  userId?: string
  canCreateTicket: boolean
  creatingTicketId: string | null
  ticketTypePickerId: string | null
  onDelete: (id: string) => void
  onCreateTicket: (message: Message, type: 'maquinaria' | 'deco') => void
  onPickTicketType: (messageId: string | null) => void
}

export default function MessageList({
  messages,
  userId,
  canCreateTicket,
  creatingTicketId,
  ticketTypePickerId,
  onDelete,
  onCreateTicket,
  onPickTicketType,
}: Props) {
  return (
    <div className="space-y-3">
      {messages
        .slice()
        .reverse()
        .map((m) => {
          const isMine = userId && m.senderId === userId
          const ticks = isMine && (m as any)?.readCount > 0 ? '✓✓' : isMine ? '✓' : ''
          return (
            <div key={m.id} className={`space-y-1 ${isMine ? 'flex flex-col items-end' : ''}`}>
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
                {ticks && <span className="text-[10px] text-gray-400">{ticks}</span>}
                {isMine && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => onDelete(m.id)}
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
                      href={`/menu/manteniment/${
                        m.ticketType === 'deco' ? 'tickets-deco' : 'tickets'
                      }?ticket=${m.ticketId}`}
                      className="underline hover:text-emerald-600"
                    >
                      Veure ticket {m.ticketCode ? `· ${m.ticketCode}` : ''}
                    </Link>
                  ) : ticketTypePickerId === m.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCreateTicket(m, 'maquinaria')}
                        disabled={creatingTicketId === m.id}
                        className="underline hover:text-emerald-600"
                      >
                        Maquinària
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        type="button"
                        onClick={() => onCreateTicket(m, 'deco')}
                        disabled={creatingTicketId === m.id}
                        className="underline hover:text-emerald-600"
                      >
                        Deco
                      </button>
                      <button
                        type="button"
                        onClick={() => onPickTicketType(null)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        aria-label="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPickTicketType(m.id)}
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
      {messages.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-slate-400">Encara no hi ha missatges.</p>
      )}
    </div>
  )
}
