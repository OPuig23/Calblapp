export function timeLabel(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
}

export function initials(name?: string) {
  const clean = (name || '').trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/)
  const a = parts[0]?.charAt(0) || ''
  const b = parts[1]?.charAt(0) || ''
  return (a + b).toUpperCase()
}

export function eventDateLabel(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const d = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
