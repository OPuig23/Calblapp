// ✅ file: src/lib/colors.ts

/**
 * 🎨 Colors corporatius Cal Blay
 * Centralitza tots els colors per LN (línia de negoci) i per etapa (StageGroup)
 * per garantir coherència visual entre mòduls.
 */

// ───────────────────────────────────────────────
// Paleta base per estats visuals generals
// ───────────────────────────────────────────────
export const STAGE_COLORS: Record<string, string> = {
  verd: 'bg-green-200 text-green-900',
  blau: 'bg-blue-200 text-blue-900',
  taronja: 'bg-orange-200 text-orange-900',
  lila: 'bg-purple-300 text-purple-900',
}

// ───────────────────────────────────────────────
// Línies de Negoci (LN)
// ───────────────────────────────────────────────
export const COLORS_LN: Record<string, string> = {
  empresa: 'bg-blue-100 border border-blue-300 text-blue-700',
  casaments: 'bg-green-100 border border-green-300 text-green-700',
  'grups restaurants': 'bg-yellow-100 border border-yellow-300 text-yellow-700',
  Foodlovers: 'bg-pink-100 border border-pink-300 text-pink-700',
  foodlovers: 'bg-pink-100 border border-pink-300 text-pink-700',
  agenda: 'bg-orange-100 border border-orange-300 text-orange-700',
  altres: 'bg-gray-100 border border-gray-300 text-gray-700',
}

// ───────────────────────────────────────────────
// Etapes (StageGroup)
// ───────────────────────────────────────────────
export const COLORS_STAGE: Record<string, string> = {
  confirmat: 'bg-green-500',
  guanyat: 'bg-green-500',
  proposta: 'bg-orange-400',
  pendent: 'bg-orange-400',
  prereserva: 'bg-blue-400',
  calentet: 'bg-blue-400',
}

// ───────────────────────────────────────────────
// Helpers reutilitzables
// ───────────────────────────────────────────────
export const colorByLN = (lnRaw?: string): string => {
  const ln = (lnRaw || '').trim().toLowerCase()
  return COLORS_LN[ln] || COLORS_LN['altres']
}

export const colorByStage = (stage?: string): string => {
  const s = (stage || '').trim().toLowerCase()
  if (s.includes('confirmat') || s.includes('ganada')) return COLORS_STAGE['confirmat']
  if (s.includes('proposta') || s.includes('pendent')) return COLORS_STAGE['pendent']
  if (s.includes('prereserva') || s.includes('calentet')) return COLORS_STAGE['calentet']
  return 'bg-gray-300'
}
