// src/services/quadrants.ts
export async function confirmQuadrant(department: string, eventId: string) {
  const res = await fetch('/api/quadrants/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ department, eventId }),
  })
  if (!res.ok) throw new Error('No s’ha pogut confirmar el quadrant')
  return res.json() as Promise<{ ok: boolean; already?: boolean }>
}
