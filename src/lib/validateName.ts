// file: src/lib/validateName.ts
export const norm = (v: string) =>
  v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export async function checkNameExists(name: string, excludeId?: string) {
  const q = new URLSearchParams({ name })
  if (excludeId) q.set('excludeId', excludeId)

  const res = await fetch(`/api/personnel/check-name?${q.toString()}`)
  const json = await res.json()
  return json.exists as boolean
}

export function generateSuggestions(name: string, count = 3) {
  const base = norm(name).replace(/[^a-z0-9]/g, '').slice(0, 8) || 'nom'
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const suf = Math.random().toString(36).slice(2, 6)
    out.push(base + suf)
  }
  return out
}
