// File: src/services/staff.ts

export interface Worker { id: string; name: string }

/**
 * Crida al teu endpoint /api/staff/available
 * que ja aplica lògica de solapaments, descans, departament…
 */
export async function fetchAvailableResponsibles(
  department: string,
  eventStart: string,
  eventEnd: string
): Promise<Worker[]> {
  const params = new URLSearchParams({
    role: 'responsible',
    department,
    start: eventStart,
    end:   eventEnd,
  })
  const url = `/api/staff/available?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    console.error(`Error carregant responsables:`, res.status, text)
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  // Esperem que /api/staff/available retorni [{ id, name, ... }, …]
  const data = (await res.json()) as Array<{ id: string; name: string }>
  return data.map(w => ({ id: w.id, name: w.name }))
}
