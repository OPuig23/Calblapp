// File: src/utils/normalize.ts

/**
 * Normalitza una cadena de text:
 * - Passa a minúscules
 * - Elimina espais sobrants
 * - Treu accents i diacrítics
 * - Retorna string buit si no hi ha valor
 */
export function normalize(str?: string): string {
  if (typeof str !== 'string' || !str.trim()) return ''

  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')               // separa lletres i accents
    .replace(/[\u0300-\u036f]/g, '') // elimina tots els diacrítics
    .replace(/\s+/g, ' ')            // normalitza espais múltiples
}

/**
 * Normalitza l'estat d'un quadrant o esdeveniment
 * Accepta variants en català, castellà o anglès i retorna:
 *   'draft' | 'pending' | 'confirmed'
 */
export function normalizeStatus(status?: string): 'draft' | 'pending' | 'confirmed' {
  const s = (status ?? '').toLowerCase().trim()

  if (['draft', 'borrador', 'esborrany', 'esborranys', 'drafts'].includes(s)) {
    return 'draft'
  }
  if (['pending', 'pendent', 'pendents', 'pendiente'].includes(s)) {
    return 'pending'
  }
  if (['confirmed', 'confirmat', 'confirmats', 'confirmado', 'confirmados'].includes(s)) {
    return 'confirmed'
  }

  return 'pending' // valor per defecte
}
