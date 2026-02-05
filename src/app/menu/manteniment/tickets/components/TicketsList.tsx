import React from 'react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import type { Ticket, TicketPriority, TicketStatus } from '../types'

type Props = {
  groupedTickets: [string, Ticket[]][]
  onSelect: (ticket: Ticket) => void
  onDelete: (ticket: Ticket) => void
  canDelete: (ticket: Ticket) => boolean
  formatDateTime: (value?: number | string | null) => string
  statusBadgeClasses: Record<TicketStatus, string>
  priorityBadgeClasses: Record<TicketPriority, string>
  statusLabels: Record<TicketStatus, string>
  priorityLabels: Record<TicketPriority, string>
}

export default function TicketsList({
  groupedTickets,
  onSelect,
  onDelete,
  canDelete,
  formatDateTime,
  statusBadgeClasses,
  priorityBadgeClasses,
  statusLabels,
  priorityLabels,
}: Props) {
  return (
    <div className="space-y-3">
      {groupedTickets.map(([day, items]) => (
        <div key={day} className="space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {format(parseISO(day), 'dd-MM-yyyy')}
          </div>
          <div className="space-y-3">
            {items.map((ticket) => (
              <div
                key={ticket.id}
                className="border rounded-xl px-4 py-3 bg-white shadow-sm cursor-pointer"
                onClick={() => onSelect(ticket)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {ticket.machine} · {ticket.description}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>
                        {ticket.ticketCode || ticket.incidentNumber || 'TIC'} · {ticket.location} · Creat per{' '}
                        {ticket.createdByName || '—'} · {formatDateTime(ticket.createdAt)}
                      </span>
                      {ticket.source === 'whatsblapp' && ticket.sourceChannelId && (
                        <Link
                          href={`/menu/missatgeria?channel=${ticket.sourceChannelId}`}
                          className="text-emerald-700 hover:text-emerald-800 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          WhatsBlapp
                        </Link>
                      )}
                      {canDelete(ticket) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(ticket)
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadgeClasses[ticket.status]}`}
                    >
                      {statusLabels[ticket.status]}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${priorityBadgeClasses[ticket.priority]}`}
                    >
                      {priorityLabels[ticket.priority]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
