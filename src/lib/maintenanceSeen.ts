export type TicketType = 'maquinaria' | 'deco'

const keyFor = (ticketType?: TicketType) =>
  `maintenance_seen_${ticketType || 'all'}`

export function readSeenTickets(ticketType?: TicketType): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(keyFor(ticketType))
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return new Set()
    return new Set(list.filter((v) => typeof v === 'string' && v.length > 0))
  } catch {
    return new Set()
  }
}

export function markTicketSeen(ticketId: string, ticketType?: TicketType) {
  if (typeof window === 'undefined') return
  if (!ticketId) return
  try {
    const seen = readSeenTickets(ticketType)
    if (seen.has(ticketId)) return
    seen.add(ticketId)
    window.localStorage.setItem(keyFor(ticketType), JSON.stringify(Array.from(seen)))
    window.dispatchEvent(
      new CustomEvent('maintenance-ticket-seen', { detail: { ticketType, ticketId } })
    )
  } catch {
    // ignore
  }
}
