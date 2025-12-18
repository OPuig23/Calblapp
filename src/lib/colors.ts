// ✅ file: src/lib/colors.ts

/**
 * 🎨 Colors corporatius Cal Blay
 * Paleta unificada i coherent per a:
 * - Calendari
 * - Mòdul Espais
 * - Cards i punts d’estat
 *
 * Criteri únic de STAGE:
 * - confirmat   → 🟢 verd
 * - calentet    → 🟠 taronja
 * - pressupost  → 🟡 groc
 */

// ───────────────────────────────────────────────
// 🎯 STAGE_COLORS
// (targetes, espais, compatibilitat legacy)
// ───────────────────────────────────────────────
export const STAGE_COLORS: Record<string, string> = {
  // 🟢 Confirmat
  verd: 'bg-emerald-50 text-emerald-800 border border-emerald-200',

  // 🟠 Calentet / Prereserva
  taronja: 'bg-orange-50 text-orange-800 border border-orange-200',

  // 🟡 Pressupost enviat
  groc: 'bg-yellow-50 text-yellow-800 border border-yellow-200',

  // 🟣 Residual / proves
  lila: 'bg-violet-50 text-violet-800 border border-violet-200',
}

// ───────────────────────────────────────────────
// 🏷️ COLORS PER LÍNIA DE NEGOCI (LN)
// ───────────────────────────────────────────────
export const COLORS_LN: Record<string, string> = {
  empresa: 'bg-blue-50 border border-blue-200 text-blue-800',
  casaments: 'bg-pink-50 border border-pink-200 text-pink-800',
  'grups restaurants': 'bg-amber-50 border border-amber-200 text-amber-800',
  foodlovers: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
  agenda: 'bg-orange-50 border border-orange-200 text-orange-800',
  altres: 'bg-gray-50 border border-gray-200 text-gray-700',

  // Variants
  'prova de menu': 'bg-violet-50 border border-violet-200 text-violet-800',
  pm: 'bg-violet-50 border border-violet-200 text-violet-800',
}

// ───────────────────────────────────────────────
// 🟢🟠🟡 COLORS_STAGE
// (punts del calendari, indicadors simples)
// ───────────────────────────────────────────────
export const COLORS_STAGE: Record<string, string> = {
  // Confirmat
  confirmat: 'bg-emerald-200',
  guanyat: 'bg-emerald-200',

  // Calentet / prereserva
  calentet: 'bg-orange-200',
  prereserva: 'bg-orange-200',

  // Pressupost
  pressupost: 'bg-yellow-200',
  proposta: 'bg-yellow-200',
  pendent: 'bg-yellow-200',
}

// ───────────────────────────────────────────────
// 🔧 HELPERS
// ───────────────────────────────────────────────
export const colorByLN = (lnRaw?: string): string => {
  const ln = (lnRaw || '').trim().toLowerCase()
  return COLORS_LN[ln] || COLORS_LN['altres']
}

export const colorByStage = (stage?: string): string => {
  const s = (stage || '').trim().toLowerCase()

  // 🔒 Valors interns normalitzats
  if (s === 'verd') return COLORS_STAGE.confirmat
  if (s === 'taronja') return COLORS_STAGE.calentet
  if (s === 'groc') return COLORS_STAGE.pressupost

  // 🔹 Textos reals (Zoho / Firestore)
  if (s.includes('confirmat') || s.includes('guanyat'))
    return COLORS_STAGE.confirmat

  if (s.includes('calentet') || s.includes('prereserva'))
    return COLORS_STAGE.calentet

  if (
    s.includes('pressupost') ||
    s.includes('proposta') ||
    s.includes('pendent')
  )
    return COLORS_STAGE.pressupost

  // Fallback neutre (no hauria de passar)
  return 'bg-gray-300'
}
